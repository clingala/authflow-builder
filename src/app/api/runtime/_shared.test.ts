import { describe, expect, it, vi } from "vitest";

import { runtimeDataResponse, runtimeErrorResponse } from "./_shared";

describe("runtime authentication responses", () => {
  it("marks successful responses private and non-cacheable", () => {
    const response = runtimeDataResponse({ authenticated: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("marks error responses private and non-cacheable", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = runtimeErrorResponse(new Error("test failure"));
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
