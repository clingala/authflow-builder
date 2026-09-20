import { createDefaultAuthFlowConfig } from "./defaults";
import { parseAuthFlowConfig } from "./migrate";
import type { AuthFlowConfig, RegistrationField } from "./schema";

export const authFlowTemplateIds = [
  "customer_portal",
  "job_applicant_portal",
  "student_portal",
  "employee_portal",
  "ecommerce_account",
  "saas_application",
  "healthcare_portal",
  "marketplace_seller",
  "delivery_application",
  "custom",
] as const;

export type AuthFlowTemplateId = (typeof authFlowTemplateIds)[number];

export type AuthFlowTemplate = {
  id: AuthFlowTemplateId;
  name: string;
  description: string;
  create: (appName: string) => AuthFlowConfig;
};

const text = (
  id: string,
  label: string,
  options: Partial<RegistrationField> = {},
): RegistrationField =>
  ({ id, label, type: "text", required: true, width: "full", ...options }) as RegistrationField;

const phone = (): RegistrationField => ({
  id: "phone",
  label: "Phone Number",
  type: "phone",
  required: true,
  width: "full",
  autocomplete: "tel",
  validation: { patternPreset: "phone", maxLength: 30 },
});

function addBeforePassword(config: AuthFlowConfig, fields: RegistrationField[]) {
  const passwordIndex = config.registration.fields.findIndex((field) => field.id === "password");
  config.registration.fields.splice(passwordIndex, 0, ...fields);
}

function configured(
  appName: string,
  accountType: string,
  configure: (config: AuthFlowConfig) => void,
): AuthFlowConfig {
  const config = structuredClone(createDefaultAuthFlowConfig({ appName, accountType }));
  configure(config);
  return parseAuthFlowConfig(config);
}

export const authFlowTemplates: readonly AuthFlowTemplate[] = [
  {
    id: "customer_portal",
    name: "Customer Portal",
    description: "Email-based customer access with Google sign-in and email verification.",
    create: (appName) =>
      configured(appName, "Customer", (config) => {
        config.login.socialProviders.google = true;
        config.registration.socialSignup = true;
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "job_applicant_portal",
    name: "Job Applicant Portal",
    description: "Applicant profile details, preferred role, and professional social sign-in.",
    create: (appName) =>
      configured(appName, "Applicant", (config) => {
        addBeforePassword(config, [
          phone(),
          text("university", "University", { required: false }),
          { id: "graduation_year", label: "Graduation Year", type: "number", required: false, width: "half", validation: { min: 1950, max: 2100 } },
          text("resume_url", "Resume URL", { validation: { patternPreset: "url", maxLength: 500 } }),
          { id: "preferred_role", label: "Preferred Role", type: "dropdown", required: true, width: "full", options: [
            { value: "engineering", label: "Engineering" },
            { value: "design", label: "Design" },
            { value: "operations", label: "Operations" },
          ] },
        ]);
        config.login.socialProviders.google = true;
        config.login.socialProviders.linkedin = true;
        config.registration.socialSignup = true;
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "student_portal",
    name: "Student Portal",
    description: "Student identity and academic profile starting point.",
    create: (appName) =>
      configured(appName, "Student", (config) => {
        addBeforePassword(config, [
          text("student_id", "Student ID"),
          { id: "date_of_birth", label: "Date of Birth", type: "date", required: true, width: "half" },
        ]);
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "employee_portal",
    name: "Employee Portal",
    description: "Employee identity with organization and role details.",
    create: (appName) =>
      configured(appName, "Employee", (config) => {
        addBeforePassword(config, [
          text("employee_id", "Employee ID"),
          text("organization", "Organization", { autocomplete: "organization" }),
          text("job_title", "Job Title", { autocomplete: "organization-title" }),
        ]);
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "ecommerce_account",
    name: "E-commerce Account",
    description: "Customer account with contact and delivery location basics.",
    create: (appName) =>
      configured(appName, "Customer", (config) => {
        addBeforePassword(config, [phone(), text("postal_code", "Postal Code", { autocomplete: "postal-code", validation: { patternPreset: "postal_code", maxLength: 20 } })]);
        config.login.socialProviders.google = true;
        config.registration.socialSignup = true;
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "saas_application",
    name: "SaaS Application",
    description: "Member onboarding with company context and terms consent.",
    create: (appName) =>
      configured(appName, "Member", (config) => {
        addBeforePassword(config, [
          text("company", "Company", { required: false, autocomplete: "organization" }),
          text("job_title", "Job Title", { required: false, autocomplete: "organization-title" }),
        ]);
        config.registration.fields.push({ id: "terms", label: "I agree to the Terms of Service", type: "consent", required: true, width: "full", consentKind: "terms", policyUrl: "/terms" });
        config.login.socialProviders.google = true;
        config.registration.socialSignup = true;
        config.verification.email.enabled = true;
      }),
  },
  {
    id: "healthcare_portal",
    name: "Healthcare Portal",
    description: "Patient registration with required contact verification and privacy consent.",
    create: (appName) =>
      configured(appName, "Patient", (config) => {
        addBeforePassword(config, [phone(), { id: "date_of_birth", label: "Date of Birth", type: "date", required: true, width: "half" }]);
        config.registration.fields.push({ id: "privacy_consent", label: "I acknowledge the Privacy Policy", type: "consent", required: true, width: "full", consentKind: "privacy", policyUrl: "/privacy" });
        config.verification.email.enabled = true;
        config.verification.phone.enabled = true;
      }),
  },
  {
    id: "marketplace_seller",
    name: "Marketplace Seller",
    description: "Seller account with business and verified contact details.",
    create: (appName) =>
      configured(appName, "Seller", (config) => {
        addBeforePassword(config, [phone(), text("company", "Company or Store Name", { autocomplete: "organization" })]);
        config.verification.email.enabled = true;
        config.verification.phone.enabled = true;
      }),
  },
  {
    id: "delivery_application",
    name: "Delivery Application",
    description: "Customer delivery account with verified email, phone, and address details.",
    create: (appName) =>
      configured(appName, "Customer", (config) => {
        addBeforePassword(config, [
          phone(),
          text("address", "Delivery Address", { autocomplete: "address-line1" }),
          text("postal_code", "Delivery ZIP Code", { autocomplete: "postal-code", validation: { patternPreset: "postal_code", maxLength: 20 } }),
        ]);
        config.login.socialProviders.google = true;
        config.registration.socialSignup = true;
        config.verification.email.enabled = true;
        config.verification.phone.enabled = true;
      }),
  },
  {
    id: "custom",
    name: "Custom",
    description: "Secure defaults with no industry-specific fields.",
    create: (appName) => createDefaultAuthFlowConfig({ appName, accountType: "User" }),
  },
] as const;

export function getAuthFlowTemplate(templateId: AuthFlowTemplateId, appName: string): AuthFlowConfig {
  const template = authFlowTemplates.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`Unknown AuthFlow template: ${templateId}`);
  return template.create(appName);
}

