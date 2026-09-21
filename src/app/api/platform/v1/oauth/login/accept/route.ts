import { z } from "zod";
import type { NextRequest } from "next/server";
import { runtimeSessionCookieName } from "@/app/api/runtime/_shared";
import { requireSameOrigin } from "@/app/api/v1/_shared";
import { getOAuthPlatformService } from "@/modules/oauth-platform";

const bodySchema = z.object({ challenge: z.string().min(16).max(2048) }).strict();

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { challenge } = bodySchema.parse(await request.json());
    const service = getOAuthPlatformService();
    const context = await service.loginContext(challenge);
    const token = request.cookies.get(runtimeSessionCookieName(context.client.projectId))?.value;
    const redirectTo = await service.acceptLogin(challenge, token);
    return Response.json({ data: { redirectTo }, error: null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("OAuth login completion failed", error);
    return Response.json({ data: null, error: { code: "OAUTH_LOGIN_FAILED", message: "The OAuth login could not be completed" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
