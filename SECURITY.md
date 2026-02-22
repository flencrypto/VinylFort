# SECURITY.md

## Assumptions

- VinylFort will be deployed as a web app with server-side endpoints handling third-party API credentials.
- User-uploaded images may contain sensitive personal data.

## Scope

Minimum security baseline for development, deployment, and operations.

## Security baseline

### 1) Secrets and credentials

- No secrets in client code, localStorage, or committed files.
- Store secrets in environment manager/Vault/KMS with rotation policy.
- Use least-privilege tokens per integration (Discogs/eBay/AI).

### 2) API and input hardening

- Validate all API inputs at edge with schema validation (recommended: Zod).
- Enforce timeout + retry-with-jitter + bounded concurrency for outbound HTTP.
- Block SSRF-sensitive destinations (metadata/link-local/private ranges unless explicitly allow-listed).

### 3) Authentication and authorization

- Default-deny authorization model.
- Short-lived access tokens and rotating refresh tokens where auth is introduced.
- Mutating endpoints require idempotency keys.

### 4) Browser and transport controls

- Enforce HTTPS (TLS 1.2+, prefer 1.3).
- Set strict response headers:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - minimal `Permissions-Policy`

### 5) Upload security

- Enforce file type/size allow-list server-side.
- Store uploads outside web root.
- Add malware scanning for production uploads.

### 6) Abuse prevention and reliability

- Global and route-level rate limits.
- Request and job queue caps; dead-letter handling for failures.
- Structured logs with request ID; never log secrets or raw tokens.

## Security testing requirements

- SAST and dependency audit on CI.
- Regression tests for each security defect.
- No live network in tests; mock external APIs.

## Incident response (minimum)

- Maintain on-call contacts and escalation matrix.
- Preserve timestamped audit logs.
- Publish post-incident review with remediation actions.
