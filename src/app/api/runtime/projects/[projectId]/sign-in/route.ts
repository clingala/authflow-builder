import type { NextRequest } from "next/server";

import { getRuntimeAuthService } from "@/modules/runtime-auth";

import { requestContext, requireRuntimeWriteOrigin, runtimeDataResponse, runtimeErrorResponse, setRuntimeSessionCookie } from "../../../_shared";

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireRuntimeWriteOrigin(request);
    const { projectId } = await context.params;
    const result = await getRuntimeAuthService().signIn(projectId, await request.json(), requestContext(request));
    const response = runtimeDataResponse({ user: result.user });
    setRuntimeSessionCookie(response, projectId, result.session);
    return response;
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
