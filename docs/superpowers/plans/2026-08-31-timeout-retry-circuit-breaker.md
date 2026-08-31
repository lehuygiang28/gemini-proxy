# Timeout, retry, cooldown, and circuit breaker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-attempt upstream timeout, classified Google errors, per-key cooldown, 401 disable, Retry-After honored as skip-not-sleep when another key exists.

**Architecture:** New `packages/core/src/retry/*` units. `ProxyService` orchestrates. `ApiKeyService.reserveNextApiKey` filters `cooldown_until`. SQL RPC increments `consecutive_failures` without read-modify-write.

**Tech Stack:** TypeScript, Vitest (fake timers), Supabase migration, Refine show-page tags.

## Global Constraints

- Depends on spec 2 (no `ProxyRequestOptions`, no global keys).
- Do not wait when another eligible key exists.
- Client abort → no retry. Timeout → retry other keys.
- No `x-gproxy-attempts` headers. Persist `class` / `waited_ms` on `retry_attempts`.
- Spec: [timeout/retry](../specs/2026-08-31-timeout-retry-circuit-breaker-design.md).

## File map

| File                                                 | Responsibility          |
| ---------------------------------------------------- | ----------------------- |
| `packages/core/src/retry/create-timeout-signal.ts`   | timeout + merge signals |
| `packages/core/src/retry/classify-upstream-error.ts` | status/body → class     |
| `packages/core/src/retry/compute-cooldown.ts`        | cooldown timestamp      |
| `packages/core/src/retry/retry-delay.ts`             | full jitter loop delay  |
| `packages/core/src/retry/record-key-outcome.ts`      | success/failure RPCs    |
| `supabase/migrations/<ts>_api_key_cooldown.sql`      | columns + RPC           |
| `packages/database/sql/schema.sql`                   | mirror                  |
| `packages/database/types/database.types.ts`          | types                   |
| `packages/core/src/services/proxy.service.ts`        | use units               |
| `packages/core/src/services/api-key.service.ts`      | cooldown filter         |
| `apps/web` api-key show                              | cooldown badge          |

---

### Task 1: Classifier, cooldown math, timeout signals (unit tests)

**Interfaces:**

```ts
export const UPSTREAM_FAILURE_CLASS = {
  client_invalid: "client_invalid",
  key_invalid: "key_invalid",
  key_permission: "key_permission",
  rate_limit: "rate_limit",
  spend_limit: "spend_limit",
  transient: "transient",
  unknown: "unknown",
} as const;

export function classifyUpstreamError(input: {
  readonly status: number | undefined;
  readonly headers: Headers | Record<string, string>;
  readonly bodyText: string;
}): ClassifiedUpstreamFailure;

export function computeCooldownUntil(input: {
  readonly failureClass: ClassifiedUpstreamFailure["class"];
  readonly retryAfterSeconds: number | null;
  readonly consecutiveFailures: number;
  readonly nowMs: number;
  readonly random: () => number;
}): Date | null;

export function createTimeoutSignal(timeoutMs: number): AbortSignal;
export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal;
```

- [ ] **Step 1: Table-driven classifier tests**

  Fixtures: 400 → not retryable; 401 → `key_invalid` disable; 403 `API_KEY_INVALID` → `key_invalid`; 403 other → `key_permission`; 429 + `Retry-After: 120` → `rate_limit` 120s; 429 body spend/limit 0 → `spend_limit`; 503 → `transient`; abort status undefined → `transient`.

- [ ] **Step 2: Cooldown tests** with `random: () => 0.5`.

- [ ] **Step 3: Timeout signal test** using fake timers: abort after 50ms.

- [ ] **Step 4: Implement until PASS**

- [ ] **Step 5: Commit** `feat(core): classify upstream errors and compute key cooldowns`

---

### Task 2: Migration + reservation filter + ProxyService loop

**SQL RPC** `record_api_key_failure(p_id uuid, p_disable boolean, p_cooldown_until timestamptz, p_reason text)`:

```sql
UPDATE api_keys SET
  consecutive_failures = consecutive_failures + 1,
  cooldown_until = p_cooldown_until,
  disabled_reason = p_reason,
  is_active = CASE WHEN p_disable THEN false ELSE is_active END,
  last_error_at = NOW()
WHERE id = p_id AND deleted_at IS NULL;
```

`record_api_key_success(p_id uuid)`: `consecutive_failures = 0`, `cooldown_until = NULL`, clear `disabled_reason` when not `manual`.

GRANT EXECUTE to service_role.

Reservation: `.or('cooldown_until.is.null,cooldown_until.lte.' + nowIso)` plus existing tenant filters.

- [ ] **Step 1: Contract tests** (harness)
  - `429 Retry-After on key A immediately uses key B` (assert two fetch calls, elapsed < 50ms)
  - `401 disables key A then uses key B`
  - `400 does not call a second key`
  - `timeout retries another key` (mock fetch abort)
  - `client abort does not retry` (pass aborted `request.signal`)

- [ ] **Step 2: Implement ProxyService**

  `performAttempt` uses `mergeAbortSignals([createTimeoutSignal(timeoutMs), baseRequest.signal])`.

  On failure: classify → record failure → if `!retryable` break → reserve next (exclude used ids) → if none eligible and retryable, `waited_ms = computeRetryDelayMs` then retry reserve; else break.

  On success: `record_api_key_success`.

  Each `retry_attempts` item: `{ attempt_number, api_key_id, duration_ms, waited_ms, class, error, timestamp }`.

- [ ] **Step 3: ConfigService**

  `PROXY_UPSTREAM_TIMEOUT_MS` default 120000 clamp 1000–600000. `PROXY_RETRY_BASE_DELAY_MS` 200. `PROXY_RETRY_MAX_DELAY_MS` 5000.

- [ ] **Step 4: Mirror schema.sql + database.types.ts** (hand-edit types if `supabase gen types` cannot run).

- [ ] **Step 5: Commit** `feat(core): timeout, Retry-After cooldown, and 401 key disable`

---

### Task 3: Web cooldown display + README matrix row

**Files:** api-key show page / `key-health-badge.tsx`.

- [ ] **Step 1:** Read-only `Tag` when `cooldown_until` is in the future; `disabled_reason` text. i18n `en` + `vi`. No `useEffect`.

- [ ] **Step 2:** README capability row backoff → Implemented.

- [ ] **Step 3: Commit** `feat(web): show API key cooldown and disable reason`

---

## Spec coverage

Timeout, merge abort, classification table, cooldown columns, RPC, skip cooled keys, no wait when sibling eligible, 401 disable, 400 no retry, client abort no retry, retry_attempts fields, UI tags.
