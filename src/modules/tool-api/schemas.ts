import { z } from "zod";

import { authFlowConfigSchema, registrationFieldSchema } from "@/modules/auth-config";
import { exportTargets } from "@/modules/export";

const projectId = z.string().uuid();
const expectedVersion = z.number().int().positive();
const writeBase = { projectId, expectedVersion } as const;

export const toolInputSchemas = {
  create_auth_project: z.object({ name: z.string().trim().min(1).max(80), accountType: z.string().trim().min(1).max(50) }).strict(),
  get_auth_project: z.object({ projectId }).strict(),
  update_auth_project: z.object({ ...writeBase, config: authFlowConfigSchema }).strict(),
  configure_login: z.object({
    ...writeBase,
    login: authFlowConfigSchema.shape.login,
    labels: authFlowConfigSchema.shape.labels.pick({ loginTitle: true, loginAction: true, recoveryLink: true }).partial().optional(),
  }).strict(),
  configure_registration: z.object({
    ...writeBase,
    registration: authFlowConfigSchema.shape.registration,
    labels: authFlowConfigSchema.shape.labels.pick({ signupTitle: true, signupAction: true, existingAccount: true, newAccount: true }).partial().optional(),
  }).strict(),
  add_registration_field: z.object({ ...writeBase, field: registrationFieldSchema, position: z.number().int().min(0).max(49).optional() }).strict(),
  remove_registration_field: z.object({ ...writeBase, fieldId: z.string().min(1).max(64) }).strict(),
  configure_social_login: z.object({
    ...writeBase,
    providers: authFlowConfigSchema.shape.login.shape.socialProviders,
    socialSignup: z.boolean(),
  }).strict(),
  configure_verification: z.object({ ...writeBase, verification: authFlowConfigSchema.shape.verification }).strict(),
  configure_recovery: z.object({
    ...writeBase,
    recovery: authFlowConfigSchema.shape.recovery,
    recoveryTitle: authFlowConfigSchema.shape.labels.shape.recoveryTitle.optional(),
  }).strict(),
  configure_branding: z.object({ ...writeBase, branding: authFlowConfigSchema.shape.branding }).strict(),
  preview_auth_flow: z.object({ projectId }).strict(),
  export_auth_config: z.object({ projectId, target: z.enum(exportTargets).default("config") }).strict(),
} as const;

export type ToolName = keyof typeof toolInputSchemas;

export const toolResultSchema = z.object({
  projectId: z.string().uuid(),
  version: z.number().int().positive(),
  summary: z.string().min(1),
  config: authFlowConfigSchema.optional(),
  previewPath: z.string().optional(),
  artifact: z.unknown().optional(),
}).strict();
