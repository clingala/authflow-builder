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
