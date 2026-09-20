import { NextResponse, type NextRequest } from "next/server";
import { getRuntimeOAuthService } from "@/modules/runtime-auth";
import { runtimeErrorResponse } from "../../../../../_shared";

type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: NextRequest, context: Context) {
  try { const { projectId } = await context.params; return NextResponse.redirect(await getRuntimeOAuthService().start(projectId), 302); }
  catch (error) { return runtimeErrorResponse(error); }
}
