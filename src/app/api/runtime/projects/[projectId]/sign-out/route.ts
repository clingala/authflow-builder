import type { NextRequest } from "next/server";

import { getRuntimeAuthService } from "@/modules/runtime-auth";

import { clearRuntimeSessionCookie, requestContext, requireRuntimeWriteOrigin, runtimeDataResponse, runtimeErrorResponse, runtimeSessionCookieName } from "../../../_shared";

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireRuntimeWriteOrigin(request);
    const { projectId } = await context.params;
    const token = request.cookies.get(runtimeSessionCookieName(projectId))?.value;
    await getRuntimeAuthService().signOut(projectId, token, requestContext(request));
    const response = runtimeDataResponse({ signedOut: true });
    clearRuntimeSessionCookie(response, projectId);
    return response;
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
