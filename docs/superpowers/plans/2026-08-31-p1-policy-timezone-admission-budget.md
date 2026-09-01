# Proxy-key policy, timezone, and atomic admission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Prior draft on `cursor/proxy-key-policy-a451` wired TPM/concurrency/max-output. Realign: leave those columns unused by admit/UI/docs. Locked limits are RPM, RPD, `token_day_limit`, monthly USD, allowlist, `expires_at`, plus IANA timezone windows.

**Goal:** Optional RPM, request/day, token/day, USD/month, model allowlist, `expires_at` on each proxy key. Daily/monthly windows follow `user_settings.timezone`.

**Architecture:** Columns on `proxy_api_keys` + `proxy_key_quota_windows`. Pure timezone window helper. Middleware admits after model extraction. `finalize`/`settle` in spec 5.

**Tech Stack:** Supabase SQL, Hono middleware, Refine `useForm`, Vitest, `dayjs` timezone.

## Global Constraints

- Null / empty limits = unlimited.
- No request headers for policy.
- Trailing `*` glob only; internal `*` is exact equality.
- Invalid timezone rejected (no silent UTC fallback).
- Changing timezone does not reset the active bucket.
- Do not call Google `countTokens`.
- Spec: [policy](../specs/2026-08-31-p1-policy-timezone-admission-budget-design.md).

## File map

| File                                                       | Responsibility            |
| ---------------------------------------------------------- | ------------------------- |
| `packages/core/src/policy/match-model-policy.ts`           | allow/deny glob           |
| `packages/core/src/policy/estimate-admit.ts`               | tokens / usd / body bytes |
| `packages/core/src/middlewares/proxy-policy.middleware.ts` | RPC admit                 |
| `supabase/migrations/<ts>_proxy_key_policies.sql`          | columns, windows, RPCs    |
| `packages/core/src/app.ts`                                 | mount middleware          |
| `packages/core/src/types/index.ts`                         | `proxyPolicyReservation`  |
| `packages/core/src/services/background.service.ts`         | settle                    |
| `apps/web/.../proxy-api-keys/create/page.tsx`              | Limits fields             |
| `apps/web/.../proxy-api-keys/edit/[id]/page.tsx`           | same                      |
| `apps/web/public/locales/{en,vi}/common.json`              | copy                      |

---

### Task 1: Model policy + admit estimate (pure TS)

```ts
export function matchModelPolicy(input: {
  readonly model: string | undefined;
  readonly allowed: string[] | null;
  readonly denied: string[] | null;
}): "ok" | "model_denied" | "model_required";

export function globModel(pattern: string, model: string): boolean;
```

Trailing `*` only: `gemini-3.5-*` matches `gemini-3.5-flash`. Pattern with `*` not at end → treat as exact string (or reject in UI). Empty allowed + empty denied → `ok` even if model undefined. Non-empty allowed + undefined model → `model_required`.

```ts
export function estimateAdmitTokens(input: {
  readonly peekedMaxOutput: number | undefined;
  readonly policyMaxOutput: number | null;
}): number; // default 8192
```

- [ ] **Step 1: Failing tests** for glob, deny-wins, allowlist, missing model, estimate `min(peeked, policy)`.

- [ ] **Step 2: Implement until PASS**

- [ ] **Step 3: Commit** `feat(core): add proxy-key model policy matcher`

---

### Task 2: Migration + RPCs + middleware + settle

SQL per spec. `admit_proxy_request` and `settle_proxy_request` `SECURITY DEFINER`, `GRANT EXECUTE … TO service_role`.

TS replica of TPM/RPM checks is **not** required if contract tests mock `.rpc`. Still add a SQL comment with the ledger rules.

- [ ] **Step 1: Contract tests**
  - `rpm_limit 1 → second request 429 code rpm` (mock RPC first ok, second `{ ok:false, code:'rpm' }`; assert origin fetch call count 1)
  - `null limits → both requests fetch origin`
  - `model_denied → 400` without fetch
  - success path calls `settle_proxy_request`
  - origin 502 after retries still settles

- [ ] **Step 2: Middleware** after `extractProxyDataMiddleware`. Context key `proxyPolicyReservation: { reserved_tokens, reserved_usd }`.

  Deny mapping: rpm/tpm/rpd/concurrency/budget → 429; model/body/expired/inactive → 400; unknown_key → 401.

- [ ] **Step 3: BackgroundService** `waitUntil` settle with actual tokens from parsed usage and `estimatedCostUsd`. Always decrement inflight.

- [ ] **Step 4: Types** `Variables.proxyPolicyReservation`. Mirror `schema.sql` + `database.types.ts`.

- [ ] **Step 5: Commit** `feat(core): atomically admit and settle proxy-key quotas`

---

### Task 3: Web Limits form

Create + edit pages: optional `InputNumber` for rpm/tpm/rpd/max_concurrent/budgets/max_output/max_body, `Select mode="tags"` for models, `DatePicker` `expires_at`. Empty number → `null`. Refine `useForm` `initialValues` from record on edit — **do not** add `useEffect`.

Validate tags: if a tag contains `*` not at the end, `Promise.reject`.

i18n both locales. Locale parity script must pass.

- [ ] **Step 1: Implement UI + locale keys**

- [ ] **Step 2: `pnpm --filter web lint`** (includes locale parity)

- [ ] **Step 3: Commit** `feat(web): edit proxy-key RPM TPM budget and model limits`

---

## Spec coverage

Admit/settle ledger, inflight, model glob, body size, expiry, 429 vs 400, UI, no IP allowlist (omitted).
