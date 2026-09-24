import type { PrismaClient } from "@/generated/prisma/client";

export type DeliveryCounts = { attempts: number; failures: number };

export function deliveryHealth(counts: DeliveryCounts, threshold: number) {
  return {
    status: counts.failures >= threshold ? "alert" as const : "ok" as const,
    attempts: counts.attempts,
    failures: counts.failures,
    threshold,
  };
}

export async function countDeliveryEvents(
  prisma: Pick<PrismaClient, "$queryRaw">,
  since: Date,
): Promise<DeliveryCounts> {
  const rows = await prisma.$queryRaw<Array<{ attempts: bigint; failures: bigint }>>`
    SELECT
      COUNT(*) AS attempts,
      COUNT(*) FILTER (WHERE outcome = 'failure') AS failures
    FROM runtime_auth_events
    WHERE "createdAt" >= ${since}
      AND "eventType" IN ('runtime.verification', 'runtime.recovery')
      AND metadata->>'action' IN ('challenge_sent', 'challenge_delivery_failed')
  `;

  return {
    attempts: Number(rows[0]?.attempts ?? 0n),
    failures: Number(rows[0]?.failures ?? 0n),
  };
}

export function readDeliveryMonitorSettings(env: Record<string, string | undefined>) {
  return {
    windowMinutes: boundedInteger(env.DELIVERY_FAILURE_WINDOW_MINUTES, 15, 1, 1440),
    threshold: boundedInteger(env.DELIVERY_FAILURE_ALERT_COUNT, 5, 1, 100000),
  };
}

function boundedInteger(value: string | undefined, defaultValue: number, min: number, max: number) {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error("Invalid delivery monitor setting");
  }
  return parsed;
}
