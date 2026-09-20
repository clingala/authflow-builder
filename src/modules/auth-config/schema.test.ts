import { describe, expect, it } from "vitest";

import { createDefaultAuthFlowConfig } from "./defaults";
import { parseAuthFlowConfig } from "./migrate";

function validConfig() {
  return structuredClone(createDefaultAuthFlowConfig({ appName: "Suruchi Delivery", accountType: "Customer" }));
}

describe("AuthFlow configuration schema", () => {
  it("creates secure, terminology-aware defaults", () => {
    const config = validConfig();
    expect(config.app).toEqual({ name: "Suruchi Delivery", accountType: "Customer" });
    expect(config.labels.signupTitle).toBe("Create Customer Account");
    expect(config.passwordPolicy.minLength).toBeGreaterThanOrEqual(12);
    expect(config.recovery.methods).toEqual(["email_link"]);
  });

  it("accepts a custom field with data-only validation", () => {
    const config = validConfig();
    config.registration.fields.splice(2, 0, {
      id: "delivery_zip",
      label: "Delivery ZIP Code",
      type: "text",
      required: true,
      width: "half",
      validation: { minLength: 5, maxLength: 10, patternPreset: "postal_code" },
    });
    expect(parseAuthFlowConfig(config).registration.fields.some((field) => field.id === "delivery_zip")).toBe(true);
  });

  it("rejects duplicate and reserved registration field IDs", () => {
    const duplicate = validConfig();
    duplicate.registration.fields.push({
      id: "email",
      label: "Second Email",
      type: "email",
      required: false,
      width: "full",
    });
    expect(() => parseAuthFlowConfig(duplicate)).toThrow(/unique/);

    const reserved = validConfig();
    reserved.registration.fields.push({ id: "role", label: "Role", type: "text", required: false, width: "full" });
    expect(() => parseAuthFlowConfig(reserved)).toThrow(/reserved/);
  });

  it("requires identifiers and verification channels to be required fields", () => {
    const missingPhone = validConfig();
    missingPhone.login.identifiers = ["phone"];
    missingPhone.verification.phone.enabled = true;
    expect(() => parseAuthFlowConfig(missingPhone)).toThrow(/phone must be a required registration field/);

    const optionalEmail = validConfig();
    const email = optionalEmail.registration.fields.find((field) => field.id === "email")!;
    email.required = false;
    expect(() => parseAuthFlowConfig(optionalEmail)).toThrow(/email must be a required registration field/);
  });

  it("rejects unsafe redirects and arbitrary validation code", () => {
    const unsafeRedirect = validConfig();
    unsafeRedirect.redirects.afterLogin = "https://attacker.example/callback";
    expect(() => parseAuthFlowConfig(unsafeRedirect)).toThrow(/same-origin/);

    const executableValidation = validConfig() as unknown as Record<string, unknown>;
    const registration = executableValidation.registration as { fields: Array<Record<string, unknown>> };
    registration.fields[0]!.validation = { execute: "return true" };
    expect(() => parseAuthFlowConfig(executableValidation)).toThrow();
  });

  it("rejects duplicate option values", () => {
    const config = validConfig();
    config.registration.fields.splice(2, 0, {
      id: "preferred_role",
      label: "Preferred Role",
      type: "dropdown",
      required: true,
      width: "full",
      options: [
        { value: "driver", label: "Driver" },
        { value: "driver", label: "Delivery Driver" },
      ],
    });
    expect(() => parseAuthFlowConfig(config)).toThrow(/unique/);
  });
});

