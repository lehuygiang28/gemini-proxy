# Logs table: group Format and Stream into Model

**Date:** 2026-09-02
**Status:** Design dialogue locked; awaiting spec review before implementation plan
**Parent:** [2026-09-02-logs-filters-datetime-i18n-design.md](./2026-09-02-logs-filters-datetime-i18n-design.md)
**Approach:** A — restore OpenRouter-style Model grouping; keep token / cost / speed / duration as separate sortable columns

## Goal

The logs list stays a first-class Refine table (server-side filter/sort on every metric) but is scannable again: Format and Stream live inside the Model cell and its filter popover, not as extra columns.

## Problem

The filters/i18n work flattened Format and Stream into their own columns. Thirteen headers (Time, Model, Status, Format, Stream, Input, Output, Cache, Cost, Est. Speed, Duration, Key, Actions) make rows hard to scan. The 2026-08-30 OpenRouter spec already put format badge + stream indicator on Model and **removed** standalone Type/Stream from the table.

## Approaches considered

1. **Chosen: A — group only Format + Stream into Model.** Token, cache, cost, Est. Speed, and duration stay one-column-per-metric so rows still compare. Filter/sort on those fields stay on their headers.
2. **B — stronger stacking** (Tokens in/out/cache in one column, Perf = duration + speed). Denser, but numeric sort/filter on a grouped header is worse for ranking.
3. **C — custom mix.** Rejected; user picked A and delegated remaining UX.

### Filter/sort UX for grouped Format/Stream

1. **Chosen:** Model `filterDropdown` includes model search + Format + Stream. No independent `api_format` / `is_stream` sorters. Enum ranking is the wrong verb; Status remains the row-level enum sort.
2. Submenu “sort by Format/Stream” on the Model header — extra chrome, low use.
3. Hidden Ant columns for Format/Stream sort — fights `syncWithLocation` and column specs.

## Design decisions (locked)

1. **Drop standalone Format and Stream columns.** Do not return those filters to the toolbar. Request ID stays Advanced.
2. **Model cell stack (top → bottom):**
   - Primary model name.
   - Requested model, muted, only when it differs from primary.
   - Format tag always (`Gemini` / `OpenAI`).
   - Stream tag only when `is_stream` is true. Non-stream shows no tag (filter still offers “Không stream”).
   - Retries line only when `retry_attempts.length > 0`.
3. **Model filter popover** (one dropdown, existing search `Form` + `syncWithLocation`):
   - Model contains (same OR `usage_metadata->>model` / `->>requested_model`).
   - Format enum (`api_format`).
   - Stream enum (`is_stream`).
   - Apply writes those Refine fields (same mapping as today’s split columns).
   - Reset clears only `model`, `api_format`, `is_stream`.
   - Filter icon is primary if any of those three filters is active.
4. **No sort** on `api_format` or `is_stream`. Status, time, and numeric metric columns keep `sorter: true`. Est. Speed keeps `nullsLast`.
5. **Cache tokens stay a column** (after Output). Overhead stays gone.
6. **Clear all** still `setFieldsValue(blankRequestLogSearchValues())` then `setFilters([], 'replace')`.
7. **Deep links** with `api_format` / `is_stream` hydrate the Model popover via existing `mapFiltersToSearchFormValues`.
8. **Unchanged:** JSONB `->` / `->>` paths, generated `estimated_speed_tok_per_s`, datetime cookie, hybrid i18n glossary, worker persist.

## Table columns (left → right)

| Column (en / vi header)    | Refine field                                                  | Sorter | Filter                               |
| -------------------------- | ------------------------------------------------------------- | ------ | ------------------------------------ |
| Created / Thời gian        | `created_at`                                                  | yes    | RangePicker `gte`/`lte`              |
| Model                      | display only; filters use model OR, `api_format`, `is_stream` | no     | contains + enum Format + enum Stream |
| Status / Trạng thái        | `is_successful`                                               | yes    | enum                                 |
| Input / Token đầu vào      | `usage_metadata->prompt_tokens`                               | yes    | min–max                              |
| Output / Token đầu ra      | `usage_metadata->completion_tokens`                           | yes    | min–max                              |
| Cache / Token cache        | `usage_metadata->cache_tokens`                                | yes    | min–max                              |
| Cost / Chi phí             | `usage_metadata->estimated_cost_usd`                          | yes    | min–max                              |
| Est. Speed                 | `estimated_speed_tok_per_s`                                   | yes    | min–max, `nullsLast`                 |
| Duration / Thời gian xử lý | `performance_metrics->total_response_time_ms`                 | yes    | min–max (ms)                         |
| Key                        | `proxy_key_id` / `api_key_id`                                 | no     | existing combobox                    |
| Actions                    | —                                                             | —      | —                                    |

Eleven columns. Parent spec’s Format/Stream **column** rows are superseded by this table; their **filter fields** remain, now hosted by Model.

```text
gemini-2.5-flash
gpt-4o
[Gemini]  [Streaming]
Retries: 2
```

## Components

- `request-log-table-columns.tsx` — remove Format/Stream column defs; extend Model renderer + `ModelFilterDropdown`.
- `request-log-table-column-specs.ts` — drop `{ key: 'api_format' }` and `{ key: 'is_stream' }`. Model filter kind stays `'model'` and means the combined popover.
- Filter utils / data provider / SQL — no contract change.

## Testing

- Unit: column specs list eleven keys; no `api_format` / `is_stream` column keys.
- Unit: Model filter icon active when only `api_format` or only `is_stream` is set.
- Existing `buildRequestLogSearchFilters` tests stay valid.
- Manual: no Format/Stream headers; OpenAI filter from Model popover; Clear all; numeric/Est. Speed sort unchanged.

## Out of scope

- Stacking tokens or duration+speed into one column (approach B).
- Sort controls for Format/Stream.
- Toolbar Format/Stream Selects.
- Schema, Est. Speed formula, datetime preference, i18n glossary.
