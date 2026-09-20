import type { NextRequest } from "next/server";

import { getRuntimeAuthService } from "@/modules/runtime-auth";

import { runtimeDataResponse, runtimeErrorResponse, runtimeSessionCookieName } from "../../../_shared";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { projectId } = await context.params;
    const token = request.cookies.get(runtimeSessionCookieName(projectId))?.value;
    const session = await getRuntimeAuthService().getSession(projectId, token);
    return runtimeDataResponse(session ? {
      user: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        phoneVerified: session.user.phoneVerified,
      },
      expiresAt: session.expiresAt,
    } : null);
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
