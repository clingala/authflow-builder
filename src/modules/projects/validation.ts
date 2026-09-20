import { z } from "zod";

const projectName = z.string().trim().min(1).max(80);
const accountType = z.string().trim().min(1).max(50);

export const createProjectSchema = z.object({
  name: projectName,
  accountType: accountType.default("User"),
});

export const updateProjectSchema = z
  .object({
    name: projectName.optional(),
    accountType: accountType.optional(),
  })
  .refine((value) => value.name !== undefined || value.accountType !== undefined, {
    message: "At least one project property is required",
  });

export const saveConfigSchema = z.object({
  expectedVersion: z.number().int().positive(),
  config: z.record(z.string(), z.unknown()),
});

export const projectIdSchema = z.string().uuid();

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type SaveConfigInput = z.input<typeof saveConfigSchema>;

