# Phase 13 — Security review and threat model

Phase 13 reviews the MVP as a multi-tenant authentication service rather than as a UI feature. The review covers the owner control plane, public project-scoped authentication runtime, verification and recovery delivery, Google OAuth, exports, and structured tools.

## Assets and security objectives

Critical assets are owner sessions, runtime-user password hashes, runtime sessions, challenge and reset secrets, OAuth client credentials, PKCE verifiers and state, delivery credentials, project configurations, tenant ownership, audit events, and end-user profile data.

The primary objectives are tenant isolation; authentication integrity; confidentiality of secrets and profile data; single-use, time-bound recovery and OAuth transactions; availability under abusive traffic; and a trustworthy audit trail.

## Trust boundaries

1. The browser is untrusted. Every owner mutation is authenticated, same-origin checked, schema validated, and ownership scoped on the server.
2. Public runtime routes accept hostile input. They use strict Zod schemas, project binding, generic credential/recovery errors, database-backed limits, and secret-free logs.
3. PostgreSQL is the authoritative state boundary. Security-sensitive lookups include project IDs, and atomic updates enforce one-time token consumption and optimistic configuration versions.
4. Google and the delivery webhook are external systems. Credentials remain server-only, outbound calls have fixed destinations or configured HTTPS endpoints, and failures do not become fake success.
5. Structured tools are untrusted callers. They require declared scopes and owner context, then call the same application services as the dashboard.

## Threats and controls

| Threat | Control | Status |
| --- | --- | --- |
| Cross-tenant project access (IDOR) | Owner ID is included in project reads/writes; unauthorized IDs return not found; authorization tests cover known foreign IDs. | Mitigated |
| Password disclosure or offline compromise | Better Auth scrypt implementation; plaintext is never persisted; password policy is server-enforced. | Mitigated |
| Credential stuffing and brute force | Generic sign-in errors, dummy password verification for missing accounts, project/identity/IP-derived database limits, hashed session tokens. | Mitigated |
| Recovery/verification enumeration | Generic accepted responses and identical pre-lookup rate-limit consumption for existing and absent identifiers. | Mitigated in Phase 13 |
| OTP/reset replay or guessing | HMAC-only persistence, TTL, attempt caps, resend cooldowns, atomic single-use consumption. | Mitigated |
| OAuth login CSRF/code interception | 256-bit state, state hashing, ten-minute expiry, atomic consumption, S256 PKCE, project-bound callback, verified Google email. | Mitigated |
| CSRF | Same-origin enforcement on state-changing dashboard, tool, and runtime routes; `SameSite=Lax` HTTP-only cookies. | Mitigated |
| XSS and unsafe tenant content | React encoding, strict configuration strings, no executable validation, no inline tenant markup, CSP, safe logo URL policy. | Mitigated with residual CSP item below |
| Clickjacking/cross-origin isolation | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP/CORP, MIME sniffing disabled. | Mitigated in Phase 13 |
| Sensitive response caching | Runtime authentication success and error responses explicitly use `private, no-store`. | Mitigated in Phase 13 |
| Insecure production origin | Production environment validation rejects non-HTTPS `APP_URL`; secure cookies are enabled in production. | Mitigated in Phase 13 |
| Secret leakage through export/tools | Configuration schema contains references and enablement only; export and tool results omit credentials and stored authentication records. | Mitigated |
| Supply-chain advisories | Frozen lockfile, pnpm supply-chain policy, patched transitive overrides, and a production audit CI gate. | Mitigated in Phase 13 |

## Findings resolved in this phase

- Closed a recovery and verification enumeration oracle caused by applying request limits only after a successful account lookup.
- Added explicit private/no-store caching policy to runtime authentication responses, including errors.
- Added COOP, CORP, and cross-domain-policy denial headers.
- Made production configuration fail closed when the public application URL is not HTTPS.
- Patched transitive `deepmerge-ts` and unused MySQL-driver advisories and verified a clean production dependency audit.

## Accepted and deferred risks

- The CSP currently permits inline framework scripts and styles required by the present Next.js rendering path. A nonce-based CSP is a deployment hardening item; tenant-controlled HTML and script are never accepted.
- Forwarded IP headers are trustworthy only when a controlled reverse proxy overwrites them. Identity limits remain active, but production IP-based protections require that proxy configuration.
- PostgreSQL rate-limit rows, expired challenges, sessions, and OAuth transactions need scheduled retention cleanup before sustained production traffic.
- The local structured-tool HTTP adapter uses owner sessions. A public remote MCP deployment still needs standards-compliant OAuth issuer, audience, expiry, and scope verification.
- Audit events are database records, not an immutable external ledger. Production should stream security events to append-only monitoring with redaction and alerting.
- Availability still depends on infrastructure-level request size limits, connection limits, WAF/CDN controls, database backups, and restore drills.

## Verification

Security regression coverage includes tenant authorization, origin checks, unsafe redirects and logos, password policy, dummy-hash sign-in behavior, database limits, challenge expiry/attempt/replay behavior, OAuth state/PKCE/replay checks, scoped tools, non-cacheable auth responses, and production HTTPS enforcement. The complete gate also validates Prisma, strict lint, TypeScript, all tests, the production build, and the production dependency audit.
