import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { errorResponse, ForbiddenError, requireSameOrigin } from "./_shared";

describe("requireSameOrigin", () => {
  it("accepts a matching request origin", () => {
    const request = new NextRequest("https://authflow.example/api/v1/projects", {
      headers: { host: "authflow.example", origin: "https://authflow.example" },
    });
    expect(() => requireSameOrigin(request)).not.toThrow();
  });

  it("uses trusted proxy host and protocol headers when resolving the public origin", () => {
    const request = new NextRequest("http://localhost:3000/api/v1/projects", {
      headers: {
        host: "localhost:3000",
        origin: "https://authflow.example",
        "x-forwarded-host": "authflow.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(() => requireSameOrigin(request)).not.toThrow();
  });

  it("rejects missing and cross-site origins", () => {
    const missing = new NextRequest("https://authflow.example/api/v1/projects");
    const crossSite = new NextRequest("https://authflow.example/api/v1/projects", {
      headers: { host: "authflow.example", origin: "https://attacker.example" },
    });
    expect(() => requireSameOrigin(missing)).toThrow(ForbiddenError);
    expect(() => requireSameOrigin(crossSite)).toThrow(ForbiddenError);
  });
});

describe("errorResponse", () => {
  it("does not log details from unexpected exceptions", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = errorResponse(new Error("secret-token-sentinel"));
      expect(response.status).toBe(500);
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token-sentinel");
    } finally {
      log.mockRestore();
    }
  });
});
