# P0 — Timeout, retry, cooldown, and circuit breaker

> **DRAFT FROZEN.** Not implementation authorization. The replacement is program spec 3 (`/v1` routing, passthrough, retry, cooldown). Hard cooldown is `key + canonical model` (not whole-key by default). Do not wait in-request for a cooled key. `5xx` is a soft penalty, not a hard lock.

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 2 (no global keys, no `ProxyRequestOptions`, no zero-completion retry).
**Approach:** Per-attempt upstream timeout; classify Google errors; cooldown the **failed key**; immediately try a different key; never busy-loop a quarantined key.

## Goal

Failed upstream calls wait only when the **next eligible key** is in cooldown. `Retry-After` is stored as `api_keys.cooldown_until`, not ignored. 401 disables the key. 5xx/timeouts open a per-key circuit that half-opens when cooldown expires.

## Current behavior (wrong)

`ProxyService.retryApiRequest` immediately `continue`s to the next key with no delay. `RateLimitError` parses `Retry-After` into a field that nothing reads. `InvalidKeyError` is retryable, so a permanently dead key is retried until `maxRetries`. `fetch` has no timeout and does not abort on client disconnect. README claims exponential backoff.

## Design

### Extracted units (do not grow `proxy.service.ts`)

| File                                                 | Export                                     | Responsibility                                         |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `packages/core/src/retry/create-timeout-signal.ts`   | `createTimeoutSignal`, `mergeAbortSignals` | Timeout + client abort                                 |
| `packages/core/src/retry/classify-upstream-error.ts` | `classifyUpstreamError`                    | Map status + body → `UpstreamFailureClass`             |
| `packages/core/src/retry/compute-cooldown.ts`        | `computeCooldownUntil`                     | Class + Retry-After + consecutive_failures → timestamp |
| `packages/core/src/retry/retry-delay.ts`             | `computeRetryDelayMs`                      | Full-jitter delay when we must wait                    |
| `packages/core/src/retry/record-key-failure.ts`      | `recordApiKeyFailure`                      | Persist cooldown / disable                             |
| `packages/core/src/retry/record-key-success.ts`      | `recordApiKeySuccess`                      | Reset consecutive_failures, clear cooldown             |

`ProxyService.performAttempt` uses the timeout signal. `retryApiRequest` uses the classifier + recorder + delay. `ApiKeyService.reserveNextApiKey` filters cooled-down and disabled keys.

### Failure classes

```ts
export const UPSTREAM_FAILURE_CLASS = {
  client_invalid: "client_invalid", // 400, 404 on *request* (not key)
  key_invalid: "key_invalid", // 401; 403 API_KEY_INVALID
  key_permission: "key_permission", // other 403
  rate_limit: "rate_limit", // 429 RESOURCE_EXHAUSTED (default)
  spend_limit: "spend_limit", // 429 + spend/billing/limit 0
  transient: "transient", // 408, 409, 423, 5xx, network, timeout
  unknown: "unknown",
} as const;

export interface ClassifiedUpstreamFailure {
  readonly class: (typeof UPSTREAM_FAILURE_CLASS)[keyof typeof UPSTREAM_FAILURE_CLASS];
  readonly retryable: boolean;
  readonly disableKey: boolean;
  readonly retryAfterSeconds: number | null;
  readonly message: string;
  readonly status: number | undefined;
}
```

Classifier inputs: `{ status, headers, bodyText }`. Parse Google JSON `error.status`, `error.message`, `error.details[].reason` when present.

| Class                         | Retry other keys? | This key                                                                                            |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `client_invalid`              | No                | Untouched                                                                                           |
| `key_invalid`                 | Yes               | `is_active = false`, `disabled_reason = 'invalid_key'`, `consecutive_failures += 1`                 |
| `key_permission`              | Yes               | cooldown 15 minutes (900s), `disabled_reason = 'permission'` (key stays active so it can half-open) |
| `rate_limit`                  | Yes               | `cooldown_until` from Retry-After or 60s                                                            |
| `spend_limit`                 | Yes               | `cooldown_until` now+1h, `disabled_reason = 'spend_limit'`                                          |
| `transient`                   | Yes               | exponential cooldown (below)                                                                        |
| `unknown` with status 4xx     | No                | Untouched                                                                                           |
| `unknown` with status 5xx / 0 | Yes               | same as transient                                                                                   |

**Retry-After:** if the header is an integer, treat as delta-seconds (clamp 1–3600). If it is an HTTP-date, use that instant (if in the past, 1s). If missing, class default.

**Do not disable on 429.** Quota recovers. **Do disable on 401.** Operators re-enable in the UI.

### Cooldown formula (transient)

```text
exp = min(PROXY_RETRY_MAX_DELAY_MS, PROXY_RETRY_BASE_DELAY_MS * 2^consecutive_failures)
cooldownMs = random between 0 and exp   // full jitter
```

Defaults: base 200ms, max 5000ms **for the in-loop wait**. Key-level cooldown for transient uses a longer cap: `min(300_000, 1000 * 2^consecutive_failures)` plus full jitter, so a flapping key is skipped for up to 5 minutes.

Two clocks, by design:

1. **Key cooldown** (`api_keys.cooldown_until`) — skip this key in `reserveNextApiKey`.
2. **Loop delay** — only when **no** non-cooled key remains and the failure is retryable **and** `maxRetries` still allows another attempt. Then wait `min(remaining cooldown among keys, computeRetryDelayMs)` before selecting again. If every key is disabled/invalid, stop immediately.

When another key is eligible, **do not wait**. Switching keys is the availability feature.

### Schema

Migration `supabase/migrations/20260831010000_api_key_cooldown.sql` (timestamp assigned at implement time; do not reuse an existing version). Mirror `schema.sql`.

```sql
ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_consecutive_failures_nonneg
        CHECK (consecutive_failures >= 0);

CREATE INDEX IF NOT EXISTS idx_api_keys_cooldown
    ON api_keys (user_id, is_active, cooldown_until)
    WHERE deleted_at IS NULL;
```

`disabled_reason` is informational (`invalid_key` | `permission` | `spend_limit` | `manual` | null). Manual disable from the UI may set `manual`. Success path sets `consecutive_failures = 0`, `cooldown_until = NULL`, and clears `disabled_reason` only when it is not `manual` and `is_active` is true.

RPC optional: `record_api_key_failure(p_id, p_disable, p_cooldown_until, p_reason)` as a single `UPDATE` to avoid read-modify-write on `consecutive_failures`. Prefer an RPC; do not fetch-then-update.

Reservation query adds:

```text
AND (cooldown_until IS NULL OR cooldown_until <= now())
```

Half-open: once `cooldown_until` passes, the key is eligible again. One success resets the counters. No extra `circuit_state` column.

### Timeout and abort

`PROXY_UPSTREAM_TIMEOUT_MS` default `120000`. `ConfigService` parses it (min 1000, max 600000).

```ts
const signal = mergeAbortSignals([
  createTimeoutSignal(timeoutMs),
  request.signal, // client disconnect when the runtime provides it
]);
await fetch(url, { ...requestInit, signal });
```

Abort → `classifyUpstreamError` as `transient` with status `undefined` and message `upstream_timeout` or `client_aborted` (distinguish `AbortSignal.timeout` vs client via `signal.reason` when available). Client abort: **do not retry** other keys (the user is gone). Timeout: retry other keys.

`duplex: 'half'` remains for Node when a body exists.

### Retry budget

Keep `PROXY_MAX_RETRIES`:

- `-1` → `min(availableEligibleKeys, 50)` additional attempts after the first, same as today's `MAX_RETRIES_SAFETY_CAP` semantics (`calculateRetryAttempts`).
- `N > 0` → `min(N, availableEligibleKeys)`.
- `0` → no retries.

`availableEligibleKeys` counts active, not deleted, not cooled down, same `user_id`. Re-count inside the loop after a disable/cooldown so we do not spin.

Load-balance strategy remains `round_robin` | `sticky_until_error` from **env only**. Sticky lookup must refuse keys in cooldown or inactive.

### Error returned to the client

Same as today: last provider status/body when present; otherwise JSON `{ error, message, code, gproxy_request_id }`. No `x-gproxy-*` headers (spec 2). Do not add attempt-count headers.

`retry_attempts` JSON on `request_logs` already exists; each attempt must include `duration_ms`, `status`, `class`, `waited_ms`. Spec 7 reads these fields; write them now.

### Web UI

API key show/edit: display `cooldown_until`, `consecutive_failures`, `disabled_reason` as read-only tags. Re-enable (`is_active: true`) clears `disabled_reason` if the operator toggles the existing `StatusToggle`. No new `useEffect`. i18n en/vi.

Dashboard `key-health-panel` may show a "cooldown" badge using the new columns when the list select includes them (Refine supabase select `*`).

## Tests

Classifier table-driven tests (status × body fixtures). Cooldown math tests with a seeded RNG injected (`random: () => 0.5`). Reservation mock: cooled-down key not selected. Contract:

- origin `AbortError` after `PROXY_UPSTREAM_TIMEOUT_MS` (fake timers).
- 429 with `Retry-After: 120` → next reserve excludes that key; second key called immediately (no 120s wait).
- 401 → key disabled via RPC/update; second key used.
- 400 → no second attempt.
- client abort → no second attempt.

## Success criteria

- README capability matrix row for backoff/Retry-After becomes "Implemented".
- A single 429 key cannot starve the pool: other keys serve immediately.
- 401 keys stay off until an operator re-enables them.

## Out of scope

- Project-level quota (spec 5). A 429 still cooldowns the **key**; spec 5 will also cooldown the **pool**.
- Proxy-key RPM (spec 4).
- OTel spans (spec 7) — but persist `waited_ms` / `class` on retry_attempts now.
