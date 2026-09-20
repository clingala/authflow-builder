# Phase 2 delivery — database and project management

Completed 2026-09-20.

## What was built

- PostgreSQL 17 local service definition and a reviewable Prisma migration.
- Prisma ORM 7 schema/client for Better Auth users, sessions, accounts, verification records, projects, immutable configuration versions, and audit events.
- Lazy, fail-closed runtime environment and database initialization so builds do not require a database while requests do require explicit secrets and connection details.
- Better Auth email/password owner authentication with 12-character minimum passwords, database sessions, secure-cookie production mode, trusted-origin checking, and no simulated provider success paths.
- Real sign-up/sign-in pages and an authenticated project dashboard.
- Owner-scoped project application service and Prisma repository.
- Project create/list/read/update/archive endpoints plus configuration read/save endpoints.
- Atomic initial configuration creation and audit emission.
- Immutable configuration versions with SHA-256 integrity metadata, 64 KiB input limit, and optimistic revision conflict responses.
- Same-origin enforcement on cookie-authenticated custom write endpoints.
- Stable JSON error contracts that do not reveal whether another owner possesses a requested project ID.

## Main files created or changed

- `prisma/schema.prisma`
- `prisma/migrations/20260920030000_phase_2_foundation/migration.sql`
- `prisma.config.ts`
- `compose.yaml`
- `src/lib/auth/*`
- `src/lib/db/prisma.ts`
- `src/lib/env/*`
- `src/modules/projects/*`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/v1/projects/**`
- `src/app/(auth)/**`
- `src/app/dashboard/page.tsx`
- `src/components/auth/auth-form.tsx`
- `src/components/dashboard/project-dashboard.tsx`

## Security decisions

- Ownership is part of every repository query. Routes do not fetch a project and authorize it afterward.
- Cross-owner access returns the same `NOT_FOUND` response as a nonexistent ID.
- Project/config writes require a matching `Origin` header in addition to the authenticated HTTP-only session cookie.
- Configuration changes append a new version; they never mutate prior versions.
- Concurrent saves with the same version resolve to one success and one `REVISION_CONFLICT` rather than silent last-write-wins behavior.
- Audit metadata contains field names, versions, and configuration hashes—not configuration bodies, credentials, cookies, or passwords.
- Provider secrets remain outside exported/stored AuthFlow JSON.

## Verification

- Prisma schema validation passes.
- ESLint passes with zero warnings.
- Strict TypeScript checking passes.
- Eleven unit/security tests pass, including cross-owner access, list scoping, CSRF origin enforcement, stale-version conflicts, size bounds, environment validation, headers, and health contracts.
- The optimized Next.js production build passes.
- PostgreSQL 17.11 started successfully in Docker Desktop and the committed migration applied cleanly.
- The maintained `pnpm db:smoke` test proved real project persistence, version `1 → 2`, two audit events, cross-owner denial with a known project ID, and complete test-data cleanup.
- Database inspection confirmed eight application tables, one completed migration, and zero residual smoke-test users.

The Docker PostgreSQL service is exposed on `127.0.0.1:5432`. The explicit IPv4 address avoids intermittent Windows/Docker `localhost` resolution failures. Full browser sign-up/sign-in testing still requires a local `.env.local` containing a private `AUTH_SECRET`; no secret was generated or persisted automatically.

## Deliberately deferred

- The complete AuthFlow Zod schema and semantic refinements are Phase 3.
- Email verification delivery, OTP, recovery, and Google OAuth are later adapter phases.
- Production rate-limit storage is not yet configured.
- The Phase 2 dashboard proves authorized project creation/listing; the full builder begins in Phase 5.
