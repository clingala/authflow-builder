import { describe, expect, it, vi } from "vitest";

import { createReadinessResponse } from "./route";

const now = new Date("2026-09-21T16:00:00.000Z");

describe("readiness response", () => {
  it("reports ready only after the database probe succeeds", async () => {
    const response = await createReadinessResponse(vi.fn(async () => [{ ok: 1 }]), now);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ready", service: "authflow-builder", timestamp: now.toISOString() });
  });

  it("fails closed without exposing database errors", async () => {
    const response = await createReadinessResponse(vi.fn(async () => { throw new Error("connection details"); }), now);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "not_ready", service: "authflow-builder", timestamp: now.toISOString() });
  });
});
