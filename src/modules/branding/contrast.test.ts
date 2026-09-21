import { describe, expect, it } from "vitest";
import { accessibleFocusColor, accessibleTextColor, auditBranding, contrastRatio } from "./contrast";

describe("branding contrast", () => {
  it("calculates WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
  it("selects the stronger primary-button text color", () => {
    expect(accessibleTextColor("#173D31")).toBe("#FFFFFF");
    expect(accessibleTextColor("#F4D35E")).toBe("#000000");
  });
  it("reports text and non-text WCAG thresholds", () => {
    const checks = auditBranding({ primaryColor: "#EEEEEE", backgroundColor: "#FFFFFF", surfaceColor: "#FFFFFF", textColor: "#DDDDDD" });
    expect(checks.find((check) => check.label === "Primary button")?.passes).toBe(true);
    expect(checks.find((check) => check.label === "Card text")?.passes).toBe(false);
  });
  it("falls back to a visible focus color", () => {
    expect(accessibleFocusColor("#EEEEEE", "#FFFFFF")).toBe("#000000");
    expect(accessibleFocusColor("#173D31", "#FFFFFF")).toBe("#173D31");
  });
});
