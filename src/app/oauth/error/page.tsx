export default async function OAuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string; error_description?: string }> }) {
  const error = await searchParams;
  return <main className="oauth-consent-shell"><section className="oauth-consent-card" role="alert">
    <p className="eyebrow">Authorization error</p>
    <h1>The request could not be completed</h1>
    <p>{error.error_description || error.error || "Return to the application and try again."}</p>
  </section></main>;
}
