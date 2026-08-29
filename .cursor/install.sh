#!/usr/bin/env bash
# Cloud Agent `install` phase: prepare durable, source-derived state.
#
# Runs after the repository is checked out. When environment builds are enabled,
# this runs once to create the baseline snapshot, so it also warms the Supabase
# Docker images here (per-boot `start` then becomes fast). Must be idempotent.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=/dev/null
source "$REPO_ROOT/.cursor/lib-docker.sh"

echo "==> Installing Node dependencies (pnpm)"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "==> Ensuring Docker is installed and configured for nested use"
ensure_docker_installed

# Warm the Supabase images and apply migrations so the baseline snapshot already
# contains them. Best-effort: if it cannot run during the build, `start` will
# pull the images on first boot instead.
echo "==> Warming local Supabase images (best-effort)"
if ensure_docker_running; then
    pnpm exec supabase start >/dev/null 2>&1 || pnpm exec supabase start >/dev/null 2>&1 || true
    pnpm exec supabase stop --no-backup >/dev/null 2>&1 || pnpm exec supabase stop >/dev/null 2>&1 || true
else
    echo "WARN: Docker unavailable during install; images will be pulled on first boot" >&2
fi

echo "==> install.sh complete"
