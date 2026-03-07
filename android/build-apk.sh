#!/usr/bin/env bash
# =============================================================================
#  VinylVault Android APK Build Script
#  Builds a Trusted Web Activity (TWA) APK that wraps vinylvault.netlify.app
# =============================================================================
# Requirements:
#   - Java 17+ (export JAVA_HOME=/path/to/java)
#   - Android SDK (export ANDROID_HOME=/path/to/android-sdk)
#   - For release builds: signing keystore (see ANDROID_BUILD.md)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR" && pwd)"
PROJECT_ROOT="$(cd "$ANDROID_DIR/.." && pwd)"

# ── Colour output ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Parse args ────────────────────────────────────────────────────────────────
BUILD_TYPE="${1:-debug}"   # debug | release
HOST_URL="${2:-https://vinylvault.netlify.app}"

info "Building VinylVault Android APK"
info "  Type    : $BUILD_TYPE"
info "  Host URL: $HOST_URL"
echo

# ── Validate environment ──────────────────────────────────────────────────────
command -v java >/dev/null 2>&1 || error "Java not found. Install JDK 17+ and set JAVA_HOME."
JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
[ "$JAVA_VER" -ge 17 ] || error "Java 17+ required (found $JAVA_VER)."

[ -n "${ANDROID_HOME:-}" ] || error "ANDROID_HOME is not set. Install Android SDK and set ANDROID_HOME."
[ -d "$ANDROID_HOME" ]     || error "ANDROID_HOME=$ANDROID_HOME does not exist."

if [ "$BUILD_TYPE" = "release" ]; then
  [ -n "${KEYSTORE_PATH:-}"     ] || error "KEYSTORE_PATH not set. See ANDROID_BUILD.md."
  [ -n "${KEYSTORE_PASSWORD:-}" ] || error "KEYSTORE_PASSWORD not set."
  [ -n "${KEY_ALIAS:-}"         ] || error "KEY_ALIAS not set."
  [ -n "${KEY_PASSWORD:-}"      ] || error "KEY_PASSWORD not set."
  [ -f "$KEYSTORE_PATH" ]         || error "Keystore not found: $KEYSTORE_PATH"
  # Warn if assetlinks.json still has the placeholder fingerprint
  if grep -q "REPLACE_WITH_YOUR_SIGNING_CERT_SHA256_FINGERPRINT" "$PROJECT_ROOT/.well-known/assetlinks.json" 2>/dev/null; then
    warn "assetlinks.json still has placeholder SHA-256 fingerprint."
    warn "TWA verification will fail until you update it. See ANDROID_BUILD.md Step 2."
  fi
  # Warn if in-app fingerprint env var is not set
  if [ -z "${TWA_SHA256_CERT:-}" ]; then
    warn "TWA_SHA256_CERT is not set — build.gradle will fail."
    warn "Export TWA_SHA256_CERT matching your assetlinks.json fingerprint. See ANDROID_BUILD.md Step 2b."
  fi
fi

# ── Update host URL in build.gradle ──────────────────────────────────────────
# Strip trailing slash to avoid double-slash in the default URL
HOST_URL="${HOST_URL%/}"
HOST=$(echo "$HOST_URL" | sed 's|https\?://||' | cut -d'/' -f1)
info "Setting hostName to: $HOST"

# Escape values for safe use inside sed replacement (avoid shell injection via metacharacters)
# We escape: backslashes (must be first), double quotes, and & (matches full pattern in sed replacements)
HOST_ESC="${HOST//\\/\\\\}"
HOST_ESC="${HOST_ESC//\"/\\\"}"
HOST_ESC="${HOST_ESC//&/\\&}"
DEFAULT_URL="${HOST_URL}/?source=twa"
DEFAULT_URL_ESC="${DEFAULT_URL//\\/\\\\}"
DEFAULT_URL_ESC="${DEFAULT_URL_ESC//\"/\\\"}"
DEFAULT_URL_ESC="${DEFAULT_URL_ESC//&/\\&}"

# Use a temp file for portability (GNU sed and BSD sed both support this)
GRAD_FILE="$ANDROID_DIR/app/build.gradle"
GRAD_TMP="$GRAD_FILE.tmp"
sed "s|hostName: \".*\"|hostName: \"$HOST_ESC\"|" "$GRAD_FILE" \
  | sed "s|defaultUrl: \".*\"|defaultUrl: \"$DEFAULT_URL_ESC\"|" \
  > "$GRAD_TMP" && mv "$GRAD_TMP" "$GRAD_FILE"

# ── Build ─────────────────────────────────────────────────────────────────────
cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" = "release" ]; then
  info "Building release APK + AAB (App Bundle)..."
  ./gradlew assembleRelease bundleRelease --no-daemon
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
  AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
  info "✅ Release APK: $ANDROID_DIR/$APK_PATH"
  info "✅ Release AAB: $ANDROID_DIR/$AAB_PATH"
  info ""
  warn "To install on a device via USB:"
  warn "  adb install $ANDROID_DIR/$APK_PATH"
  warn ""
  warn "Upload the .aab to Google Play Console for Play Store distribution."
else
  info "Building debug APK..."
  ./gradlew assembleDebug --no-daemon
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  info "✅ Debug APK: $ANDROID_DIR/$APK_PATH"
  info ""
  info "Install on a connected device:"
  info "  adb install $ANDROID_DIR/$APK_PATH"
fi

info "Build complete!"
