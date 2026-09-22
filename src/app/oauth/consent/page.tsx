import { notFound } from "next/navigation";
import { getOAuthPlatformService } from "@/modules/oauth-platform";

export const dynamic = "force-dynamic";

export default async function OAuthConsentPage({ searchParams }: { searchParams: Promise<{ consent_challenge?: string }> }) {
  const challenge = (await searchParams).consent_challenge;
  if (!challenge) notFound();
  const { request, client, user } = await getOAuthPlatformService().consentContext(challenge);
  return <main className="oauth-consent-shell" style={{ background: client.configuration.branding.backgroundColor }}>
    <section className="oauth-consent-card">
      <p className="eyebrow">Authorization request</p>
      <h1>Allow {request.client.client_name || client.client.name}?</h1>
      <p><strong>{user.email}</strong> is signed in to {client.configuration.app.name}. The application is requesting:</p>
      <ul>{request.requested_scope.map((scope) => <li key={scope}>{scope === "openid" ? "Confirm your identity" : scope === "email" ? "Read your email address" : scope === "profile" ? "Read your basic profile" : scope === "offline_access" ? "Stay signed in when you are away" : scope}</li>)}</ul>
      <form method="post" action="/api/platform/v1/oauth/consent">
        <input type="hidden" name="consentChallenge" value={challenge} />
        <button className="button secondary" type="submit" name="decision" value="deny">Deny</button>
        <button className="button primary" type="submit" name="decision" value="accept">Allow</button>
      </form>
    </section>
  </main>;
}
