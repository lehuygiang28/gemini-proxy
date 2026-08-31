# P0 — CI, test baseline, and proxy contract tests

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Status:** Presented; awaiting formal approval before an implementation plan.
**Approach:** One GitHub Actions quality workflow plus a Node-side `coreApp.fetch` contract harness. Adapters stay thin; do not duplicate the suite inside Workers/Vercel runtimes in v1.

## Goal

`pnpm test`, `pnpm lint`, `pnpm format:check`, and `pnpm build` pass on a clean clone in CI. Proxy behavior (auth, header stripping, health, client abort) is locked by tests that call `coreApp`, not by README claims.

This spec does **not** implement `/v1` detection, retry, or policy. It lands the harness those specs will extend. Harness requests must be able to target both canonical `/v1/...` and legacy `/gemini/...` plus `/openai/...` (coreApp-relative; adapters add `/api/gproxy`).

## Current failures (must fix)

1. **Cloudflare Vitest has zero test files.** `packages/cloudflare/package.json` `"test": "vitest"` uses `@cloudflare/vitest-pool-workers`. Turbo `test` depends on `^build`, then the Cloudflare package exits non-zero because Vitest finds no tests.
2. **CLI `test:validation` references a missing file.** `packages/cli/package.json` runs `tsdown src/test-validation.ts` which does not exist. `test:import-helpers` works via `node:test`.
3. **GitHub Actions only verifies Supabase migrations** (`.github/workflows/supabase.yml`). No format/lint/test/build of application code.
4. **README lies:** Node 18 vs root `engines.node >=20`; exponential backoff, caching, alerting, and rate limiting are documented as shipped.

`pnpm build` and `packages/core` + `apps/web` unit tests already pass. Do not weaken those.

## Design

### 1. Fix package test scripts

**Cloudflare**

Keep wrangler-based Vitest config. Add `packages/cloudflare/src/index.test.ts` that imports the worker module and asserts `fetch` is a function. If the workers pool cannot boot without secrets in CI, fall back to a Node test that only imports the built export surface. Prefer a real file so `--passWithNoTests` is unnecessary. Do **not** boot a full Workers runtime that needs `SUPABASE_*` bindings for this spec.

**CLI**

- Delete the `test:validation` script.
- Add Vitest (`vitest ~3.2.0`, same as core) with `src/**/*.test.ts`.
- Convert `api-key-import-helpers.test.ts` to Vitest. One runner only.
- `"test": "vitest run"`.
- `"engines": { "node": ">=20.0.0" }` to match the monorepo.

**apps/api**

Do not import `src/index.ts` if it calls `serve()`. Extract `createApiApp()`, export it, and test that it returns a Hono instance with a route matching `/api/gproxy/*`. `serve()` stays behind a direct-run guard so tests do not bind a port. A `/v1` mount assertion waits for spec 3 unless `createApiApp` already exposes it.

**packages/vercel**

Add `"test": "vitest run"` and a test that `GET`/`POST` are functions exported from `src/route.ts`. If the module throws without `SUPABASE_URL`, split env binding or set dummy `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` in the test file before import.

### 2. `quality.yml`

New workflow `.github/workflows/quality.yml`:

- **Triggers:** `pull_request`; `push` to `main` and `develop`. No path filter.
- **Concurrency:** `quality-${{ github.ref }}`, `cancel-in-progress: true`.
- **Node:** 20, pnpm 10 from `packageManager`.
- **Steps:** checkout → pnpm/action-setup → `actions/setup-node` with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm format:check` → `pnpm lint` → `pnpm test` → `pnpm build`.
- Dummy env for `pnpm build` (Next.js inlines public Supabase values): `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL=https://example.supabase.co`, `NEXT_PUBLIC_ANON_SUPABASE_KEY=sb_publishable_ci-placeholder`, `SUPABASE_SERVICE_ROLE_KEY=sb_secret_ci-placeholder`. Do not put real secrets in the workflow.
- **Do not** start Docker/Supabase here. Migration verification stays in `supabase.yml`.
- **Do not** hit live Gemini or live Supabase.

### 3. Contract test harness (`packages/core/test/proxy-contract/`)

Tests call `coreApp.fetch(request, mockEnv, mockExecutionCtx)` with:

- `mockEnv`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Gemini/OpenAI base URLs pointing at a mock origin (`https://origin.test/`).
- `mockExecutionCtx`: `{ waitUntil(p) { void p } }` (later specs may collect these promises).
- **Supabase:** test-only factory seam on `getSupabaseClient`:

```ts
export type SupabaseFactory = (c: Context) => SupabaseClient;
let supabaseFactory: SupabaseFactory | null = null;

export function setSupabaseFactoryForTests(factory: SupabaseFactory | null): void {
  supabaseFactory = factory;
}
```

Reset in `afterEach`.

- **Upstream `fetch`:** `vi.stubGlobal('fetch', mockFetch)`. Stub only the mock origin. Do not stub unrelated URLs.

Shared helper builds coreApp-relative URLs:

- Legacy: `/gemini/v1beta/models/gemini-flash:generateContent`, `/openai/v1/chat/completions`
- Canonical (harness must accept the path even if routing still 404 until spec 3): `/v1/models/gemini-flash:generateContent`

This spec does not require `/v1` to succeed. It requires the harness helper to exist so spec 3 does not invent a second fixture.

#### Required cases (this spec)

| Test name | Behavior |
| --------- | -------- |
| `rejects missing proxy key with 401` | No `x-goog-api-key` and no `Authorization: Bearer` → 401 JSON. Query `?key=` and `x-api-key` are **not** credentials. |
| `rejects unknown proxy key with 401` | Lookup returns null |
| `rejects inactive proxy key with 401` | `is_active = false` |
| `strips hop-by-hop and cookie headers to origin` | Upstream sees no `cookie`, `x-forwarded-*` |
| `strips x-gproxy-* request headers to origin` | Origin must not receive them |
| `forwards gemini key as x-goog-api-key` | Origin header equals reserved Gemini key |
| `forwards openai key as Authorization Bearer` | OpenAI path |
| `does not buffer stream before first byte` | Mock origin SSE; first chunk received before `onComplete` |
| `persists usage when client cancels the stream` | Reader `cancel()`; waitUntil/onComplete still runs |

Timeout, Retry-After, `/v1` detect-by-credential, and policy tests live in later specs and reuse this harness.

SDK smoke (`packages/core/test/sdk-smoke/`) is **in this spec** as three tests using the same mock origin:

1. `@google/genai` `GoogleGenAI` with `httpOptions.baseUrl` pointing at an in-process Hono listener (or `coreApp.request` if a real URL is not required).
2. `openai` SDK against `/openai/v1/chat/completions`.
3. Vercel AI SDK `@ai-sdk/google` if it can target a custom base URL; if it cannot, `it.skip` and document in the capability matrix.

Mock origin returns a minimal valid Gemini/OpenAI JSON body. No network egress.

### 4. README capability matrix

Replace false "Core Features" bullets with a table. Prerequisites: **Node.js ≥ 20**. Advertise **`/v1`** as the public base URL; mention legacy `/api/gproxy/{gemini\|openai}` as compatibility only.

| Capability | Status |
| ---------- | ------ |
| Multi Gemini key rotation | Implemented |
| Streaming | Implemented |
| Usage logs + Standard text/image cost estimate | Implemented |
| Canonical `/v1` + detect-by-credential | Spec 3 |
| Classified retry + key/model cooldown | Spec 3 |
| Proxy-key RPM / request-day / token-day / USD-month | Spec 4 |
| User timezone windows | Spec 4 |
| Idempotent settlement + stale alerts | Spec 5 |
| Response cache | Not implemented |
| Hash/encrypt at rest | Out of scope (plaintext by design) |
| Google project pools | Out of scope |
| OpenTelemetry / OTLP | Out of scope |
| Interaction/resource affinity | Out of scope |

### 5. Health routes

`healthz` / `readyz` land in spec 2 (they need a Supabase ping and an auth bypass). This spec does not add them. Adapter smokes that need health wait for spec 2.

## Files

| Action | Path |
| ------ | ---- |
| Create | `.github/workflows/quality.yml` |
| Create | `packages/core/test/proxy-contract/harness.ts` |
| Create | `packages/core/test/proxy-contract/auth-and-headers.test.ts` |
| Create | `packages/core/test/sdk-smoke/sdk-clients.test.ts` |
| Create | `packages/cloudflare/src/index.test.ts` |
| Create | `packages/vercel/src/route.test.ts` |
| Create | `apps/api/src/create-api-app.ts` (extract) |
| Modify | `packages/core/src/services/supabase.service.ts` (test factory) |
| Modify | `packages/cli/package.json`, add `vitest.config.ts` |
| Modify | `apps/api/src/index.ts`, `apps/api/package.json` |
| Modify | `packages/vercel/package.json` |
| Modify | `README.md` |
| Modify | `packages/cli/src/lib/api-key-import-helpers.test.ts` (Vitest) |

## Success criteria

- `pnpm test` from repo root exits 0.
- A PR without SQL changes still runs `quality.yml`.
- README Node version, `/v1` as the advertised URL, and the capability matrix match this program.

## Out of scope

- Running the contract suite inside `@cloudflare/vitest-pool-workers`.
- Playwright/Cypress.
- Hitting real Gemini.
- Implementing `/v1` routing, retry, policy, timezone, or settlement (later specs).
- Project pools, OTel, affinity tables.
