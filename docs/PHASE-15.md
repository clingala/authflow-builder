# Phase 15 — Deployment and operations

Phase 15 completes the planned MVP foundation with production packaging and operating procedures. It does not deploy to a vendor or claim production readiness without the owner's infrastructure, credentials, backups, monitoring and review.

## Delivered

- Multi-stage, non-root Next.js standalone Docker image.
- Separate migration and retention-maintenance image targets.
- Single-host production Compose reference with migration ordering and read-only application filesystem.
- Liveness and database-backed readiness endpoints.
- Bounded cleanup for expired authentication records with unit coverage.
- Immutable deployment IDs for rolling-version skew protection.
- CI container build gate.
- Deployment, secret, proxy, migration, backup, monitoring, incident and rollback documentation.

## Required before public launch

Provision managed PostgreSQL with TLS/PITR, a production secret manager, TLS proxy/load balancer, centralized redacted logs, metrics/alerts, an email delivery adapter, optional SMS and Google credentials, scheduled cleanup, backups and restore drills. Complete privacy/legal review for collected profile fields and retention. Perform an independent application/security review and staging load/abuse tests.

## Verification

The phase gate validates Prisma, lint, TypeScript, unit/component/service tests, production build, desktop/mobile Playwright journeys, production dependency audit, Compose expansion and the final runner image build.
