import { describe, expect, it, vi } from "vitest";
import { HydraAdminAdapter, OAuthPlatformRequestError, OAuthPlatformUnavailableError } from "./hydra-adapter";

describe("HydraAdminAdapter", () => {
  it("registers public authorization-code clients with PKCE-compatible metadata", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      void input; void init;
      return new Response(JSON.stringify({ client_id: "af_pk_test" }), { status: 201, headers: { "Content-Type": "application/json" } });
    });
    const adapter = new HydraAdminAdapter("http://hydra:4445", fetcher as typeof fetch);
    await adapter.registerClient({ clientId: "af_pk_test", name: "Web app", projectId: crypto.randomUUID(), redirectUris: ["https://app.example/callback"], allowedOrigins: ["https://app.example"] });
    const [, init] = fetcher.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] });
    expect(body).not.toHaveProperty("client_secret");
  });

  it("accepts login using only the stable runtime-user subject", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      void input; void init;
      return new Response(JSON.stringify({ redirect_to: "http://localhost:4444/resume" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const adapter = new HydraAdminAdapter("http://hydra:4445", fetcher as typeof fetch);
    await expect(adapter.acceptLogin("challenge-value-long", "runtime-user-id")).resolves.toBe("http://localhost:4444/resume");
    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toMatchObject({ subject: "runtime-user-id", remember: false });
  });

  it("fails closed on network and protocol errors", async () => {
    const unavailable = new HydraAdminAdapter("http://hydra:4445", vi.fn(async () => { throw new Error("offline"); }) as typeof fetch);
    await expect(unavailable.getLoginRequest("challenge-value-long")).rejects.toBeInstanceOf(OAuthPlatformUnavailableError);
    const rejected = new HydraAdminAdapter("http://hydra:4445", vi.fn(async () => new Response(JSON.stringify({ error_description: "invalid challenge" }), { status: 400, headers: { "Content-Type": "application/json" } })) as typeof fetch);
    await expect(rejected.getLoginRequest("challenge-value-long")).rejects.toBeInstanceOf(OAuthPlatformRequestError);
  });
});
