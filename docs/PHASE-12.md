# Phase 12 — ChatGPT-compatible tool/API layer

Phase 12 exposes AuthFlow's application services as typed, transport-independent tools. The implementation follows the current OpenAI plugin guidance: every tool declares input and output schemas, security scopes, and accurate read/write annotations; every call is authorized and validated again on the server.

## Delivered

- Thirteen structured actions covering project creation/read, full configuration replacement, login, registration, fields, social login, verification, recovery, branding, preview, and export.
- Zod input schemas and a uniform structured result schema suitable for MCP `structuredContent`.
- `projects:read` and `projects:write` scope enforcement inside the tool service, before project data is loaded.
- Accurate `readOnlyHint`, `destructiveHint`, `openWorldHint`, and `idempotentHint` annotations.
- An authenticated tool catalog at `GET /api/v1/tools`, including JSON Schema input/output contracts and OAuth security metadata.
- An owner-session adapter at `POST /api/v1/tools/:toolName` for local product testing.
- Structured errors for unknown tools, missing scopes, invalid input, ownership failures, and revision conflicts.

## Security boundary

Tool calls do not execute arbitrary code and cannot provide custom validation expressions. Mutations load the owner-scoped project, clone its validated configuration, apply a narrow typed change, then pass the complete document through the normal AuthFlow schema and optimistic-version save path.

The model never receives or controls OAuth client secrets, password hashes, OTP values, reset tokens, sessions, encryption keys, or rate-limit policy. Preview results contain only a project-scoped path. Export results use the secret-free Phase 11 export service.

The current HTTP adapter uses the existing owner session and same-origin protection so it can be exercised safely inside the SaaS. A public remote MCP deployment still requires a standards-compliant OAuth authorization server that validates issuer, audience, expiry, and scopes on every request. The tool service is intentionally independent of that transport so the future MCP adapter cannot bypass application authorization.

## Tool actions

- `create_auth_project`
- `get_auth_project`
- `update_auth_project`
- `configure_login`
- `configure_registration`
- `add_registration_field`
- `remove_registration_field`
- `configure_social_login`
- `configure_verification`
- `configure_recovery`
- `configure_branding`
- `preview_auth_flow`
- `export_auth_config`

## Testing

Automated coverage verifies typed create/read operations, optimistic field updates, full-schema rejection when a security-required field is removed, scope enforcement, and cross-owner denial. The repository quality gate continues to run Prisma validation, strict lint, TypeScript, all Vitest suites, and the production build.

## Official guidance

The design follows the OpenAI documentation for [plugin architecture](https://developers.openai.com/plugins/concepts/plugins), [authentication](https://developers.openai.com/plugins/build/auth), and [tool metadata/reference](https://developers.openai.com/plugins/reference).
