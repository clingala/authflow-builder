# Production deployment

AuthFlow Builder ships as a stateless Next.js standalone container backed by PostgreSQL. Put a managed TLS load balancer or reverse proxy in front of the application; do not expose the Node server or database directly to the internet.

## Release sequence

1. Build one immutable image from a reviewed commit with `DEPLOYMENT_VERSION` set to the commit SHA.
2. Back up PostgreSQL and verify the most recent restore drill.
3. Run the Dockerfile `migrate` target as a one-shot job with production `DATABASE_URL`.
4. Stop if migration exits non-zero. Never allow application replicas to run migrations during startup.
5. Deploy the same `runner` image to every replica, using a rolling update with a 30-second termination grace period.
6. Require `/api/health` for liveness and `/api/ready` for traffic readiness.
7. Run smoke checks for owner sign-in, project read, hosted authentication rendering, and provider configuration without sending a real customer challenge.
8. Monitor error rate, latency, database saturation, authentication failures, delivery failures and OAuth failures through the observation window.

`compose.production.yaml` is a single-host reference, not a substitute for managed production infrastructure. It demonstrates the migration-before-app dependency, non-root/read-only application container, database health check and secret injection. Production should use a managed PostgreSQL service with point-in-time recovery.

For the first managed staging deployment, follow the service-by-service
[Railway guide](RAILWAY.md). It preserves the same migration-before-traffic
contract and keeps Hydra's administrative API on private networking.

## Images and jobs

```bash
docker build --target runner --build-arg DEPLOYMENT_VERSION=<commit-sha> -t authflow-builder:<commit-sha> .
docker build --target migrate -t authflow-builder-migrate:<commit-sha> .
docker build --target maintenance -t authflow-builder-maintenance:<commit-sha> .
```

Run `pnpm db:cleanup` or the `maintenance` image hourly. The job removes expired owner verification/session data, expired rate limits, challenges and OAuth transactions, runtime sessions seven days after expiry/revocation, and runtime auth events after one year. Audit events and configuration history are not automatically deleted.

## Required runtime secrets and configuration

| Name | Requirement |
| --- | --- |
| `DATABASE_URL` | PostgreSQL TLS connection string from the secret manager; use a least-privileged runtime role after migrations. |
| `AUTH_SECRET` | At least 32 random bytes; rotation requires a planned session invalidation strategy. |
| `APP_URL` | Exact public HTTPS origin. Production startup validation rejects HTTP. |
| `DEPLOYMENT_VERSION` | Immutable build identifier used for Next.js version-skew protection. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Server-only Google OAuth credentials and exact callback registration. |
| `AUTHFLOW_DELIVERY_WEBHOOK_URL` / `AUTHFLOW_DELIVERY_WEBHOOK_SECRET` | HTTPS delivery adapter endpoint and signing secret. |

Do not bake runtime secrets into images, CI variables printed to logs, source files, or `NEXT_PUBLIC_` variables. Use the deployment platform's secret manager and restrict read access to the app/migration job identities. Database passwords placed inside URLs must be URL-encoded.

## Network and proxy requirements

- Terminate TLS at a trusted proxy and redirect HTTP to HTTPS.
- Overwrite, rather than append untrusted, `Forwarded`, `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers.
- Allow only the proxy to reach port 3000 and only application/migration identities to reach PostgreSQL.
- Apply request-body, connection, and per-IP limits at the edge; preserve application identity/project limits.
- Use sticky behavior only if required by future stateful features. Current auth state is database-backed.
- Use the same build and deployment ID across replicas. Add shared cache coordination before introducing ISR or cached tenant data.

## Database changes and rollback

Prisma migrations are forward-only release artifacts. Review SQL before deployment, test it against a production-sized staging copy, and prefer expand/migrate/contract changes. Roll back application code only when the old version is compatible with the migrated schema. For an incompatible or destructive migration, stop deployment and restore into a new database from the pre-release backup; do not improvise reverse SQL in an incident.

## Backup policy

- Enable encrypted daily snapshots and continuous point-in-time recovery with a retention period matching business and regulatory needs.
- Store backups in a separate failure domain and restrict deletion privileges.
- Perform and record quarterly restore drills into an isolated environment.
- Verify schema, row counts, project/config access and a sampled authentication flow after restore.
- Never use production secrets to send email, SMS or OAuth traffic from a restored environment.
