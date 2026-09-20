import { describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";
import type { JsonValue } from "@/modules/projects";

import type { PasswordHasher, RuntimeAuthEventInput, RuntimeAuthStore, RuntimeChallenge, RuntimeProject, RuntimeSession, RuntimeUser } from "./contracts";
import {
  RuntimeAuthService,
  RuntimeInvalidCredentialsError,
  RuntimeRateLimitedError,
  RuntimeVerificationRequiredError,
} from "./service";

const projectA = "11111111-1111-4111-8111-111111111111";
const projectB = "22222222-2222-4222-8222-222222222222";

class MemoryStore implements RuntimeAuthStore {
  projects = new Map<string, RuntimeProject>();
  users: RuntimeUser[] = [];
  sessions: Array<RuntimeSession & { tokenHash: string }> = [];
  events: RuntimeAuthEventInput[] = [];
  limits = new Map<string, { count: number; expiresAt: Date }>();
  challenges: RuntimeChallenge[] = [];

  async getProject(projectId: string) { return this.projects.get(projectId) ?? null; }
  async findUserByEmail(projectId: string, email: string) { return this.users.find((user) => user.projectId === projectId && user.email === email) ?? null; }
  async findUserByPhone(projectId: string, phone: string) { return this.users.find((user) => user.projectId === projectId && (user.profile as Record<string, unknown>).phone === phone) ?? null; }
  async createUser(input: { projectId: string; email: string; passwordHash: string; profile: JsonValue }) {
    if (await this.findUserByEmail(input.projectId, input.email)) return null;
    const user: RuntimeUser = { id: `user-${this.users.length + 1}`, ...input, emailVerified: false, phoneVerified: false };
    this.users.push(user);
    return user;
  }
  async createSession(input: { projectId: string; userId: string; tokenHash: string; expiresAt: Date }) {
    const user = this.users.find((candidate) => candidate.id === input.userId)!;
    const session: RuntimeSession & { tokenHash: string } = {
      id: `session-${this.sessions.length + 1}`,
      projectId: input.projectId,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      user,
    };
    this.sessions.push(session);
    return session;
  }
  async findSession(projectId: string, tokenHash: string, now: Date) {
    return this.sessions.find((session) => session.projectId === projectId && session.tokenHash === tokenHash && !session.revokedAt && session.expiresAt > now) ?? null;
  }
  async revokeSession(projectId: string, tokenHash: string) {
    const session = this.sessions.find((candidate) => candidate.projectId === projectId && candidate.tokenHash === tokenHash && !candidate.revokedAt);
    if (!session) return false;
    session.revokedAt = new Date();
    return true;
  }
  async markLogin() {}
  async createChallenge(input: Omit<RuntimeChallenge, "id" | "attempts" | "resendCount" | "consumedAt">) {
    const challenge: RuntimeChallenge = { id: `challenge-${this.challenges.length + 1}`, ...input, attempts: 0, resendCount: 0, consumedAt: null };
    this.challenges.push(challenge);
    return challenge;
  }
  async invalidateActiveChallenges(input: { projectId: string; runtimeUserId: string; purpose: RuntimeChallenge["purpose"]; now: Date }) { for (const challenge of this.challenges) if (challenge.projectId === input.projectId && challenge.runtimeUserId === input.runtimeUserId && challenge.purpose === input.purpose && !challenge.consumedAt) challenge.consumedAt = input.now; }
  async findActiveChallenge(input: { projectId: string; purpose: RuntimeChallenge["purpose"]; targetHash: string; now: Date }) { return this.challenges.findLast((challenge) => challenge.projectId === input.projectId && challenge.purpose === input.purpose && challenge.targetHash === input.targetHash && !challenge.consumedAt && challenge.expiresAt > input.now) ?? null; }
  async incrementChallengeAttempt(id: string) { const challenge = this.challenges.find((item) => item.id === id); if (challenge) challenge.attempts += 1; }
  async consumeChallenge(id: string, now: Date) { const challenge = this.challenges.find((item) => item.id === id && !item.consumedAt && item.expiresAt > now); if (!challenge) return false; challenge.consumedAt = now; return true; }
  async setVerified(userId: string, channel: "email" | "phone") { const user = this.users.find((item) => item.id === userId); if (user && channel === "email") user.emailVerified = true; if (user && channel === "phone") user.phoneVerified = true; }
  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string, at: Date) { const user = this.users.find((item) => item.id === userId); if (user) user.passwordHash = passwordHash; for (const session of this.sessions) if (session.userId === userId && !session.revokedAt) session.revokedAt = at; }
  async recordEvent(input: RuntimeAuthEventInput) { this.events.push(input); }
  async consumeRateLimit(input: { keyHash: string; limit: number; windowSeconds: number; now: Date }) {
    const existing = this.limits.get(input.keyHash);
    const bucket = !existing || existing.expiresAt <= input.now
      ? { count: 1, expiresAt: new Date(input.now.getTime() + input.windowSeconds * 1000) }
      : { ...existing, count: existing.count + 1 };
    this.limits.set(input.keyHash, bucket);
    return { allowed: bucket.count <= input.limit, retryAfterSeconds: Math.ceil((bucket.expiresAt.getTime() - input.now.getTime()) / 1000) };
  }
}

function setup(configure?: (project: RuntimeProject) => void) {
  const store = new MemoryStore();
  const config = createDefaultAuthFlowConfig({ appName: "Customer Portal", accountType: "Customer" });
  const a = { id: projectA, config };
  configure?.(a);
  store.projects.set(projectA, a);
  store.projects.set(projectB, { id: projectB, config: structuredClone(config) });
  const hasher: PasswordHasher = {
    hash: vi.fn(async (password) => `scrypt:${password}`),
    verify: vi.fn(async ({ hash, password }) => hash === `scrypt:${password}`),
  };
  return { store, hasher, service: new RuntimeAuthService(store, hasher, "test-secret-at-least-32-characters", () => new Date("2026-09-20T18:00:00.000Z")) };
}

function registration(email = "member@example.test", password = "SecurePassword9") {
  return { fields: { full_name: "Test Member", email, password, confirm_password: password } };
}

describe("RuntimeAuthService", () => {
  it("creates project-scoped identities and stores only password/session hashes", async () => {
    const { service, store } = setup();
    const first = await service.signUp(projectA, registration(), { ipHash: "ip-a" });
    const second = await service.signUp(projectB, registration(), { ipHash: "ip-b" });

    expect(store.users).toHaveLength(2);
    expect(store.users.map((user) => user.projectId)).toEqual([projectA, projectB]);
    expect(store.users[0]?.passwordHash).toBe("scrypt:SecurePassword9");
    expect(store.users[0]?.passwordHash).not.toBe("SecurePassword9");
    expect(first.session?.token).toHaveLength(43);
    expect(store.sessions[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(store.sessions[0]?.tokenHash).not.toBe(first.session?.token);
    expect(second.verificationRequired).toBe(false);
  });

  it("enforces the configured password policy before hashing", async () => {
    const { service, hasher } = setup();
    await expect(service.signUp(projectA, registration("member@example.test", "too-short"), {})).rejects.toMatchObject({
      issues: expect.objectContaining({ password: expect.any(String) }),
    });
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it("returns the same generic credential error and performs a dummy verification for missing accounts", async () => {
    const { service, hasher } = setup();
    await service.signUp(projectA, registration(), {});

    await expect(service.signIn(projectA, { email: "member@example.test", password: "wrong-password" }, {})).rejects.toBeInstanceOf(RuntimeInvalidCredentialsError);
    await expect(service.signIn(projectA, { email: "missing@example.test", password: "wrong-password" }, {})).rejects.toBeInstanceOf(RuntimeInvalidCredentialsError);
    expect(hasher.verify).toHaveBeenCalledTimes(2);
  });

  it("does not issue sessions until configured verification is complete", async () => {
    const { service, store } = setup((project) => { project.config.verification.email.enabled = true; });
    const result = await service.signUp(projectA, registration(), {});

    expect(result.verificationRequired).toBe(true);
    expect(result.session).toBeNull();
    await expect(service.signIn(projectA, { email: "member@example.test", password: "SecurePassword9" }, {})).rejects.toBeInstanceOf(RuntimeVerificationRequiredError);
    expect(store.sessions).toHaveLength(0);
  });

  it("isolates session lookup by project and revokes only the matching session", async () => {
    const { service } = setup();
    const result = await service.signUp(projectA, registration(), {});
    const token = result.session!.token;

    expect(await service.getSession(projectB, token)).toBeNull();
    expect(await service.getSession(projectA, token)).not.toBeNull();
    await service.signOut(projectA, token, {});
    expect(await service.getSession(projectA, token)).toBeNull();
  });

  it("blocks repeated attempts with a retry interval and records the event", async () => {
    const { service, store } = setup();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await expect(service.signIn(projectA, { email: "missing@example.test", password: "wrong-password" }, { ipHash: "same-ip" })).rejects.toBeInstanceOf(RuntimeInvalidCredentialsError);
    }
    await expect(service.signIn(projectA, { email: "missing@example.test", password: "wrong-password" }, { ipHash: "same-ip" })).rejects.toBeInstanceOf(RuntimeRateLimitedError);
    expect(store.events.at(-1)).toMatchObject({ outcome: "blocked", metadata: { reason: "rate_limited" } });
  });
});
