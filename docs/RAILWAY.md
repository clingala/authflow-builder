# Railway staging deployment

Railway maps each Compose service to a separate Railway service. Use a staging
environment first; do not reuse production OAuth, email, SMS, or database
credentials.

## Service topology

Create one Railway project with these services:

1. `authflow-postgres` — managed Railway PostgreSQL for AuthFlow Builder.
2. `hydra-postgres` — a separate managed Railway PostgreSQL for Ory Hydra.
3. `hydra` — Docker image `oryd/hydra:v2.3.0`.
4. `authflow-builder` — GitHub source `clingala/authflow-builder`, branch
   `main`. Railway detects the root `Dockerfile` and `railway.json`.

Keep Hydra's administrative port private. Expose only its public OAuth port
through a Railway-generated HTTPS domain.

## AuthFlow Builder variables

Configure these in the `authflow-builder` service's Variables tab:

| Variable | Staging value |
| --- | --- |
| `DATABASE_URL` | Reference `authflow-postgres.DATABASE_URL`. |
| `AUTH_SECRET` | A newly generated secret containing at least 32 random bytes. |
| `APP_URL` | The exact generated HTTPS domain for this service, without a trailing slash. |
| `DEPLOYMENT_VERSION` | The deployed Git commit SHA. |
| `HYDRA_PUBLIC_URL` | The exact public HTTPS issuer for the `hydra` service. |
| `HYDRA_ADMIN_URL` | `http://${{hydra.RAILWAY_PRIVATE_DOMAIN}}:4445`. |
| `GOOGLE_CLIENT_ID` | Leave empty until a staging Google OAuth client exists. |
| `GOOGLE_CLIENT_SECRET` | Leave empty until a staging Google OAuth client exists. |
| `AUTHFLOW_DELIVERY_WEBHOOK_URL` | Leave empty until a real staging delivery adapter exists. |
| `AUTHFLOW_DELIVERY_WEBHOOK_SECRET` | Leave empty until the staging adapter is configured. |

The checked-in Railway configuration runs `prisma migrate deploy` as a
pre-deploy command and requires `/api/ready` to return `2xx` before traffic is
switched to the new deployment.

## Hydra variables and command

Configure the `hydra` service with:

| Variable | Staging value |
| --- | --- |
| `DSN` | Reference the separate `hydra-postgres` connection values using a PostgreSQL URL. |
| `SECRETS_SYSTEM` | A newly generated high-entropy staging secret. |
| `URLS_SELF_ISSUER` | The Hydra public HTTPS domain. |
| `URLS_LOGIN` | `${{authflow-builder.APP_URL}}/oauth/login`. |
| `URLS_CONSENT` | `${{authflow-builder.APP_URL}}/oauth/consent`. |
| `URLS_ERROR` | `${{authflow-builder.APP_URL}}/oauth/error`. |
| `SERVE_COOKIES_SAME_SITE_MODE` | `Lax`. |
| `SERVE_PUBLIC_CORS_ENABLED` | `true`. |

Run Hydra with `serve all`. Before its first start, run the one-shot command
`migrate sql -e --yes` against the Hydra DSN. Never publish port `4445`.

## Verification

After deployment:

1. Confirm `GET /api/health` returns `200`.
2. Confirm `GET /api/ready` returns `200` and database readiness is true.
3. Create a staging owner and project.
4. Render the hosted authentication page for that project.
5. Exercise the OAuth authorization-code flow with PKCE using a staging client.
6. Confirm no password, cookie, OTP, reset token, authorization code, PKCE
   verifier, provider secret, or database URL appears in logs.

Railway health checks gate deployment activation but are not continuous
monitoring. Add an independent uptime check and alerts before calling the
environment production-ready.

## Scheduled maintenance services

Create two additional GitHub-backed Railway services from the same reviewed
`main` commit. Do not expose public networking. For both, select the
**Dockerfile** builder and set **Dockerfile Path** to
`/Dockerfile.maintenance`. The image is a one-shot process and deliberately
does not run the web server or migrations. Configure `DATABASE_URL` as a
Railway reference to `authflow-postgres.DATABASE_URL` (prefer separate,
least-privileged database roles when available). Do not copy a database URL
into source control or a job log. Set **Restart Policy** to **Never** so a
failed run is observable rather than retried in a tight loop.

| Service | Start command | Cron schedule (UTC) | Purpose |
| --- | --- | --- | --- |
| `authflow-delivery-monitor` | `pnpm delivery:check` | `*/5 * * * *` | Aggregate delivery failures; exits 2 at the threshold and 1 if the check fails. |
| `authflow-retention-cleanup` | `pnpm db:cleanup` | `0 3 * * *` | Delete expired authentication data according to the retention implementation. |

The monitor defaults to a 15-minute window and five failures; optional
`DELIVERY_FAILURE_WINDOW_MINUTES` and `DELIVERY_FAILURE_ALERT_COUNT` must be
tuned to traffic. Route nonzero job exits and missing expected runs to an
operator-controlled alert destination. A scheduled service alone is **not**
alerting. Verify an initial successful run of each service and an alert test
before checking off the launch gate. Railway cron schedules use UTC, and a
still-running execution can cause the next scheduled execution to be skipped.

New Railway services cannot opt into the legacy `railway.json` config-as-code
flow. Configure these settings on the new services, then manage a future
migration of existing legacy configuration to Railway Infrastructure as Code
before the announced legacy end date. Do not attach the web service's health
check or migration pre-deploy command to a cron service.
