import { z } from "zod";

import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";
import type { JsonValue } from "@/modules/projects";

export const projectIdSchema = z.string().uuid();
export const signInSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) }).strict();
export const signUpSchema = z.object({
  fields: z.record(z.string(), z.unknown()).refine((fields) => Object.keys(fields).length <= 50, "Too many registration fields"),
}).strict();

const patterns: Record<string, RegExp> = {
  person_name: /^[\p{L}\p{M} .'-]+$/u,
  username: /^[A-Za-z0-9_.-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[0-9 ()-]{7,30}$/,
  url: /^https?:\/\//i,
  postal_code: /^[A-Za-z0-9 -]{2,20}$/,
};

export type ValidatedRegistration = { email: string; password: string; profile: JsonValue };

export class RegistrationValidationError extends Error {
  constructor(public readonly issues: Record<string, string>) {
    super("Registration fields are invalid");
  }
}

type TextRegistrationField = Extract<RegistrationField, { type: "text" | "email" | "phone" | "password" | "textarea" }>;

function textValue(field: TextRegistrationField, raw: unknown, issues: Record<string, string>) {
  const value = typeof raw === "string" ? (field.type === "password" ? raw : raw.trim()) : "";
  if (field.required && !value) issues[field.id] = `${field.label} is required.`;
  if (!("validation" in field) || !field.validation) return value;
  if (field.validation.minLength !== undefined && value.length < field.validation.minLength) issues[field.id] = `${field.label} is too short.`;
  if (field.validation.maxLength !== undefined && value.length > field.validation.maxLength) issues[field.id] = `${field.label} is too long.`;
  if (value && field.validation.patternPreset && !patterns[field.validation.patternPreset]?.test(value)) issues[field.id] = `${field.label} is invalid.`;
  return value;
}

function fieldValue(field: RegistrationField, raw: unknown, issues: Record<string, string>): JsonValue {
  if (field.type === "checkbox" || field.type === "boolean" || field.type === "consent") {
    const value = raw === true || raw === "true" || raw === "on";
    if (field.required && !value) issues[field.id] = `${field.label} is required.`;
    return value;
  }
  if (field.type === "number") {
    if ((raw === "" || raw === undefined || raw === null) && !field.required) return null;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) issues[field.id] = `${field.label} must be a number.`;
    else {
      if (field.validation?.min !== undefined && value < field.validation.min) issues[field.id] = `${field.label} is below the minimum.`;
      if (field.validation?.max !== undefined && value > field.validation.max) issues[field.id] = `${field.label} exceeds the maximum.`;
    }
    return Number.isFinite(value) ? value : null;
  }
  if (field.type === "dropdown" || field.type === "radio") {
    const value = typeof raw === "string" ? raw : "";
    if (field.required && !value) issues[field.id] = `${field.label} is required.`;
    if (value && !field.options.some((option) => option.value === value)) issues[field.id] = `${field.label} is invalid.`;
    return value;
  }
  if (field.type === "date") {
    const value = typeof raw === "string" ? raw : "";
    if (field.required && !value) issues[field.id] = `${field.label} is required.`;
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) issues[field.id] = `${field.label} is invalid.`;
    if (value && field.validation?.minDate && value < field.validation.minDate) issues[field.id] = `${field.label} is before the minimum date.`;
    if (value && field.validation?.maxDate && value > field.validation.maxDate) issues[field.id] = `${field.label} is after the maximum date.`;
    return value;
  }
  return textValue(field, raw, issues);
}

export function validateRegistration(config: AuthFlowConfig, rawFields: Record<string, unknown>): ValidatedRegistration {
  const issues: Record<string, string> = {};
  const profile: Record<string, JsonValue> = {};
  let email = "";
  let password = "";
  let confirmation = "";

  for (const field of config.registration.fields) {
    const value = fieldValue(field, rawFields[field.id], issues);
    if (field.id === "email") email = String(value).trim().toLowerCase();
    else if (field.id === "password") password = String(value);
    else if (field.id === "confirm_password") confirmation = String(value);
    else profile[field.id] = value;
  }

  const policy = config.passwordPolicy;
  if (password.length < policy.minLength || password.length > policy.maxLength) issues.password = `Password must be ${policy.minLength}–${policy.maxLength} characters.`;
  if (policy.requireUppercase && !/[A-Z]/.test(password)) issues.password = "Password must include an uppercase letter.";
  if (policy.requireLowercase && !/[a-z]/.test(password)) issues.password = "Password must include a lowercase letter.";
  if (policy.requireNumber && !/[0-9]/.test(password)) issues.password = "Password must include a number.";
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) issues.password = "Password must include a special character.";
  if (policy.requireConfirmation && password !== confirmation) issues.confirm_password = "Passwords do not match.";
  if (!z.string().email().safeParse(email).success) issues.email = "Enter a valid email address.";

  if (Object.keys(issues).length) throw new RegistrationValidationError(issues);
  return { email, password, profile };
}
