import type { NextRequest } from "next/server";

import { dataResponse, errorResponse, requireOwnerId, requireSameOrigin } from "@/app/api/v1/_shared";
import { getProjectService } from "@/modules/projects";

export async function GET(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    return dataResponse(await getProjectService().list(ownerId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const ownerId = await requireOwnerId(request);
    const project = await getProjectService().create(ownerId, await request.json());
    return dataResponse(project, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
