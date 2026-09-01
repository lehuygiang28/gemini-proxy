# `/v1` routing, passthrough, retry, and cooldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> `cursor/timeout-retry-circuit-breaker-a451` currently implements the deleted whole-key / in-request-wait draft. Realign that branch to this plan: `/v1` routing, `api_key_model_cooldowns`, skip cooled keys (no sleep), soft 5xx only.

**Goal:** Canonical `/v1` with credential-based format detection, legacy paths kept, one-attempt-per-key retry without waiting on hard cooldown, hard cooldown scoped to `api_key + canonical model`.

**Architecture:** Pure `normalizeV1Path` / `detectApiFormat` / `buildOriginUrl`. Classifier + cooldown math stay in `packages/core/src/retry/*`. New `api_key_model_cooldowns` table. `ProxyService` orchestrates only.

**Tech Stack:** Hono, Vitest, Supabase.

## Global Constraints

- Spec: [v1 routing](../specs/2026-08-31-p0-routing-retry-cooldown-design.md). Master architecture wins on conflict.
- No `?key=`, no `x-api-key`. Both goog+Bearer → 400.
- Do not wait in-request for hard cooldown. Cap 50 keys. `PROXY_MAX_RETRIES` 0 / N / -1.
- 5xx is soft penalty, not `api_key_model_cooldowns`.
- Do not parse cooldown from error message prose.
- Do not merge `feat/auto-detect-api-format` wholesale.
- No project pools, affinity, or OTel.
- TDD. Conventional Commits. English.

## File map

| File | Responsibility |
| ---- | -------------- |
| `packages/core/src/routing/normalize-v1-path.ts` | path rewrite table |
| `packages/core/src/routing/detect-api-format.ts` | credential + legacy path |
| `packages/core/src/routing/build-origin-url.ts` | Gemini/OpenAI origin URL + raw query |
| `packages/core/src/middlewares/extract-proxy-data.middleware.ts` | use routing units; allow `/v1` |
| `packages/vercel/src/route.ts` + `apps/web/src/app/v1/[[...slug]]/route.ts` | mount `/v1` |
| `apps/api/src/create-api-app.ts` / cloudflare worker | dual mount |
| `packages/core/src/retry/compute-cooldown.ts` | scope key vs key_model |
| `supabase/migrations/20260831040000_api_key_model_cooldowns.sql` | table |
| `packages/core/test/proxy-contract/v1-routing.test.ts` | contract |
| `README.md` | advertise `/v1` |

---

### Task 1: Path normalize + format detect + origin URL (pure)

- [ ] **Step 1:** Failing tests in `normalize-v1-path.test.ts`, `detect-api-format.test.ts`, `build-origin-url.test.ts` for every row in the spec tables (including repeated query params).
- [ ] **Step 2:** Implement the three files. `detectApiFormat` returns `{ apiFormat, error?: 'conflicting_credentials' | 'missing_credential' }`.
- [ ] **Step 3:** Commit `feat(core): normalize /v1 paths and detect format from credentials`

### Task 2: Middleware + adapter mounts + contract

- [ ] **Step 1:** Failing contract: `/v1/models/gemini-flash:generateContent` + goog header reaches mock origin; both headers 400; `?key=` 401; `/v1/v1beta/models/...` origin path; legacy `/gemini/...` still 200.
- [ ] **Step 2:** Wire `extractProxyDataMiddleware` to the routing units. Add Next `app/v1/[[...slug]]/route.ts`, mount `coreApp` without stripping `/v1`. Dual-mount Node and Cloudflare.
- [ ] **Step 3:** README quickstart `/v1` only.
- [ ] **Step 4:** Commit `feat(core): serve canonical /v1 alongside legacy gproxy paths`

### Task 3: Model-scoped hard cooldown + no wait + soft 5xx

- [ ] **Step 1:** Failing tests: 429 on A/model M skips A/M, still allows A/N and B/M; 503 uses B immediately (`toBeLessThan(100)`); all keys cooled → 429 no sleep; `PROXY_MAX_RETRIES=0` → one origin call; passthrough POST network error → no retry.
- [ ] **Step 2:** Migration `api_key_model_cooldowns`. Reservation filters model cooldown. Remove in-loop cooldown wait. Soft penalty via `last_error_at` only.
- [ ] **Step 3:** Mirror `schema.sql` + `database.types.ts`.
- [ ] **Step 4:** Commit `feat(core): cooldown Gemini keys per canonical model without in-request wait`

## Spec coverage

`/v1` detect-by-credential, path normalize, raw query, legacy paths, managed vs passthrough retry, hard cooldown scope, soft 5xx, max retries, abort, header-wait timeout.
