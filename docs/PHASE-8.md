# Phase 8 delivery — Verification and account recovery

Phase 8 turns the existing verification gate and recovery preview into real server-side challenge lifecycles. Delivery remains vendor-neutral and cannot silently fall back to a mock provider.

## Delivered

- Project-scoped `runtime_challenges` with hashed secrets, purpose/channel binding, TTL, attempt counters, resend cooldowns, and single-use consumption.
- Email verification links, email OTP, phone SMS OTP, email recovery links, email recovery OTP, and phone recovery OTP domain contracts.
- A server-only HTTPS delivery adapter authenticated with a bearer secret. An unconfigured installation returns `DELIVERY_UNAVAILABLE` before account lookup, preserving recovery enumeration resistance.
- Verification request/confirm and recovery request/reset APIs with same-origin protection, Zod validation, stable errors, rate limits, and redacted audit events.
- Password recovery enforces the active project's password policy, hashes the replacement with Better Auth's scrypt implementation, and revokes every active session in the same database transaction.
- Hosted runtime screens now request verification delivery, accept OTP values, request recovery, and complete password resets.
- Missing-account recovery requests return the same accepted response and perform no delivery.

## Runtime endpoints

```text
POST /api/runtime/projects/:projectId/verification/request
POST /api/runtime/projects/:projectId/verification/confirm
POST /api/runtime/projects/:projectId/recovery/request
POST /api/runtime/projects/:projectId/recovery/reset
```

## Delivery adapter

Set `AUTHFLOW_DELIVERY_WEBHOOK_URL` and `AUTHFLOW_DELIVERY_WEBHOOK_SECRET` on the server. The webhook receives a typed delivery payload with a short-lived code or link. Its implementation owns vendor credentials for transactional email and SMS; those credentials never enter AuthFlow configuration or frontend bundles.

The webhook should authenticate the bearer token, enforce HTTPS, avoid logging secrets, render branded templates, and return a non-2xx response when the provider rejects delivery. Production deployments should rotate the bearer secret and restrict network access where possible.

## Security properties

- Raw OTP and reset-token values are never persisted.
- Challenge secrets are HMAC-SHA-256 digests keyed by `AUTH_SECRET`.
- Challenge lookup is bound to project, purpose, and a hashed destination.
- Successful confirmation atomically marks a challenge consumed; replay fails.
- Invalid attempts and expiration have distinct stable error codes without exposing stored secrets.
- Recovery lookup is project-scoped and returns generic acceptance for absent identities.
- A successful password reset invalidates prior sessions.

## Testing

Automated tests cover hashed OTP storage, invalid attempts, one-time verification, expiry, missing-account enumeration resistance, scrypt replacement-password handling, session revocation, and reset-token replay denial. The full repository quality gate validates Prisma, lint, TypeScript, Vitest, and the Next.js production build.

## Deferred

Provider-specific email/SMS packages and credentials are deployment choices. Phase 9 adds real Google OAuth; MFA, passkeys, authenticator apps, and additional social providers remain future extensions.
