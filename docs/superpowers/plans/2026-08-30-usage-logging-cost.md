# Usage logging, token accuracy, and Gemini cost estimate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse all Gemini token buckets without double-counting, persist raw usage, stream without buffering, retry log writes, and snapshot Standard paid cost estimates.

**Architecture:** Incremental `UsageStreamParser` inside a response `TransformStream`. Persist on `flush()` with `waitUntil` retry. Atomic SQL increments. Versioned pricing table + partition cost formula. Dashboard/log UI reads JSONB fields.

**Tech Stack:** TypeScript, Hono, Vitest, Supabase SQL, Refine/Ant Design i18n catalogs.

## Global Constraints

- Do not add `toolUsePromptTokenCount` into USD v1.
- Snapshot `estimated_cost_usd` at persist; do not reprice historical logs.
- `cache ⊂ prompt`; never `prompt * input + cache * cached`.
- `waitUntil` must not wrap the full stream consume (30s post-return limit).
- Persist from stream `flush` / error handler only — do not flush the operations Map in `app.ts` before the body is parsed.
- English code and docs. Conventional Commits. Locale keys added to both `en` and `vi`.

---

### Task 1: Parser, pricing, cost estimator, unit tests

**Files:**

- Create: `packages/core/src/constants/gemini-pricing.ts`
- Create: `packages/core/src/utils/cost-estimator.ts`
- Create: `packages/core/src/utils/usage-metadata-parser.test.ts`
- Create: `packages/core/src/utils/cost-estimator.test.ts`
- Create: `packages/core/vitest.config.ts`
- Modify: `packages/core/src/utils/usage-metadata-parser.ts`
- Modify: `packages/core/src/utils/index.ts`
- Modify: `packages/core/package.json`

**Interfaces:**

- Produces: `UsageStreamParser`, `ParsedUsageMetadata`, `estimateGeminiCostUsd()`, `GEMINI_PRICING.asOf`

- [x] **Step 1:** Add Vitest to `@gemini-proxy/core` (`vitest ~3.2.0`), script `test`: `vitest run`.
- [x] **Step 2:** Write failing tests for the five fixtures in the spec (Gemini forum example, MAX_TOKENS stream, OpenAI usage-only chunk, split SSE, alias + unknown model).
- [x] **Step 3:** Implement `UsageStreamParser` + mapper + `parseFromResponseBody` wrapper.
- [x] **Step 4:** Implement pricing table (`asOf: 2026-08-30`) and `estimateGeminiCostUsd` with the partition formula.
- [x] **Step 5:** `pnpm --filter @gemini-proxy/core test` passes.
- [x] **Step 6:** Commit `test(core): cover token parse and Gemini cost partition`

---

### Task 2: Stream logging + waitUntil retry + atomic usage RPC

**Files:**

- Create: `packages/core/src/utils/usage-log-stream.ts`
- Create: `supabase/migrations/20260830010000_usage_cost_and_atomic_counters.sql`
- Modify: `packages/core/src/utils/wait-until.ts`
- Modify: `packages/core/src/services/background.service.ts`
- Modify: `packages/core/src/services/response-handler.service.ts`
- Modify: `packages/core/src/app.ts`
- Modify: `packages/database/sql/schema.sql`
- Modify: `packages/database/types/database.types.ts`
- Modify: `packages/database/types/statistics.types.ts`

**Interfaces:**

- Consumes: `UsageStreamParser`, `estimateGeminiCostUsd`
- Produces: `attachUsageLogging()`, `increment_api_key_usage`, `increment_proxy_api_key_usage`, expanded `get_request_logs_statistics`

- [x] **Step 1:** `attachUsageLogging({ response, headers, apiFormat, onComplete, registerBackground? })` pipes body through TransformStream; `flush` calls `onComplete(parser.finish(), cappedText)`. Empty-body responses register `onComplete` via `registerBackground` (waitUntil).
- [x] **Step 2:** `handleSuccess` returns the wrapped stream immediately; persist in `flush` + `executeWithWaitUntil`. `handleError` waitUntil after collect. Remove premature `executeAllOperations` from `app.ts`.
- [x] **Step 3:** Settings + request body at persist time. `raw_metadata` = provider object. Insert throws on error; retry 200ms/800ms.
- [x] **Step 4:** Migration: atomic increment RPCs (GRANT `service_role`); stats adds `thoughts_tokens`, `tool_use_prompt_tokens`, `estimated_cost_usd`. Mirror `schema.sql`.
- [x] **Step 5:** Commit `fix(core): stream usage logs and persist Gemini cost snapshot`

---

### Task 3: Web UI + i18n

**Files:**

- Modify: `apps/web/src/utils/table-helpers.ts`
- Modify: `apps/web/src/components/RequestLogDetails.tsx`
- Modify: `apps/web/src/features/observability/components/kpi-strip.tsx`
- Modify: `apps/web/src/app/(protected)/dashboard/page.tsx`
- Modify: `apps/web/public/locales/en/common.json`
- Modify: `apps/web/public/locales/vi/common.json`

- [x] **Step 1:** `extractUsageMetadata` reads new fields; `formatUsd` for estimates.
- [x] **Step 2:** Log detail KPIs: cache, thoughts, tool-use, estimated USD (em dash when null).
- [x] **Step 3:** Dashboard token strip: thoughts + estimated cost.
- [x] **Step 4:** Catalog keys in `en` and `vi`; `pnpm --filter web i18n:check`.
- [x] **Step 5:** Commit `feat(web): show token breakdown and estimated Gemini cost`

---

### Task 4: Verify

- [x] **Step 1:** `pnpm --filter @gemini-proxy/core test`
- [x] **Step 2:** `pnpm --filter web i18n:check` and `pnpm --filter web lint` if feasible
- [x] **Step 3:** Push branch and open draft PR
