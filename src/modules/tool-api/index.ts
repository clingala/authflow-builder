import { getProjectService } from "@/modules/projects";

import { AuthFlowToolService } from "./service";

let toolService: AuthFlowToolService | undefined;

export function getAuthFlowToolService(): AuthFlowToolService {
  toolService ??= new AuthFlowToolService(getProjectService());
  return toolService;
}

export { ToolAuthorizationError, UnknownToolError } from "./contracts";
export type { ToolAnnotations, ToolContext, ToolDescriptor, ToolScope } from "./contracts";
export { authFlowToolMap, authFlowTools } from "./registry";
export { toolInputSchemas, toolResultSchema } from "./schemas";
export type { ToolName } from "./schemas";
export { AuthFlowToolService } from "./service";
