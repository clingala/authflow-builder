import type { NextRequest } from "next/server";
import { errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getApplicationClientService } from "@/modules/application-clients";

type Context = { params: Promise<{ projectId: string; applicationClientId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId, applicationClientId }] = await Promise.all([requireOwnerId(request), context.params]);
    await getApplicationClientService().remove(ownerId, projectId, applicationClientId);
    return new Response(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
