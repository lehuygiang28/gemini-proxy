# Logs Filters, Est. Speed, Datetime Preference, i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-side Refine/Supabase filters and sorters on the logs table, sortable Est. Speed, cookie datetime format preference, and hybrid Vietnamese i18n.

**Architecture:** Keep usage/performance in JSONB. Map Refine `field` to PostgREST `usage_metadata->…` / `performance_metrics->…` / `usage_metadata->>model`. Add one generated column `estimated_speed_tok_per_s`. Datetime mode is a cookie + React context wrapping `DateTimeDisplay`. i18n catalogs follow the locked glossary.

**Tech Stack:** Refine v5 `useTable`, `@refinedev/supabase`, Ant Design Table, PostgREST JSON operators, Vitest, next-intl catalogs, js-cookie.

**Spec:** [2026-09-02-logs-filters-datetime-i18n-design.md](../specs/2026-09-02-logs-filters-datetime-i18n-design.md)

## Global Constraints

- JSONB remains source of truth; do not generate columns for prompt/completion/cache/cost/duration.
- Numeric JSON fields use `->` (never `->>`, never dotted `usage_metadata.cache_tokens`).
- Model search stays `usage_metadata->>model` OR `usage_metadata->>requested_model` contains.
- Est. Speed formula: `completion_tokens / (duration_ms / 1000)`; NULL if either `<= 0` or missing; API `duration_ms` not total time.
- Column label `Est. Speed` in en and vi (not "Tốc độ ước lượng").
- Cookie `_gp_datetime_format`: `relative` | `exact` | `auto` (default). Invalid value → `auto`. Invalid quota TZ → exact.
- Auto uses `user_settings.timezone` civil day, not the browser TZ.
- VI nav: Logs, API Keys, Proxy API Keys, Console — never "Nhật ký" as the resource name.
- English code/docs. Conventional Commits. Both locale files for every new key.
- TDD: failing test first for each unit of behavior.

## File map

```text
supabase/migrations/20260902010000_request_log_estimated_speed.sql
packages/database/sql/schema.sql
packages/database/types/database.types.ts
apps/web/src/constants/datetime-format.constant.ts
apps/web/src/features/request-logs/estimate-speed.ts
apps/web/src/features/request-logs/estimate-speed.test.ts
apps/web/src/features/request-logs/request-log-table-filter-utils.ts
apps/web/src/features/request-logs/request-log-table-filter-utils.test.ts
apps/web/src/features/datetime/datetime-format.ts
apps/web/src/features/datetime/datetime-format.test.ts
apps/web/src/contexts/datetime-format/index.tsx
apps/web/src/components/common/DateTimeDisplay.tsx
apps/web/src/features/settings/appearance-settings.tsx
apps/web/src/app/layout.tsx
apps/web/src/features/request-logs/components/request-log-table-columns.tsx
apps/web/src/app/(protected)/request-logs/page.tsx
apps/web/public/locales/en/common.json
apps/web/public/locales/vi/common.json
```

---

### Task 1: Est. Speed estimator

**Files:**

- Create: `apps/web/src/features/request-logs/estimate-speed.ts`
- Create: `apps/web/src/features/request-logs/estimate-speed.test.ts`
- Modify: `apps/web/src/utils/table-helpers.ts` (`formatSpeed` delegates to estimator)
- Modify: `apps/web/src/features/request-logs/index.ts`

**Interfaces:**

- Produces: `estimateSpeedTokPerS({ completionTokens, durationMs }: { completionTokens?: number | null; durationMs?: number | null }): number | null`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { estimateSpeedTokPerS } from "./estimate-speed";

describe("estimateSpeedTokPerS", () => {
  it("returns completion tokens per API second", () => {
    expect(estimateSpeedTokPerS({ completionTokens: 470, durationMs: 10000 })).toBe(47);
  });

  it("returns null when duration is missing or not positive", () => {
    expect(estimateSpeedTokPerS({ completionTokens: 100, durationMs: 0 })).toBeNull();
    expect(estimateSpeedTokPerS({ completionTokens: 100, durationMs: null })).toBeNull();
  });

  it("returns null when completion tokens are missing or not positive", () => {
    expect(estimateSpeedTokPerS({ completionTokens: 0, durationMs: 1000 })).toBeNull();
    expect(estimateSpeedTokPerS({ completionTokens: null, durationMs: 1000 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter web exec vitest run src/features/request-logs/estimate-speed.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
export function estimateSpeedTokPerS(input: {
  completionTokens?: number | null;
  durationMs?: number | null;
}): number | null {
  const completionTokens = input.completionTokens;
  const durationMs = input.durationMs;
  if (completionTokens == null || durationMs == null || completionTokens <= 0 || durationMs <= 0) {
    return null;
  }
  return completionTokens / (durationMs / 1000);
}
```

`formatSpeed` uses this and formats `toFixed(1) tok/s` when non-null.

- [ ] **Step 4: Re-run tests — PASS**

- [ ] **Step 5: Commit** `test(web): cover estimated log speed formula`

---

### Task 2: Datetime format resolver

**Files:**

- Create: `apps/web/src/constants/datetime-format.constant.ts`
- Create: `apps/web/src/features/datetime/datetime-format.ts`
- Create: `apps/web/src/features/datetime/datetime-format.test.ts`
- Modify: `apps/web/src/constants/index.ts`

**Interfaces:**

- Produces: `DATETIME_FORMAT_COOKIE_NAME = '_gp_datetime_format'`, `DatetimeFormatMode`, `parseDatetimeFormatMode`, `isSameCivilDay`, `resolveDatetimePresentation`

- [ ] **Step 1: Failing tests** for `parseDatetimeFormatMode` (unknown → `auto`), `isSameCivilDay` in `Asia/Ho_Chi_Minh` across UTC midnight, `resolveDatetimePresentation` auto/relative/exact, invalid TZ → `exact`.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement** with `Intl.DateTimeFormat('en-CA', { timeZone, year/month/day })` for civil day. `resolveDatetimePresentation` returns `{ kind: 'relative' | 'exact' }`.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat(web): resolve datetime display mode from cookie`

---

### Task 3: Server-side log filter mapping

**Files:**

- Modify: `apps/web/src/features/request-logs/request-log-table-filter-utils.ts`
- Modify: `apps/web/src/features/request-logs/request-log-table-filter-utils.test.ts`

**Interfaces:**

- Extends `RequestLogSearch` with optional numeric ranges: `prompt_tokens`, `completion_tokens`, `cache_tokens`, `estimated_cost_usd`, `total_response_time_ms`, `estimated_speed_tok_per_s` as `[number | undefined, number | undefined]`.
- Field constants: `usage_metadata->prompt_tokens`, `usage_metadata->completion_tokens`, `usage_metadata->cache_tokens`, `usage_metadata->estimated_cost_usd`, `performance_metrics->total_response_time_ms`, `estimated_speed_tok_per_s`.
- `between` when both ends set; `gte`/`lte` when one end set; skip when min > max.

- [ ] **Step 1: Failing tests** asserting `->` (not `->>`) for cache tokens gt/between, speed field is the generated column name, model still `->>` OR, no `.` in JSON field strings.

- [ ] **Step 2: Run — FAIL** (assertions on missing fields).

- [ ] **Step 3: Implement mapping.** Countable filters include the new fields (a range counts once).

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat(web): map JSONB numeric log filters for PostgREST`

---

### Task 4: Generated Est. Speed column

**Files:**

- Create: `supabase/migrations/20260902010000_request_log_estimated_speed.sql`
- Modify: `packages/database/sql/schema.sql`
- Modify: `packages/database/types/database.types.ts` (`request_logs.Row` add `estimated_speed_tok_per_s: number | null`; omit from Insert/Update)

**Interfaces:**

- SQL matches Task 1 formula. Index `(user_id, estimated_speed_tok_per_s)`.

- [ ] **Step 1:** Add the migration + schema mirror + types. No dual-write in the worker.

- [ ] **Step 2:** Commit `feat(db): generate estimated_speed_tok_per_s on request_logs`

---

### Task 5: Cookie context + DateTimeDisplay + Appearance

**Files:**

- Create: `apps/web/src/contexts/datetime-format/index.tsx`
- Modify: `apps/web/src/app/layout.tsx` (read cookie, provide default)
- Modify: `apps/web/src/components/common/DateTimeDisplay.tsx`
- Modify: `apps/web/src/features/settings/appearance-settings.tsx`
- Modify: `apps/web/public/locales/en/common.json` and `vi/common.json` (appearance datetime keys)
- Test: `apps/web/src/features/datetime/datetime-format.test.ts` already covers resolver; add relative formatter tests if extracted.

**Interfaces:**

- `DateTimeFormatContext`: `{ mode, setMode }`
- `DateTimeDisplay` uses mode + `useList`/`existing settings` timezone. Relative via `Intl.RelativeTimeFormat`. Tooltip exact when `kind === 'relative'`.

- [ ] **Step 1:** Appearance Radio: Relative / Exact / Auto. Cookie set like theme.

- [ ] **Step 2:** Wire `DateTimeDisplay`.

- [ ] **Step 3:** Commit `feat(web): add relative exact auto datetime preference`

---

### Task 6: Logs table columns + page

**Files:**

- Modify: `apps/web/src/features/request-logs/components/request-log-table-columns.tsx`
- Modify: `apps/web/src/app/(protected)/request-logs/page.tsx`
- Modify: `apps/web/src/constants/request-log-select.ts` (include `estimated_speed_tok_per_s`)

**Interfaces:**

- Remove overhead column. Add cache + Est. Speed. Format/Stream as column enum filters. Numeric filterDropdown min/max calling `searchFormProps`. Sorters `sorter: true` with `dataIndex` matching Refine fields (`estimated_speed_tok_per_s`, JSON paths for tokens). Drop toolbar Format/Stream Selects.

- [ ] **Step 1:** Implement columns per spec table.

- [ ] **Step 2:** `pnpm --filter web test` for request-logs tests PASS.

- [ ] **Step 3:** Commit `feat(web): expand logs table server filters and Est. Speed`

---

### Task 7: Hybrid i18n catalog

**Files:**

- Modify: `apps/web/public/locales/en/common.json`
- Modify: `apps/web/public/locales/vi/common.json`

**Interfaces:**

- VI nav/titles/documentTitle: Logs, API Keys, Proxy API Keys, Console, Combos, Reconciliation.
- Logs fields: Est. Speed, Token cache, Token đầu vào, Token đầu ra, Thời gian xử lý.
- Replace nhật ký as resource name; Rotate key; no dấu ống / xoay khóa / sức khỏe / token suốt đời.
- New keys for datetime preference, Est. Speed tooltip, numeric filter placeholders.

- [ ] **Step 1:** Edit catalogs.

- [ ] **Step 2:** Run `pnpm --filter web i18n:check` — OK.

- [ ] **Step 3:** Commit `fix(web): use hybrid Vietnamese loanwords for console i18n`

---

## Spec coverage

| Spec item                          | Task    |
| ---------------------------------- | ------- |
| JSONB `->` numeric filters/sorters | 3, 6    |
| Model `->>` OR                     | 3       |
| Est. Speed generated + formula     | 1, 4, 6 |
| Remove overhead, add cache         | 6       |
| Format/Stream column filters       | 6       |
| Datetime cookie + auto civil day   | 2, 5    |
| Hybrid i18n                        | 7       |
| No worker dual-write               | 4       |

## Execution

This session executes the plan inline with TDD (tightly coupled UI + catalog files).
