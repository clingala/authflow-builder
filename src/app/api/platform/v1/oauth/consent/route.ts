import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSameOrigin } from "@/app/api/v1/_shared";
import { getOAuthPlatformService } from "@/modules/oauth-platform";

const formSchema = z.object({ consentChallenge: z.string().min(16).max(2048), decision: z.enum(["accept", "deny"]) });

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const form = await request.formData();
    const input = formSchema.parse({ consentChallenge: form.get("consentChallenge"), decision: form.get("decision") });
    const service = getOAuthPlatformService();
    const redirectTo = input.decision === "accept" ? await service.acceptConsent(input.consentChallenge) : await service.rejectConsent(input.consentChallenge);
    return NextResponse.redirect(redirectTo, 303);
  } catch (error) {
    console.error("OAuth consent completion failed", error);
    return NextResponse.json({ data: null, error: { code: "OAUTH_CONSENT_FAILED", message: "The OAuth consent request could not be completed" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
