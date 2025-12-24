#!/bin/bash

set -e

cd "$(dirname "$0")" || exit 1

echo "🚀 Building APK..."
echo ""

# Clean
rm -rf dist android node_modules/.vite 2>/dev/null

# Install
echo "Installing packages..."
npm install --legacy-peer-deps --no-audit > /dev/null 2>&1

# Build client
echo "Building client..."
npm run build:client > /dev/null 2>&1

# Build server
echo "Building server..."
npm run build:server > /dev/null 2>&1

# Capacitor init
echo "Initializing Capacitor..."
npx cap init --web-dir dist/public 2>/dev/null || npx cap init > /dev/null 2>&1

# Add Android
echo "Adding Android platform..."
npx cap add android > /dev/null 2>&1

# Sync
echo "Syncing files..."
npx cap sync android > /dev/null 2>&1

# Open Android Studio
echo ""
echo "✅ Done! Opening Android Studio..."
npx cap open android

echo ""
echo "Build > Build APK(s)"
