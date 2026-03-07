# VinylVault Android APK Build Guide

This guide explains how to build the VinylVault Android APK (`.apk`) file that
can be side-loaded onto any Android phone, or uploaded to Google Play.

The Android app is a **Trusted Web Activity (TWA)** — a lightweight native
Android wrapper that loads the VinylVault PWA in a full-screen Chrome experience.
It passes Android's hardware-back-button, deep-link, and offline-install criteria.

## Pre-built APK

A signed release APK is available at:
```
releases/VinylVault-1.0.0-release.apk
```

To install it directly on an Android phone:
1. Copy the APK to your device (USB, Google Drive, email, etc.)
2. On the phone: **Settings → Security → Install unknown apps** → enable for your file manager
3. Tap the `.apk` file → Install
4. **VinylVault** will appear on your home screen
5. After installation, **disable "Install unknown apps"** again to maintain device security

> ⚠️ Only install APKs from sources you trust. Always verify the file is from the
> official VinylVault repository before installing.

---

## Building from Source

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java JDK | 17 or higher | https://adoptium.net |
| Android Studio (or SDK only) | Latest | https://developer.android.com/studio |
| `adb` (Android Debug Bridge) | Bundled with SDK | In `$ANDROID_HOME/platform-tools` |

### Set environment variables

```bash
# macOS / Linux — add to ~/.bashrc or ~/.zshrc
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk          # macOS
# export ANDROID_HOME=$HOME/Android/Sdk                # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Quick Build (Debug APK)

A debug APK can be installed on any Android device without signing:

```bash
cd android
./build-apk.sh debug
```

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device (USB debugging enabled):
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or simply copy the `.apk` to your phone and tap it to install (enable
"Install from unknown sources" in Android Settings → Security).

---

## Production Release APK

### Step 1 — Create a signing keystore (one-time)

```bash
mkdir -p android/keystore
keytool -genkeypair \
  -v \
  -keystore android/keystore/release.keystore \
  -alias vinylvault \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**⚠️ Keep this keystore file and passwords safe.** If you lose the keystore
you cannot update the app on Google Play.

### Step 2 — Get your certificate SHA-256 fingerprint

```bash
keytool -list -v \
  -keystore android/keystore/release.keystore \
  -alias vinylvault
```

Copy the `SHA256` certificate fingerprint — it includes colons (format: `AA:BB:CC:...`).

> **Security note:** The SHA-256 fingerprint is a _public_ certificate hash — it is safe and
> required to be publicly accessible in `assetlinks.json` so Android can verify TWA ownership.
> The **private key** lives in the keystore file which is gitignored and must never be committed.

### Step 3 — Update `assetlinks.json`

Edit `/.well-known/assetlinks.json` in the project root and replace
`REPLACE_WITH_YOUR_SIGNING_CERT_SHA256_FINGERPRINT` with your fingerprint,
**keeping the colon separators exactly as printed by `keytool`**:

```json
"sha256_cert_fingerprints": [
  "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
]
```

Deploy the updated `assetlinks.json` to Netlify (it must be accessible at
`https://vinylvault.netlify.app/.well-known/assetlinks.json`).

### Step 3b — Set the in-app fingerprint

The same fingerprint must also be embedded in the APK itself via the `asset_statements`
manifest metadata. Pass it as an env var so the two values stay in sync:

```bash
export TWA_SHA256_CERT="AA:BB:CC:DD:EE:FF:..."   # same value as in assetlinks.json
```

`build.gradle` reads `TWA_SHA256_CERT` (or Gradle property `-PTWA_SHA256_CERT=…`) and
injects it into the APK manifest. The build will fail with a clear error if it is not set.

> **Why both?** Android verifies TWA ownership by matching the fingerprint in
> `assetlinks.json` (served by your website) against the fingerprint declared inside
> the APK. They must be identical for TWA verification to pass.

### Step 4 — Build release APK

```bash
export KEYSTORE_PATH="$(pwd)/android/keystore/release.keystore"
export KEYSTORE_PASSWORD="your-keystore-password"
export KEY_ALIAS="vinylvault"
export KEY_PASSWORD="your-key-password"
export TWA_SHA256_CERT="AA:BB:CC:DD:EE:FF:..."   # fingerprint from Step 2

cd android
./build-apk.sh release https://vinylvault.netlify.app
```

Outputs:
- **APK**: `app/build/outputs/apk/release/app-release.apk` — for direct install
- **AAB**: `app/build/outputs/bundle/release/app-release.aab` — for Google Play

---

## Configuring the Host URL

The APK wraps **your deployed Netlify URL**. If you use a custom domain, pass
it to the build script:

```bash
./build-apk.sh release https://your-custom-domain.com
```

Or edit `android/app/build.gradle` directly:
```groovy
manifestPlaceholders = [
    hostName: "your-custom-domain.com",
    defaultUrl: "https://your-custom-domain.com/?source=twa",
    ...
]
```

---

## Installing on a Phone (Sideload)

1. On your Android phone go to **Settings → Security → Install unknown apps**
   and enable it for Files (or your file manager).
2. Copy `app-release.apk` to your phone (USB, email, Google Drive, etc.).
3. Tap the APK file on your phone → Install.

The app will appear on your home screen as **VinylVault** with the gold vinyl
record icon.

---

## Google Play Submission

Upload `app-release.aab` (not the APK) to the
[Google Play Console](https://play.google.com/console):

1. Create a new app (Free, age rating: Everyone).
2. Upload the `.aab` under **Production → Releases → Create release**.
3. Fill in store listing (name, description, screenshots from `/static/`).
4. Submit for review (typically 1–3 business days).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App opens in browser tab, not full-screen TWA | `assetlinks.json` not deployed or SHA-256 mismatch |
| "Parse error" when installing | APK not signed correctly or `targetSdk` incompatible |
| Camera not working | Check `CAMERA` permission in `AndroidManifest.xml` |
| White screen on launch | Host URL unreachable; check internet + Netlify status |
| Back button shows URL bar | App not verified as TWA owner; fix `assetlinks.json` |

---

## Architecture

```
android/
├── app/
│   ├── build.gradle           # App config, signing, dependencies
│   ├── proguard-rules.pro     # Code shrinking rules
│   └── src/main/
│       ├── AndroidManifest.xml  # TWA activity, permissions, deep links
│       └── res/
│           ├── drawable/splash.xml    # Splash screen
│           ├── mipmap-*/              # Launcher icons (all densities)
│           ├── values/colors.xml      # Brand colours
│           ├── values/strings.xml     # App name
│           ├── values/styles.xml      # Theme
│           └── xml/file_paths.xml     # FileProvider paths for camera
├── build.gradle               # Root Gradle config
├── settings.gradle            # Module list
├── gradle.properties          # JVM + AndroidX flags
├── gradlew                    # Gradle wrapper (Unix)
├── build-apk.sh               # Automated build script
└── gradle/wrapper/
    └── gradle-wrapper.properties  # Gradle version pin
```
