import type { NextRequest } from "next/server";
import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getApplicationClientService } from "@/modules/application-clients";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    return dataResponse(await getApplicationClientService().list(ownerId, projectId));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }, body] = await Promise.all([requireOwnerId(request), context.params, request.json()]);
    return dataResponse(await getApplicationClientService().create(ownerId, projectId, body), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
