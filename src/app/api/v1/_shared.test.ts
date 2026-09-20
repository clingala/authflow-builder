import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ForbiddenError, requireSameOrigin } from "./_shared";

describe("requireSameOrigin", () => {
  it("accepts a matching request origin", () => {
    const request = new NextRequest("https://authflow.example/api/v1/projects", {
      headers: { origin: "https://authflow.example" },
    });
    expect(() => requireSameOrigin(request)).not.toThrow();
  });

  it("rejects missing and cross-site origins", () => {
    const missing = new NextRequest("https://authflow.example/api/v1/projects");
    const crossSite = new NextRequest("https://authflow.example/api/v1/projects", {
      headers: { origin: "https://attacker.example" },
    });
    expect(() => requireSameOrigin(missing)).toThrow(ForbiddenError);
    expect(() => requireSameOrigin(crossSite)).toThrow(ForbiddenError);
  });
});
