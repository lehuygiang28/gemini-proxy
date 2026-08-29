#!/usr/bin/env bash
# Long-running dev servers (Turbo): Next.js dashboard on :4040 and the
# standalone Hono API on :9090. Runs as a persistent Cloud Agent terminal.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

exec pnpm dev
