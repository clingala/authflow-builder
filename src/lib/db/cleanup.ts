type DeleteResult = { count: number };
type DeleteModel = { deleteMany(input: { where: Record<string, unknown> }): Promise<DeleteResult> };

export type RetentionDatabase = {
  session: DeleteModel;
  verification: DeleteModel;
  runtimeSession: DeleteModel;
  runtimeChallenge: DeleteModel;
  runtimeRateLimit: DeleteModel;
  runtimeOAuthTransaction: DeleteModel;
  runtimeAuthEvent: DeleteModel;
};

export type CleanupResult = {
  ownerSessions: number;
  ownerVerifications: number;
  runtimeSessions: number;
  runtimeChallenges: number;
  runtimeRateLimits: number;
  runtimeOAuthTransactions: number;
  runtimeAuthEvents: number;
};

const day = 24 * 60 * 60 * 1000;

export async function cleanupExpiredAuthData(database: RetentionDatabase, now = new Date()): Promise<CleanupResult> {
  const oneDayAgo = new Date(now.getTime() - day);
  const sevenDaysAgo = new Date(now.getTime() - 7 * day);
  const oneYearAgo = new Date(now.getTime() - 365 * day);

  const ownerSessions = await database.session.deleteMany({ where: { expiresAt: { lt: oneDayAgo } } });
  const ownerVerifications = await database.verification.deleteMany({ where: { expiresAt: { lt: oneDayAgo } } });
  const runtimeSessions = await database.runtimeSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: sevenDaysAgo } }, { revokedAt: { lt: sevenDaysAgo } }] },
  });
  const runtimeChallenges = await database.runtimeChallenge.deleteMany({
    where: { OR: [{ expiresAt: { lt: oneDayAgo } }, { consumedAt: { lt: oneDayAgo } }] },
  });
  const runtimeRateLimits = await database.runtimeRateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  const runtimeOAuthTransactions = await database.runtimeOAuthTransaction.deleteMany({
    where: { OR: [{ expiresAt: { lt: oneDayAgo } }, { consumedAt: { lt: oneDayAgo } }] },
  });
  const runtimeAuthEvents = await database.runtimeAuthEvent.deleteMany({ where: { createdAt: { lt: oneYearAgo } } });

  return {
    ownerSessions: ownerSessions.count,
    ownerVerifications: ownerVerifications.count,
    runtimeSessions: runtimeSessions.count,
    runtimeChallenges: runtimeChallenges.count,
    runtimeRateLimits: runtimeRateLimits.count,
    runtimeOAuthTransactions: runtimeOAuthTransactions.count,
    runtimeAuthEvents: runtimeAuthEvents.count,
  };
}
