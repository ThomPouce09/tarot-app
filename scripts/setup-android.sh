#!/usr/bin/env bash
# ============================================================
# Capacitor Android Setup Script
# Run this AFTER npm run build succeeds
# Requires: Java 17+ JDK, Android Studio with SDK 35
# ============================================================
set -euo pipefail

echo "=== Tarot APK — Initialisation Android ==="

# 1. Initialize Capacitor (if not already done)
if [ ! -d "android" ]; then
  echo "[1/4] Capacitor init..."
  npx cap init TarotDivinatoire com.tarot.app
else
  echo "[1/4] Capacitor already initialized."
fi

# 2. Add Android platform
if [ ! -d "android/app" ]; then
  echo "[2/4] Adding Android platform..."
  npx cap add android
else
  echo "[2/4] Android platform already present."
fi

# 3. Copy web build to Android
echo "[3/4] Copying web build..."
npx cap copy

# 4. Sync Capacitor plugins
echo "[4/4] Syncing plugins..."
npx cap sync

echo ""
echo "=== Done ==="
echo "Open in Android Studio:  npx cap open android"
echo "Or build APK directly:    npx cap build android"
echo ""
echo "For production release:"
echo "  1. cd android"
echo "  2. ./gradlew assembleRelease  # generates .apk in app/build/outputs/"
echo "  3. ./gradlew bundleRelease    # generates .aab for Google Play"
echo ""
