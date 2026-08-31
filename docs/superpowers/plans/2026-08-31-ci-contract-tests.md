# CI, test baseline, and proxy contract tests Implementation Plan

> **FROZEN.** Not implementation authorization until [CI spec](../specs/2026-08-31-ci-contract-tests-design.md) is formally approved. Rewrite this plan after approval; do not execute the old task list blindly (`?key=` is no longer a credential; capability matrix dropped pools/OTel/affinity).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm test` / `pnpm lint` / `pnpm format:check` / `pnpm build` green in GitHub Actions and lock proxy auth/header behavior with a `coreApp.fetch` harness.

**Architecture:** Fix empty/broken package test scripts first so Turbo is green. Add a replaceable Supabase factory and mocked `fetch` around `coreApp`. Keep adapters thin; do not boot a full Workers runtime for the contract suite.

**Tech Stack:** GitHub Actions, pnpm, Turbo, Vitest ~3.2.0, Hono `app.fetch`, `@hono/node-server` only for SDK smoke.

## Global Constraints

- English code/docs. Conventional Commits. Node ≥20.
- No live Gemini. No live Supabase. No Docker in `quality.yml`.
- Do not add `x-gproxy-*` APIs. Do not hash/encrypt keys.
- `waitUntil` mock must not wrap stream consume.
- Follow [CI spec](../specs/2026-08-31-ci-contract-tests-design.md) and [master](../specs/2026-08-31-p0-p1-master-architecture-design.md).

## File map

| File                                                         | Responsibility                               |
| ------------------------------------------------------------ | -------------------------------------------- |
| `.github/workflows/quality.yml`                              | format → lint → test → build                 |
| `packages/core/src/services/supabase.service.ts`             | `setSupabaseFactoryForTests`                 |
| `packages/core/test/proxy-contract/harness.ts`               | env, executionCtx, supabase mock, fetch mock |
| `packages/core/test/proxy-contract/auth-and-headers.test.ts` | 401 + header stripping                       |
| `packages/core/test/sdk-smoke/sdk-clients.test.ts`           | genai / openai / ai SDK against loopback     |
| `packages/cloudflare/src/index.test.ts`                      | `fetch` export exists                        |
| `packages/vercel/src/route.test.ts`                          | GET/POST exports                             |
| `apps/api/src/create-api-app.ts`                             | Hono app without `serve()`                   |
| `packages/cli/vitest.config.ts`                              | CLI test runner                              |
| `README.md`                                                  | Node 20 + capability matrix                  |

---

### Task 1: Unblock Turbo `test`

**Files:**

- Create: `packages/cloudflare/src/index.test.ts`
- Create: `packages/vercel/src/route.test.ts`
- Create: `packages/vercel/vitest.config.ts`
- Create: `apps/api/src/create-api-app.ts`
- Create: `apps/api/src/create-api-app.test.ts`
- Create: `packages/cli/vitest.config.ts`
- Modify: `packages/cloudflare/package.json`
- Modify: `packages/vercel/package.json`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/package.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/lib/api-key-import-helpers.test.ts`

**Interfaces:**

- Produces: `createApiApp(): Hono`

- [ ] **Step 1: Write the failing Cloudflare test**

```ts
import { describe, expect, it } from "vitest";
import * as worker from "./index";

describe("cloudflare worker module", () => {
  it("exports fetch", () => {
    expect(typeof worker.fetch).toBe("function");
  });
});
```

If `@cloudflare/vitest-pool-workers` cannot load `wrangler.jsonc` without secrets, change `packages/cloudflare/vitest.config.mts` to the default Vitest pool for this file only, or set `"test": "vitest run --passWithNoTests"` **and** keep the test file under a Node config. Prefer Node Vitest for this smoke so CI does not need bindings.

- [ ] **Step 2: Run Cloudflare test**

Run: `pnpm --filter @lehuygiang28/gemini-proxy-cloudflare test`

Expected: FAIL (no test file) then PASS after the file exists.

- [ ] **Step 3: Extract `createApiApp` and stop auto-listen on import**

```ts
export function createApiApp(): Hono {
  return new Hono()
    .use(
      cors({
        /* existing options */
      }),
    )
    .route("/api/gproxy/*", coreApp);
}
```

`index.ts` calls `serve` only when executed as the entrypoint (`import.meta.url` ends with the started file, or `process.env.API_LISTEN !== '0'`). Tests import `createApiApp` only.

- [ ] **Step 4: Vercel export smoke**

Set `process.env.SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` to `https://example.supabase.co` **before** importing `../route` if the module throws. Assert `typeof GET === 'function'`.

- [ ] **Step 5: CLI Vitest**

Remove `test:validation`. `"test": "vitest run"`. Convert `api-key-import-helpers.test.ts` to `describe/it/expect` from `vitest`. `"engines": { "node": ">=20.0.0" }`.

- [ ] **Step 6: Run root tests**

Run: `pnpm test`

Expected: PASS (all packages with a test script).

- [ ] **Step 7: Commit**

```bash
git add packages/cloudflare packages/vercel apps/api packages/cli
git commit -m "test: make monorepo test scripts runnable"
```

---

### Task 2: Supabase test factory + contract harness

**Files:**

- Modify: `packages/core/src/services/supabase.service.ts`
- Create: `packages/core/test/proxy-contract/harness.ts`
- Create: `packages/core/test/proxy-contract/auth-and-headers.test.ts`

**Interfaces:**

- Produces: `setSupabaseFactoryForTests`, `createContractEnv()`, `createMockSupabase(handlers)`, `invokeCore(path, init)`

```ts
export function setSupabaseFactoryForTests(factory: ((c: Context) => SupabaseClient) | null): void;
```

`afterEach(() => { setSupabaseFactoryForTests(null); vi.unstubAllGlobals(); })`.

`getSupabaseClient` currently caches a module singleton. The factory **must be checked on every call before the singleton**. Tests never assign `client`; they only use the factory so tenants cannot leak across tests.

Mock chain: `from('proxy_api_keys').select().eq().is().limit().maybeSingle()` resolves `{ data: proxyRow | null, error: null }`. `from('api_keys')` used by reserve can return empty until spec 3; for 401 tests reserve is never reached.

- [ ] **Step 1: Write failing tests**

Names:

- `rejects missing proxy key with 401`
- `rejects unknown proxy key with 401`
- `rejects inactive proxy key with 401`
- `strips cookie and x-forwarded-for to origin`
- `strips x-gproxy-retry-max to origin`
- `forwards gemini secret as x-goog-api-key`

- [ ] **Step 2: Run**

Run: `pnpm --filter @gemini-proxy/core test test/proxy-contract/auth-and-headers.test.ts`

Expected: FAIL (harness or cases missing).

- [ ] **Step 3: Implement factory + harness + tests until PASS**

Request path for `coreApp` is `/gemini/v1beta/models/gemini-flash:generateContent` (no `/api/gproxy` prefix).

- [ ] **Step 4: Commit**

```bash
git commit -m "test(core): add proxy contract harness for auth and header stripping"
```

---

### Task 3: SDK smoke + README + quality.yml

**Files:**

- Create: `packages/core/test/sdk-smoke/sdk-clients.test.ts`
- Create: `.github/workflows/quality.yml`
- Modify: `README.md`

- [ ] **Step 1: SDK smoke**

Listen with `@hono/node-server` `serve({ fetch: wrapped.fetch, port: 0 })` if the helper supports port 0; otherwise pick an ephemeral port via `net.createServer().listen(0)`. `wrapped` = Hono `basePath('/api/gproxy').route('/', coreApp)`. Mock Supabase with one active proxy key + one Gemini key. Mock origin `fetch` to return a valid generateContent JSON.

If `@google/genai` cannot target the loopback base URL, `it.skip` with a comment. Same for `@ai-sdk/google`. OpenAI SDK `baseURL` is required to pass.

- [ ] **Step 2: quality.yml**

```yaml
name: Quality
on:
  pull_request:
  push:
    branches: [main, develop]
concurrency:
  group: quality-${{ github.ref }}
  cancel-in-progress: true
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.18.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

Leave `supabase.yml` unchanged.

- [ ] **Step 3: README**

Replace Node 18 with Node ≥20. Replace false feature bullets with the capability matrix from the spec (status "not implemented" for specs 3–7).

- [ ] **Step 4: Run** `pnpm format:check && pnpm lint && pnpm test && pnpm build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "ci: add quality workflow, SDK smoke, and honest README matrix"
```

---

## Spec coverage

| Spec section                | Task                   |
| --------------------------- | ---------------------- |
| Cloudflare empty Vitest     | 1                      |
| CLI missing test-validation | 1                      |
| quality.yml                 | 3                      |
| Contract auth/headers       | 2                      |
| SDK smoke                   | 3                      |
| README matrix / Node 20     | 3                      |
| Healthz                     | Spec 2 (not this plan) |
