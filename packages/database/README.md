# Gemini Proxy - Database

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This internal package contains database types and scripts for the **Gemini Proxy** application.

## Schema source of truth

| Location | Role |
| -------- | ---- |
| [`../../supabase/migrations/`](../../supabase/migrations/) | Versioned migrations (Supabase CLI) |
| [`sql/schema.sql`](sql/schema.sql) | SQL Editor fallback dump |

Apply migrations from the **repo root**:

```bash
cp packages/database/.env.example packages/database/.env
# Set SUPABASE_DB_URL (Session pooler URI)
pnpm db:apply
```

See [docs/supabase-ci.md](../../docs/supabase-ci.md) for CI, local Docker, and contributor workflow.

## Request log retention (90 days)

Detailed rows in `request_logs` are hard-deleted after **90 days** by default. Lifetime counters on `api_keys` / `proxy_api_keys` are **not** cleared.

| Piece | Detail |
| ----- | ------ |
| RPC | `cleanup_old_request_logs(p_days_to_keep DEFAULT 90)` |
| Migration | `supabase/migrations/20260801030000_request_log_retention.sql` |
| Schedule | `pg_cron` job `purge-request-logs-daily` at `0 3 * * *` (03:00 UTC) when available |

### Manual prune (CLI)

```bash
gproxy logs prune --days 90 --force
```

## Types

```bash
cd packages/database && pnpm gen:types
```

Types are generated from the remote Supabase project (`SUPABASE_PROJECT_ID` in `.env`).

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm db:apply` / `pnpm db:push` | Apply pending CLI migrations to remote DB |
| `pnpm gen:types` | Regenerate `types/database.types.ts` from remote |

Run these from `packages/database/`, or `pnpm db:apply` from the repo root.

## Back to main README

[**root README.md**](../../README.md)
