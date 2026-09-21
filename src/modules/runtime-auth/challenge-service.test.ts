import { describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";
import { RuntimeChallengeExpiredError, RuntimeChallengeInvalidError, RuntimeChallengeService } from "./challenge-service";
import type { DeliveryMessage, RuntimeDeliveryAdapter } from "./delivery";
import type { PasswordHasher, RuntimeAuthEventInput, RuntimeAuthStore, RuntimeChallenge, RuntimeProject, RuntimeSession, RuntimeUser } from "./contracts";

const projectId = "11111111-1111-4111-8111-111111111111";

class ChallengeStore implements RuntimeAuthStore {
  project: RuntimeProject;
  user: RuntimeUser = { id: "user-1", projectId, email: "member@example.test", passwordHash: "old-hash", emailVerified: false, phoneVerified: false, profile: { phone: "+15555550123" } };
  challenges: RuntimeChallenge[] = [];
  sessions: RuntimeSession[] = [];
  events: RuntimeAuthEventInput[] = [];
  rateLimitActions: string[] = [];
  constructor() {
    const config = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Member" });
    config.verification.email = { enabled: true, method: "otp" };
    this.project = { id: projectId, config };
  }
  async getProject(id: string) { return id === projectId ? this.project : null; }
  async findUserByEmail(id: string, email: string) { return id === projectId && email === this.user.email ? this.user : null; }
  async findUserByPhone(id: string, phone: string) { return id === projectId && phone === "+15555550123" ? this.user : null; }
  async createUser(): Promise<RuntimeUser | null> { return null; }
  async createSession(): Promise<RuntimeSession> { throw new Error("not used"); }
  async findSession() { return null; }
  async revokeSession() { return false; }
  async markLogin() {}
  async createChallenge(input: Omit<RuntimeChallenge, "id" | "attempts" | "resendCount" | "consumedAt">) { const value = { id: `c-${this.challenges.length}`, ...input, attempts: 0, resendCount: 0, consumedAt: null }; this.challenges.push(value); return value; }
  async invalidateActiveChallenges(input: { projectId: string; runtimeUserId: string; purpose: RuntimeChallenge["purpose"]; now: Date }) { for (const value of this.challenges) if (value.projectId === input.projectId && value.runtimeUserId === input.runtimeUserId && value.purpose === input.purpose && !value.consumedAt) value.consumedAt = input.now; }
  async findActiveChallenge(input: { projectId: string; purpose: RuntimeChallenge["purpose"]; targetHash: string; now: Date }) { return this.challenges.findLast((value) => value.projectId === input.projectId && value.purpose === input.purpose && value.targetHash === input.targetHash && !value.consumedAt && value.expiresAt > input.now) ?? null; }
  async incrementChallengeAttempt(id: string) { this.challenges.find((value) => value.id === id)!.attempts += 1; }
  async consumeChallenge(id: string, now: Date) { const value = this.challenges.find((item) => item.id === id && !item.consumedAt && item.expiresAt > now); if (!value) return false; value.consumedAt = now; return true; }
  async setVerified(_id: string, channel: "email" | "phone") { if (channel === "email") this.user.emailVerified = true; else this.user.phoneVerified = true; }
  async updatePasswordAndRevokeSessions(_id: string, hash: string, at: Date) { this.user.passwordHash = hash; for (const session of this.sessions) session.revokedAt = at; }
  async recordEvent(input: RuntimeAuthEventInput) { this.events.push(input); }
  async consumeRateLimit(input: { action: string }) { this.rateLimitActions.push(input.action); return { allowed: true, retryAfterSeconds: 0 }; }
}

function setup() {
  const store = new ChallengeStore();
  const messages: DeliveryMessage[] = [];
  const delivery: RuntimeDeliveryAdapter = { available: true, deliver: vi.fn(async (message) => { messages.push(message); }) };
  const hasher: PasswordHasher = { hash: vi.fn(async (password) => `scrypt:${password}`), verify: vi.fn() };
  let now = new Date("2026-09-20T18:00:00.000Z");
  const service = new RuntimeChallengeService(store, hasher, delivery, "test-secret-at-least-32-characters", "https://auth.example.test", () => now);
  return { store, messages, hasher, service, advance: (milliseconds: number) => { now = new Date(now.getTime() + milliseconds); } };
}

describe("RuntimeChallengeService", () => {
  it("stores only a hash, limits invalid attempts, and consumes verification codes once", async () => {
    const { service, store, messages } = setup();
    await service.requestVerification(projectId, { identifier: store.user.email, channel: "email" }, {});
    const message = messages[0]!;
    expect(message.kind).toBe("email_verification_otp");
    const code = "code" in message ? message.code : "";
    expect(store.challenges[0]?.secretHash).not.toContain(code);
    await expect(service.confirmVerification(projectId, { identifier: store.user.email, channel: "email", secret: "000000" }, {})).rejects.toBeInstanceOf(RuntimeChallengeInvalidError);
    await service.confirmVerification(projectId, { identifier: store.user.email, channel: "email", secret: code }, {});
    expect(store.user.emailVerified).toBe(true);
    await expect(service.confirmVerification(projectId, { identifier: store.user.email, channel: "email", secret: code }, {})).rejects.toBeInstanceOf(RuntimeChallengeExpiredError);
  });

  it("returns the same accepted recovery response for unknown accounts without delivery", async () => {
    const { service, store, messages } = setup();
    await expect(service.requestRecovery(projectId, { identifier: "missing@example.test", method: "email_link" }, {})).resolves.toEqual({ accepted: true });
    expect(messages).toHaveLength(0);
    expect(store.rateLimitActions).toEqual(["recover_password"]);
  });

  it("applies the same pre-lookup limit to existing and unknown recovery identifiers", async () => {
    const { service, store } = setup();
    await service.requestRecovery(projectId, { identifier: "missing@example.test", method: "email_link" }, { ipHash: "ip" });
    await service.requestRecovery(projectId, { identifier: store.user.email, method: "email_link" }, { ipHash: "ip" });
    expect(store.rateLimitActions).toEqual(["recover_password", "recover_password"]);
  });

  it("uses a single-use reset token, hashes the new password, and revokes sessions", async () => {
    const { service, store, messages, hasher } = setup();
    store.sessions.push({ id: "s-1", projectId, userId: store.user.id, expiresAt: new Date("2027-01-01"), revokedAt: null, user: store.user });
    await service.requestRecovery(projectId, { identifier: store.user.email, method: "email_link" }, {});
    const message = messages[0]!;
    const token = new URL("link" in message ? message.link : "https://invalid").searchParams.get("recovery")!;
    await service.resetPassword(projectId, { identifier: store.user.email, method: "email_link", secret: token, password: "NewSecurePassword9", confirmPassword: "NewSecurePassword9" }, {});
    expect(hasher.hash).toHaveBeenCalledWith("NewSecurePassword9");
    expect(store.user.passwordHash).toBe("scrypt:NewSecurePassword9");
    expect(store.sessions[0]?.revokedAt).not.toBeNull();
    await expect(service.resetPassword(projectId, { identifier: store.user.email, method: "email_link", secret: token, password: "NewSecurePassword9", confirmPassword: "NewSecurePassword9" }, {})).rejects.toBeInstanceOf(RuntimeChallengeExpiredError);
  });

  it("rejects expired codes", async () => {
    const { service, store, messages, advance } = setup();
    await service.requestVerification(projectId, { identifier: store.user.email, channel: "email" }, {});
    const message = messages[0]!;
    advance(store.project.config.verification.otp.ttlSeconds * 1000 + 1);
    await expect(service.confirmVerification(projectId, { identifier: store.user.email, channel: "email", secret: "code" in message ? message.code : "" }, {})).rejects.toBeInstanceOf(RuntimeChallengeExpiredError);
  });

  it("invalidates the previous code when a replacement is issued", async () => {
    const { service, store, messages, advance } = setup();
    await service.requestVerification(projectId, { identifier: store.user.email, channel: "email" }, {});
    const first = messages[0]!;
    advance(store.project.config.verification.otp.resendCooldownSeconds * 1000 + 1);
    await service.requestVerification(projectId, { identifier: store.user.email, channel: "email" }, {});
    await expect(service.confirmVerification(projectId, { identifier: store.user.email, channel: "email", secret: "code" in first ? first.code : "" }, {})).rejects.toBeInstanceOf(RuntimeChallengeInvalidError);
  });
});
