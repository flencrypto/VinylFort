# VinylVault

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

## Installing VinylVault

VinylVault is a **Progressive Web App (PWA)**. You can install it on phones, tablets, and desktop computers for a full-screen, app-like experience with no app store required. An optional Android APK is also available for sideloading.

---

### 📱 Mobile — Android

#### Android: Chrome, Edge, or Brave

These three browsers share the same installation flow on Android.

1. Open the VinylVault URL in **Chrome**, **Edge**, or **Brave** for Android.
2. Tap the **⋮ (three-dot) menu** in the top-right corner.
3. Tap **"Add to Home screen"** (or **"Install app"** if an install banner appears at the bottom).
4. Confirm by tapping **"Add"** or **"Install"** in the dialog.
5. The **VinylVault** icon will appear on your home screen. Tap it to launch in full-screen mode.

> **Tip:** If the option is missing, make sure you are on `https://` — PWA installation requires a secure connection.

#### Android: Samsung Internet

1. Open the VinylVault URL in **Samsung Internet**.
2. Tap the **☰ (hamburger) menu** at the bottom of the screen.
3. Tap **"Add page to"** → **"Home screen"**.
4. Tap **"Add"** to confirm.

#### Android: Firefox

Firefox for Android does not currently support PWA installation. Use Chrome, Edge, Brave, or Samsung Internet instead.

---

### 📱 Mobile — iPhone & iPad (iOS / iPadOS)

#### iOS / iPadOS: Safari

1. Open the VinylVault URL in **Safari** (only Safari can install PWAs on iOS/iPadOS).
2. Tap the **Share button** (box with an arrow pointing up) at the bottom of the screen.
3. Scroll down and tap **"Add to Home Screen"**.
4. Edit the name if you wish, then tap **"Add"** in the top-right corner.
5. The **VinylVault** icon will appear on your home screen. Tap it to launch in full-screen mode.

> **Note:** Chrome, Firefox, and other browsers on iOS/iPadOS use Apple's WebKit engine and cannot install PWAs — Safari is required.

---

### 🖥️ Desktop — Windows, macOS, and Linux

#### Windows / macOS / Linux: Chrome, Edge, or Brave

Chrome, Edge, and Brave all share the same installation flow on every desktop OS (Windows, macOS, and Linux).

1. Open the VinylVault URL in **Chrome**, **Edge**, or **Brave**.
2. Look for the **install icon** (⊕ or a small screen icon) in the right-hand side of the address bar.  
   - If no icon appears, click the **⋮ menu** → **"Save and share"** (Chrome) or **"Apps"** (Edge) → **"Install VinylVault"**.
3. Click **"Install"** in the confirmation dialog.
4. VinylVault opens in its own window and a shortcut is added to your taskbar / Dock / desktop.

> **Tip:** You can also re-open it from your OS's application launcher or start menu just like any other app.

#### macOS: Safari (macOS Sonoma (14) or later)

Safari on macOS Sonoma (14) or later supports installing web apps directly to the Dock.

1. Open the VinylVault URL in **Safari**.
2. In the menu bar click **File** → **Add to Dock…** (macOS Sonoma (14) or later).
3. Edit the name if you wish, then click **"Add"**.
4. VinylVault appears in your Dock and runs as a standalone app.

> **Note:** The "Add to Dock" option requires **macOS Sonoma (14) or later**. On older macOS versions use Chrome or Edge instead.

#### Windows / macOS / Linux: Firefox

Firefox does not currently support PWA installation on desktop. Use Chrome, Edge, or Brave for the installable app experience, or simply keep VinylVault open in a Firefox tab.

---

### 📦 Android APK (sideload — alternative to PWA)

A signed release APK is available for Android devices if you prefer a native install from outside the Play Store.

**Install the pre-built APK:**

1. Download the latest signed APK from the [Releases](releases/latest) page of this repository.
2. On your Android device go to **Settings → Security → Install unknown apps** and enable it for your file manager.
3. Open the downloaded `.apk` file and tap **Install**.
4. VinylVault will appear on your home screen.
5. After installation, **disable "Install unknown apps"** again to maintain device security.

> ⚠️ Only install APKs from sources you trust. Always verify the file is from the official VinylVault repository.

For developer instructions (building from source, signing, and publishing to Google Play) see **[ANDROID_BUILD.md](ANDROID_BUILD.md)**.

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
