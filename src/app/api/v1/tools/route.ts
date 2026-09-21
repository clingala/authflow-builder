import type { NextRequest } from "next/server";
import { z } from "zod";

import { dataResponse, errorResponse, requireOwnerId } from "@/app/api/v1/_shared";
import { authFlowTools } from "@/modules/tool-api";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerId(request);
    return dataResponse(authFlowTools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: z.toJSONSchema(tool.inputSchema),
      outputSchema: z.toJSONSchema(tool.outputSchema),
      securitySchemes: [{ type: "oauth2", scopes: [tool.requiredScope] }],
      annotations: tool.annotations,
    })));
  } catch (error) {
    return errorResponse(error);
  }
}
