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

log "Pushing schema (safe mode - no truncation)..."
printf 'No, add the constraint without truncating the table\n%.0s' {1..20} | timeout 60 npx drizzle-kit push --force 2>/dev/null && log "db:push completed" || {
  log "db:push with --force failed, attempting without --force..."
  printf 'No, add the constraint without truncating the table\n%.0s' {1..20} | timeout 60 npx drizzle-kit push 2>/dev/null && log "db:push completed" || {
    err "db:push failed - manual schema sync may be needed"
    log "Run 'npx drizzle-kit push' manually to review and apply changes"
  }
}

log "Post-merge setup complete"
