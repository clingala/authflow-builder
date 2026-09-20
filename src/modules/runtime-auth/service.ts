import { createHash, createHmac, randomBytes } from "node:crypto";

import type { AuthFlowConfig } from "@/modules/auth-config";

import type { PasswordHasher, RuntimeAuthStore, RuntimeProject, RuntimeUser } from "./contracts";
import { RegistrationValidationError, projectIdSchema, signInSchema, signUpSchema, validateRegistration } from "./validation";

const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

export class RuntimeProjectNotFoundError extends Error {}
export class RuntimeUnsupportedConfigError extends Error {}
export class RuntimeAccountExistsError extends Error {}
export class RuntimeInvalidCredentialsError extends Error {}
export class RuntimeVerificationRequiredError extends Error {}
export class RuntimeRateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) { super("Too many requests"); }
}

export type RuntimeRequestContext = { ipHash?: string; userAgent?: string };

function publicUser(user: RuntimeUser) {
  return { id: user.id, email: user.email, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified };
}

function requiresVerification(config: AuthFlowConfig, user: Pick<RuntimeUser, "emailVerified" | "phoneVerified">) {
  return (config.verification.email.enabled && !user.emailVerified) || (config.verification.phone.enabled && !user.phoneVerified);
}

function ensureEmailPassword(config: AuthFlowConfig) {
  if (!config.login.passwordEnabled || !config.login.identifiers.includes("email")) {
    throw new RuntimeUnsupportedConfigError();
  }
}

export class RuntimeAuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly store: RuntimeAuthStore,
    private readonly passwordHasher: PasswordHasher,
    private readonly secret: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getProject(rawProjectId: string): Promise<RuntimeProject> {
    const projectId = projectIdSchema.safeParse(rawProjectId);
    if (!projectId.success) throw new RuntimeProjectNotFoundError();
    const project = await this.store.getProject(projectId.data);
    if (!project) throw new RuntimeProjectNotFoundError();
    return project;
  }

  async signUp(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.getProject(rawProjectId);
    ensureEmailPassword(project.config);
    const input = signUpSchema.parse(rawInput);
    const registration = validateRegistration(project.config, input.fields);
    await this.enforceLimits(project.id, "signup", registration.email, context.ipHash, 5, 600);

    const existing = await this.store.findUserByEmail(project.id, registration.email);
    if (existing) {
      await this.store.recordEvent({ projectId: project.id, runtimeUserId: existing.id, eventType: "runtime.signup", outcome: "failure", ipHash: context.ipHash, metadata: { reason: "account_exists" } });
      throw new RuntimeAccountExistsError();
    }

    const passwordHash = await this.passwordHasher.hash(registration.password);
    const user = await this.store.createUser({ projectId: project.id, email: registration.email, passwordHash, profile: registration.profile });
    if (!user) throw new RuntimeAccountExistsError();

    if (requiresVerification(project.config, user)) {
      await this.store.recordEvent({ projectId: project.id, runtimeUserId: user.id, eventType: "runtime.signup", outcome: "success", ipHash: context.ipHash, metadata: { verificationRequired: true } });
      return { user: publicUser(user), verificationRequired: true, session: null };
    }

    const session = await this.issueSession(project.id, user, context);
    await this.store.recordEvent({ projectId: project.id, runtimeUserId: user.id, eventType: "runtime.signup", outcome: "success", ipHash: context.ipHash });
    return { user: publicUser(user), verificationRequired: false, session };
  }

  async signIn(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.getProject(rawProjectId);
    ensureEmailPassword(project.config);
    const input = signInSchema.parse(rawInput);
    const email = input.email.toLowerCase();
    await this.enforceLimits(project.id, "signin", email, context.ipHash, 8, 300);

    const user = await this.store.findUserByEmail(project.id, email);
    const hash = user?.passwordHash ?? await (this.dummyHash ??= this.passwordHasher.hash(randomBytes(32).toString("base64url")));
    const valid = await this.passwordHasher.verify({ hash, password: input.password });
    if (!user || !valid) {
      await this.store.recordEvent({ projectId: project.id, runtimeUserId: user?.id, eventType: "runtime.signin", outcome: "failure", ipHash: context.ipHash, metadata: { reason: "invalid_credentials" } });
      throw new RuntimeInvalidCredentialsError();
    }
    if (requiresVerification(project.config, user)) {
      await this.store.recordEvent({ projectId: project.id, runtimeUserId: user.id, eventType: "runtime.signin", outcome: "blocked", ipHash: context.ipHash, metadata: { reason: "verification_required" } });
      throw new RuntimeVerificationRequiredError();
    }

    const session = await this.issueSession(project.id, user, context);
    await Promise.all([
      this.store.markLogin(user.id, this.now()),
      this.store.recordEvent({ projectId: project.id, runtimeUserId: user.id, eventType: "runtime.signin", outcome: "success", ipHash: context.ipHash }),
    ]);
    return { user: publicUser(user), session };
  }

  async getSession(rawProjectId: string, token: string | undefined) {
    const projectId = projectIdSchema.parse(rawProjectId);
    if (!token) return null;
    return this.store.findSession(projectId, hashToken(token), this.now());
  }

  async signOut(rawProjectId: string, token: string | undefined, context: RuntimeRequestContext) {
    const { id: projectId } = await this.getProject(rawProjectId);
    if (token) await this.store.revokeSession(projectId, hashToken(token));
    await this.store.recordEvent({ projectId, eventType: "runtime.signout", outcome: "success", ipHash: context.ipHash });
  }

  private async issueSession(projectId: string, user: RuntimeUser, context: RuntimeRequestContext) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + sessionLifetimeSeconds * 1000);
    await this.store.createSession({ projectId, userId: user.id, tokenHash: hashToken(token), expiresAt, ipHash: context.ipHash, userAgent: context.userAgent });
    return { token, expiresAt };
  }

  private async enforceLimits(projectId: string, action: string, identity: string, ipHash: string | undefined, limit: number, windowSeconds: number) {
    const keys = [identity ? `identity:${identity}` : null, ipHash ? `ip:${ipHash}` : null].filter((value): value is string => Boolean(value));
    for (const key of keys) {
      const keyHash = createHmac("sha256", this.secret).update(`${projectId}:${action}:${key}`).digest("hex");
      const result = await this.store.consumeRateLimit({ keyHash, projectId, action, limit, windowSeconds, now: this.now() });
      if (!result.allowed) {
        await this.store.recordEvent({ projectId, eventType: action === "signup" ? "runtime.signup" : "runtime.signin", outcome: "blocked", ipHash, metadata: { reason: "rate_limited" } });
        throw new RuntimeRateLimitedError(result.retryAfterSeconds);
      }
    }
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export { RegistrationValidationError };
