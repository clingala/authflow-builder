import { z } from "zod";
import { contrastRatio } from "@/modules/branding";

const fieldIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores");

const commonFieldShape = {
  id: fieldIdSchema,
  label: z.string().trim().min(1).max(80),
  required: z.boolean(),
  placeholder: z.string().max(120).optional(),
  helpText: z.string().max(240).optional(),
  width: z.enum(["full", "half"]).default("full"),
} as const;

const lengthValidationSchema = z
  .object({
    minLength: z.number().int().min(0).max(1000).optional(),
    maxLength: z.number().int().min(1).max(4000).optional(),
    patternPreset: z.enum(["person_name", "username", "email", "phone", "url", "postal_code"]).optional(),
  })
  .strict()
  .superRefine((validation, context) => {
    if (
      validation.minLength !== undefined &&
      validation.maxLength !== undefined &&
      validation.minLength > validation.maxLength
    ) {
      context.addIssue({ code: "custom", message: "minLength cannot exceed maxLength", path: ["minLength"] });
    }
  });

const numberValidationSchema = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict()
  .superRefine((validation, context) => {
    if (validation.min !== undefined && validation.max !== undefined && validation.min > validation.max) {
      context.addIssue({ code: "custom", message: "min cannot exceed max", path: ["min"] });
    }
  });

const dateValueSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format");

const choiceSchema = z
  .object({
    value: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
  })
  .strict();

function textField<const T extends "text" | "email" | "phone" | "password" | "textarea">(type: T) {
  return z
    .object({
      ...commonFieldShape,
      type: z.literal(type),
      validation: lengthValidationSchema.optional(),
      autocomplete: z
        .enum([
          "name",
          "given-name",
          "additional-name",
          "family-name",
          "username",
          "email",
          "tel",
          "current-password",
          "new-password",
          "street-address",
          "address-line1",
          "address-line2",
          "address-level1",
          "address-level2",
          "country-name",
          "postal-code",
          "organization",
          "organization-title",
          "off",
        ])
        .optional(),
    })
    .strict();
}

const numberFieldSchema = z
  .object({
    ...commonFieldShape,
    type: z.literal("number"),
    validation: numberValidationSchema.optional(),
  })
  .strict();

const dateFieldSchema = z
  .object({
    ...commonFieldShape,
    type: z.literal("date"),
    validation: z
      .object({ minDate: dateValueSchema.optional(), maxDate: dateValueSchema.optional() })
      .strict()
      .optional(),
  })
  .strict();

function choiceField<const T extends "dropdown" | "radio">(type: T) {
  return z
    .object({
      ...commonFieldShape,
      type: z.literal(type),
      options: z.array(choiceSchema).min(1).max(100),
    })
    .strict()
    .superRefine((field, context) => {
      const values = new Set<string>();
      field.options.forEach((option, index) => {
        if (values.has(option.value)) {
          context.addIssue({ code: "custom", message: "Option values must be unique", path: ["options", index, "value"] });
        }
        values.add(option.value);
      });
    });
}

function booleanField<const T extends "checkbox" | "boolean">(type: T) {
  return z.object({ ...commonFieldShape, type: z.literal(type), defaultValue: z.boolean().optional() }).strict();
}

const consentFieldSchema = z
  .object({
    ...commonFieldShape,
    type: z.literal("consent"),
    policyUrl: z.string().max(500).optional(),
    consentKind: z.enum(["terms", "privacy", "marketing", "custom"]),
  })
  .strict();

export const registrationFieldSchema = z.discriminatedUnion("type", [
  textField("text"),
  textField("email"),
  textField("phone"),
  textField("password"),
  textField("textarea"),
  numberFieldSchema,
  dateFieldSchema,
  choiceField("dropdown"),
  choiceField("radio"),
  booleanField("checkbox"),
  booleanField("boolean"),
  consentFieldSchema,
]);

const relativeRedirectSchema = z
  .string()
  .max(500)
  .regex(/^\/(?!\/)/, "Redirects must be same-origin relative paths");

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hexadecimal color");

const optionalAssetUrlSchema = z.string().max(500).refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001F]/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use a relative URL or an HTTPS URL");

const passwordPolicySchema = z
  .object({
    minLength: z.number().int().min(12).max(128).default(12),
    maxLength: z.number().int().min(12).max(256).default(128),
    requireUppercase: z.boolean().default(false),
    requireLowercase: z.boolean().default(true),
    requireNumber: z.boolean().default(true),
    requireSpecial: z.boolean().default(false),
    requireConfirmation: z.boolean().default(true),
    showStrength: z.boolean().default(true),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.minLength > policy.maxLength) {
      context.addIssue({ code: "custom", message: "minLength cannot exceed maxLength", path: ["minLength"] });
    }
  });

export const authFlowConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    app: z
      .object({
        name: z.string().trim().min(1).max(100),
        accountType: z.string().trim().min(1).max(50),
      })
      .strict(),
    labels: z
      .object({
        loginTitle: z.string().trim().min(1).max(80),
        loginAction: z.string().trim().min(1).max(40),
        signupTitle: z.string().trim().min(1).max(80),
        signupAction: z.string().trim().min(1).max(40),
        recoveryLink: z.string().trim().min(1).max(80),
        recoveryTitle: z.string().trim().min(1).max(80),
        existingAccount: z.string().trim().min(1).max(120),
        newAccount: z.string().trim().min(1).max(120),
      })
      .strict(),
    login: z
      .object({
        identifiers: z.array(z.enum(["email", "phone", "username"])).min(1).max(3),
        passwordEnabled: z.boolean(),
        socialProviders: z
          .object({
            google: z.boolean(),
            linkedin: z.boolean(),
            facebook: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    registration: z
      .object({
        description: z.string().max(240),
        fields: z.array(registrationFieldSchema).min(1).max(50),
        socialSignup: z.boolean(),
      })
      .strict(),
    verification: z
      .object({
        email: z.object({ enabled: z.boolean(), method: z.enum(["link", "otp"]) }).strict(),
        phone: z.object({ enabled: z.boolean(), method: z.literal("sms_otp") }).strict(),
        otp: z
          .object({
            ttlSeconds: z.number().int().min(60).max(1800),
            resendCooldownSeconds: z.number().int().min(15).max(600),
            maxAttempts: z.number().int().min(3).max(10),
            maxResends: z.number().int().min(1).max(10),
          })
          .strict(),
      })
      .strict(),
    passwordPolicy: passwordPolicySchema,
    recovery: z
      .object({
        enabled: z.boolean(),
        methods: z.array(z.enum(["email_link", "email_otp", "phone_otp"])).max(3),
      })
      .strict(),
    branding: z
      .object({
        logoUrl: optionalAssetUrlSchema.optional(),
        primaryColor: colorSchema,
        backgroundColor: colorSchema,
        surfaceColor: colorSchema,
        textColor: colorSchema,
        borderRadius: z.number().int().min(0).max(32),
        spacing: z.enum(["compact", "comfortable", "spacious"]),
        fontFamily: z.enum(["system", "serif", "mono"]),
        fieldArrangement: z.enum(["single_column", "responsive_two_column"]),
      })
      .strict(),
    redirects: z
      .object({
        afterLogin: relativeRedirectSchema,
        afterSignup: relativeRedirectSchema,
        afterLogout: relativeRedirectSchema,
      })
      .strict(),
    messages: z
      .object({
        invalidCredentials: z.string().min(1).max(160),
        verificationRequired: z.string().min(1).max(160),
        accountCreated: z.string().min(1).max(160),
        recoverySent: z.string().min(1).max(160),
        networkError: z.string().min(1).max(160),
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    const reservedIds = new Set(["id", "owner_id", "password_hash", "created_at", "updated_at", "role"]);
    const fieldsById = new Map<string, (typeof config.registration.fields)[number]>();

    config.registration.fields.forEach((field, index) => {
      if (fieldsById.has(field.id)) {
        context.addIssue({ code: "custom", message: "Registration field IDs must be unique", path: ["registration", "fields", index, "id"] });
      }
      if (reservedIds.has(field.id)) {
        context.addIssue({ code: "custom", message: "This field ID is reserved", path: ["registration", "fields", index, "id"] });
      }
      fieldsById.set(field.id, field);
    });

    const requiredField = (id: string, path: PropertyKey[]) => {
      const field = fieldsById.get(id);
      if (!field || !field.required) {
        context.addIssue({ code: "custom", message: `${id} must be a required registration field`, path });
      }
    };

    config.login.identifiers.forEach((identifier, index) => requiredField(identifier, ["login", "identifiers", index]));
    if (new Set(config.login.identifiers).size !== config.login.identifiers.length) {
      context.addIssue({ code: "custom", message: "Login identifiers must be unique", path: ["login", "identifiers"] });
    }

    if (config.login.passwordEnabled) {
      requiredField("password", ["registration", "fields"]);
      if (config.passwordPolicy.requireConfirmation) requiredField("confirm_password", ["registration", "fields"]);
    }
    if (config.verification.email.enabled) requiredField("email", ["verification", "email"]);
    if (config.verification.phone.enabled) requiredField("phone", ["verification", "phone"]);

    if (contrastRatio(config.branding.textColor, config.branding.surfaceColor) < 4.5) {
      context.addIssue({ code: "custom", message: "Text and surface colors must meet WCAG AA contrast (4.5:1)", path: ["branding", "textColor"] });
    }
    if (contrastRatio(config.branding.textColor, config.branding.backgroundColor) < 4.5) {
      context.addIssue({ code: "custom", message: "Text and background colors must meet WCAG AA contrast (4.5:1)", path: ["branding", "backgroundColor"] });
    }

    if (new Set(config.recovery.methods).size !== config.recovery.methods.length) {
      context.addIssue({ code: "custom", message: "Recovery methods must be unique", path: ["recovery", "methods"] });
    }
    if (config.recovery.enabled && config.recovery.methods.length === 0) {
      context.addIssue({ code: "custom", message: "At least one recovery method is required", path: ["recovery", "methods"] });
    }
    if (config.recovery.methods.some((method) => method.startsWith("email"))) {
      requiredField("email", ["recovery", "methods"]);
    }
    if (config.recovery.methods.includes("phone_otp")) requiredField("phone", ["recovery", "methods"]);

    const socialEnabled = Object.values(config.login.socialProviders).some(Boolean);
    if (config.registration.socialSignup && !socialEnabled) {
      context.addIssue({ code: "custom", message: "Enable at least one social provider", path: ["registration", "socialSignup"] });
    }
  });

export type AuthFlowConfig = z.infer<typeof authFlowConfigSchema>;
export type RegistrationField = z.infer<typeof registrationFieldSchema>;
