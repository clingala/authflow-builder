# Contributing to AuthFlow Builder

Thank you for helping make authentication infrastructure safer and easier to integrate.

## Before opening a change

- Discuss large features in an issue before implementation.
- Report vulnerabilities privately according to `SECURITY.md`; never include secrets or real user data in an issue.
- Keep changes configuration-driven, tenant-isolated, accessible, and vendor-neutral.
- Do not add fake authentication success paths or custom cryptography.

## Local workflow

1. Fork the repository and create a focused branch.
2. Copy `.env.example` to `.env.local` and replace every development secret.
3. Run `corepack pnpm install` and `docker compose up -d`.
4. Run `corepack pnpm db:deploy` and `corepack pnpm dev`.
5. Add tests for behavior and security boundaries you change.
6. Run `corepack pnpm check` before opening a pull request.

Use Conventional Commit-style subjects where practical, such as `feat:`, `fix:`, `docs:`, or `test:`. Pull requests should explain the motivation, security impact, test evidence, and deployment changes.

By contributing, you agree that your contributions are licensed under the Apache License 2.0.
