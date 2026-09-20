import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";

type NativeConstraints = {
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  pattern?: string;
};

const safePatterns = {
  person_name: "[A-Za-zÀ-ÖØ-öø-ÿ' -]+",
  username: "[A-Za-z0-9._-]+",
  email: undefined,
  phone: "[0-9+(). -]+",
  url: "https?://.+",
  postal_code: "[A-Za-z0-9 -]+",
} as const;

export function getNativeConstraints(field: RegistrationField): NativeConstraints {
  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "password":
    case "textarea": {
      const validation = field.validation;
      return {
        minLength: validation?.minLength,
        maxLength: validation?.maxLength,
        pattern: validation?.patternPreset ? safePatterns[validation.patternPreset] : undefined,
      };
    }
  }
  if (field.type === "number") {
    return { min: field.validation?.min, max: field.validation?.max };
  }
  if (field.type === "date") {
    return { min: field.validation?.minDate, max: field.validation?.maxDate };
  }
  return {};
}

export type PasswordRequirement = {
  id: "length" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  met: boolean;
};

export function evaluatePassword(password: string, policy: AuthFlowConfig["passwordPolicy"]): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: `${policy.minLength}–${policy.maxLength} characters`,
      met: password.length >= policy.minLength && password.length <= policy.maxLength,
    },
  ];

  if (policy.requireUppercase) requirements.push({ id: "uppercase", label: "One uppercase letter", met: /[A-Z]/.test(password) });
  if (policy.requireLowercase) requirements.push({ id: "lowercase", label: "One lowercase letter", met: /[a-z]/.test(password) });
  if (policy.requireNumber) requirements.push({ id: "number", label: "One number", met: /[0-9]/.test(password) });
  if (policy.requireSpecial) requirements.push({ id: "special", label: "One special character", met: /[^A-Za-z0-9]/.test(password) });

  return requirements;
}

export function passwordStrength(password: string, policy: AuthFlowConfig["passwordPolicy"]): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const requirements = evaluatePassword(password, policy);
  const metRatio = requirements.filter((requirement) => requirement.met).length / requirements.length;
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const score = Math.round(Math.min(4, metRatio * 3 + Math.max(0, variety - 1) / 3));
  return Math.max(1, score) as 1 | 2 | 3 | 4;
}
