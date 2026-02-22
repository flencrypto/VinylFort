# PRIVACY.md

## Assumptions
- VinylFort processes user-uploaded images and text extracted from those images.
- Deployment may serve UK/EU users and must align with UK GDPR/GDPR principles.

## Scope
Data minimization, retention, deletion, and transparency requirements.

## Data categories
- Account/contact data (if auth is enabled): email, profile identifiers.
- Content data: uploaded images, OCR text, listing drafts.
- Operational metadata: timestamps, request IDs, source provenance for pricing.

## Lawful handling principles
- Collect only data necessary for listing generation and diagnostics.
- Separate operational logs from user content.
- Avoid storing raw uploaded media longer than required.

## Retention policy (baseline)
- Uploaded images: default TTL 30 days (configurable by policy).
- OCR text and generated drafts: retained until user deletion or account closure.
- Request logs: 30–90 days, redacted for PII/secrets.
- Pricing provenance records: retain for auditability with pseudonymized user linkage.

## User rights workflow
- Export: provide user-readable export of listing drafts and associated metadata.
- Deletion: delete account data and purge linked content within defined SLA.
- Rectification: allow edits/corrections to saved listing data.

## Privacy by design requirements
- Default private storage for uploads and drafts.
- Role-restricted access for operational/admin tools.
- Data processing inventory and DPIA maintained for major feature additions.

## Third-party processors
- Document each processor and data category shared.
- Use DPAs where required.
- Review non-API public data sources before automation; require explicit permission/licensing.
