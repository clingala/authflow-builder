# Integrating an application with AuthFlow Builder

AuthFlow Builder is designed to work with applications written in any language.
Your application uses standard OpenID Connect (OIDC) and OAuth 2.0 endpoints;
the builder controls the account experience and the project configuration.

This guide covers browser, mobile, desktop, server-rendered, and API clients.
It deliberately does not require a framework-specific AuthFlow SDK.

## Before you start

In the AuthFlow Builder dashboard, create a project and open **Integrations**.
Create an application client and record only these non-secret values:

- Client ID
- Allowed redirect URIs
- Allowed web origins, when the client is browser based
- Issuer URL

Register exact redirect URIs. A redirect URI is not a pattern: protocol, host,
port, path, and trailing slash must match. Use HTTPS outside local development.

Public browser, mobile, and desktop clients must use Authorization Code with
S256 PKCE. They never receive or store a client secret. A confidential backend
client may hold a secret only in its server-side secret manager and must never
send it to a browser or mobile app.

## OIDC discovery

Do not hard-code authorization, token, JWKS, or UserInfo URLs. Fetch the
issuer's discovery document at:

```
https://<your-issuer>/.well-known/openid-configuration
```

Use the document's `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`,
and `jwks_uri` values. Validate the returned `issuer` exactly against your
configured issuer.

AuthFlow's project configuration is separately available to public clients at:

```
GET /api/platform/v1/clients/{clientId}/configuration
```

See [PLATFORM.md](PLATFORM.md) and
[openapi.platform.yaml](openapi.platform.yaml) for its request and response
contract. This endpoint returns presentation/configuration data; it is not an
authorization decision and does not expose credentials.

## Authorization Code + PKCE flow

Use the following flow for browser, mobile, and desktop applications:

1. Generate a cryptographically random `code_verifier` (43–128 characters).
2. Compute `code_challenge = BASE64URL(SHA-256(code_verifier))`.
3. Generate a cryptographically random `state`. OIDC clients should also
   generate a `nonce` and validate it in the ID token.
4. Redirect the user to the discovered authorization endpoint with:
   `response_type=code`, `client_id`, exact `redirect_uri`, requested `scope`,
   `state`, `code_challenge`, and `code_challenge_method=S256`.
5. At the redirect URI, compare the returned `state` using the value stored
   before redirecting. Reject mismatches and OAuth error responses.
6. Send the one-time authorization `code`, exact `redirect_uri`,
   `client_id`, and original `code_verifier` to the token endpoint.
7. Validate ID-token signature and claims (`iss`, `aud`, `exp`, `iat`, and
   `nonce` when used) using the issuer's JWKS. Use UserInfo only with a valid
   access token and only when the requested scopes require it.

The dependency-free reference implementation is in
[`examples/pkce-client`](../examples/pkce-client). It is a test client, not a
drop-in production session library.

## Example authorization request

The exact URL is built from discovery. Values below are placeholders.

```text
GET {authorization_endpoint}?
  response_type=code&
  client_id={client_id}&
  redirect_uri=https%3A%2F%2Fapp.example.com%2Foauth%2Fcallback&
  scope=openid%20profile%20email%20offline_access&
  state={random_state}&
  nonce={random_nonce}&
  code_challenge={base64url_sha256_verifier}&
  code_challenge_method=S256
```

The token request is a form-encoded HTTPS `POST` to the discovered token
endpoint. Never place an authorization code, verifier, refresh token, access
token, or ID token in a URL, console log, analytics event, or error report.

## Sessions and token handling

- Prefer a backend-for-frontend (BFF) or server session for web applications.
  Keep refresh tokens server-side and use secure, `HttpOnly`, `Secure`,
  `SameSite` cookies for the browser session.
- Treat access and refresh tokens as credentials. Do not store them in
  `localStorage`, URLs, or browser logs.
- If `offline_access` is granted, use refresh-token rotation. Replace the old
  refresh token atomically; do not retry a consumed token indefinitely.
- Use short-lived access tokens, minimize scopes, and revoke/sign out through
  the issuer's supported logout or revocation integration.
- Protect callback and session endpoints from CSRF. The OAuth `state` check is
  required but does not replace normal application CSRF protections.

## Framework recipes

The protocol contract is the same in every stack. Choose a mature OIDC client
library that supports discovery, Authorization Code, S256 PKCE, state, nonce,
and token validation.

| Stack | Recommended integration shape |
| --- | --- |
| Plain JavaScript | Use the reference client as a learning aid, then keep tokens in a BFF/session rather than browser storage. |
| React / Next.js | Use a server-side callback route and encrypted/HttpOnly session cookie; render AuthFlow configuration through the public configuration endpoint. |
| Java / Spring Boot | Configure Spring Security's OAuth2 Client with the issuer URI; use `oauth2Login` for the authorization code callback and server-managed sessions. |
| Node / Express | Use a standards-compliant OIDC client and a server-side session store; exchange the code on the server. |
| Python / Django / FastAPI | Use a maintained OIDC client package, discovery, a server callback, and the framework's protected session mechanism. |
| .NET / ASP.NET Core | Use OpenID Connect middleware with `ResponseType=code`, PKCE enabled, and server-side cookie authentication. |
| Mobile / native | Use the system browser and a maintained AppAuth-style library. Register platform redirect URIs and keep tokens in the OS secure storage. |

Do not use the implicit flow, Resource Owner Password Credentials grant, or an
embedded web view for a public native application.

## React / Next.js outline

1. The server loads public project configuration using the client ID.
2. A login action creates `state`, `nonce`, and PKCE verifier, storing them in
   a short-lived server session.
3. The callback route validates `state`, exchanges the code server-side, and
   validates the ID token.
4. The application creates or updates its own secure session cookie.
5. API routes authorize using the application session, not a token supplied by
   arbitrary client-side JavaScript.

For a browser-only proof of protocol behavior, see the reference client. Do
not copy its token display or test transport patterns into a production app.

## Java / Spring Boot outline

Use the issuer URI rather than individual endpoint URLs so Spring Security can
use discovery:

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          authflow:
            client-id: ${AUTHFLOW_CLIENT_ID}
            client-authentication-method: none
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
            scope: openid,profile,email
        provider:
          authflow:
            issuer-uri: ${AUTHFLOW_ISSUER_URI}
```

For a public client, ensure the library performs S256 PKCE and register the
expanded redirect URI in AuthFlow. For a confidential web application, use a
server-only secret if the client registration requires one; never put it in
`application.yml` committed to source control.

## Failure handling

- Show a generic, actionable message for a denied request, expired session, or
  failed sign-in. Do not expose codes, verifier values, token responses, or
  provider diagnostics to end users.
- Treat `invalid_grant`, state mismatch, nonce mismatch, wrong issuer, wrong
  audience, or invalid signature as a failed login. Clear transient auth state
  and start a new flow.
- Do not automatically retry token exchanges. Authorization codes are single
  use.
- Log a correlation ID and sanitized error category only. Never log OAuth
  credentials or personally sensitive claims.

## Production acceptance checklist

Before enabling a client for real users, verify:

- [ ] Exact HTTPS redirect URIs and web origins are registered.
- [ ] Authorization Code + S256 PKCE, `state`, and OIDC `nonce` are validated.
- [ ] Discovery and ID-token/JWKS validation use the intended issuer.
- [ ] Tokens are absent from browser storage, URLs, logs, and analytics.
- [ ] Refresh-token rotation, logout/revocation, and session expiry behavior are tested.
- [ ] Consent scopes are minimal and descriptions are understandable.
- [ ] The app has privacy, support, and incident-response contacts.
- [ ] An authorization failure, denied consent, and expired refresh-token path are tested.

