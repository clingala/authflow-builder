import type { HydraClientInput, HydraConsentRequest, HydraLoginRequest, OAuthProtocolAdapter } from "./contracts";

export class OAuthPlatformUnavailableError extends Error {}
export class OAuthPlatformRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type RedirectResponse = { redirect_to: string };

export class HydraAdminAdapter implements OAuthProtocolAdapter {
  constructor(private readonly adminUrl: string, private readonly fetcher: typeof fetch = fetch) {}

  registerClient(input: HydraClientInput) {
    return this.request<void>("/admin/clients", {
      method: "POST",
      body: JSON.stringify({
        client_id: input.clientId,
        client_name: input.name,
        redirect_uris: input.redirectUris,
        allowed_cors_origins: input.allowedOrigins,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "openid profile email offline_access",
        metadata: { authflow_project_id: input.projectId },
      }),
    });
  }

  async removeClient(clientId: string) {
    await this.request<void>(`/admin/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" }, [404]);
  }

  getLoginRequest(challenge: string) {
    return this.request<HydraLoginRequest>(`/admin/oauth2/auth/requests/login?login_challenge=${encodeURIComponent(challenge)}`);
  }

  async acceptLogin(challenge: string, subject: string) {
    const response = await this.request<RedirectResponse>(`/admin/oauth2/auth/requests/login/accept?login_challenge=${encodeURIComponent(challenge)}`, {
      method: "PUT", body: JSON.stringify({ subject, remember: false, acr: "urn:authflow:password" }),
    });
    return response.redirect_to;
  }

  async rejectLogin(challenge: string) {
    const response = await this.request<RedirectResponse>(`/admin/oauth2/auth/requests/login/reject?login_challenge=${encodeURIComponent(challenge)}`, {
      method: "PUT", body: JSON.stringify({ error: "access_denied", error_description: "The authentication request was denied" }),
    });
    return response.redirect_to;
  }

  getConsentRequest(challenge: string) {
    return this.request<HydraConsentRequest>(`/admin/oauth2/auth/requests/consent?consent_challenge=${encodeURIComponent(challenge)}`);
  }

  async acceptConsent(challenge: string, scopes: string[], claims: { sub: string; email: string; email_verified: boolean }) {
    const response = await this.request<RedirectResponse>(`/admin/oauth2/auth/requests/consent/accept?consent_challenge=${encodeURIComponent(challenge)}`, {
      method: "PUT",
      body: JSON.stringify({ grant_scope: scopes, remember: false, session: { id_token: claims, access_token: { sub: claims.sub } } }),
    });
    return response.redirect_to;
  }

  async rejectConsent(challenge: string) {
    const response = await this.request<RedirectResponse>(`/admin/oauth2/auth/requests/consent/reject?consent_challenge=${encodeURIComponent(challenge)}`, {
      method: "PUT", body: JSON.stringify({ error: "access_denied", error_description: "The resource owner denied the request" }),
    });
    return response.redirect_to;
  }

  private async request<T>(path: string, init: RequestInit = {}, ignoredStatuses: number[] = []): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(new URL(path, this.adminUrl), {
        ...init,
        headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      throw new OAuthPlatformUnavailableError(error instanceof Error ? error.message : "Hydra is unavailable");
    }
    if (ignoredStatuses.includes(response.status)) return undefined as T;
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error_description?: string; message?: string };
      throw new OAuthPlatformRequestError(response.status, payload.error_description || payload.message || "Hydra rejected the request");
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
