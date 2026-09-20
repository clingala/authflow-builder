# Phase 7 delivery — Project-scoped authentication runtime

Phase 7 connects generated AuthFlow login and registration pages to real email/password execution. Owner accounts and generated end-user accounts remain separate security domains.

## Architecture decision

Better Auth core users require a globally unique email. Reusing the owner-auth tables or adding only project membership would merge credentials for the same email across unrelated customer projects. That violates AuthFlow's independent-project boundary.

The runtime therefore uses dedicated `(projectId, email)` identities and project-scoped sessions. Password hashing delegates to Better Auth's maintained scrypt implementation rather than implementing cryptography. This preserves framework-grade password handling while allowing the relational model to enforce tenant isolation.

## Delivered

- Dedicated `runtime_users`, `runtime_sessions`, `runtime_auth_events`, and `runtime_rate_limits` tables with cascading project ownership.
- The same email can independently register in different projects; duplicate email is rejected within one project.
- Server-side dynamic registration validation against the active AuthFlow schema and configured password policy.
- Better Auth scrypt password hashing and verification; plaintext passwords never enter stored profile data, audit records, or logs.
- Cryptographically random 256-bit session tokens; only SHA-256 token hashes are persisted.
- Project-specific HTTP-only, `SameSite=Lax`, production-secure session cookies with seven-day expiry and server-side revocation.
- Database-backed identity and IP attempt limits with `429`, `Retry-After`, and HMAC-derived keys.
- Generic login failures plus dummy password verification for missing accounts to reduce enumeration and timing differences.
- Verification gates that refuse to issue sessions when configured email or phone verification is incomplete. Phase 8 will provide the real challenge and delivery lifecycle.
- Redacted runtime security events for signup, sign-in, sign-out, failures, blocks, and rate limits.
- Hosted generated pages at `/auth/:projectId`, connected to signup, sign-in, and sign-out APIs.
- Dashboard links to each project's hosted authentication experience.

## Runtime endpoints

```text
POST /api/runtime/projects/:projectId/sign-up
POST /api/runtime/projects/:projectId/sign-in
GET  /api/runtime/projects/:projectId/session
POST /api/runtime/projects/:projectId/sign-out
GET  /auth/:projectId
```

Cookie-authenticated writes require a matching public origin. Deployments behind a proxy must overwrite trusted forwarding headers; client-supplied forwarding headers must not pass through unchanged.

## Security boundary

Runtime API responses return only identity and verification state, not the stored dynamic profile. Registration storage contains validated non-password fields only. Audit metadata records reason codes, never credentials, form values, raw IP addresses, cookies, or tokens. Configuration remains untrusted until parsed by the server schema.

## Testing and verification

Automated coverage includes tenant-duplicate behavior, configured password policies, no plaintext persistence, hashed session storage, generic credential failures, dummy verification, verification blocking, cross-project session denial, revocation, attempt limits, hosted form submission, and configured public error messages.

Browser/PostgreSQL QA created a real project-scoped customer, inspected the stored scrypt hash, signed out, and signed back in through the generated page. No owner-table record was used for the runtime identity.

## Deferred

Phase 8 adds hashed verification/recovery challenges, email delivery adapters, phone OTP adapters, expiration, resend cooldowns, attempt limits, and single-use password-reset transactions. Phase 9 adds real Google OAuth with state and PKCE. Username/phone credential login execution also remains outside this email/password phase.
