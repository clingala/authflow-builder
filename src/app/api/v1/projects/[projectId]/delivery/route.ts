import type { NextRequest } from "next/server";

import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getPrisma } from "@/lib/db/prisma";
import { readAuthEnvironment } from "@/lib/env/runtime";
import { DeliveryConnectionService } from "@/modules/delivery-integrations";

type Context = { params: Promise<{ projectId: string }> };
const service = () => new DeliveryConnectionService(getPrisma(), readAuthEnvironment().AUTH_SECRET);

export async function GET(request: NextRequest, context: Context) {
  try {
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    return dataResponse(await service().get(ownerId, projectId));
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }, body] = await Promise.all([requireOwnerId(request), context.params, request.json()]);
    return dataResponse(await service().save(ownerId, projectId, body));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    await service().remove(ownerId, projectId);
    return new Response(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
