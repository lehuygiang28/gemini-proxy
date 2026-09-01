# Proxy-key quota reset (current windows)

**Date:** 2026-09-01
**Parent:** [P1 policy, timezone, admission, and budget](./2026-08-31-p1-policy-timezone-admission-budget-design.md)
**Depends on:** live `admit_proxy_request` (including timezone catalog check and unexpired day/month reuse in `20260831080000_admit_timezone_catalog_preserve_windows.sql`).
**Status:** Approved for implementation planning
**Approach:** One `SECURITY DEFINER` RPC zeros selected **current** quota-window counters. Web (list + show) and CLI call that RPC. Raising a limit already unblocks a key; this feature wipes usage without changing caps.

## Goal

An operator can zero usage on the **current** minute, day, and/or month ledger for one proxy key so that key immediately has full remaining quota at the same limits. Other history must not move.

## Current behavior (do not change)

Admit reads `proxy_api_keys` limits on every request (`SELECT … FOR UPDATE`) and compares them to `proxy_key_quota_windows` counters. There is no limit cache.

- Raising `rpm_limit` / `rpd_limit` / `token_day_limit` / `monthly_budget_usd` applies on the **next** admit. If usage is below the new cap, the key works again. Remaining = new cap − current usage.
- Clearing a limit (null / empty = unlimited) also unblocks on the next admit.
- Lowering a cap below current usage still 429s until the window rolls or usage is reset.
- Changing `user_settings.timezone` does **not** start a new day/month row; admit reuses an unexpired bucket.

There is no reset RPC or UI today.

## Locked decisions

- Reset **usage**, not limits. Caps, allowlist, `expires_at`, `is_active` stay as they are.
- Operator **selects** which of `{minute, day, month}` to reset; multiple allowed.
- Zero **immediately**, including when requests are in flight. Settle of those requests still adds token/USD onto the same `window_start` row. `request_count` is not incremented again at settle (admit already did).
- Do **not** `DELETE` window rows (settle needs the row).
- Do **not** rewrite `request_logs`, lifetime `proxy_api_keys` counters (`success_count`, `failure_count`, `prompt_tokens`, `completion_tokens`, `total_tokens`), `inflight_count`, or any window that was not selected / is not the current `window_start`.
- Surfaces: web **list** + **show** (same modal). Not create. Not edit (avoids mixing Save limits with reset). Not bulk.
- CLI: `gproxy proxy-keys reset-quota <id>`.
- Errors: `RAISE EXCEPTION` (Postgres errcodes) so PostgREST returns 4xx. Success is JSONB. Never HTTP 200 with `{ ok: false }`.
- Data plane never calls reset.

## Window resolution (shared helper)

Extract the **current** admit formula into `proxy_quota_window_starts(p_proxy_key_id UUID, p_tz TEXT)` returning `(minute_start, day_start, month_start)`.

Copy this behavior exactly from live `admit_proxy_request`; do not re-derive it in TypeScript:

1. `minute_start = date_trunc('minute', now())` (UTC).
2. `day_start` = latest `proxy_key_quota_windows` row for that key with `window_type = 'day'` where `window_start <= now()` and `window_start + interval '1 day' > now()`, else civil day start in `p_tz`.
3. `month_start` = same pattern with `window_type = 'month'` and `interval '1 month'`.

Caller resolves `p_tz` the same way admit does (`user_settings.timezone`, default `UTC`, reject names missing from `pg_timezone_names`).

`admit_proxy_request` must call this helper (behavior-preserving refactor). Reset and the read RPC must call it too so all three hit the same row.

Do **not** `GRANT EXECUTE` on the helper. It is internal. `REVOKE ALL FROM PUBLIC`.

## Write RPC

Migration `supabase/migrations/20260901010000_reset_proxy_key_quota.sql`. Mirror `packages/database/sql/schema.sql`. Regenerate `packages/database/types/database.types.ts`.

```sql
reset_proxy_key_quota(
  p_proxy_key_id UUID,
  p_window_types TEXT[]
) RETURNS JSONB
```

`SECURITY DEFINER`, `SET search_path = 'public', pg_catalog`. `REVOKE ALL FROM PUBLIC`. `GRANT EXECUTE` to `authenticated` and `service_role` only. Not `anon`.

`p_window_types` must be non-empty, unique, and a subset of `{minute, day, month}`. Canonical result order is `minute`, `day`, `month`.

Steps in one transaction:

1. `SELECT * FROM proxy_api_keys WHERE id = p_proxy_key_id AND deleted_at IS NULL FOR UPDATE` (same lock order as admit).
2. Missing / soft-deleted → `RAISE` `no_data_found` (`P0002`).
3. If `auth.role() <> 'service_role'` and `user_id <> (SELECT auth.uid())` → `RAISE` `insufficient_privilege` (`42501`).
4. Invalid `p_window_types` → `RAISE` `invalid_parameter_value` (`22023`).
5. Resolve owner timezone (admit rules). Invalid catalog name → `RAISE` `invalid_parameter_value` (`22023`).
6. `SELECT … FROM proxy_quota_window_starts(...)`.
7. For each requested type: `SELECT … FOR UPDATE` the current `(proxy_key_id, window_type, window_start)` row. If found, set `request_count`, `token_count`, `reserved_tokens`, `reserved_cost_usd`, `settled_cost_usd` to `0`. If not found, skip (already zero).
8. Return `{ "reset": ["day"], "skipped": ["month"] }` (`skipped` = requested types with no row).

Allowed on inactive or expired keys (operator may reset before re-enabling). Not allowed on deleted keys.

Do not insert a window row just to zero it. Do not touch unselected types.

## Read RPC

```sql
current_proxy_key_quota(p_proxy_key_id UUID) RETURNS JSONB
```

Same `SECURITY DEFINER`, search_path, owner check, timezone, and helper as reset. **No** `FOR UPDATE`. Same `GRANT` as reset.

Returns the three current windows. `window_start` is always the helper result (so the UI knows which period is current). Missing row → `"exists": false` and counters `0`.

```json
{
  "minute": {
    "window_start": "2026-09-01T10:00:00+00:00",
    "exists": true,
    "request_count": 12,
    "token_count": 0,
    "reserved_tokens": 0,
    "reserved_cost_usd": 0,
    "settled_cost_usd": 0
  },
  "day": {
    "window_start": "2026-08-31T17:00:00+00:00",
    "exists": false,
    "request_count": 0,
    "token_count": 0,
    "reserved_tokens": 0,
    "reserved_cost_usd": 0,
    "settled_cost_usd": 0
  },
  "month": {
    "window_start": "2026-08-31T17:00:00+00:00",
    "exists": true,
    "request_count": 40,
    "token_count": 12000,
    "reserved_tokens": 8192,
    "reserved_cost_usd": 0.02,
    "settled_cost_usd": 1.1
  }
}
```

Unknown / forbidden / bad timezone: same `RAISE` as reset.

## In-flight

Zero even if `inflight_count > 0` or reserved ledgers are non-zero. Do not wait. Do not change `inflight_count`.

After reset, a still-running request that already admitted will `settle` / `finalize_proxy_request` against the **same** `window_start` values it reserved. Token and USD counters can become non-zero again. RPM/RPD `request_count` stays at the reset value plus any **new** admits; the in-flight request does not add another request.

That overshoot (one extra in-flight request against a freshly zeroed RPM/RPD) is accepted.

## Web UI

Minimal: one extra list-row icon and one show-page button. Both open the **same** modal. No always-visible checkbox card. No list bulk. No edit-page action. No create-page action.

### Modal

Extend `ConfirmAlertModal` with optional `children` and `okButtonProps` (checkboxes cannot live in the warning `Alert` string). Keep using `antd` `Modal` instance APIs, not `Modal.confirm()`.

Contents:

- Warning copy: this zeros **current** window usage only; limits and request logs stay.
- Three checkboxes: minute (RPM), day (RPD + token/day), month (USD/month). **All three start checked.**
- Next to each checkbox, current usage from `current_proxy_key_quota` (`request_count`, `token_count`, reserved+settled USD).
- Confirm disabled when zero checkboxes are selected, or while the mutation is pending (`okButtonProps.loading`). Do not block Confirm on the usage query: checkboxes default to all three even if usage is still loading.

Common path: open modal → Confirm (2 clicks). Uncheck to narrow.

After success: Refine `successNotification` mentions `reset` and `skipped`. `skipped` is not an error (“already 0”). Close the modal.

### Refine only (no extra data layer)

The modal component uses:

- `useCustom` → `POST rpc/current_proxy_key_quota` with `p_proxy_key_id`. `queryOptions.enabled` when the modal is open and `id` is set. No `useEffect` fetch.
- `useCustomMutation` → `POST rpc/reset_proxy_key_quota` with `p_proxy_key_id` and `p_window_types`. `successNotification` / `errorNotification` on the mutate config.
- `useInvalidate` for resource `proxy_api_keys` (`list` + `detail`) and the current-quota `useCustom` query after success. Custom RPC URLs do not auto-invalidate; this matches `useReconcileProxyRequest`.

Do **not** call `supabase-js` from pages. Do **not** use `queryClient` directly. Do **not** wrap a second data hook around the mutation (no `useResetProxyQuota` service). List and show pass `open`, `proxyKeyId`, `onClose`.

Do **not** put reset into Refine `useForm` `onFinish` (edit saves limits only).

Add `reset_proxy_key_quota` and `current_proxy_key_quota` to `apps/web/src/types/rpc.types.ts` validators. Do not force them through `createRpcHook` (that factory always injects `p_user_id`).

i18n `en` + `vi` under `proxy_api_keys.quotaReset.*`.

Show page lifetime token/success cards must keep their values after reset (those columns are not in the RPC).

List actions: one `Tooltip` + text `Button` icon, same `Space` as rotate. Widen `PROXY_API_KEYS_ACTIONS_COLUMN_WIDTH` if the row overflows. Not `Popconfirm` (window choice lives in the modal).

## CLI

```text
gproxy proxy-keys reset-quota <id>
  --minute
  --day
  --month
  -f, --force
```

- `<id>` is the proxy key UUID (same as `delete` / `get`). No `--name`.
- At least one of `--minute` / `--day` / `--month`. Zero flags → exit 1, no RPC.
- Without `--force`: `@inquirer/prompts` `confirm`, same pattern as `proxy-keys delete`. `--force` skips confirm.
- `ProxyKeysManager.resetQuota(id, windows)` → `supabase.rpc('reset_proxy_key_quota', { p_proxy_key_id, p_window_types })`. CLI already uses `service_role`.
- Print `reset` and `skipped`. Map Postgres errors through `ErrorHandler` (non-zero exit).

## Error map

| Case                                    | Postgres  | HTTP (PostgREST) | Web                 | CLI                       |
| --------------------------------------- | --------- | ---------------- | ------------------- | ------------------------- |
| Empty / duplicate / unknown window type | `22023`   | 400              | `errorNotification` | exit 1 (flags) or RPC 400 |
| Deleted / missing key                   | `P0002`   | 404              | `errorNotification` | fail                      |
| JWT caller does not own the key         | `42501`   | 403              | `errorNotification` | N/A (`service_role`)      |
| Invalid owner timezone catalog name     | `22023`   | 400              | `errorNotification` | fail                      |
| Other DB errors                         | exception | 5xx              | `errorNotification` | `ErrorHandler`            |

`skipped` on success is not an error.

Concurrent reset vs admit: both lock `proxy_api_keys` then the window row. After reset commits, the next admit sees zeros. No extra retry/queue.

## Tests

- RPC / SQL (local Supabase or equivalent): reset `day` does not change `minute` or `month`; missing current row → that type in `skipped`; invalid types raise `22023`; other user’s JWT raises `42501`; `service_role` can reset; inactive key can reset; `request_logs` and lifetime counters unchanged; past `window_start` rows unchanged.
- Admit helper: after extract, `admit_proxy_request` still reuses an unexpired day row when timezone changes (existing preserve-window behavior).
- Contract: `rpd_limit = 1` → second request 429 `rpd`; reset `day`; third request hits origin. Reset `minute` only does not clear RPD.
- Settle after reset: token/USD increase on that window; `request_count` does not increase for the in-flight request.
- Timezone: `Asia/Bangkok` zeros the civil-day row admit would use, not yesterday’s row.
- CLI: zero flags exit 1; `--force` does not prompt; flags map to `['minute','day']`.
- Web: checkbox set → `p_window_types` payload; `rpc.types` validators. No Ant Design screenshot tests.

## Out of scope

- Audit table of resets.
- Bulk reset.
- Reset from edit/create.
- Auto-reset when raising a limit.
- Changing limits (already works).
- Dashboard reconcile of stale reservations (spec 5).
- Google-project quota.
- Rewriting `request_logs` or lifetime counters.

## Success criteria

Operator on list or show opens one modal, confirms, and the next admit on that key succeeds if the selected windows were the blockers. CLI does the same for a UUID. Logs and lifetime stats still match real traffic. Past quota windows are untouched.
