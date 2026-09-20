import { describe, expect, it, vi } from "vitest";
import type { PasswordHasher, RuntimeSession, RuntimeUser } from "./contracts";
import { RuntimeOAuthService, RuntimeOAuthStateError, RuntimeOAuthUnavailableError, type GoogleOAuthAdapter, type RuntimeOAuthStore } from "./oauth";

const projectId = "11111111-1111-4111-8111-111111111111";

function setup(enabled = true) {
  const transactions: Array<{ projectId: string; stateHash: string; verifierCipher: string; expiresAt: Date; consumed: boolean }> = [];
  const sessions: Array<{ tokenHash: string }> = [];
  const user: RuntimeUser = { id: "user-1", projectId, email: "member@example.test", passwordHash: "hash", emailVerified: true, phoneVerified: false, profile: {} };
  const store: RuntimeOAuthStore = {
    getGoogleProject: vi.fn(async (id) => id === projectId ? { id, enabled } : null),
    createTransaction: vi.fn(async (input) => { transactions.push({ ...input, consumed: false }); }),
    consumeTransaction: vi.fn(async (stateHash, now) => { const item = transactions.find((value) => value.stateHash === stateHash && !value.consumed && value.expiresAt > now); if (!item) return null; item.consumed = true; return { id: "tx-1", projectId: item.projectId, verifierCipher: item.verifierCipher }; }),
    completeGoogleLogin: vi.fn(async () => user),
    createSession: vi.fn(async (input) => { sessions.push({ tokenHash: input.tokenHash }); return { id: "session-1", ...input, revokedAt: null, user } as RuntimeSession; }),
    recordSuccess: vi.fn(async () => undefined),
  };
  const provider: GoogleOAuthAdapter = {
    authorizationUrl: vi.fn(({ state, codeChallenge, redirectUri }) => `https://accounts.example/auth?state=${state}&challenge=${codeChallenge}&redirect=${encodeURIComponent(redirectUri)}`),
    exchange: vi.fn(async () => ({ subject: "google-subject", email: "member@example.test", name: "Member" })),
  };
  const hasher: PasswordHasher = { hash: vi.fn(async () => "random-password-hash"), verify: vi.fn() };
  return { service: new RuntimeOAuthService(store, provider, hasher, "test-secret-at-least-32-characters", "https://auth.example.test", () => new Date("2026-09-20T18:00:00Z")), store, provider, transactions, sessions };
}

describe("RuntimeOAuthService", () => {
  it("creates hashed state, encrypted PKCE storage, and an S256 authorization request", async () => {
    const { service, transactions } = setup();
    const url = new URL(await service.start(projectId));
    expect(url.searchParams.get("state")).toHaveLength(43);
    expect(url.searchParams.get("challenge")).toHaveLength(43);
    expect(transactions[0]?.stateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(transactions[0]?.stateHash).not.toBe(url.searchParams.get("state"));
    expect(transactions[0]?.verifierCipher.split(".")).toHaveLength(3);
  });

  it("consumes state once, exchanges with PKCE, and stores only a session hash", async () => {
    const { service, provider, sessions } = setup();
    const url = new URL(await service.start(projectId));
    const state = url.searchParams.get("state")!;
    const result = await service.callback(projectId, { state, code: "authorization-code" }, {});
    expect(provider.exchange).toHaveBeenCalledWith(expect.objectContaining({ code: "authorization-code", codeVerifier: expect.any(String) }));
    expect(result.token).toHaveLength(43);
    expect(sessions[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions[0]?.tokenHash).not.toBe(result.token);
    await expect(service.callback(projectId, { state, code: "replay" }, {})).rejects.toBeInstanceOf(RuntimeOAuthStateError);
  });

  it("refuses disabled provider configurations", async () => {
    const { service } = setup(false);
    await expect(service.start(projectId)).rejects.toBeInstanceOf(RuntimeOAuthUnavailableError);
  });
});
