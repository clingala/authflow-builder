import type { NextRequest } from "next/server";
import { getRuntimeChallengeService } from "@/modules/runtime-auth";
import { requestContext, requireRuntimeWriteOrigin, runtimeDataResponse, runtimeErrorResponse } from "../../../../_shared";

export async function POST(request: NextRequest, context: RouteContext<"/api/runtime/projects/[projectId]/recovery/reset">) {
  try {
    requireRuntimeWriteOrigin(request);
    const { projectId } = await context.params;
    return runtimeDataResponse(await getRuntimeChallengeService().resetPassword(projectId, await request.json(), requestContext(request)));
  } catch (error) { return runtimeErrorResponse(error); }
}
