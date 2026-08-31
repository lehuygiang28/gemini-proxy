# P1 — Persistence reliability, dashboard alerts, and reconciliation

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 4 (admit/settle RPCs and quota windows).
**Status:** Approved (locked decisions + continue).
**Approach:** Idempotent settlement in the same RPC as log/counter updates. Persistence failure must not flip an upstream success into a client error. No auto-release of stale reservations. Dashboard shows stale rows; the user retries reconcile.

## Goal

An origin 200 is a client 200 even if logging or settlement fails. Reservations stay fail-closed so the next admit cannot ignore leaked inflight/reserved tokens. Operators see and retry those rows from the dashboard.

## Invariants

1. Admit/reserve runs atomically **before** upstream (spec 4).
2. Settlement and request-log writes are **idempotent** on `request_id`.
3. Request log, usage counters, and settlement apply in **one** `SECURITY DEFINER` RPC (or one Postgres transaction called from a single RPC). Do not update them from three independent JS calls on the success path.
4. If that RPC fails after origin success: return the origin response to the client anyway; enqueue bounded retries on `waitUntil`.
5. If retries exhaust: leave the reservation in place (reserved_tokens / inflight unchanged except what the failed RPC did not commit). Fail closed on the next admit.
6. **Do not** cron-release stale reservations.
7. Dashboard lists stale reservations/settlements. The owner can click retry/reconcile, which re-invokes the same idempotent RPC (safe if the first call actually committed).

## Success-path RPC

```sql
finalize_proxy_request(
  p_request_id TEXT,
  p_proxy_key_id UUID,
  p_api_key_id UUID,
  p_user_id UUID,
  p_is_successful BOOLEAN,
  p_request_data JSONB,
  p_response_data JSONB,
  p_usage JSONB,
  p_reserved_tokens BIGINT,
  p_reserved_usd NUMERIC,
  p_actual_tokens BIGINT,
  p_actual_usd NUMERIC,
  p_minute_start TIMESTAMPTZ,
  p_day_start TIMESTAMPTZ,
  p_month_start TIMESTAMPTZ
) RETURNS VOID
```

Body (single transaction):

- Insert `request_logs` on `request_id` conflict do update (idempotent).
- `increment_api_key_usage` / `increment_proxy_api_key_usage` only if a settlement row is first inserted (`INSERT … ON CONFLICT DO NOTHING` on `proxy_key_settlements`; skip counters when conflict).
- Call settle math from spec 4 (window reserved → settled, inflight decrement) inside the same function when the settlement insert wins.

`GRANT EXECUTE … TO service_role` only.

Existing split `settle_proxy_request` + JS log insert must move into this RPC (or `settle_proxy_request` becomes an internal helper invoked only from `finalize_proxy_request`).

## Retry

`BackgroundService` / `waitUntil`:

- Attempt finalize up to 3 times total with full-jitter delays capped at 2s.
- After 3 failures, insert (idempotent) a row into `proxy_reconciliation_needed`:

```sql
CREATE TABLE proxy_reconciliation_needed (
  request_id TEXT PRIMARY KEY,
  proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

RLS: `user_id = auth.uid() OR service_role`.

Do not throw to the client on finalize failure after origin success. Stream/non-stream both apply: persist from `onComplete` / flush, not by wrapping the whole consume in `waitUntil`.

Error path (origin failed or never sent): still attempt finalize with `is_successful=false`, actual 0, so inflight/reserved release. If this fails, the same reconciliation table is used; the client already received the origin/gateway error.

## Dashboard

Refine resource `proxy_reconciliation_needed` (or a tab on request logs): list unresolved rows (`resolved_at IS NULL`) for the current user. Action `handleRetry` calls a `reconcile_proxy_request(p_request_id)` RPC that re-runs finalize from stored `request_logs` if present, or no-ops if already settled, then sets `resolved_at`.

Badge on the sider or observability panel when `count > 0`. i18n en/vi. No `useEffect` polling beyond Refine `liveMode` / `query` refetch; if live is missing, a Refine `queryOptions.refetchInterval` of 30s is allowed (not an effect).

Copy: reservations stay held until reconcile so limits remain fail-closed.

## Tests

- Origin 200 + mocked finalize RPC fail twice then succeed → client 200, third RPC called, no reconciliation row.
- Origin 200 + finalize always fails → client 200, reconciliation row inserted, reserved tokens still blocking a `token_day_limit=1` second admit (fail closed).
- Double finalize (retry after hidden success) does not double-increment success_count (idempotent).
- Reconcile RPC is safe when settlement already exists.
- Origin 429 exhaust → client error path still attempts finalize; failure → reconciliation row.

## Success criteria

Operators can clear a stuck reservation without SQL. Upstream success never becomes HTTP 5xx because logging failed.

## Out of scope

- Automatic expiry of inflight.
- Slack/email/OTLP alerts.
- Rewriting the 90-day log cleanup job.
