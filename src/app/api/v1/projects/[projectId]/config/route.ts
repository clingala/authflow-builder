import type { NextRequest } from "next/server";

import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getProjectService } from "@/modules/projects";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    const project = await getProjectService().get(ownerId, projectId);
    return dataResponse({ projectId: project.id, version: project.currentVersion, config: project.config });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }, body] = await Promise.all([
      requireOwnerId(request),
      context.params,
      request.json(),
    ]);
    return dataResponse(await getProjectService().saveConfig(ownerId, projectId, body));
  } catch (error) {
    return errorResponse(error);
  }
}
