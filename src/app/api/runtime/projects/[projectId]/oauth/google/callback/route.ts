import { NextResponse, type NextRequest } from "next/server";
import { getRuntimeOAuthService } from "@/modules/runtime-auth";
import { requestContext, runtimeErrorResponse, setRuntimeSessionCookie } from "../../../../../_shared";

type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { projectId } = await context.params;
    const result = await getRuntimeOAuthService().callback(projectId, { state: request.nextUrl.searchParams.get("state") ?? undefined, code: request.nextUrl.searchParams.get("code") ?? undefined, error: request.nextUrl.searchParams.get("error") ?? undefined }, requestContext(request));
    const response = NextResponse.redirect(new URL(`/auth/${projectId}?oauth=success`, request.url), 303);
    setRuntimeSessionCookie(response, projectId, result);
    return response;
  } catch (error) { return runtimeErrorResponse(error); }
}
