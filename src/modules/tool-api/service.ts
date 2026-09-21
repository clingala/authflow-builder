import { parseAuthFlowConfig, type AuthFlowConfig } from "@/modules/auth-config";
import { buildConfigExport, buildNextJsExport } from "@/modules/export";
import type { ProjectService, ProjectView } from "@/modules/projects";

import { ToolAuthorizationError, UnknownToolError, type ToolContext } from "./contracts";
import { authFlowToolMap } from "./registry";
import { toolInputSchemas, toolResultSchema, type ToolName } from "./schemas";

type ToolResult = ReturnType<typeof toolResultSchema.parse>;

function configFrom(project: ProjectView): AuthFlowConfig {
  return parseAuthFlowConfig(project.config);
}

function result(project: ProjectView, summary: string): ToolResult {
  return toolResultSchema.parse({ projectId: project.id, version: project.currentVersion, config: configFrom(project), summary });
}

export class AuthFlowToolService {
  constructor(private readonly projects: ProjectService) {}

  async execute(rawName: string, rawInput: unknown, context: ToolContext): Promise<ToolResult> {
    const descriptor = authFlowToolMap.get(rawName as ToolName);
    if (!descriptor) throw new UnknownToolError(rawName);
    if (!context.scopes.has(descriptor.requiredScope)) throw new ToolAuthorizationError(descriptor.requiredScope);

    const input = descriptor.inputSchema.parse(rawInput) as Record<string, unknown>;
    const name = descriptor.name as ToolName;

    if (name === "create_auth_project") {
      const parsed = toolInputSchemas.create_auth_project.parse(input);
      return result(await this.projects.create(context.ownerId, parsed), `Created ${parsed.accountType} authentication project.`);
    }

    const projectId = String(input.projectId);
    const project = await this.projects.get(context.ownerId, projectId);

    if (name === "get_auth_project") return result(project, "Returned the validated authentication project.");
    if (name === "preview_auth_flow") {
      return toolResultSchema.parse({ projectId, version: project.currentVersion, summary: "Hosted preview is ready.", previewPath: `/auth/${projectId}` });
    }
    if (name === "export_auth_config") {
      const parsed = toolInputSchemas.export_auth_config.parse(input);
      const artifact = parsed.target === "nextjs"
        ? buildNextJsExport({ projectId, projectVersion: project.currentVersion, config: project.config })
        : buildConfigExport(project.config);
      return toolResultSchema.parse({ projectId, version: project.currentVersion, summary: `Exported ${parsed.target} artifact.`, artifact });
    }

    const expectedVersion = Number(input.expectedVersion);
    let config = structuredClone(configFrom(project));

    if (name === "update_auth_project") config = toolInputSchemas.update_auth_project.parse(input).config;
    if (name === "configure_login") {
      const parsed = toolInputSchemas.configure_login.parse(input);
      config.login = parsed.login;
      config.labels = { ...config.labels, ...parsed.labels };
    }
    if (name === "configure_registration") {
      const parsed = toolInputSchemas.configure_registration.parse(input);
      config.registration = parsed.registration;
      config.labels = { ...config.labels, ...parsed.labels };
    }
    if (name === "add_registration_field") {
      const parsed = toolInputSchemas.add_registration_field.parse(input);
      const position = parsed.position ?? config.registration.fields.length;
      config.registration.fields.splice(position, 0, parsed.field);
    }
    if (name === "remove_registration_field") {
      const parsed = toolInputSchemas.remove_registration_field.parse(input);
      config.registration.fields = config.registration.fields.filter((field) => field.id !== parsed.fieldId);
    }
    if (name === "configure_social_login") {
      const parsed = toolInputSchemas.configure_social_login.parse(input);
      config.login.socialProviders = parsed.providers;
      config.registration.socialSignup = parsed.socialSignup;
    }
    if (name === "configure_verification") config.verification = toolInputSchemas.configure_verification.parse(input).verification;
    if (name === "configure_recovery") {
      const parsed = toolInputSchemas.configure_recovery.parse(input);
      config.recovery = parsed.recovery;
      if (parsed.recoveryTitle) config.labels.recoveryTitle = parsed.recoveryTitle;
    }
    if (name === "configure_branding") config.branding = toolInputSchemas.configure_branding.parse(input).branding;

    const saved = await this.projects.saveConfig(context.ownerId, projectId, { expectedVersion, config });
    return result(saved, `${descriptor.title} completed.`);
  }
}
