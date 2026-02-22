# VinylFort

## Assumptions

- This repository is currently a static web application (`index.html`, `style.css`, `script.js`) used to generate record listing drafts.
- The near-term goal is to make the project production-ready without rewriting the UI first.
- Credentialed third-party integrations (Discogs, AI providers, marketplace APIs) should move server-side before launch.

## Scope

This repository now includes a concrete completion plan and security/compliance baseline documents for the next implementation phase:

- Architecture and delivery roadmap.
- Security controls and operational requirements.
- Privacy and data-retention policy baseline.
- STRIDE-oriented threat model.

## How to run (current app)

1. Serve the repository with any static file server.
2. Open `index.html` in a browser.

Examples:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Current file tree (selected)

```text
.
├── index.html
├── style.css
├── script.js
├── components/
├── SECURITY.md
├── PRIVACY.md
├── THREATMODEL.md
└── docs/
    └── COMPLETION_PLAN.md
```

## Commands to run

```bash
python3 -m http.server 8080
node --check script.js
```

## Documentation added

- `docs/COMPLETION_PLAN.md` — phased completion plan with priorities and acceptance criteria.
- `SECURITY.md` — minimum security baseline and hardening checklist.
- `PRIVACY.md` — UK GDPR-oriented data handling and retention policy.
- `THREATMODEL.md` — STRIDE threat model and mitigations.
