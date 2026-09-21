import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import type { JsonValue } from "@/modules/projects";

import type { PasswordHasher, RuntimeAuthStore, RuntimeChallenge, RuntimeUser } from "./contracts";
import { RuntimeDeliveryUnavailableError, type RuntimeDeliveryAdapter } from "./delivery";
import { RuntimeProjectNotFoundError, RuntimeRateLimitedError, type RuntimeRequestContext } from "./service";
import {
  recoveryRequestSchema,
  recoveryResetSchema,
  RegistrationValidationError,
  validatePassword,
  verificationConfirmSchema,
  verificationRequestSchema,
} from "./validation";

export class RuntimeChallengeInvalidError extends Error {}
export class RuntimeChallengeExpiredError extends Error {}
export class RuntimeChallengeAttemptsExceededError extends Error {}
export class RuntimeMethodUnavailableError extends Error {}

export class RuntimeChallengeService {
  constructor(
    private readonly store: RuntimeAuthStore,
    private readonly passwordHasher: PasswordHasher,
    private readonly delivery: RuntimeDeliveryAdapter,
    private readonly secret: string,
    private readonly publicBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async requestVerification(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.store.getProject(rawProjectId);
    if (!project) throw new RuntimeProjectNotFoundError();
    const input = verificationRequestSchema.parse(rawInput);
    if (!this.delivery.available) throw new RuntimeDeliveryUnavailableError();
    await this.enforceRequestLimit(project.id, input.channel === "email" ? "verify_email" : "verify_phone", input.identifier, project.config.verification.otp, context.ipHash);
    const user = await this.findUser(project.id, input.identifier);
    if (!user) return { accepted: true };
    const method = input.channel === "email" ? project.config.verification.email : project.config.verification.phone;
    if (!method.enabled) throw new RuntimeMethodUnavailableError();
    const channel: RuntimeChallenge["channel"] = input.channel === "phone" ? "phone_otp" : method.method === "otp" ? "email_otp" : "email_link";
    const target = input.channel === "email" ? user.email : this.phoneOf(user);
    if (!target) throw new RuntimeMethodUnavailableError();
    await this.issue(project.id, user, input.channel === "email" ? "verify_email" : "verify_phone", channel, target, project.config.verification.otp, context);
    return { accepted: true };
  }

  async confirmVerification(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.store.getProject(rawProjectId);
    if (!project) throw new RuntimeProjectNotFoundError();
    const input = verificationConfirmSchema.parse(rawInput);
    const purpose = input.channel === "email" ? "verify_email" : "verify_phone";
    const user = await this.findUser(project.id, input.identifier);
    const target = user ? (input.channel === "email" ? user.email : this.phoneOf(user)) : null;
    if (!target) throw new RuntimeChallengeExpiredError();
    const challenge = await this.verifyChallenge(project.id, purpose, target, input.secret, project.config.verification.otp.maxAttempts);
    await this.store.setVerified(challenge.runtimeUserId, input.channel);
    await this.store.recordEvent({ projectId: project.id, runtimeUserId: challenge.runtimeUserId, eventType: "runtime.verification", outcome: "success", ipHash: context.ipHash, metadata: { channel: input.channel } });
    return { verified: true };
  }

  async requestRecovery(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.store.getProject(rawProjectId);
    if (!project) throw new RuntimeProjectNotFoundError();
    const input = recoveryRequestSchema.parse(rawInput);
    if (!this.delivery.available) throw new RuntimeDeliveryUnavailableError();
    if (!project.config.recovery.enabled || !project.config.recovery.methods.includes(input.method)) throw new RuntimeMethodUnavailableError();
    await this.enforceRequestLimit(project.id, "recover_password", input.identifier, project.config.verification.otp, context.ipHash);
    const user = await this.findUser(project.id, input.identifier);
    if (!user) return { accepted: true };
    const target = input.method === "phone_otp" ? this.phoneOf(user) : user.email;
    if (!target) return { accepted: true };
    await this.issue(project.id, user, "recover_password", input.method, target, project.config.verification.otp, context);
    return { accepted: true };
  }

  async resetPassword(rawProjectId: string, rawInput: unknown, context: RuntimeRequestContext) {
    const project = await this.store.getProject(rawProjectId);
    if (!project) throw new RuntimeProjectNotFoundError();
    const input = recoveryResetSchema.parse(rawInput);
    if (!project.config.recovery.enabled || !project.config.recovery.methods.includes(input.method)) throw new RuntimeMethodUnavailableError();
    validatePassword(project.config.passwordPolicy, input.password, input.confirmPassword);
    const challenge = await this.verifyChallenge(project.id, "recover_password", input.identifier, input.secret, project.config.verification.otp.maxAttempts);
    const passwordHash = await this.passwordHasher.hash(input.password);
    await this.store.updatePasswordAndRevokeSessions(challenge.runtimeUserId, passwordHash, this.now());
    await this.store.recordEvent({ projectId: project.id, runtimeUserId: challenge.runtimeUserId, eventType: "runtime.recovery", outcome: "success", ipHash: context.ipHash, metadata: { method: input.method } });
    return { reset: true };
  }

  private async issue(projectId: string, user: RuntimeUser, purpose: RuntimeChallenge["purpose"], channel: RuntimeChallenge["channel"], target: string, otp: { ttlSeconds: number; resendCooldownSeconds: number; maxResends: number }, context: RuntimeRequestContext) {
    const now = this.now();
    const expiresAt = new Date(now.getTime() + otp.ttlSeconds * 1000);
    const targetHash = this.hmac(`target:${target.trim().toLowerCase()}`);
    const previous = await this.store.findActiveChallenge({ projectId, purpose, targetHash, now });
    if (previous && previous.nextResendAt > now) throw new RuntimeRateLimitedError(Math.ceil((previous.nextResendAt.getTime() - now.getTime()) / 1000));
    const secret = channel.endsWith("_otp") ? randomInt(100000, 1000000).toString() : randomBytes(32).toString("base64url");
    await this.store.invalidateActiveChallenges({ projectId, runtimeUserId: user.id, purpose, now });
    await this.store.createChallenge({ projectId, runtimeUserId: user.id, purpose, channel, targetHash, secretHash: this.hmac(`secret:${secret}`), expiresAt, nextResendAt: new Date(now.getTime() + otp.resendCooldownSeconds * 1000) });
    const link = `${this.publicBaseUrl}/auth/${projectId}?${purpose === "recover_password" ? "recovery" : "verification"}=${encodeURIComponent(secret)}&identifier=${encodeURIComponent(target)}`;
    if (purpose === "verify_email" && channel === "email_link") await this.delivery.deliver({ kind: "email_verification_link", to: target, link, expiresAt });
    else if (purpose === "verify_email") await this.delivery.deliver({ kind: "email_verification_otp", to: target, code: secret, expiresAt });
    else if (purpose === "verify_phone") await this.delivery.deliver({ kind: "phone_verification_otp", to: target, code: secret, expiresAt });
    else if (channel === "email_link") await this.delivery.deliver({ kind: "password_recovery_link", to: target, link, expiresAt });
    else await this.delivery.deliver({ kind: "password_recovery_otp", to: target, code: secret, expiresAt });
    await this.store.recordEvent({ projectId, runtimeUserId: user.id, eventType: purpose === "recover_password" ? "runtime.recovery" : "runtime.verification", outcome: "success", ipHash: context.ipHash, metadata: { action: "challenge_sent", channel } });
  }

  private async verifyChallenge(projectId: string, purpose: RuntimeChallenge["purpose"], identifier: string, secret: string, maxAttempts: number) {
    const now = this.now();
    const targetHash = this.hmac(`target:${identifier.trim().toLowerCase()}`);
    const challenge = await this.store.findActiveChallenge({ projectId, purpose, targetHash, now });
    if (!challenge) throw new RuntimeChallengeExpiredError();
    if (challenge.attempts >= maxAttempts) throw new RuntimeChallengeAttemptsExceededError();
    const suppliedHash = this.hmac(`secret:${secret}`);
    if (!timingSafeEqual(Buffer.from(challenge.secretHash, "hex"), Buffer.from(suppliedHash, "hex"))) {
      await this.store.incrementChallengeAttempt(challenge.id);
      throw challenge.attempts + 1 >= maxAttempts ? new RuntimeChallengeAttemptsExceededError() : new RuntimeChallengeInvalidError();
    }
    if (!await this.store.consumeChallenge(challenge.id, now)) throw new RuntimeChallengeInvalidError();
    return challenge;
  }

  private async findUser(projectId: string, identifier: string) {
    if (identifier.includes("@")) return this.store.findUserByEmail(projectId, identifier.trim().toLowerCase());
    return this.store.findUserByPhone(projectId, identifier.trim());
  }
  private phoneOf(user: RuntimeUser) {
    const profile = user.profile as JsonValue;
    if (!profile || Array.isArray(profile) || typeof profile !== "object") return null;
    const phone = profile.phone;
    return typeof phone === "string" ? phone : null;
  }
  private hmac(value: string) { return createHmac("sha256", this.secret).update(value).digest("hex"); }
  private async enforceRequestLimit(projectId: string, action: string, identifier: string, otp: { ttlSeconds: number; maxResends: number }, ipHash: string | undefined) {
    const limit = await this.consumeLimit(projectId, action, identifier, ipHash, otp.maxResends, Math.max(otp.ttlSeconds, 3600));
    if (!limit.allowed) throw new RuntimeRateLimitedError(limit.retryAfterSeconds);
  }
  private consumeLimit(projectId: string, action: string, target: string, ipHash: string | undefined, limit: number, windowSeconds: number) {
    const identity = this.hmac(`${projectId}:${action}:${target.trim().toLowerCase()}:${ipHash ?? ""}`);
    return this.store.consumeRateLimit({ keyHash: identity, projectId, action, limit, windowSeconds, now: this.now() });
  }
}

export { RegistrationValidationError };
