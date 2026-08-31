# P0 — CI, test baseline, and proxy contract tests

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Approach:** One GitHub Actions quality workflow plus a Node-side `coreApp.fetch` contract harness. Adapters stay thin; do not duplicate the suite inside Workers/Vercel runtimes in v1.

## Goal

`pnpm test`, `pnpm lint`, `pnpm format:check`, and `pnpm build` pass on a clean clone in CI. Proxy behavior (auth, header stripping, timeout, retry, client abort) is locked by tests that call `coreApp`, not by README claims.

## Current failures (must fix)

1. **Cloudflare Vitest has zero test files.** `packages/cloudflare/package.json` `"test": "vitest"` uses `@cloudflare/vitest-pool-workers`. Turbo `test` depends on `^build`, then the Cloudflare package exits non-zero because Vitest finds no tests.
2. **CLI `test:validation` references a missing file.** `packages/cli/package.json` runs `tsdown src/test-validation.ts` which does not exist. `test:import-helpers` works via `node:test`.
3. **GitHub Actions only verifies Supabase migrations** (`.github/workflows/supabase.yml`). No format/lint/test/build of application code.
4. **README lies:** Node 18 vs root `engines.node >=20`; exponential backoff, caching, alerting, and rate limiting are documented as shipped.

`pnpm build` (8/8) and `packages/core` + `apps/web` unit tests already pass. Do not weaken those.

## Design

### 1. Fix package test scripts

**Cloudflare**

Keep wrangler-based Vitest config. Add `packages/cloudflare/src/index.test.ts` that imports the worker module and asserts `fetch` is a function. If the workers pool cannot boot without secrets in CI, fall back to:

```json
"test": "vitest run --passWithNoTests"
```

and move the smoke assertion to a Node test that only imports the built `dist` types. Prefer a real file so `--passWithNoTests` is unnecessary. Do **not** boot a full Workers runtime that needs `SUPABASE_*` bindings for this spec.

**CLI**

- Delete the `test:validation` script.
- Add Vitest (`vitest ~3.2.0`, same as core) with `src/**/*.test.ts`.
- Keep `api-key-import-helpers.test.ts` by converting it to Vitest (or leave `node:test` if Vitest include does not pick it — pick **one** runner: Vitest).
- `"test": "vitest run"`.
- `"engines": { "node": ">=20.0.0" }` to match the monorepo.

**apps/api**

Add `"test": "vitest run --passWithNoTests"` **or** a one-file smoke test that imports `src/index.ts` is wrong (it calls `serve()`). Extract `createApiApp()` from `apps/api/src/index.ts`, export it, and test that `GET /api/gproxy/healthz` is wired once spec 2/3 health routes exist. Until health exists, add a test that `createApiApp()` returns a Hono instance with a route matching `/api/gproxy/*`. `serve()` stays in `index.ts` only when `import.meta.url === process.argv[1]` (or a `isDirectRun` guard) so importing the module in tests does not bind a port.

**packages/vercel**

No test script today (Turbo skips missing tasks). Add `"test": "vitest run"` and a test that `GET`/`POST` are functions exported from `src/route.ts`. Do not call them (they construct Hono + env at import). If `src/route.ts` throws without `SUPABASE_URL`, split env binding so the module can load in tests with dummy env, **or** set `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` in the test file before import.

### 2. `quality.yml`

New workflow `.github/workflows/quality.yml`:

- **Triggers:** `pull_request`; `push` to `main` and `develop`. No path filter (code quality is global).
- **Concurrency:** `quality-${{ github.ref }}`, `cancel-in-progress: true`.
- **Node:** 20, pnpm 10 from `packageManager`.
- **Steps:** checkout → pnpm/action-setup → `actions/setup-node` with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm format:check` → `pnpm lint` → `pnpm test` → `pnpm build`.
- **Do not** start Docker/Supabase here. Migration verification stays in `supabase.yml`.
- **Do not** hit live Gemini or live Supabase.

### 3. Contract test harness (`packages/core/test/proxy-contract/`)

Tests call `coreApp.fetch(request, mockEnv, mockExecutionCtx)` with:

- `mockEnv`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Gemini/OpenAI base URLs pointing at a mock origin.
- `mockExecutionCtx`: `{ waitUntil(p) { void p } }`.
- **Supabase:** inject via a test-only seam. Today `getSupabaseClient(c)` constructs from env. Add `createSupabaseClient` as a replaceable function in `supabase.service.ts`:

```ts
export type SupabaseFactory = (c: Context) => SupabaseClient;
let supabaseFactory: SupabaseFactory | null = null;

export function setSupabaseFactoryForTests(factory: SupabaseFactory | null): void {
  supabaseFactory = factory;
}

export function getSupabaseClient(c: Context): SupabaseClient {
  if (supabaseFactory) return supabaseFactory(c);
  // existing construction
}
```

Only compiled/exported for tests if tree-shaking keeps it; the setter is acceptable in core because it is a no-op in production. Reset in `afterEach`.

- **Upstream `fetch`:** `vi.stubGlobal('fetch', mockFetch)`.

Shared fixture `makeProxyRequest({ path, headers, body, method })` builds `http://localhost/api/gproxy/...` **relative to coreApp** (coreApp has no basePath; adapters add `/api/gproxy`). Contract requests use paths like `/gemini/v1beta/models/gemini-flash:generateContent`.

#### Required cases (this spec)

| Test name                                        | Behavior                                                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rejects missing proxy key with 401`             | No `x-goog-api-key` / Bearer → 401 JSON                                                                                                                                                                            |
| `rejects unknown proxy key with 401`             | Lookup returns null                                                                                                                                                                                                |
| `rejects inactive proxy key with 401`            | `is_active = false`                                                                                                                                                                                                |
| `strips hop-by-hop and cookie headers to origin` | Upstream sees no `cookie`, `x-forwarded-*`                                                                                                                                                                         |
| `strips x-gproxy-* request headers to origin`    | Even before spec 2 deletes the parser, origin must not receive them                                                                                                                                                |
| `forwards gemini key as x-goog-api-key`          | Origin header equals reserved Gemini key                                                                                                                                                                           |
| `forwards openai key as Authorization Bearer`    | OpenAI path                                                                                                                                                                                                        |
| `does not buffer stream before first byte`       | Mock origin SSE; first chunk received before `onComplete`                                                                                                                                                          |
| `persists usage when client cancels the stream`  | Reader `cancel()`; waitUntil/onComplete still runs (existing usage-log-stream test covers the transform; contract test covers the handler wiring once retry lands — until then assert `makeApiRequest` is invoked) |

Timeout, Retry-After, and classified retry tests **live in spec 3** but use this harness. This spec only lands the harness plus the rows above.

SDK smoke (`packages/core/test/sdk-smoke/`) is **in this spec** as three tests using the same mock origin:

1. `@google/genai` `GoogleGenAI` with `httpOptions.baseUrl` pointing at an in-process Hono listener (`@hono/node-server` in a test `listen`, or `coreApp.request` if the SDK needs a real URL — use a loopback server).
2. `openai` SDK against `/openai/v1/chat/completions`.
3. Vercel AI SDK `@ai-sdk/google` if it can target a custom base URL; if the SDK cannot, skip with `it.skip` and document in the capability matrix rather than wrapping a fake.

Mock origin returns a minimal valid Gemini/OpenAI JSON body. No network egress.

### 4. README capability matrix

Replace the false "Core Features" bullets with a table:

| Capability                                     | Status                              |
| ---------------------------------------------- | ----------------------------------- |
| Multi Gemini key rotation                      | Implemented                         |
| Streaming                                      | Implemented                         |
| Usage logs + Standard text/image cost estimate | Implemented                         |
| Exponential backoff + Retry-After              | Spec 3 (not implemented until then) |
| Circuit breaker / cooldown                     | Spec 3                              |
| Proxy-key RPM/TPM/budget                       | Spec 4                              |
| Project-aware quota                            | Spec 5                              |
| Interactions API + affinity                    | Spec 6                              |
| OpenTelemetry / webhooks                       | Spec 7                              |
| Response cache                                 | Not implemented                     |
| Hash/encrypt at rest                           | Out of scope (plaintext by design)  |

Prerequisites: **Node.js ≥ 20**.

### 5. Health routes in the contract harness

If spec 2 has not landed yet, contract tests for `/healthz` wait for spec 2/3. This spec may add the routes **here** if cheaper: they are unauthenticated GETs and unblock adapter smokes. **Decision: healthz/readyz land in spec 2** (they need a Supabase ping and auth bypass). Spec 1 does not add them.

## Files

| Action | Path                                                            |
| ------ | --------------------------------------------------------------- |
| Create | `.github/workflows/quality.yml`                                 |
| Create | `packages/core/test/proxy-contract/harness.ts`                  |
| Create | `packages/core/test/proxy-contract/auth-and-headers.test.ts`    |
| Create | `packages/core/test/sdk-smoke/sdk-clients.test.ts`              |
| Create | `packages/cloudflare/src/index.test.ts`                         |
| Create | `packages/vercel/src/route.test.ts`                             |
| Create | `apps/api/src/create-api-app.ts` (extract)                      |
| Modify | `packages/core/src/services/supabase.service.ts` (test factory) |
| Modify | `packages/cli/package.json`, add `vitest.config.ts`             |
| Modify | `apps/api/src/index.ts`, `apps/api/package.json`                |
| Modify | `packages/vercel/package.json`                                  |
| Modify | `README.md`                                                     |
| Modify | `packages/cli/src/lib/api-key-import-helpers.test.ts` (Vitest)  |

## Success criteria

- `pnpm test` from repo root exits 0 with no `--passWithNoTests` needed except `apps/api` if still empty of domain tests.
- A PR without SQL changes still runs `quality.yml`.
- README Node version and capability matrix match reality.

## Out of scope

- Running the contract suite inside `@cloudflare/vitest-pool-workers`.
- Playwright/Cypress.
- Hitting real Gemini.
