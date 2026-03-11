#!/bin/bash
set -euo pipefail

log() { echo "[post-merge] $1"; }
err() { echo "[post-merge] ERROR: $1" >&2; }

cleanup() {
  rm -rf /tmp/deploy-*.tar.gz /tmp/app-build-*.tar.gz 2>/dev/null || true
  rm -rf client/www www 2>/dev/null || true
}
trap cleanup EXIT

log "Installing dependencies..."
npm install --legacy-peer-deps || { err "npm install failed"; exit 1; }

log "Pushing schema..."
npm run db:push --force 2>/dev/null || npm run db:push 2>/dev/null || log "db:push skipped (may need manual run)"

log "Post-merge setup complete"
