# Production launch checklist

This checklist is for an AuthFlow Builder service that will process real user
identities. Complete it for staging first, then repeat the relevant items for
production. A green build or a reachable URL alone is not sufficient.

## Infrastructure

- [ ] Production `APP_URL` is the exact HTTPS public origin.
- [ ] `DATABASE_URL` points to managed PostgreSQL with TLS, backup retention,
  point-in-time recovery, and a least-privileged runtime role.
- [ ] A restore drill has been documented and meets business-approved RPO/RTO.
- [ ] `AUTH_SECRET`, Hydra secrets, database credentials, delivery credentials,
  and provider credentials are held only in a secret manager.
- [ ] The application, migration job, and maintenance job use separate least-
  privilege identities where the platform supports them.
- [ ] TLS termination, security headers, request limits, and proxy headers are
  configured at the trusted edge.
- [ ] Hydra administrative endpoints and PostgreSQL are private-network only.
- [ ] A scheduled cleanup job runs and alerts on failure.

## Identity and providers

- [ ] Owner sign-up, sign-in, sign-out, password reset, and session expiry are
  exercised in staging.
- [ ] The delivery adapter uses a real HTTPS endpoint and signature secret.
  Verify that email/SMS can be delivered, expired, rate limited, and audited.
- [ ] Google (or any social provider) has production callback URLs, consent
  screen details, and server-only credentials configured.
- [ ] Every public OIDC client has exact redirect URIs, expected scopes, and
  Authorization Code + S256 PKCE tested.
- [ ] Consent approval, consent denial, token exchange, UserInfo, refresh
  rotation, and logout/revocation behavior are tested using non-production
  test accounts before customer enablement.

## Security and privacy

- [ ] Branch protection and required CI are active on `main`.
- [ ] Secret-scanning alerts are enabled and a history review has been done.
- [ ] Dependencies are reviewed; high-severity findings are triaged before launch.
- [ ] Error tracking redacts passwords, cookies, OTPs, reset links, OAuth
  codes, token values, verifier/state values, and sensitive profile claims.
- [ ] Audit logs, retention, access controls, and deletion/export policies have
  a documented owner.
- [ ] A privacy policy, terms, support contact, and vulnerability-reporting
  path are available to users.
- [ ] An incident lead, notification process, and credential-rotation process
  are named and rehearsed.

## Observability and acceptance

- [ ] `/api/health` and `/api/ready` are monitored externally.
- [ ] Alerts cover elevated 5xx responses, readiness failures, database
  capacity, migration/cleanup failures, provider failures, and unusual auth
  rate-limit blocks.
- [ ] A deployment has been rolled back safely in staging after a schema-
  compatible change.
- [ ] Accessibility checks cover keyboard navigation, focus, labels, errors,
  responsive layouts, and the configured signup fields.
- [ ] A tenant-isolation test confirms one owner cannot read or edit another
  project's configuration, integrations, or runtime identities.
- [ ] Product owners have reviewed every configured label, consent text,
  redirect destination, and brand asset in the hosted flow.

## Sign-off

Record the deployment version, date, owner, completed checks, known risks, and
rollback contact in your release system. Any unchecked critical item should be
an explicit launch decision, not an accidental omission.

