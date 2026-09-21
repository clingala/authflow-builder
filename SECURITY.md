# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository, or contact the repository owner privately if that feature is unavailable.

Include the affected commit, attack prerequisites, reproduction steps, impact, and any suggested mitigation. Do not include real passwords, OAuth credentials, session tokens, OTPs, personal data, or production database contents.

## Supported version

Security fixes are applied to the current `main` branch during MVP development. There are no supported historical release lines yet.

## Deployment responsibility

Operators must use HTTPS, a high-entropy `AUTH_SECRET`, separate production provider credentials, managed PostgreSQL with encrypted backups, a trusted reverse proxy that overwrites forwarding headers, restricted delivery-webhook egress, log redaction, and timely dependency updates. Never expose `.env` files or use `NEXT_PUBLIC_` for secrets.
