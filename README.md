# AuthFlow Builder

AuthFlow Builder is a configuration-driven authentication experience builder for product teams and non-technical owners. The same validated configuration will drive the visual builder, live preview, runtime UI, JSON export, and future ChatGPT tools.

All 15 planned MVP phases are complete: architecture, persistence, owner sessions, project APIs, the strict AuthFlow schema, accessible configuration-driven rendering, the visual builder, recoverable drafts, project-scoped authentication, verification and recovery, Google OAuth, branding, export, structured tools, security hardening, automated browser tests, and deployment preparation.

## Start locally

1. Install Node 24.11+, pnpm 11.19+, and Docker Desktop.
2. Copy `.env.example` to `.env.local` and replace `AUTH_SECRET` with at least 32 random characters.
3. Start PostgreSQL and apply the migration.

```bash
pnpm install
docker compose up -d
pnpm db:deploy
pnpm db:smoke
pnpm dev
```

Open `http://localhost:3000`. The health contract is at `http://localhost:3000/api/health`.
Database readiness is available at `http://localhost:3000/api/ready`.

The standalone authentication renderer preview is available at `http://localhost:3000/preview`.

Owner authentication is available at `/sign-up` and `/sign-in`; authenticated project management is at `/dashboard`.

Each active project has a real hosted authentication page at `/auth/:projectId`. It supports project-scoped email/password signup, sign-in, session validation, sign-out, email/phone verification challenges, and password recovery. Delivery is enabled only when the server-side webhook adapter is configured; the application never reports fake delivery success.

## Quality gate

```bash
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

Read [the full MVP plan](docs/MVP-PLAN.md), the [deployment guide](docs/DEPLOYMENT.md), the [operations runbook](docs/RUNBOOK.md), the [Phase 15 delivery note](docs/PHASE-15.md), and the [security policy](SECURITY.md).

## Security posture

This repository does not contain fake authentication success paths. Email/password execution uses Better Auth's maintained scrypt implementation, hashed opaque runtime sessions, project-scoped identities, database rate limits, and server authorization boundaries. OAuth, OTP, verification delivery, and password reset are not presented as successful until their real adapters are implemented. Never commit `.env` files or expose provider secrets through `NEXT_PUBLIC_` variables.
