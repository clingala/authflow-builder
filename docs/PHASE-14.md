# Phase 14 — Automated testing

Phase 14 completes the MVP's layered automated test strategy. Fast Vitest suites continue to exercise configuration, domain services, route response contracts, authorization, and security state machines. Playwright now validates the built Next.js application in a real Chromium browser at desktop and mobile viewports.

## Test layers

| Layer | Scope | Failure caught |
| --- | --- | --- |
| Schema and domain unit tests | AuthFlow parsing, templates, migrations, validation and branding | Invalid or incompatible configuration |
| Service security tests | Tenant ownership, sessions, password policy, rate limits, challenges and OAuth | IDOR, replay, expiry and authentication regressions |
| Component tests | Builder and renderer semantics, errors, keyboard controls and configured labels | Accessibility and configuration-rendering regressions |
| Route contract tests | Health, origin checks, cache controls and stable error envelopes | HTTP boundary regressions |
| Playwright E2E | Production build, screen navigation, form semantics and responsive overflow | Browser integration and responsive regressions |

## Coverage added

- A foreign owner cannot save configuration even with a known project ID.
- OTP attempts stop at the configured maximum and resend cooldown prevents duplicate delivery.
- OAuth callbacks reject cross-project state, provider denial, incomplete callbacks and replay.
- The generated preview renders its configured signup fields and supports login, verification and recovery navigation.
- Preview navigation works from the keyboard and the experience has no document-level horizontal overflow at desktop or mobile dimensions.
- The deployed health endpoint keeps its public response contract.

## CI gate

CI installs only Chromium and its Linux dependencies after the regular production build, then runs the same Playwright suite in desktop Chrome and Pixel 7 profiles. A failed browser journey fails the workflow. Retries are CI-only and retain a trace on the first retry for diagnosis.

## Local commands

Run `pnpm check` for Prisma validation, lint, TypeScript, Vitest and a production build. Install the browser once with `pnpm exec playwright install chromium`, then run `pnpm test:e2e`. The Playwright web server uses the generated standalone production artifact on port 3100 and reuses an existing server locally when available.

## Deferred deployment tests

Provider sandbox tests, destructive migration rehearsals, backup restores, email/SMS deliverability and remote MCP OAuth conformance require deployed infrastructure and credentials. Phase 15 documents those staging and operations checks rather than simulating them as production success.
