import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { RuntimeAuthExperience } from "@/components/runtime-auth/runtime-auth-experience";
import { runtimeSessionCookieName } from "@/app/api/runtime/_shared";
import { getOAuthPlatformService } from "@/modules/oauth-platform";
import { getRuntimeAuthService } from "@/modules/runtime-auth";

export const dynamic = "force-dynamic";

export default async function OAuthLoginPage({ searchParams }: { searchParams: Promise<{ login_challenge?: string }> }) {
  const challenge = (await searchParams).login_challenge;
  if (!challenge) notFound();
  const service = getOAuthPlatformService();
  const context = await service.loginContext(challenge);
  const token = (await cookies()).get(runtimeSessionCookieName(context.client.projectId))?.value;
  const session = await getRuntimeAuthService().getSession(context.client.projectId, token);
  if (session) redirect(await service.acceptLogin(challenge, token));
  return <RuntimeAuthExperience projectId={context.client.projectId} config={context.client.configuration} oauthLoginChallenge={challenge} />;
}
