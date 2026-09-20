import type { NextRequest } from "next/server";
import { getRuntimeChallengeService } from "@/modules/runtime-auth";
import { requestContext, requireRuntimeWriteOrigin, runtimeDataResponse, runtimeErrorResponse } from "../../../../_shared";
type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireRuntimeWriteOrigin(request);
    const { projectId } = await context.params;
    return runtimeDataResponse(await getRuntimeChallengeService().confirmVerification(projectId, await request.json(), requestContext(request)));
  } catch (error) { return runtimeErrorResponse(error); }
}
