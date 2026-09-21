import type { NextRequest } from "next/server";

import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getAuthFlowToolService } from "@/modules/tool-api";

type Context = { params: Promise<{ toolName: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { toolName }, input] = await Promise.all([requireOwnerId(request), context.params, request.json()]);
    return dataResponse(await getAuthFlowToolService().execute(toolName, input, {
      ownerId,
      scopes: new Set(["projects:read", "projects:write"]),
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
