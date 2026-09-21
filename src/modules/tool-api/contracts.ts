import type { z } from "zod";

export const toolScopes = ["projects:read", "projects:write"] as const;
export type ToolScope = (typeof toolScopes)[number];

export type ToolContext = {
  ownerId: string;
  scopes: ReadonlySet<ToolScope>;
};

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
  idempotentHint?: boolean;
};

export type ToolDescriptor = {
  name: string;
  title: string;
  description: string;
  requiredScope: ToolScope;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  annotations: ToolAnnotations;
};

export class ToolAuthorizationError extends Error {
  constructor(public readonly requiredScope: ToolScope) {
    super(`Missing required scope: ${requiredScope}`);
    this.name = "ToolAuthorizationError";
  }
}

export class UnknownToolError extends Error {
  constructor(public readonly toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = "UnknownToolError";
  }
}
