import { z } from "zod";

import { authFlowConfigSchema, type AuthFlowConfig } from "./schema";

const versionProbeSchema = z.object({ schemaVersion: z.number().int() }).passthrough();

export class UnsupportedAuthFlowVersionError extends Error {
  constructor(public readonly version: number | "missing") {
    super(`Unsupported AuthFlow schema version: ${version}`);
    this.name = "UnsupportedAuthFlowVersionError";
  }
}

export function parseAuthFlowConfig(input: unknown): AuthFlowConfig {
  return authFlowConfigSchema.parse(input);
}

export function migrateAuthFlowConfig(input: unknown): AuthFlowConfig {
  const probe = versionProbeSchema.safeParse(input);
  if (!probe.success) throw new UnsupportedAuthFlowVersionError("missing");
  if (probe.data.schemaVersion !== 1) throw new UnsupportedAuthFlowVersionError(probe.data.schemaVersion);
  return parseAuthFlowConfig(input);
}

