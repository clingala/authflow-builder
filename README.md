# AuthFlow Builder

AuthFlow Builder is a configuration-driven authentication experience builder for product teams and non-technical owners. The same validated configuration will drive the visual builder, live preview, runtime UI, JSON export, and future ChatGPT tools.

Phase 1 is complete: architecture, application shell, module boundaries, security headers, health endpoint, tests, CI, and VS Code workspace settings.

## Start locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The health contract is at `http://localhost:3000/api/health`.

## Quality gate

```bash
pnpm check
```

Read [the full MVP plan](docs/MVP-PLAN.md) before beginning Phase 2.

## Security posture

This repository does not contain fake login, OAuth, OTP, or password-reset success paths. Authentication execution will be added only with real framework/provider adapters and the security controls described in the plan. Never commit `.env` files or expose provider secrets through `NEXT_PUBLIC_` variables.
