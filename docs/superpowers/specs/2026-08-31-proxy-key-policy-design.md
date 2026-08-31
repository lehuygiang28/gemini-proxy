# P1 — Proxy-key policy, atomic admission, and budget settlement

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 2 (tenant-owned proxy keys, no client headers).
**Approach:** Limits live on `proxy_api_keys` rows. Admit with a single SQL RPC before upstream fetch. Settle after the response. Null means unlimited.

## Goal

A proxy key can cap RPM, TPM, RPD, concurrency, daily/monthly USD, model allow/deny, max output tokens, and max body size. Concurrent requests cannot overshoot because reservation is atomic in Postgres. Holders of the key cannot raise the caps.

## Why not headers

Spec 2 deleted `x-gproxy-*`. Policy is operator-configured on the key (web UI + CLI later). The data plane only reads the row.

## Schema

Migration `supabase/migrations/YYYYMMDDHHMMSS_proxy_key_policies.sql`. Mirror `schema.sql`.

```sql
ALTER TABLE proxy_api_keys
    ADD COLUMN IF NOT EXISTS rpm_limit INTEGER,
    ADD COLUMN IF NOT EXISTS tpm_limit INTEGER,
    ADD COLUMN IF NOT EXISTS rpd_limit INTEGER,
    ADD COLUMN IF NOT EXISTS max_concurrent INTEGER,
    ADD COLUMN IF NOT EXISTS daily_budget_usd NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS monthly_budget_usd NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS allowed_models TEXT[],
    ADD COLUMN IF NOT EXISTS denied_models TEXT[],
    ADD COLUMN IF NOT EXISTS max_output_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS max_request_body_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS inflight_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE proxy_api_keys
    ADD CONSTRAINT proxy_api_keys_rpm_limit_pos CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    ADD CONSTRAINT proxy_api_keys_tpm_limit_pos CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    ADD CONSTRAINT proxy_api_keys_rpd_limit_pos CHECK (rpd_limit IS NULL OR rpd_limit > 0),
    ADD CONSTRAINT proxy_api_keys_max_concurrent_pos CHECK (max_concurrent IS NULL OR max_concurrent > 0),
    ADD CONSTRAINT proxy_api_keys_max_output_pos CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
    ADD CONSTRAINT proxy_api_keys_max_body_pos CHECK (max_request_body_bytes IS NULL OR max_request_body_bytes > 0),
    ADD CONSTRAINT proxy_api_keys_inflight_nonneg CHECK (inflight_count >= 0);

CREATE TABLE IF NOT EXISTS proxy_key_quota_windows (
    proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day', 'month')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    token_count BIGINT NOT NULL DEFAULT 0,
    reserved_tokens BIGINT NOT NULL DEFAULT 0,
    reserved_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    settled_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    PRIMARY KEY (proxy_key_id, window_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_proxy_key_quota_windows_start
    ON proxy_key_quota_windows (window_start);

ALTER TABLE proxy_key_quota_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quota windows for their proxy keys"
    ON proxy_key_quota_windows FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM proxy_api_keys p
            WHERE p.id = proxy_key_id
              AND (p.user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role')
        )
    );

-- service_role insert/update via RPC only
```

Window starts are truncated:

- `minute` → `date_trunc('minute', now())`
- `day` → `date_trunc('day', now())` UTC
- `month` → `date_trunc('month', now())` UTC

Do not add IP allowlists in v1 (Cloudflare/Vercel client IP headers are inconsistent; YAGNI until a real demand). `allowed_origins` is also deferred.

### Admit RPC

`admit_proxy_request(p_proxy_key_id uuid, p_model text, p_estimated_tokens bigint, p_estimated_usd numeric, p_body_bytes integer) RETURNS jsonb`

Runs as `SECURITY DEFINER`, `GRANT EXECUTE TO service_role`.

Steps inside one transaction:

1. `SELECT … FOR UPDATE` the `proxy_api_keys` row (`deleted_at IS NULL`). Missing → `{ ok: false, code: 'unknown_key' }`.
2. If `is_active = false` → `inactive_key`.
3. If `expires_at IS NOT NULL AND expires_at <= now()` → `expired_key`.
4. Model: if `denied_models` contains `p_model` (or a prefix match — **exact match only** in v1, plus trailing `*` glob: `gemini-2.5-*`) → `model_denied`. If `allowed_models` is non-null and non-empty and no entry matches → `model_denied`. Null/empty allowlist = all models allowed (minus deny). Unknown/missing model: if allowlist is set, deny (`model_required`).
5. If `max_request_body_bytes` set and `p_body_bytes` exceeds → `body_too_large`.
6. If `max_concurrent` set and `inflight_count >= max_concurrent` → `concurrency`.
7. Upsert minute and day windows. If `rpm_limit` is set and minute `request_count >= rpm_limit` → `rpm`. If `rpd_limit` is set and day `request_count >= rpd_limit` → `rpd`. If `tpm_limit` is set and `(token_count + reserved_tokens + p_estimated_tokens) > tpm_limit` on the minute window → `tpm`.
8. Daily/monthly budget (window table is the only ledger): if the matching limit is set and `(reserved_cost_usd + settled_cost_usd + p_estimated_usd) > limit` → `budget`.
9. Increment `inflight_count` by 1. Increment window `request_count` by 1. Add `p_estimated_tokens` to `reserved_tokens`. Add `p_estimated_usd` to `reserved_cost_usd`. Do not add estimates to `token_count` or `settled_cost_usd`.
10. Return `{ ok: true, reserved_tokens, reserved_usd, window_starts: { minute, day, month } }`.

Middleware stores `reserved_tokens` / `reserved_usd` on `c.set('proxyPolicyReservation')` and copies them into `request_logs.performance_metrics` (`policy_reserved_tokens`, `policy_reserved_usd`) so settle can reverse the reservation.

### Settle RPC

`settle_proxy_request(p_proxy_key_id uuid, p_request_id text, p_reserved_tokens bigint, p_reserved_usd numeric, p_actual_tokens bigint, p_actual_usd numeric) RETURNS void`

```text
inflight_count = GREATEST(inflight_count - 1, 0)
reserved_tokens = GREATEST(reserved_tokens - p_reserved_tokens, 0)
reserved_cost_usd = GREATEST(reserved_cost_usd - p_reserved_usd, 0)
token_count += p_actual_tokens
settled_cost_usd += p_actual_usd
```

`BackgroundService` always settles after admit (success, error, client abort) via `waitUntil`. Skip settle when admit never ran (`/healthz`).

If the isolate dies before settle, `inflight_count` can leak. v1 has no lease table: operators may `UPDATE proxy_api_keys SET inflight_count = 0`. Do not add `reset_stale_proxy_inflight` now.

### Estimates on admit

- `p_estimated_tokens`: `max_output_tokens` from policy if set, else `8192`. Do **not** parse the request body for `generationConfig.maxOutputTokens` beyond a cheap JSON peek already done for `model` (spec 6 will share the parsed body). If body has `generationConfig.maxOutputTokens` or OpenAI `max_tokens`, use `min(that, policy max_output_tokens ?? that)`.
- `p_estimated_usd`: `estimateGeminiCostUsd` with estimated output tokens and zero input (under-reserve input). Overshoot risk is accepted; daily budget is a soft-ish cap. Documented as such.
- `p_body_bytes`: `content-length` header if valid, else byte length of buffered body text when already extracted, else 0. If policy `max_request_body_bytes` is set and content-length missing, still enforce after `safelyExtractBodyText` when present.

### Data plane wiring

New middleware `packages/core/src/middlewares/proxy-policy.middleware.ts` **after** `extractProxyDataMiddleware` (needs `model`) and **before** `ProxyService.makeApiRequest`.

- Calls `admit_proxy_request`.
- On `{ ok: false }`, return 429 for rpm/tpm/rpd/concurrency/budget and 400 for model/body/expired, JSON `{ error: 'policy_denied', code, message, gproxy_request_id }`.
- Stash reservation on context: `c.set('proxyPolicyReservation', { … })`.
- `BackgroundService` always settles (success, error, client abort). If admit never ran (healthz), skip.

`max_output_tokens`: if set, **do not** rewrite the provider body in v1 (invasive). Enforce by deny when peeked `max_tokens` exceeds the cap; if the client omitted max tokens, admit uses the cap as the estimate only. Document: "hard reject when the client asks for more than the cap; omitted max is allowed."

### Middleware order

```text
requestId → httpLogger → [healthz/readyz]
→ validateProxyApiKey
→ extractProxyData
→ proxyPolicy
→ ProxyService
```

### Web UI

Proxy key create/edit: a "Limits" `Divider` with optional number inputs (empty = unlimited), `allowed_models` / `denied_models` as Ant Design `Select` `mode="tags"`, `expires_at` as `DatePicker`. Use Refine `useForm` `initialValues` from the record on edit — **no `useEffect`**. i18n en/vi. Show page displays current minute RPM as `request_count` from a Refine list on `proxy_key_quota_windows` if RLS SELECT is enough; otherwise omit live counters in v1 and only show configured caps.

CLI: no new flags in this spec (web is the control plane). Optional follow-up.

### ConfigService

No env for per-key policy. Server-wide retries stay env.

## Tests

- SQL: document RPC with examples in the spec; unit-test a **TypeScript replica** of matching/deny glob `matchModelPolicy(model, allowed, denied)` used by both the TS peek and comments in SQL. Implement glob in SQL with `LIKE` after replacing `*` with `%` (only trailing `*` allowed; reject `*` in the middle at write time in the UI validator).
- Middleware tests with mocked supabase `.rpc('admit_proxy_request')`.
- Contract: active key with `rpm_limit = 1`, second request same minute returns 429 `rpm` without calling upstream `fetch`.
- Settle called on success and on 502 after retries exhausted.
- Null limits: two requests both hit upstream.

## Success criteria

- Two concurrent requests with `max_concurrent = 1`: one 429 `concurrency`.
- Allowlist `gemini-3.5-flash` rejects `gemini-3.5-pro`.
- Empty limits behave like today's proxy key.

## Out of scope

- Slack alerts at 50/80/100% (spec 7). This spec may expose remaining quota in the admit JSON for spec 7 to read; include `usage: { rpm: { used, limit } }` in admit success **only if cheap**. Skip to keep RPC small; spec 7 queries windows.
- IP/origin allowlists.
- Per-model budgets.
