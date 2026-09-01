# P0/P1 master architecture — Gemini-native gateway

**Date:** 2026-08-31
**Status:** Sections 0–5 approved (locked decisions + continue). Implementation plans follow; one PR per spec, stacked.
**Positioning:** Self-hosted, Gemini-native, edge-first gateway. Do not become a multi-provider LiteLLM/Portkey clone.
**Approach:** Direction B — layered incremental. Keep Hono, Supabase, and Refine. Do not add Redis, a queue service, OpenTelemetry, or a new microservice.

This document is the source of truth when a feature spec conflicts with it. Feature details live in the specs listed below. Do not reopen locked decisions during implementation.

## Specs in this program

| ID  | Priority | Spec                                                                                                | Plan                                                                | Status   |
| --- | -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| 0   | —        | This master architecture                                                                            | —                                                                   | Approved |
| 1   | P0       | [CI, test baseline, and runtime contract](./2026-08-31-p0-ci-test-runtime-design.md)                | [plan](../plans/2026-08-31-p0-ci-test-runtime.md)                   | Approved |
| 2   | P0       | [Tenant, CLI, auth, privacy](./2026-08-31-p0-tenant-cli-auth-privacy-design.md)                     | [plan](../plans/2026-08-31-p0-tenant-cli-auth-privacy.md)           | Approved |
| 3   | P0       | [`/v1` routing, passthrough, retry, cooldown](./2026-08-31-p0-routing-retry-cooldown-design.md)     | [plan](../plans/2026-08-31-p0-routing-retry-cooldown.md)            | Approved |
| 4   | P1       | [Proxy-key policy, timezone, admission](./2026-08-31-p1-policy-timezone-admission-budget-design.md) | [plan](../plans/2026-08-31-p1-policy-timezone-admission-budget.md)  | Approved |
| 5   | P1       | [Persistence, alerts, reconciliation](./2026-08-31-p1-persistence-alerts-reconciliation-design.md)  | [plan](../plans/2026-08-31-p1-persistence-alerts-reconciliation.md) | Approved |

Each spec is one implementation plan and one PR (stacked).

### Dropped from this program

Do not implement, and treat prior drafts as superseded:

- Google project pools, `google_project_pools` / `google_projects`, and a project-level scheduler.
- Interactions-specific state or resource affinity tables.
- OpenTelemetry / OTLP exporters.
- Encryption or hashing of keys at rest.
- Public `x-gproxy-*` request or response headers.
- Zero-completion synthetic error/retry.
- Merging `feat/auto-detect-api-format` wholesale (selective helper/test port only).

**Invariant:** each Gemini API key belongs to its own Google project. Do not group keys as if they shared a quota bucket.

Those drafts are removed from this tree. Do not revive them. The six files in the table above are the only authorized specs for this program.

Locked local filenames (do not rename again):

- `docs/superpowers/specs/2026-08-31-p0-p1-master-architecture-design.md`
- `docs/superpowers/specs/2026-08-31-p0-ci-test-runtime-design.md`
- `docs/superpowers/specs/2026-08-31-p0-tenant-cli-auth-privacy-design.md`
- `docs/superpowers/specs/2026-08-31-p0-routing-retry-cooldown-design.md`
- `docs/superpowers/specs/2026-08-31-p1-policy-timezone-admission-budget-design.md`
- `docs/superpowers/specs/2026-08-31-p1-persistence-alerts-reconciliation-design.md`

### Stacked implementation PRs vs this lock

Treat these as the live stack. Realign code; do not continue dropped work.

| Spec | Branch / PR                                 | vs lock                                                                                                                                                      |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `cursor/ci-contract-tests-a451`             | Keep. Finish README matrix (`/v1`, pools/OTel out of scope) and the two stream contract cases.                                                               |
| 2    | `cursor/auth-tenant-log-privacy-a451`       | Keep. Finish CLI 0/1/2+ owner (including sync/`-q`), delete leftover `ProxyRequestOptions` / synthetic helpers.                                              |
| 3    | `cursor/timeout-retry-circuit-breaker-a451` | **Rewrite.** Old whole-key cooldown, in-request wait, and 5xx hard lock contradict spec 3. Add `/v1`, `api_key_model_cooldowns`, skip cooled keys, soft 5xx. |
| 4    | `cursor/proxy-key-policy-a451`              | **Rewrite.** Unwire TPM / max_concurrent / max_output / max_body / denied_models / daily USD. Add `token_day_limit` and IANA timezone windows.               |
| —    | `cursor/project-pool-scheduler-a451`        | **Drop.** Out of scope. Do not merge.                                                                                                                        |

## Locked product decisions

1. **Keys stay plaintext.** Gemini keys (`api_keys.api_key_value`) and proxy keys (`proxy_api_keys.proxy_key_value`) remain readable. The UI and CLI continue to show, copy, and rotate them. No hashing, envelope encryption, master key, or encryption migration.
2. **Secrets never appear** in logs, URLs, captured headers, or error payloads.
3. **Every key belongs to exactly one user.** `user_id NOT NULL` with a foreign key to `auth.users`. Delete global/shared-key logic and every `user_id IS NULL` branch.
4. **CLI owner assignment:**
   - 0 users → fail before insert.
   - 1 user → auto-assign.
   - 2+ users → require `--user-id` or interactive selection.
   - Validate UUID and that the user exists in quick and interactive modes.
   - Same rule for Gemini keys and proxy keys.
5. **Canonical public API is `/v1`.** Users must not need `/gemini`, `/openai`, or `/api/gproxy`. README/quickstart advertise only `/v1`.
6. **Format detection is by credential, not by path alone:**
   - `x-goog-api-key` → Gemini.
   - Strict `Authorization: Bearer` → OpenAI-compatible.
   - Both present → `400`.
   - No valid credential → `401`.
   - Do not accept `x-api-key` or query `?key=`.
7. **Path is for operation/model, not the sole format signal.** Normalize `/v1/models/...`, `/v1/v1/models/...`, and `/v1/v1beta/models/...`. Preserve the raw query string, including repeated parameters.
8. **Legacy paths stay:** `/api/gproxy/gemini/*` and `/api/gproxy/openai/*` keep working (no breaking change).
9. **No public `x-gproxy-*` headers** on request or response. Delete `proxyOptionsMiddleware` and `ProxyRequestOptions`. Do not add replacement headers. Error JSON may keep `gproxy_request_id`. Optionally set standard `x-request-id` to the same UUID.
10. **Retry and load-balancing come only from server env:** `PROXY_MAX_RETRIES`, `PROXY_LOADBALANCE_STRATEGY`. `x-goog-api-key` remains because it is the Gemini client credential, not an internal control header.
11. **HTTP 200 is success.** Do not invent a failure when completion tokens are zero.
12. **No new infrastructure.** Hono is the HTTP boundary. Pure modules handle classification, retry, cooldown, policy, and timezone. Supabase RPCs handle admission, reservation, selection, and settlement. Transport only forwards. Refine + Supabase remain the dashboard state layer.

## Current architecture (do not reinvent)

```text
Client SDK
  → /v1/*                         (canonical)
  → /api/gproxy/{gemini|openai}/* (legacy)
       ↓
  apps/web  Next.js + @gemini-proxy/vercel (Node runtime)
  apps/api  Node + @hono/node-server
  packages/cloudflare  Workers Module Worker
       ↓
  packages/core  Hono coreApp
       ↓
  packages/database  Supabase (service_role on the data plane)
```

- **One data plane:** `ProxyService.makeApiRequest` in `@gemini-proxy/core`. Adapters stay thin.
- **Auth on the data plane:** lookup `proxy_api_keys.proxy_key_value` with the service role, then scope Gemini key selection to that row's `user_id`.
- **Control plane:** Refine + Ant Design + `@refinedev/supabase` (user JWT + RLS). New tables get RLS `user_id = auth.uid() OR service_role`.
- **Background work:** `executeWithWaitUntil` (Hono `executionCtx` → `@vercel/functions` → await). Persist from stream `flush` / error handler only. Do not wrap the whole stream consume in `waitUntil`.
- **Schema changes:** new file under `supabase/migrations/`, then mirror `packages/database/sql/schema.sql`, then update `packages/database/types/database.types.ts`. Never edit merged migrations.
- **English** in code and docs. Conventional Commits. Locale keys in both `apps/web/public/locales/en/common.json` and `vi/common.json`.

## Layering (direction B)

| Layer                                     | Owns                                                                         | Must not own              |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| Adapter (web / api / cloudflare / vercel) | Mount paths, platform `waitUntil`, env binding                               | Retry, policy math, SQL   |
| Hono middleware                           | Credential extract, tenant bind, request-id, health                          | Upstream fetch            |
| Pure modules                              | Classify errors, cooldown math, model glob, timezone windows, path normalize | `fetch`, Supabase         |
| Supabase RPC                              | Atomic admit / reserve / settle / counters                                   | HTTP                      |
| Transport                                 | Forward method, query, body, status, safe headers                            | Endpoint-specific state   |
| Refine UI                                 | Query-derived forms, lists, alerts                                           | New `useEffect` hydration |

## Runtime constraints (edge-first)

All new core code must run on Node 20, Cloudflare Workers, and the Next.js Node route.

| Allowed                                                                | Forbidden in `packages/core`                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Web `fetch`, `Request`, `AbortSignal`, `TransformStream`               | `node:fs`, `node:net`, `node:crypto` KeyObject APIs that Workers reject |
| `AbortSignal.timeout` with a `setTimeout` + `AbortController` fallback | OpenTelemetry SDKs or auto-instrumentation                              |
| Hono `env(c)`, `c.executionCtx.waitUntil`                              | Process-global mutable caches that leak across tenants                  |
| Supabase JS client                                                     | Prisma, Drizzle, Redis, extra queue/microservice                        |

Client disconnect must abort the in-flight upstream attempt. Timeout waits only for response headers; do not cut a stream after the first byte.

## Public API

Canonical:

```text
https://host/v1
```

`coreApp` owns `/v1`, legacy `/gemini` and `/openai` (as used behind `/api/gproxy`), plus unauthenticated `GET /healthz` and `GET /readyz`.

Adapters must serve:

- `/v1/*` (canonical)
- `/api/gproxy/gemini/*` and `/api/gproxy/openai/*` (legacy)
- Health URLs that reach the same `healthz` / `readyz` handlers

Port useful helpers/tests from `feat/auto-detect-api-format` only. Do not merge that branch: it diverged, and a path-only detector mishandles ambiguous paths.

## Managed vs generic passthrough

**Managed** (model parse, usage/cost parse, retry, model policy, token/cost guardrail):

- Gemini `generateContent`
- Gemini `streamGenerateContent`
- OpenAI-compatible endpoints

**Best-effort passthrough** for everything else:

- Forward method, raw query, body, status, and safe response headers.
- No endpoint-specific state. No interaction/resource affinity table.
- Continuity is not guaranteed if a later request selects a different Gemini key.
- Apply auth, expiry, RPM, and request/day only.
- Do not claim model/token/cost policy without a parser.
- Do not retry a generic mutation when delivery state is unknown.

## Retry and cooldown (invariants; details in spec 3)

- Default: try every eligible provider key. At most one attempt per key per logical request. Safety cap 50 keys.
- Do not wait for a key in hard cooldown to become eligible.
- `PROXY_MAX_RETRIES=0` → first attempt only. `=N` → at most N retries after the first attempt. `-1` or unset → all eligible keys (still capped at 50).
- Ineligible: inactive, deleted, hard-cooldown, or already used in this request.
- Managed endpoints may retry clear `401/403/408/429/5xx`. Do not retry client `400`.
- Fetch/network ambiguity must not retry a mutation.
- **Hard cooldown** (`429` and clear credential/quota state): default scope is `API key + canonical model`. Model A rate-limited does not lock model B on the same key. Lock the whole key only when a **structured** error proves a credential or project/spend-wide problem. Prefer `google.rpc.RetryInfo.retryDelay`, then `Retry-After` (seconds or HTTP-date), then structured quota-reset metadata. If several signals exist, use the latest instant. Do not parse prose in error messages. Persist in the database so every runtime sees it. Success resets only that `key + model` scope. If every key is in hard cooldown, return `429` immediately with the shortest remaining wait.
- **Soft penalty** (`500/502/503/504`): do not hard-lock. Immediately try the next eligible key. Deprioritize the failing key/model for at most 30 seconds (or RetryInfo/Retry-After duration if present, still not a hard lock). Still usable as fallback if nothing healthier remains. Success clears the penalty. If every key returns `5xx`, exhaust them then return the error.

## Proxy-key policy (invariants; details in spec 4)

Per proxy key, nullable means unlimited:

- RPM (hard, atomic)
- Request/day (hard, atomic)
- Token/day (guardrail, not an absolute billing cap)
- Estimated USD/month (guardrail)
- Model allowlist
- `expires_at`

Guardrails count settled usage plus outstanding reservations. Bounded overage is allowed on the last request or under concurrency. Do not call Google `countTokens` before each request. Actual usage that exceeds the reservation is still recorded in full and blocks the next request.

Daily/monthly windows use `user_settings.timezone` (IANA, e.g. `Asia/Bangkok`). Unset → UTC. Store boundaries in UTC. Changing timezone does not reset the active bucket; the new zone applies from the next period. Invalid timezone is rejected (no silent fallback).

## Persistence (invariants; details in spec 5)

- Admit/reserve atomically before upstream.
- Settlement and logging are idempotent.
- Request log, counters, and settlement update in the same transaction/RPC.
- A persistence failure must not turn an upstream success into a client error.
- Settlement retry is bounded. If it still fails, leave the reservation in place (fail-closed on the next admit).
- Do not auto-release stale reservations.
- Dashboard shows stale/reconciliation alerts. Users can retry/reconcile safely.

## Web UI rules

- Prefer query-derived state, pure selectors, and event handlers.
- Minimize `useEffect`. Allowed only for subscription, timer, or external lifecycle, and it must clean up.
- Do not add `useEffect` to copy Refine query data into `form.setFieldsValue`. Pass `initialValues` from the query or Refine `useForm`.
- Event handlers start with `handle`. Named exports.
- Every user-visible string goes through `translate('…')` with matching `en` and `vi` keys.

## Shared code patterns (required)

Follow existing files. Do not invent a second style.

- **Services:** static methods on classes (`ProxyService`, `ApiKeyService`, `ConfigService`, `BackgroundService`). New units are focused files, not more private methods on those classes.
- **RO-RO:** object params in, object out. No 8-argument functions.
- **Types:** explicit parameter and return types. No `any` on new code. Prefer interfaces over enums; use const maps (`as const`) for closed string unions.
- **One export per new file.** kebab-case filenames. PascalCase classes. camelCase functions.
- **Errors:** extend `ProxyError`. Do not throw raw `Error` on the request path.
- **Tests:** Vitest `describe` / `it` / `expect` in `*.test.ts` next to the unit or under `packages/core/test/<area>/`. Arrange-Act-Assert. Names: `inputX`, `mockX`, `actualX`, `expectedX`.
- **SQL:** `SECURITY DEFINER` RPCs used by the data plane are `GRANT EXECUTE … TO service_role` only. RLS on every new table.
- **TDD:** RED → GREEN → REFACTOR. Plans name the failing tests.

## Split oversized files instead of growing them

These files are already past the project guideline:

- `packages/core/src/services/proxy.service.ts`
- `packages/core/src/services/background.service.ts`
- `packages/core/src/services/api-key.service.ts`
- `apps/web/src/app/(protected)/api-keys/create/page.tsx`

Plans must extract new behavior into new files. Keep `ProxyService.makeApiRequest` as the orchestrator.

## Config surface (server env only)

| Variable                     | Default                                                    | Spec     |
| ---------------------------- | ---------------------------------------------------------- | -------- |
| `PROXY_MAX_RETRIES`          | `-1` (all eligible keys, cap 50)                           | 3        |
| `PROXY_LOADBALANCE_STRATEGY` | `round_robin`                                              | 3        |
| `PROXY_UPSTREAM_TIMEOUT_MS`  | `120000` (wait for response headers only)                  | 3        |
| `PROXY_REDACT_JSON_FIELDS`   | empty (built-in list always on)                            | 2        |
| `GOOGLE_GEMINI_API_BASE_URL` | `https://generativelanguage.googleapis.com/`               | existing |
| `GOOGLE_OPENAI_API_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` | existing |

No per-request override headers. Proxy-key policy is row data, not env. Do not add OTLP env vars.

## Health endpoints

Mounted on `coreApp` **before** proxy-key validation:

- `GET /healthz` → `200 { "status": "ok" }`
- `GET /readyz` → `200 { "status": "ready" }` after a cheap Supabase probe; `503 { "status": "not_ready" }` on failure

## Testing strategy (program-wide)

| Layer          | Where                                | What                                                                 |
| -------------- | ------------------------------------ | -------------------------------------------------------------------- |
| Unit           | `packages/core/src/**/*.test.ts`     | classifiers, sanitizer, policy math, path/model extractors, timezone |
| Proxy contract | `packages/core/test/proxy-contract/` | `coreApp.fetch` + mocked Supabase + mocked upstream `fetch`          |
| Adapter smoke  | Cloudflare / Vercel / `apps/api`     | export surface + healthz                                             |
| SDK smoke      | `packages/core/test/sdk-smoke/`      | `@google/genai`, `openai`, `ai` against `coreApp` with mock upstream |
| Web            | existing Vitest + locale parity      | pure helpers; no Cypress in this program                             |
| CI             | `.github/workflows/quality.yml`      | `format:check` → `lint` → `test` → `build` on every PR               |

Contract tests must not egress. SDK smoke may bind a loopback server; stub `fetch` only for the mock origin.

## Dependency graph

```text
1 CI / contract harness
        │
        ▼
2 Tenant / CLI / auth / privacy
        │
        ▼
3 /v1 routing + passthrough + retry/cooldown
        │
        ▼
4 Proxy-key policy + timezone + admit/settle
        │
        ▼
5 Persistence reliability + dashboard reconciliation
```

Spec 1 must stay green. Spec 2 must land before spec 3 (retry writes health on tenant-owned keys). Spec 4 admits on `proxy_api_keys` after spec 2. Spec 5 depends on spec 4 reservations.

## Rollout

1. Spec 1: CI green, capability matrix, contract harness.
2. Spec 2: tenant queries, CLI owner resolver, redaction, delete `x-gproxy-*` and synthetic retry, no `?key=`.
3. Spec 3: `/v1` detect-by-credential, legacy paths, classified retry, key+model hard cooldown, soft 5xx penalty.
4. Spec 4: policy columns, timezone, admit/settle RPCs, proxy-key edit UI.
5. Spec 5: idempotent settlement retry, fail-open client on persist failure, dashboard stale alerts.

Each step is production-safe on its own: missing optional columns/env fail open to current behavior except where the spec says fail closed (invalid proxy key, missing owner, policy deny, invalid timezone).

## Anti-patterns (reject in review)

- Grouping Gemini keys into a Google project pool.
- Guessing Google quota from key count.
- Letting a proxy-key holder widen retries, models, or budget via headers.
- Hashing or encrypting keys "while we are in there".
- Accepting `x-api-key` or `?key=` as the proxy credential.
- Semantic/response caching of Gemini outputs.
- New `useEffect` to copy Refine query data into `form.setFieldsValue`.
- `waitUntil(read entire stream)`.
- Editing `packages/database/sql/migrations/` (retired path).
- Adding Slack/Discord/email/OTLP providers.
- Restoring `user_id IS NULL` global-key filters.
- Waiting in-request for a hard-cooled key to become eligible.
- Parsing cooldown duration from English error text.
- Retrying generic mutations after an ambiguous fetch failure.
- Auto-releasing stale reservations.
- Merging `feat/auto-detect-api-format` as a whole.
