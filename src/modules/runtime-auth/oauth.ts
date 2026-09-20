import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { parseAuthFlowConfig } from "@/modules/auth-config";

import type { PasswordHasher, RuntimeSession, RuntimeUser } from "./contracts";
import { hashToken, RuntimeProjectNotFoundError } from "./service";

const googleUserSchema = z.object({
  sub: z.string().min(1).max(255), email: z.string().email().max(254), email_verified: z.literal(true),
  name: z.string().max(200).optional(), picture: z.string().url().max(2048).optional(),
});
const tokenSchema = z.object({ access_token: z.string().min(1), token_type: z.string().optional() });

export class RuntimeOAuthUnavailableError extends Error {}
export class RuntimeOAuthStateError extends Error {}
export class RuntimeOAuthProviderError extends Error {}

type OAuthTransaction = { id: string; projectId: string; verifierCipher: string };
type OAuthIdentity = { subject: string; email: string; name?: string; picture?: string };

export interface RuntimeOAuthStore {
  getGoogleProject(projectId: string): Promise<{ id: string; enabled: boolean } | null>;
  createTransaction(input: { projectId: string; stateHash: string; verifierCipher: string; expiresAt: Date }): Promise<void>;
  consumeTransaction(stateHash: string, now: Date): Promise<OAuthTransaction | null>;
  completeGoogleLogin(input: { projectId: string; identity: OAuthIdentity; passwordHash: string }): Promise<RuntimeUser>;
  createSession(input: { projectId: string; userId: string; tokenHash: string; expiresAt: Date; ipHash?: string; userAgent?: string }): Promise<RuntimeSession>;
  recordSuccess(input: { projectId: string; userId: string; ipHash?: string }): Promise<void>;
}

export interface GoogleOAuthAdapter {
  authorizationUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string;
  exchange(input: { code: string; codeVerifier: string; redirectUri: string }): Promise<OAuthIdentity>;
}

export class GoogleOAuthHttpAdapter implements GoogleOAuthAdapter {
  constructor(private readonly clientId: string, private readonly clientSecret: string) {}
  authorizationUrl(input: { state: string; codeChallenge: string; redirectUri: string }) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: this.clientId, redirect_uri: input.redirectUri, response_type: "code", scope: "openid email profile", state: input.state, code_challenge: input.codeChallenge, code_challenge_method: "S256" }).toString();
    return url.toString();
  }
  async exchange(input: { code: string; codeVerifier: string; redirectUri: string }) {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: input.code, client_id: this.clientId, client_secret: this.clientSecret, redirect_uri: input.redirectUri, grant_type: "authorization_code", code_verifier: input.codeVerifier }), signal: AbortSignal.timeout(10_000) });
    if (!tokenResponse.ok) throw new RuntimeOAuthProviderError();
    const token = tokenSchema.safeParse(await tokenResponse.json());
    if (!token.success) throw new RuntimeOAuthProviderError();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.data.access_token}` }, signal: AbortSignal.timeout(10_000) });
    if (!profileResponse.ok) throw new RuntimeOAuthProviderError();
    const profile = googleUserSchema.safeParse(await profileResponse.json());
    if (!profile.success) throw new RuntimeOAuthProviderError();
    return { subject: profile.data.sub, email: profile.data.email.toLowerCase(), name: profile.data.name, picture: profile.data.picture };
  }
}

export class RuntimeOAuthService {
  constructor(private readonly store: RuntimeOAuthStore, private readonly provider: GoogleOAuthAdapter, private readonly hasher: PasswordHasher, private readonly secret: string, private readonly appUrl: string, private readonly now: () => Date = () => new Date()) {}
  async start(projectId: string) {
    const project = await this.store.getGoogleProject(projectId);
    if (!project) throw new RuntimeProjectNotFoundError();
    if (!project.enabled) throw new RuntimeOAuthUnavailableError();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await this.store.createTransaction({ projectId, stateHash: hashToken(state), verifierCipher: encrypt(verifier, this.secret), expiresAt: new Date(this.now().getTime() + 10 * 60 * 1000) });
    return this.provider.authorizationUrl({ state, codeChallenge: challenge, redirectUri: this.redirectUri(projectId) });
  }
  async callback(projectId: string, input: { state?: string; code?: string; error?: string }, context: { ipHash?: string; userAgent?: string }) {
    if (input.error || !input.state || !input.code) throw new RuntimeOAuthProviderError();
    const transaction = await this.store.consumeTransaction(hashToken(input.state), this.now());
    if (!transaction || transaction.projectId !== projectId) throw new RuntimeOAuthStateError();
    const identity = await this.provider.exchange({ code: input.code, codeVerifier: decrypt(transaction.verifierCipher, this.secret), redirectUri: this.redirectUri(projectId) });
    const passwordHash = await this.hasher.hash(randomBytes(48).toString("base64url"));
    const user = await this.store.completeGoogleLogin({ projectId, identity, passwordHash });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.store.createSession({ projectId, userId: user.id, tokenHash: hashToken(token), expiresAt, ...context });
    await this.store.recordSuccess({ projectId, userId: user.id, ipHash: context.ipHash });
    return { token, expiresAt };
  }
  private redirectUri(projectId: string) { return `${this.appUrl}/api/runtime/projects/${projectId}/oauth/google/callback`; }
}

export class PrismaRuntimeOAuthStore implements RuntimeOAuthStore {
  constructor(private readonly prisma: PrismaClient) {}
  async getGoogleProject(projectId: string) { const project = await this.prisma.project.findFirst({ where: { id: projectId, status: "ACTIVE" }, include: { activeConfig: true } }); if (!project?.activeConfig) return null; return { id: project.id, enabled: parseAuthFlowConfig(project.activeConfig.config).login.socialProviders.google }; }
  async createTransaction(input: { projectId: string; stateHash: string; verifierCipher: string; expiresAt: Date }) { await this.prisma.runtimeOAuthTransaction.create({ data: { ...input, provider: "google" } }); }
  async consumeTransaction(stateHash: string, now: Date) { return this.prisma.$transaction(async (tx) => { const value = await tx.runtimeOAuthTransaction.findFirst({ where: { stateHash, provider: "google", consumedAt: null, expiresAt: { gt: now } } }); if (!value) return null; const consumed = await tx.runtimeOAuthTransaction.updateMany({ where: { id: value.id, consumedAt: null }, data: { consumedAt: now } }); return consumed.count === 1 ? { id: value.id, projectId: value.projectId, verifierCipher: value.verifierCipher } : null; }); }
  async completeGoogleLogin(input: { projectId: string; identity: OAuthIdentity; passwordHash: string }) { return this.prisma.$transaction(async (tx) => {
    const linked = await tx.runtimeOAuthAccount.findUnique({ where: { projectId_provider_subject: { projectId: input.projectId, provider: "google", subject: input.identity.subject } }, include: { runtimeUser: true } });
    if (linked) return mapOAuthUser(linked.runtimeUser);
    let user = await tx.runtimeUser.findUnique({ where: { projectId_email: { projectId: input.projectId, email: input.identity.email } } });
    user ??= await tx.runtimeUser.create({ data: { projectId: input.projectId, email: input.identity.email, passwordHash: input.passwordHash, emailVerified: true, profile: { full_name: input.identity.name ?? "", avatar_url: input.identity.picture ?? "" } } });
    if (!user.emailVerified) user = await tx.runtimeUser.update({ where: { id: user.id }, data: { emailVerified: true } });
    await tx.runtimeOAuthAccount.create({ data: { projectId: input.projectId, runtimeUserId: user.id, provider: "google", subject: input.identity.subject, email: input.identity.email } });
    return mapOAuthUser(user);
  }); }
  async createSession(input: { projectId: string; userId: string; tokenHash: string; expiresAt: Date; ipHash?: string; userAgent?: string }) { const value = await this.prisma.runtimeSession.create({ data: input, include: { user: true } }); return { ...value, user: mapOAuthUser(value.user) }; }
  async recordSuccess(input: { projectId: string; userId: string; ipHash?: string }) { await this.prisma.runtimeAuthEvent.create({ data: { projectId: input.projectId, runtimeUserId: input.userId, eventType: "runtime.oauth", outcome: "success", ipHash: input.ipHash, metadata: { provider: "google" } } }); }
}

function mapOAuthUser(user: { id: string; projectId: string; email: string; passwordHash: string; emailVerified: boolean; phoneVerified: boolean; profile: Prisma.JsonValue }): RuntimeUser { return { ...user, profile: user.profile as RuntimeUser["profile"] }; }
function key(secret: string) { return createHash("sha256").update(secret).digest(); }
function encrypt(value: string, secret: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(secret), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
function decrypt(value: string, secret: string) { try { const [iv, tag, data] = value.split("."); if (!iv || !tag || !data) throw new Error(); const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8"); } catch { throw new RuntimeOAuthStateError(); } }
