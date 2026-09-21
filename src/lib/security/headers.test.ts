import { describe, expect, it } from "vitest";

import { securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("prevents framing and MIME sniffing", () => {
    expect(securityHeaders).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
    expect(securityHeaders).toContainEqual({ key: "X-Content-Type-Options", value: "nosniff" });
    expect(securityHeaders).toContainEqual({ key: "Cross-Origin-Opener-Policy", value: "same-origin" });
    expect(securityHeaders).toContainEqual({ key: "Cross-Origin-Resource-Policy", value: "same-origin" });
    expect(securityHeaders).toContainEqual({ key: "X-Permitted-Cross-Domain-Policies", value: "none" });
  });

  it("ships a deny-by-default content security policy", () => {
    const csp = securityHeaders.find((header) => header.key === "Content-Security-Policy");
    expect(csp?.value).toContain("default-src 'self'");
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });
});
