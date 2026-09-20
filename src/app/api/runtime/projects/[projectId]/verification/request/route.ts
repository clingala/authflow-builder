import type { NextRequest } from "next/server";
import { getRuntimeChallengeService } from "@/modules/runtime-auth";
import { requestContext, requireRuntimeWriteOrigin, runtimeDataResponse, runtimeErrorResponse } from "../../../../_shared";
type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireRuntimeWriteOrigin(request);
    const { projectId } = await context.params;
    return runtimeDataResponse(await getRuntimeChallengeService().requestVerification(projectId, await request.json(), requestContext(request)), 202);
  } catch (error) { return runtimeErrorResponse(error); }
}
