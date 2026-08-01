# Gemini Proxy - Database

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This internal package contains the database schema, types, and management scripts for the **Gemini Proxy** application.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Overview</strong></summary>

- [Schema](#️-schema)
- [Scripts](#️-scripts)

</details>

<details>
<summary><strong>💻 Usage</strong></summary>

- [Installation](#-installation)
- [Usage Information](#-usage-information)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Back to Main README](#-back-to-main-readme)

</details>

## 🏗️ Schema

The database schema is defined in `sql/schema.sql` and includes tables for `api_keys`, `proxy_api_keys`, and `request_logs`.

## Request log retention (90 days)

Detailed rows in `request_logs` are hard-deleted after **90 days** by default. Lifetime counters on `api_keys` / `proxy_api_keys` (`success_count`, `failure_count`, token columns) are **not** cleared.

| Piece | Detail |
| ----- | ------ |
| RPC | `cleanup_old_request_logs(p_days_to_keep DEFAULT 90)` — batched deletes (`SECURITY DEFINER`, `service_role` only) |
| Migration | `sql/migrations/2026-08-01_request_log_retention.sql` |
| Schedule | `pg_cron` job `purge-request-logs-daily` at `0 3 * * *` (03:00 UTC) |

### Apply on Supabase Free

1. Enable **Cron** in Dashboard → Integrations → Cron (installs `pg_cron` if needed).
2. Run the migration SQL in the SQL editor (or your usual migrate path).
3. Verify: `SELECT * FROM cron.job WHERE jobname = 'purge-request-logs-daily';`
4. Optional one-shot reclaim: `SELECT cleanup_old_request_logs(90);` (service role / SQL editor as postgres).

**Free plan notes**

- Database size is capped (~500 MB) — this purge is the main storage guardrail.
- Free projects **pause after ~7 days of inactivity**; cron does not run while paused. Active proxy traffic keeps the project awake.
- Dashboard period KPIs/charts that scan `request_logs` are only accurate within the retention window.

### Manual prune (CLI)

```bash
gproxy logs prune --days 90 --force
# or: LOG_RETENTION_DAYS=90 gproxy logs prune --force
```

## 📊 Types Architecture

This package provides centralized TypeScript types for the entire monorepo:

- **Database Schema Types**: Auto-generated from Supabase schema
- **Statistics Types**: Manual interfaces for RPC function returns
- **User Types**: Shared authentication types

## 🛠️ Scripts

### **Generating Types**

```bash
pnpm gen:types
```

### **Pushing Schema Changes**

```bash
pnpm db:push
```

**Warning:** This command will overwrite the existing schema in your database.

## 📦 Installation

This is an internal package and is not intended for direct installation.

## 💻 Usage Information

The generated TypeScript types are used by the `@gemini-proxy/core` package.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
