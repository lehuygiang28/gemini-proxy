# P1 — Proxy-key policy, timezone, admission, and budget

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 2 (tenant-owned proxy keys). Spec 3 provides parsed `model` / `apiFormat` for managed endpoints.
**Status:** Approved (locked decisions + continue). Replaces the frozen TPM/concurrency draft.
**Approach:** Limits live on `proxy_api_keys`. Admit with one SQL RPC before upstream. Settle after the response. Null means unlimited. Daily/monthly windows use the owner's IANA timezone.

## Goal

A proxy key can cap RPM, request/day, token/day, estimated USD/month, model allowlist, and `expires_at`. RPM and request/day are hard atomic limits. Token/day and USD/month are guardrails (settled + outstanding reservations). Holders of the key cannot raise caps via headers.

## Schema (additive)

On `proxy_api_keys` (keep existing columns that already match; do not add TPM / max_concurrent / max_output / max_body as locked requirements — if they already exist from a prior draft, leave them unused by admit unless already wired, and do not document them as supported):

| Column | Type | Rule |
| ------ | ---- | ---- |
| `rpm_limit` | INTEGER NULL | null or > 0. Hard. |
| `rpd_limit` | INTEGER NULL | request/day, null or > 0. Hard. |
| `token_day_limit` | BIGINT NULL | token/day guardrail, null or > 0. |
| `monthly_budget_usd` | NUMERIC(12,6) NULL | USD/month guardrail, null or > 0. |
| `allowed_models` | TEXT[] NULL | null/empty = all models. Trailing `*` glob only. |
| `expires_at` | TIMESTAMPTZ NULL | null = no expiry. |

On `user_settings`:

```sql
ALTER TABLE user_settings
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_timezone_iana
    CHECK (timezone ~ '^[A-Za-z0-9_+\-/]+$');
```

Validate IANA at write time in the web/CLI layer with `Intl.supportedValuesOf('timeZone')` (or `dayjs/timezone` loaded zone list). Invalid timezone → 400 / CLI error. **No silent fallback.** Unset column default is `UTC`.

## Windows

Store `window_start` in **UTC**.

- Minute: `date_trunc('minute', now())` UTC (RPM is not timezone-shifted).
- Day: start of civil day in `user_settings.timezone`, converted to UTC timestamptz.
- Month: start of civil month in that timezone, converted to UTC.

Changing timezone does **not** reset the active day/month row. New zone applies when the next period starts (new `window_start`).

`proxy_key_quota_windows` stays the ledger: `window_type IN ('minute','day','month')`, `request_count`, `token_count`, `reserved_tokens`, `reserved_cost_usd`, `settled_cost_usd`.

## Admit RPC

`admit_proxy_request(...) RETURNS jsonb`, `SECURITY DEFINER`, `GRANT EXECUTE TO service_role` only.

Fail closed:

| Code | HTTP | When |
| ---- | ---- | ---- |
| `unknown_key` | 401 | missing / deleted |
| `inactive_key` | 400 | `is_active=false` |
| `expired_key` | 400 | `expires_at <= now()` |
| `model_required` | 400 | managed endpoint, empty model, non-empty allowlist |
| `model_denied` | 400 | model fails allowlist |
| `rpm` | 429 | minute request_count would exceed `rpm_limit` |
| `rpd` | 429 | day request_count would exceed `rpd_limit` |
| `tokens` | 429 | day settled tokens + reserved + estimate would exceed `token_day_limit` |
| `budget` | 429 | month settled USD + reserved + estimate would exceed `monthly_budget_usd` |

Passthrough (no model parser): skip model allowlist and token/USD estimates (estimate 0). Still enforce expiry, RPM, RPD.

Do **not** call Google `countTokens`. Token estimate for managed generateContent: `max(policy-less estimate from peeked max output if present, 0)` or a small default (e.g. 8192) documented in the plan. USD estimate: existing `estimateGeminiCostUsd` with estimated output tokens; use 0 when null.

Envelope: `{ error: 'policy_denied', code, message, gproxy_request_id }`.

Admit increments request_count on minute+day, reserved_tokens / reserved_cost_usd on day+month.

## Settle RPC

Idempotent on `p_request_id` via `proxy_key_settlements`. Always decrement inflight if that column exists. Apply actual tokens/USD with `GREATEST(..., 0)`. If actual > reserved, still record the full actual (guardrail may trip the **next** request). Bounded overage on the last concurrent request is accepted.

Call settle from `BackgroundService` / `onError` after a successful admit. Spec 5 owns persist-failure behavior; this spec requires the RPC to be idempotent.

## Web UI

Proxy-key create/edit: RPM, request/day, token/day, USD/month, allowlist (newline or tags, trailing `*` only), `expires_at`. Integer `InputNumber` `precision={0}`. Empty = unlimited.

User settings: timezone `Select` of IANA names (searchable). No `useEffect` hydration.

i18n en/vi. Help text: daily/monthly windows follow this timezone; quota is per proxy key, not per Google project.

## Tests

- `rpm_limit=1` → second request in the same UTC minute 429 `rpm`; origin fetch count 1.
- null limits → both requests fetch origin.
- `allowed_models=['gemini-2.5-*']` denies `gemini-1.5-pro`, allows `gemini-2.5-flash`.
- `gemini-*-flash` (internal `*`) is exact equality, not a glob.
- timezone `Asia/Bangkok`: day window_start is 17:00 UTC previous calendar day during ICT (UTC+7).
- invalid timezone rejected.
- token guardrail: reserved+settled blocks the next admit; a single request may complete if it was admitted.
- passthrough: no model_denied when model missing.
- existing contract auth tests stay green.

## Success criteria

Operators set limits without SQL. README does not claim TPM or Google-side quota.

## Out of scope

- Project pools / TPM as a locked proxy-key limit.
- `countTokens` preflight.
- Auto-release of stale reservations (spec 5: dashboard reconcile only).
