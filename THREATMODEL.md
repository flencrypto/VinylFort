# THREATMODEL.md

## Assumptions
- Architecture target: static front-end + serverless API broker + persistent storage.
- Primary external dependencies: Discogs, AI providers, marketplace APIs.

## Scope
High-level STRIDE threat model for VinylFort’s target architecture.

## Data flow (high-level)
1. User uploads image and metadata from browser.
2. Backend validates request, stores media, runs OCR/AI extraction.
3. Backend queries metadata/pricing providers.
4. Backend computes listing draft + pricing recommendation.
5. User reviews/exports listing draft.

## STRIDE summary

### S — Spoofing
- Risk: forged client requests or token replay.
- Mitigations:
  - signed/authenticated sessions,
  - short-lived tokens,
  - anti-replay controls and idempotency keys.

### T — Tampering
- Risk: manipulated pricing/provenance payloads or altered drafts.
- Mitigations:
  - server-side validation and canonicalization,
  - integrity checks on stored artifacts,
  - append-only provenance events.

### R — Repudiation
- Risk: no traceability of who changed listing/pricing decisions.
- Mitigations:
  - immutable audit events with request correlation IDs,
  - timestamped actor attribution.

### I — Information disclosure
- Risk: leaked API keys, PII in logs, exposed uploaded images.
- Mitigations:
  - server-only secrets,
  - log redaction,
  - private object storage + signed URL expiry,
  - strict CSP and security headers.

### D — Denial of service
- Risk: expensive OCR/AI endpoints abused at scale.
- Mitigations:
  - per-user/per-IP throttling,
  - queue and concurrency caps,
  - caching of repeated metadata requests,
  - circuit-breakers and fallback behaviors.

### E — Elevation of privilege
- Risk: unauthorized admin actions or cross-tenant data access.
- Mitigations:
  - default-deny RBAC/ABAC,
  - resource-scoped authorization checks,
  - tenancy-aware query filters and tests.

## Priority risk register
1. Client-side secret exposure (critical).
2. Unauthorized data access to uploads/drafts (high).
3. Third-party API abuse and quota exhaustion (high).
4. Inaccurate pricing output without provenance (medium).
5. Incomplete deletion/retention controls (medium).

## Validation checkpoints
- Pre-release threat model review.
- Security regression tests in CI.
- Quarterly review of processors and data flows.
