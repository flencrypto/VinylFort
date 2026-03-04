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

## Install on your phone

VinylFort is a **Progressive Web App (PWA)**. You can install it to your phone's home screen for a full-screen, app-like experience with no app store required.

### Android (Chrome)

1. Open the VinylFort URL in **Chrome for Android**.
2. Tap the **⋮ (three-dot) menu** in the top-right corner.
3. Tap **"Add to Home screen"** (or **"Install app"** if Chrome shows a banner at the bottom of the screen).
4. Confirm by tapping **"Add"** or **"Install"** in the dialog.
5. The **VinylFort** icon will appear on your home screen. Tap it to launch the app in full-screen mode.

> **Tip:** If you don't see the option, make sure you are on `https://` — PWA installation requires a secure connection.

### Android (Samsung Internet)

1. Open the VinylFort URL in **Samsung Internet**.
2. Tap the **☰ (hamburger) menu** at the bottom of the screen.
3. Tap **"Add page to"** → **"Home screen"**.
4. Tap **"Add"** to confirm.

### iOS (Safari — iPhone & iPad)

1. Open the VinylFort URL in **Safari** (other iOS browsers cannot install PWAs).
2. Tap the **Share button** (the box with an arrow pointing up) at the bottom of the screen.
3. Scroll down and tap **"Add to Home Screen"**.
4. Edit the name if you wish, then tap **"Add"** in the top-right corner.
5. The **VinylFort** icon will appear on your home screen. Tap it to launch in full-screen mode.

> **Note:** iOS requires Safari specifically — Chrome and Firefox on iOS cannot install PWAs.

---

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
