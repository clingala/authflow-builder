import type { ToolDescriptor } from "./contracts";
import { toolInputSchemas, toolResultSchema, type ToolName } from "./schemas";

const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true } as const;
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

function descriptor(
  name: ToolName,
  title: string,
  description: string,
  mode: "read" | "write",
): ToolDescriptor {
  return {
    name,
    title,
    description,
    requiredScope: mode === "read" ? "projects:read" : "projects:write",
    inputSchema: toolInputSchemas[name],
    outputSchema: toolResultSchema,
    annotations: mode === "read" ? readAnnotations : writeAnnotations,
  };
}

export const authFlowTools = [
  descriptor("create_auth_project", "Create auth project", "Create an owner-scoped authentication project with secure defaults.", "write"),
  descriptor("get_auth_project", "Get auth project", "Read one owned project's validated AuthFlow configuration.", "read"),
  descriptor("update_auth_project", "Update auth project", "Replace a project configuration using its current version.", "write"),
  descriptor("configure_login", "Configure login", "Set login identifiers, password enablement, providers, and login terminology.", "write"),
  descriptor("configure_registration", "Configure registration", "Set the complete registration form and signup terminology.", "write"),
  descriptor("add_registration_field", "Add registration field", "Add one validated field at an optional position.", "write"),
  descriptor("remove_registration_field", "Remove registration field", "Remove one field; required security fields remain protected by full validation.", "write"),
  descriptor("configure_social_login", "Configure social login", "Enable supported social providers and social signup presentation.", "write"),
  descriptor("configure_verification", "Configure verification", "Set email, phone, and OTP verification requirements.", "write"),
  descriptor("configure_recovery", "Configure recovery", "Set recovery methods and optional recovery-page title.", "write"),
  descriptor("configure_branding", "Configure branding", "Set validated colors, logo URL, typography, spacing, and layout.", "write"),
  descriptor("preview_auth_flow", "Preview auth flow", "Return the owned project's hosted preview path.", "read"),
  descriptor("export_auth_config", "Export auth config", "Return a validated configuration or Next.js starter artifact.", "read"),
] as const;

export const authFlowToolMap = new Map(authFlowTools.map((tool) => [tool.name, tool]));
