# AuthFlow language-independent platform

AuthFlow integrations use HTTPS and JSON. Framework components are optional adapters, not the platform boundary.

## First platform milestone

- Owners register public application clients through `POST /api/v1/projects/{projectId}/clients`.
- Each client receives a non-secret `af_pk_...` identifier.
- Redirect URIs and browser origins are exact allowlists. Production URLs require HTTPS; localhost may use HTTP.
- Any language can fetch validated configuration from `GET /api/platform/v1/clients/{clientId}/configuration`.
- Browser reads receive CORS headers only for a registered origin. Server-to-server reads do not require an Origin header.
- The response advertises hosted UI and runtime endpoint URLs, so consumers do not reconstruct internal routes.

Public client identifiers are intentionally not secrets. Never put confidential credentials in browser or mobile code.

## Example

```http
GET /api/platform/v1/clients/af_pk_example/configuration HTTP/1.1
Host: auth.example.com
Origin: https://app.example.com
```

The JSON envelope is stable across React, Java, Python, native mobile, and other HTTP clients.

## Security boundary

The configuration API alone is not an OAuth implementation. Protocol execution is enabled only when the reviewed Hydra sidecar described below is deployed and healthy.

## OAuth 2.1 and OpenID Connect engine

AuthFlow delegates protocol execution to Ory Hydra. Hydra owns authorization codes, S256 PKCE verification, access and refresh tokens, signing keys, discovery metadata, and JWKS. AuthFlow owns project-scoped identities and the configurable login/consent UI.

The Hydra administrative API is server-only. In local development it binds to loopback port `4445`; in production it is reachable only over the private Compose network. External applications use the public issuer on port `4444` or its production HTTPS hostname.

Start the local protocol engine with:

```bash
docker compose up -d hydra
```

New application registrations are synchronized to Hydra as public clients (`token_endpoint_auth_method=none`) supporting authorization code and refresh-token grants. Clients must use S256 PKCE. Existing application clients created before Hydra was enabled should be revoked and registered again.
