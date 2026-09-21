import { describe, expect, it, vi } from "vitest";

import { cleanupExpiredAuthData, type RetentionDatabase } from "./cleanup";

function setup() {
  const model = (count: number) => ({ deleteMany: vi.fn(async () => ({ count })) });
  const database: RetentionDatabase = {
    session: model(1),
    verification: model(2),
    runtimeSession: model(3),
    runtimeChallenge: model(4),
    runtimeRateLimit: model(5),
    runtimeOAuthTransaction: model(6),
    runtimeAuthEvent: model(7),
  };
  return database;
}

describe("cleanupExpiredAuthData", () => {
  it("uses bounded retention windows and reports deleted rows", async () => {
    const database = setup();
    const now = new Date("2026-09-21T16:00:00.000Z");
    await expect(cleanupExpiredAuthData(database, now)).resolves.toEqual({
      ownerSessions: 1,
      ownerVerifications: 2,
      runtimeSessions: 3,
      runtimeChallenges: 4,
      runtimeRateLimits: 5,
      runtimeOAuthTransactions: 6,
      runtimeAuthEvents: 7,
    });
    expect(database.runtimeRateLimit.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(database.runtimeAuthEvent.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2025-09-21T16:00:00.000Z") } },
    });
  });
});
