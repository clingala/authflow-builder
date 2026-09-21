import { describe, expect, it } from "vitest";

import { createSecurityHeaders, securityHeaders } from "./headers";

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
    expect(csp?.value).not.toContain("'unsafe-eval'");
    expect(csp?.value).toContain("upgrade-insecure-requests");
  });

  it("allows React debugging eval only in local development", () => {
    const development = createSecurityHeaders("development").find((header) => header.key === "Content-Security-Policy");
    expect(development?.value).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(development?.value).not.toContain("upgrade-insecure-requests");
  });
});
