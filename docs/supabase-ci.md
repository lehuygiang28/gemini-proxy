# Supabase migrations & CI

Schema changes are versioned with the [official Supabase CLI](https://supabase.com/docs/guides/cli) at the repo root.

| Path | Purpose |
| ---- | ------- |
| [`supabase/migrations/`](../supabase/migrations/) | **Source of truth** — ordered SQL migrations |
| [`packages/database/sql/schema.sql`](../packages/database/sql/schema.sql) | SQL Editor fallback dump (keep in sync manually when schema changes) |
| [`packages/database/.env`](../packages/database/.env) | `SUPABASE_DB_URL` for remote apply (not committed) |

## OSS clone (no Docker)

1. Create a Supabase cloud project.
2. Set app env vars (`apps/web/.env.local`, `apps/api/.env`).
3. Copy Session pooler URI into `packages/database/.env` as `SUPABASE_DB_URL`.
4. From repo root: `pnpm db:apply`
5. `pnpm dev`

You only need the database URI when applying migrations — not for everyday development.

## Local Supabase (optional, Docker)

```bash
pnpm db:start    # supabase start
pnpm db:reset    # replay all migrations on local stack
pnpm db:stop
```

Generate types against local DB (with stack running):

```bash
cd packages/database && npx supabase gen types typescript --local > types/database.types.ts
```

## New schema changes (contributors)

```bash
npx supabase migration new descriptive_name
# edit supabase/migrations/<timestamp>_descriptive_name.sql
pnpm db:reset    # verify locally (optional Docker)
pnpm db:apply    # apply to your remote dev project
```

Never edit old migration files after they are merged to `main`.

## GitHub Actions

Workflow: [`.github/workflows/supabase.yml`](../.github/workflows/supabase.yml)

| Event | GitHub Environment | Behavior |
| ----- | ------------------ | -------- |
| **Pull request** | — | `supabase start` on a fresh runner, verify `migration list --local` |
| **Push to `develop`** | `staging` | `supabase db push` to staging Supabase project |
| **Push to `main`** | `production` | `supabase db push` to production Supabase project |

Forks without environments/secrets skip the remote push (job exits 0 with a log message).

### Setup GitHub Environments

Repo → **Settings → Environments** → create `staging` and `production`.

Add the **same secret name** on each environment (values differ per Supabase project):

| Environment | Secret | Value |
| ----------- | ------ | ----- |
| `staging` | `SUPABASE_DB_URL` | Session pooler URI for the **staging** Supabase project |
| `production` | `SUPABASE_DB_URL` | Session pooler URI for the **production** Supabase project |

Get the URI from **Supabase Dashboard → Connect → Session pooler**.

Optional on `production`: enable **Required reviewers** or **Deployment branches** (only `main`) for extra safety.

### App runtime env (Vercel / hosting)

`SUPABASE_DB_URL` is **not** used by the web app. Configure these per Vercel environment instead:

| Vercel env | Supabase project |
| ---------- | ---------------- |
| Preview | staging |
| Production | production |
| Development | local dev project |

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_ANON_SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Request log retention

Migration `20260801030000_request_log_retention.sql` schedules `purge-request-logs-daily` when `pg_cron` is available (Supabase cloud). On local `supabase start`, the function is created but cron is skipped.

Enable **Cron** in Supabase Dashboard → Integrations → Cron on cloud projects if the job is missing.
