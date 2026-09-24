import { describe, expect, it, vi } from "vitest";

import { runtimeDataResponse, runtimeErrorResponse } from "./_shared";

describe("runtime authentication responses", () => {
  it("marks successful responses private and non-cacheable", () => {
    const response = runtimeDataResponse({ authenticated: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("marks error responses private and non-cacheable", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = runtimeErrorResponse(new Error("secret-token-sentinel"));
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token-sentinel");
    } finally {
      log.mockRestore();
    }
  });
});
