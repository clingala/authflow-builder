import { describe, expect, it, vi } from "vitest";

import { countDeliveryEvents, deliveryHealth, readDeliveryMonitorSettings } from "./delivery-health";

describe("delivery monitor", () => {
  it("alerts at the configured failure count and never returns tenant data", () => {
    expect(deliveryHealth({ attempts: 9, failures: 4 }, 5)).toEqual({ status: "ok", attempts: 9, failures: 4, threshold: 5 });
    expect(deliveryHealth({ attempts: 9, failures: 5 }, 5)).toEqual({ status: "alert", attempts: 9, failures: 5, threshold: 5 });
  });

  it("counts only the aggregate query response", async () => {
    const query = vi.fn().mockResolvedValue([{ attempts: 7n, failures: 2n }]);
    const since = new Date("2026-09-23T18:00:00.000Z");
    const counts = await countDeliveryEvents({ $queryRaw: query } as never, since);
    expect(counts).toEqual({ attempts: 7, failures: 2 });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[1]).toBe(since);
    expect(query.mock.calls[0]?.[0].join(" ")).toContain("metadata->>'action' IN ('challenge_sent', 'challenge_delivery_failed')");
  });

  it("uses bounded settings and rejects malformed thresholds", () => {
    expect(readDeliveryMonitorSettings({})).toEqual({ windowMinutes: 15, threshold: 5 });
    expect(readDeliveryMonitorSettings({ DELIVERY_FAILURE_WINDOW_MINUTES: "30", DELIVERY_FAILURE_ALERT_COUNT: "8" })).toEqual({ windowMinutes: 30, threshold: 8 });
    expect(() => readDeliveryMonitorSettings({ DELIVERY_FAILURE_ALERT_COUNT: "0" })).toThrow("Invalid delivery monitor setting");
    expect(() => readDeliveryMonitorSettings({ DELIVERY_FAILURE_WINDOW_MINUTES: "NaN" })).toThrow("Invalid delivery monitor setting");
  });
});
