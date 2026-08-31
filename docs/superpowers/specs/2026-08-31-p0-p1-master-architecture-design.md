# P0/P1 master architecture — Gemini-native gateway

**Date:** 2026-08-31
**Status:** Locked for implementation planning
**Positioning:** Self-hosted, Gemini-native, edge-first gateway. Do not become a multi-provider LiteLLM/Portkey clone.

This document locks shared decisions, compatibility, dependencies, and rollout across the seven feature specs. Feature details live in those specs; this file is the source of truth when they conflict.

## Specs in this program

| ID  | Priority | Spec                                                                                              | Plan                                                          |
| --- | -------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0   | —        | This master architecture                                                                          | —                                                             |
| 1   | P0       | [CI and contract tests](./2026-08-31-ci-contract-tests-design.md)                                 | [plan](../plans/2026-08-31-ci-contract-tests.md)              |
| 2   | P0       | [Auth, tenant isolation, log privacy](./2026-08-31-auth-tenant-log-privacy-design.md)             | [plan](../plans/2026-08-31-auth-tenant-log-privacy.md)        |
| 3   | P0       | [Timeout, retry, cooldown, circuit breaker](./2026-08-31-timeout-retry-circuit-breaker-design.md) | [plan](../plans/2026-08-31-timeout-retry-circuit-breaker.md)  |
| 4   | P1       | [Proxy-key policy and atomic admission](./2026-08-31-proxy-key-policy-design.md)                  | [plan](../plans/2026-08-31-proxy-key-policy.md)               |
| 5   | P1       | [Google project pools and quota scheduler](./2026-08-31-project-pool-scheduler-design.md)         | [plan](../plans/2026-08-31-project-pool-scheduler.md)         |
| 6   | P1       | [Interactions API and resource affinity](./2026-08-31-interactions-resource-affinity-design.md)   | [plan](../plans/2026-08-31-interactions-resource-affinity.md) |
| 7   | P1       | [OpenTelemetry, reliability signals, alerts](./2026-08-31-otel-alerting-design.md)                | [plan](../plans/2026-08-31-otel-alerting.md)                  |

## Locked product decisions

These were decided with the maintainer before writing the specs. Do not reopen them in implementation.

1. **Keys stay plaintext.** Gemini keys (`api_keys.api_key_value`) and proxy keys (`proxy_api_keys.proxy_key_value`) remain readable. The UI and CLI continue to show and copy them. No hashing, envelope encryption, `GPROXY_MASTER_KEY`, or dual-read migration in this program.
2. **Remove the entire `x-gproxy-*` public API.** Delete `proxyOptionsMiddleware`, `ProxyRequestOptions`, and every request header that let a client raise retries, change load-balancing, or pick keys. Server env (`PROXY_MAX_RETRIES`, `PROXY_LOADBALANCE_STRATEGY`) is the only control plane for those knobs until policy rows exist.
3. **Delete zero-completion synthetic retry.** HTTP 200 is success. Do not clone/buffer a body to invent a failure when `completionTokens === 0`.
4. **No global/shared keys.** Schema already has `api_keys.user_id UUID NOT NULL`. Delete every `user_id IS NULL` branch in core, SQL comments, and indexes. A Gemini key belongs to exactly one `auth.users` row.
5. **CLI owner assignment is explicit when ambiguous.**
   - 0 users → fail before insert.
   - 1 user → auto-assign and print a warning.
   - 2+ users → require `--user-id` in non-interactive mode, or an interactive select. Never silently pick `listUsers({ perPage: 1 })[0]`.
   - Always validate UUID and that the user exists. Same rule for Gemini keys, proxy keys, import, and sync.
6. **No client-facing `x-gproxy-*` response headers either.** Error JSON keeps `gproxy_request_id`. Optionally set standard `x-request-id` to the same UUID. Do not add `x-gproxy-attempts`, `x-gproxy-key-pool`, `x-gproxy-error-*`.
7. **P2 is out of scope:** Files/Cache/Batch management UI, Live API ephemeral-token broker, full Gemini cost engine (audio/image-out/TTS/Live/embeddings/grounding/cache storage/Batch/Flex/Priority), web bundle analyzer.

## Current architecture (do not reinvent)

```text
Client SDK
  → apps/web  /api/gproxy/*   (Next.js + @gemini-proxy/vercel, Node runtime)
  → apps/api  /api/gproxy/*   (Node + @hono/node-server)
  → packages/cloudflare       (Workers Module Worker)
       ↓
  packages/core  Hono coreApp
       ↓
  packages/database  Supabase (service_role on the data plane)
```

- **One data plane:** `ProxyService.makeApiRequest` in `@gemini-proxy/core`. Adapters must stay thin (`basePath('/api/gproxy').route('/*', coreApp)`).
- **Auth on the data plane:** `validateProxyApiKeyMiddleware` looks up `proxy_api_keys.proxy_key_value` with the service role, then scopes Gemini key selection to that row's `user_id`.
- **Control plane:** Refine + Ant Design + `@refinedev/supabase` (user JWT + RLS). New tables get RLS `user_id = auth.uid() OR service_role`.
- **Background work:** `executeWithWaitUntil` (Hono `executionCtx` → `@vercel/functions` → await). Persist from stream `flush` / error handler only. Do not wrap the whole stream consume in `waitUntil`.
- **Schema changes:** new file under `supabase/migrations/`, then mirror `packages/database/sql/schema.sql`, then regenerate `packages/database/types/database.types.ts`. Never edit merged migrations.
- **English** in code and docs. Conventional Commits. Locale keys in both `apps/web/public/locales/en/common.json` and `vi/common.json`.

## Runtime constraints (edge-first)

All new core code must run on Node 20, Cloudflare Workers, and the Next.js Node route.

| Allowed                                                                | Forbidden in `packages/core`                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web `fetch`, `Request`, `AbortSignal`, `TransformStream`               | `node:fs`, `node:net`, `node:crypto` KeyObject APIs that Workers reject                                                                                       |
| `AbortSignal.timeout` with a `setTimeout` + `AbortController` fallback | `@opentelemetry/sdk-node`, OpenTelemetry auto-instrumentation that patches Node                                                                               |
| Hono `env(c)`, `c.executionCtx.waitUntil`                              | Process-global mutable caches that leak across tenants (the existing `BackgroundService.operations` Map is keyed by `requestId` and must stay request-scoped) |
| Supabase JS client                                                     | Prisma, Drizzle, or a second ORM                                                                                                                              |

`AbortSignal.timeout` exists on Node 20 and current `workerd`. Still wrap it:

```ts
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
```

Combine with the incoming request signal when present (`AbortSignal.any` or a manual abort listener). Client disconnect must abort the in-flight upstream attempt.

## Compatibility

| Surface                                                                | Before                                                        | After this program                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Proxy request path                                                     | `/api/gproxy/{gemini\|openai}/...`                            | Unchanged. Interactions live under the gemini prefix: `/api/gproxy/gemini/v1beta/interactions` |
| Proxy credentials                                                      | `x-goog-api-key` (gemini) or `Authorization: Bearer` (openai) | Also accept Gemini `?key=` and Bearer on gemini paths. Strip `key` from the forwarded URL      |
| `x-gproxy-*` request headers                                           | Parsed into `ProxyRequestOptions`                             | Ignored and stripped. Documented as removed                                                    |
| Zero-completion retry                                                  | Optional via header                                           | Gone                                                                                           |
| Global Gemini keys (`user_id` null)                                    | Queried in core despite NOT NULL schema                       | Gone                                                                                           |
| Proxy/Gemini secret storage                                            | Plaintext, revealable                                         | Unchanged                                                                                      |
| README Node version                                                    | Claims Node 18                                                | Node ≥20, matching root `engines`                                                              |
| Claimed features (cache, alerting, exponential backoff, rate limiting) | README lists them                                             | Capability matrix: implemented / partial / not implemented                                     |

Non-goals for compatibility: keep supporting clients that relied on raising `x-gproxy-retry-max` above the server cap. That was a foot-gun, not an API.

## Dependency graph

```text
1 CI/contract tests
        │
        ▼
2 Auth / tenant / redaction  ──►  3 Timeout / retry / cooldown
                                      │
                                      ▼
                                 4 Proxy-key policy
                                      │
                                      ▼
                                 5 Project pools + scheduler
                                      │
                                      ▼
                                 6 Interactions + affinity
                                      │
                                      ▼
                                 7 OTel + webhooks
```

- Spec 1 can land first and must stay green while the others merge.
- Spec 2 must land before spec 3 because retry/cooldown writes `disabled_reason` on **tenant-owned** keys and must not resurrect `user_id IS NULL`.
- Spec 3 must land before spec 5 because the scheduler consumes `cooldown_until` / `consecutive_failures`.
- Spec 4 can start after spec 2 (it admits on `proxy_api_keys` rows). It should merge before spec 7 (alerts fire on policy windows).
- Spec 6 requires spec 5 (`provider_resources.project_pool_id`). Keys with no pool use the implicit singleton pool defined in spec 5.
- Spec 7 is last. It reads attempt timing from spec 3 and quota remaining from specs 4–5.

Do not combine these into one mega-PR. Each spec is one implementation plan / one PR unless a follow-up explicitly stacks two.

## Shared code patterns (required)

Follow existing files. Do not invent a second style.

- **Services:** static methods on classes (`ProxyService`, `ApiKeyService`, `ConfigService`, `BackgroundService`). New units follow the same shape: `RetryClassifier`, `CircuitBreakerStore`, `ProxyPolicyService`, `ProjectPoolScheduler`, `ResourceAffinityService`, `TelemetryService`.
- **RO-RO:** object params in, object out. No 8-argument functions.
- **Types:** explicit parameter and return types. No `any` on new code. Prefer interfaces over enums; use const maps (`as const`) for closed string unions.
- **One export per new file.** kebab-case filenames. PascalCase classes. camelCase functions.
- **Errors:** extend `ProxyError` in `packages/core/src/types/error.type.ts`. Do not throw raw `Error` on the request path.
- **Tests:** Vitest `describe` / `it` / `expect` in `*.test.ts` next to the unit or under `packages/core/test/<area>/`. Arrange-Act-Assert. Names: `inputX`, `mockX`, `actualX`, `expectedX`.
- **SQL:** `SECURITY DEFINER` RPCs used by the data plane are `GRANT EXECUTE … TO service_role` only. RLS on every new table.
- **Web UI:** Refine `useForm` / `useList` / `useTable`. Do not add new `useEffect` to sync server data into Ant Design forms — pass `initialValues` from the query result or Refine `useForm`. Event handlers start with `handle`. Named exports.
- **i18n:** every user-visible string goes through `translate('…')` with matching `en` and `vi` keys. `apps/web` lint already runs `scripts/check-locale-parity.mjs`.

## Split oversized files instead of growing them

These files are already past the project guideline (~200 instructions / file):

- `packages/core/src/services/proxy.service.ts` (~1280 lines)
- `packages/core/src/services/background.service.ts` (~880 lines)
- `packages/core/src/services/api-key.service.ts` (~398 lines)
- `apps/web/src/app/(protected)/api-keys/create/page.tsx` (~860 lines)

Plans must extract new behavior into new files rather than appending more private methods. Keep `ProxyService.makeApiRequest` as the orchestrator that calls extracted units.

## Config surface (server env only)

| Variable                     | Default                                                    | Spec     |
| ---------------------------- | ---------------------------------------------------------- | -------- |
| `PROXY_MAX_RETRIES`          | `-1` (one attempt per available key, cap 50)               | 3        |
| `PROXY_LOADBALANCE_STRATEGY` | `round_robin`                                              | 3, 5     |
| `PROXY_UPSTREAM_TIMEOUT_MS`  | `120000`                                                   | 3        |
| `PROXY_RETRY_BASE_DELAY_MS`  | `200`                                                      | 3        |
| `PROXY_RETRY_MAX_DELAY_MS`   | `5000`                                                     | 3        |
| `PROXY_REDACT_JSON_FIELDS`   | empty (built-in list always on)                            | 2        |
| `PROXY_OTEL_OTLP_ENDPOINT`   | unset = disabled                                           | 7        |
| `PROXY_OTEL_OTLP_HEADERS`    | empty                                                      | 7        |
| `GOOGLE_GEMINI_API_BASE_URL` | `https://generativelanguage.googleapis.com/`               | existing |
| `GOOGLE_OPENAI_API_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` | existing |

No per-request override headers. Proxy-key policy (spec 4) is row data, not env.

## Health endpoints (all adapters)

Mounted on `coreApp` **before** `validateProxyApiKeyMiddleware`:

- `GET /healthz` → `200 { "status": "ok" }` (process up).
- `GET /readyz` → `200 { "status": "ready" }` after a `select id from proxy_api_keys limit 1` (or equivalent) succeeds; `503 { "status": "not_ready" }` on Supabase failure.

Because adapters mount `coreApp` at `/api/gproxy`, public URLs are `/api/gproxy/healthz` and `/api/gproxy/readyz`.

## Testing strategy (program-wide)

| Layer          | Where                                                                            | What                                                                            |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Unit           | `packages/core/src/**/*.test.ts`                                                 | classifiers, sanitizer, policy math, path/model extractors, affinity extractors |
| SQL contract   | `supabase/migrations` + comments; optional `pg_tap` later — **not** required now | RPCs specified with exact `GRANT` and conflict behavior                         |
| Proxy contract | `packages/core/test/proxy-contract/`                                             | `coreApp.fetch` + mocked Supabase + mocked upstream `fetch`                     |
| Adapter smoke  | Cloudflare / Vercel / `apps/api`                                                 | export surface + healthz (no full Workers pool required for Vercel)             |
| SDK smoke      | `packages/core/test/sdk-smoke/`                                                  | `@google/genai`, `openai`, `ai` against `coreApp` with mock upstream            |
| Web            | existing Vitest + locale parity                                                  | new forms/resources get unit tests for pure helpers; no Cypress in this program |
| CI             | `.github/workflows/quality.yml`                                                  | `format:check` → `lint` → `test` → `build` on every PR                          |

TDD is mandatory: failing test, then implementation, then commit. Plans spell out the test names.

## Rollout

1. Spec 1: CI green, capability matrix in README, contract harness.
2. Spec 2: tenant queries, CLI owner resolver, redaction, delete `x-gproxy-*` and synthetic retry.
3. Spec 3: timeout + classified retry + cooldown columns.
4. Spec 4: policy columns + admit/settle RPCs + proxy-key edit UI.
5. Spec 5: `google_project_pools` + scheduler + dashboard cooldown.
6. Spec 6: Interactions routing + `provider_resources`.
7. Spec 7: OTLP exporter + generic webhook.

Each step is production-safe on its own: missing optional columns/env must fail open to current behavior except where the spec says fail closed (invalid proxy key, missing owner user, policy deny).

## Anti-patterns (reject in review)

- Guessing Google quota from key count. Quota is per Google **project**, not per API key.
- Letting the holder of a proxy key widen retries, models, or budget via headers.
- Hashing or encrypting keys "while we are in there".
- Semantic/response caching of Gemini outputs.
- New `useEffect` to copy Refine query data into `form.setFieldsValue`.
- `waitUntil(read entire stream)`.
- Editing `packages/database/sql/migrations/` (retired path).
- Adding Slack/Discord/email providers. Generic HTTPS webhook only.
- Restoring `user_id IS NULL` "global key" filters.
