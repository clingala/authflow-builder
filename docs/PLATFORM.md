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

This milestone does not claim to implement OAuth or OpenID Connect. Authorization Code + PKCE, signed tokens, discovery metadata, JWKS rotation, and confidential server clients must be implemented using reviewed standards-compliant libraries before AuthFlow is described as an identity provider.
