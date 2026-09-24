# Operations runbook

## Service indicators and alerts

Track request rate, p50/p95/p99 latency, 4xx/5xx rate, container restarts, readiness failures, PostgreSQL connection/CPU/storage/replication health, migration failures, cleanup-job failures, delivery-adapter errors, OAuth callback failures, login rate-limit blocks and recovery/verification attempt blocks. Logs must be structured and redact passwords, cookies, bearer tokens, OTPs, reset links, OAuth codes/state/verifiers and provider responses.

Page an operator for sustained readiness failure, elevated 5xx rates, migration failure, suspected tenant isolation failure, secret exposure, database exhaustion, or authentication bypass. Ticket non-urgent delivery/provider degradation with clear customer impact.

## Triage

1. Declare an incident, assign an incident lead and start an immutable timeline.
2. Determine scope: control plane, one project, runtime auth, delivery, OAuth, database or edge.
3. Check the deployed commit and deployment ID, `/api/health`, `/api/ready`, recent releases/jobs, database metrics and redacted application logs.
4. Contain before repairing: halt rollout, disable an affected provider, restrict traffic, revoke exposed credentials or place writes in maintenance mode using platform controls.
5. Preserve evidence and audit records. Do not copy secrets or user profiles into chat, tickets, or ad-hoc logs.
6. Recover using the procedures below, validate tenant isolation and authentication invariants, then monitor.
7. Complete a blameless review with corrective actions and owners.

## Common procedures

### Readiness fails while liveness succeeds

Check PostgreSQL reachability, TLS certificates, credentials, connection limits and migration status. Keep the replica out of rotation. Do not change readiness to return success while the database is unavailable.

### Migration fails

Do not start the new application version. Capture sanitized migration output, inspect `prisma_migrations`, and determine whether the transaction rolled back. Restore a staging copy and rehearse the repair. Escalate before modifying migration history.

### Delivery provider fails

The application intentionally returns delivery unavailable rather than fake success. Verify webhook health and credentials, inspect provider status, and communicate that verification/recovery delivery is degraded. Never log or manually transmit OTP/reset secrets.

Run `pnpm delivery:check` from a scheduled maintenance job to assess recent
delivery failures without exposing tenant or recipient data. Exit code 2 means
the configured failure threshold was reached; exit code 1 means the monitor
itself failed (including database access). Alert on either nonzero result, and
do not treat a failed monitor as proof that delivery is healthy. The default
window is 15 minutes and the default threshold is 5 failures; tune with
`DELIVERY_FAILURE_WINDOW_MINUTES` and `DELIVERY_FAILURE_ALERT_COUNT` after
reviewing normal traffic. Use a read-only database identity for this job.

### Google OAuth fails

Verify exact callback URLs, client status, server clock and provider availability. OAuth state/PKCE failures must remain generic to users. Do not bypass state verification or reuse consumed transactions.

### Suspected credential or secret exposure

Revoke the credential at its source, rotate it in the secret manager, redeploy, invalidate affected sessions/tokens, search sanitized access logs for use, notify security stakeholders and follow applicable disclosure obligations. Rotating `AUTH_SECRET` invalidates HMAC-bound material and must be coordinated.

### Rollback

Stop the rollout and redeploy the previously signed image only if it is schema-compatible. Validate health/readiness, owner access and a test project runtime flow. If the schema is incompatible, restore the pre-release backup to a new database and repoint only after integrity checks.

## Recovery objectives

Set business-approved RPO/RTO values before launch; the repository does not invent them. Verify that backup frequency, point-in-time recovery, provider recovery and staffing can meet those targets. Record every restore drill with duration, data-loss window and failed checks.
