# Phase 9 delivery — Google OAuth

Phase 9 connects configured Google buttons to a real OAuth 2.0 authorization-code flow. It requests only `openid email profile` and stores no Google access or refresh tokens because AuthFlow needs identity authentication, not ongoing Google API access.

## Delivered

- Google authorization and callback endpoints for every active AuthFlow project.
- Cryptographically random 256-bit state and PKCE verifier values with S256 challenges.
- Only a SHA-256 state digest is persisted. The PKCE verifier is encrypted at rest with AES-256-GCM using key material derived from `AUTH_SECRET`.
- Ten-minute, project-bound, provider-bound, atomically single-use OAuth transactions.
- Server-only authorization-code exchange using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Bearer-authenticated Google OpenID Connect UserInfo retrieval with strict schema validation and mandatory verified email.
- Project-scoped Google subject links. A verified Google email links to an existing identity only inside the same project; otherwise a new runtime identity is created.
- Normal AuthFlow session issuance after callback. Only the session hash is stored.
- Redacted runtime audit events for successful Google authentication.
- Hosted login/signup Google buttons invoke the real flow. LinkedIn and Facebook remain visibly unavailable rather than returning mock success.

## Endpoints

```text
GET /api/runtime/projects/:projectId/oauth/google/start
GET /api/runtime/projects/:projectId/oauth/google/callback
```

The registered Google redirect URI must exactly match:

```text
{APP_URL}/api/runtime/projects/{projectId}/oauth/google/callback
```

Each hosted project therefore needs its callback URI registered in the Google Cloud OAuth client. A future hosted-domain routing layer can consolidate callback registration without weakening project binding.

## Security properties

- OAuth is refused when Google is disabled in the validated project configuration or server credentials are absent.
- State is verified and consumed before code exchange; replay fails.
- PKCE binds the intercepted authorization code to the initiating server transaction.
- Provider secrets remain server-only and never use `NEXT_PUBLIC_` variables.
- Callback parameters are removed by a `303` redirect immediately after successful handling.
- Google tokens are held only in memory long enough to retrieve UserInfo and are never persisted or logged.
- Google `sub`, not email, is the durable provider account identifier.

## Tests

Automated tests cover hashed state, encrypted verifier storage, S256 request construction, project-bound one-time state, callback replay denial, PKCE exchange, hashed AuthFlow session issuance, and disabled-provider refusal. The repository quality gate also runs Prisma validation, strict lint, TypeScript, all Vitest suites, and the production build.

## External setup

Create a Google OAuth web client, configure its consent screen, add the exact callback URI for each project, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in server secret storage. Local and production deployments should use separate OAuth clients.
