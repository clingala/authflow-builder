# Open-source and release readiness

The repository is Apache-2.0 licensed and can be hosted publicly without
publishing a package. This document separates repository readiness from a
production service launch: publishing source code is reversible; exposing an
identity service with real customer data is not.

## Complete in the repository

- [x] Apache-2.0 license
- [x] Contribution guidance
- [x] Security reporting policy
- [x] Code of conduct
- [x] Issue and pull-request templates
- [x] CI workflow and Dependabot configuration
- [x] Architecture, deployment, operations, and integration documentation
- [x] Public, language-independent OIDC/OAuth integration contract

## Before announcing the project

1. Review Git history for credentials, `.env` files, copied database URLs,
   OAuth tokens, test inboxes, and personally identifiable data. If anything
   was committed, revoke it at the source before considering history cleanup.
2. Confirm repository visibility, collaborators, branch rules, and required CI
   checks are intentional.
3. Verify the default branch passes `pnpm check` from a fresh clone.
4. Check that README examples use placeholders and do not contain a real
   customer project, user account, client ID, or production token.
5. Create a GitHub release only from a reviewed commit. Start with a
   pre-release if API and schema contracts may still change.
6. Publish a short changelog/release note describing supported deployment and
   integration boundaries. Do not claim email, SMS, social login, or an SDK is
   production ready unless real credentials and operational monitoring have
   been verified.

## Recommended GitHub settings

- Protect `main`: require pull requests and the CI quality check; block force
  pushes and branch deletion.
- Enable Dependabot alerts and security updates.
- Require code review for changes to `prisma/`, authentication modules,
  workflow files, Dockerfiles, and deployment configuration.
- Restrict repository secrets to the smallest group possible. Repository
  secrets should not be copied into issue comments, logs, or release notes.
- Configure a private security advisory process according to `SECURITY.md`.

## Versioning and releases

Use semantic versioning once an external contract is supported:

- `0.x.y`: public preview; breaking changes can occur between minor versions.
- `1.0.0`: stable API/configuration and documented upgrade path.
- Patch releases: bug and security fixes without contract changes.

The root package remains `private` because AuthFlow Builder is an application,
not an npm library. Do not remove `private: true` or run `npm publish` unless a
separately designed SDK package and publication process are approved.

## Contributor verification commands

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

Run migrations and browser tests only against a disposable local database.
Never point test commands at production.

## Release gates that need an owner

These are intentionally not automated by the repository:

- Managed PostgreSQL with encrypted backups and a tested restore procedure
- Production secret manager and credential rotation plan
- Email/SMS delivery provider contracts and verified sending domains/numbers
- OAuth provider credentials and verified consent-screen/callback settings
- Custom domain, TLS, DNS, and edge rate limits
- Monitoring, alert routing, on-call ownership, and incident communications
- Privacy policy, terms, data-retention choices, and jurisdiction-specific review
- Independent security assessment and load testing appropriate to real usage

See [DEPLOYMENT.md](DEPLOYMENT.md) and [RUNBOOK.md](RUNBOOK.md) for operating
procedures. Do not mark a gate complete based only on a successful local or
demo deployment.

