import { describe, expect, it } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";

import { evaluatePassword, getNativeConstraints, passwordStrength } from "./validation";

describe("renderer validation mapping", () => {
  it("maps trusted validation presets and length rules to native constraints", () => {
    expect(getNativeConstraints({
      id: "postal_code",
      label: "Postal Code",
      type: "text",
      required: true,
      width: "full",
      validation: { minLength: 3, maxLength: 20, patternPreset: "postal_code" },
    })).toEqual({ minLength: 3, maxLength: 20, pattern: "[A-Za-z0-9 -]+" });
  });

  it("evaluates the configured password policy without inventing requirements", () => {
    const policy = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Member" }).passwordPolicy;
    const requirements = evaluatePassword("SecurePassword9", policy);

    expect(requirements.map(({ id }) => id)).toEqual(["length", "lowercase", "number"]);
    expect(requirements.every(({ met }) => met)).toBe(true);
    expect(passwordStrength("SecurePassword9", policy)).toBeGreaterThanOrEqual(3);
  });

  it("reports an empty password with no strength", () => {
    const policy = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Member" }).passwordPolicy;
    expect(passwordStrength("", policy)).toBe(0);
  });
});
