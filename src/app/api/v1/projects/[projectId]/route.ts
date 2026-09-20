import type { NextRequest } from "next/server";

import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getProjectService } from "@/modules/projects";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    return dataResponse(await getProjectService().get(ownerId, projectId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }, body] = await Promise.all([
      requireOwnerId(request),
      context.params,
      request.json(),
    ]);
    return dataResponse(await getProjectService().update(ownerId, projectId, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    await getProjectService().archive(ownerId, projectId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
