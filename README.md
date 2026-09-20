# AuthFlow Builder

AuthFlow Builder is a configuration-driven authentication experience builder for product teams and non-technical owners. The same validated configuration will drive the visual builder, live preview, runtime UI, JSON export, and future ChatGPT tools.

Phases 1 through 5 are complete: architecture, application shell, PostgreSQL/Prisma persistence, Better Auth owner sessions, owner-scoped project APIs, versioned configuration storage, audit events, the strict AuthFlow schema, safe defaults, templates, the accessible configuration-driven renderer, and the visual authentication builder.

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

The standalone authentication renderer preview is available at `http://localhost:3000/preview`.

Owner authentication is available at `/sign-up` and `/sign-in`; authenticated project management is at `/dashboard`.

## Quality gate

```bash
pnpm check
```

Read [the full MVP plan](docs/MVP-PLAN.md) and the [Phase 5 delivery note](docs/PHASE-5.md). The next implementation stage is Phase 6: hardening the live-preview editing workflow with draft recovery, conflict resolution, and broader interaction coverage.

## Security posture

This repository does not contain fake login, OAuth, OTP, or password-reset success paths. Authentication execution will be added only with real framework/provider adapters and the security controls described in the plan. Never commit `.env` files or expose provider secrets through `NEXT_PUBLIC_` variables.
