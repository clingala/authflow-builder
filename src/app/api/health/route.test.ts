import { describe, expect, it } from "vitest";

import { createHealthPayload } from "./route";

describe("createHealthPayload", () => {
  it("returns a stable service contract", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    expect(createHealthPayload(now)).toEqual({
      status: "ok",
      service: "authflow-builder",
      timestamp: "2026-09-19T12:00:00.000Z",
    });
  });
});

