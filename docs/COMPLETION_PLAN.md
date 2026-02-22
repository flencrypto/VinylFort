# VinylFort Completion Plan

## Assumptions
- Existing UI/UX remains in place during the first hardening phase.
- Priority is secure deployment readiness, not visual redesign.
- Non-API data sources are manual-import only until explicit licensing/permission exists.

## Scope
This plan covers the path from static prototype to production-ready architecture.

## Phase 0 — Stabilize baseline (1 week)
- Refactor duplicated logic in `script.js` into small modules.
- Introduce linting + formatting + type-checking migration path (JS -> TS incrementally).
- Add unit-test harness (Vitest) and first coverage on deterministic utility logic.
- Add CI checks for lint + tests.

### Exit criteria
- Deterministic behavior for parsing/matching helpers covered by tests.
- CI required on pull requests.

## Phase 1 — Security and backend broker (1–2 weeks)
- Add serverless/API layer for all credentialed calls:
  - `/api/discogs/search`
  - `/api/discogs/release/:id`
  - `/api/ai/extract`
  - `/api/price/estimate`
- Remove all API secrets from browser storage/localStorage.
- Add rate limiting, retry with backoff, timeout guards, and request correlation IDs.

### Exit criteria
- Front-end no longer sends credentialed requests directly to third parties.
- All secrets are server-only environment variables.

## Phase 2 — Metadata identity and pricing provenance (2–3 weeks)
- Implement pressing matching with weighted signals:
  - barcode / release-id / catalog number / label / text similarity.
- Persist candidate rankings and rationale.
- Implement provenance-aware pricing model:
  - source tag, fetched_at, filters, currency normalization, outlier handling.

### Exit criteria
- Every suggested price includes source provenance and confidence band.

## Phase 3 — Compliance and resilience (1–2 weeks)
- Formalize data retention and deletion jobs.
- Add abuse controls (per-IP/per-user limits, bounded queues).
- Add audit logs that exclude secrets/PII.

### Exit criteria
- Published privacy policy and operator runbook.
- Evidence of retention enforcement.

## Phase 4 — Launch readiness (1 week)
- End-to-end smoke tests (photo intake -> matching -> listing draft).
- Error budget dashboards and alerts (RED metrics).
- Production deployment with staged rollback plan.

### Exit criteria
- Release checklist passes on staging and production.

## Non-goals (for now)
- Automated scraping of sites without explicit API/permission.
- Multi-region deployment and advanced ML model hosting.
