# Logs table filters, Est. Speed, datetime preference, i18n hybrid

**Date:** 2026-09-02
**Status:** Approved for implementation (design dialogue locked; user asked to plan and implement)
**Approach:** JSONB PostgREST paths for token/cost/duration; generated column only for Est. Speed; cookie datetime format; hybrid Vietnamese i18n

## Goal

Make the request logs list a first-class Refine + Ant Design + Supabase table: every mappable column filters and sorts server-side, Cache tokens replaces Overhead, Est. Speed is sortable as our estimate (not Google throughput), datetime display is a console preference, and Vietnamese copy stays clear for developers.

## Problem

| Issue                                           | Impact                                        |
| ----------------------------------------------- | --------------------------------------------- |
| Overhead column                                 | Low-value; Cache tokens only on detail        |
| Only Date and Status sort                       | Cannot rank by tokens, cost, duration, speed  |
| Custom filter dropdowns + toolbar Format/Stream | Incomplete vs antd Table; not all server-side |
| `DateTimeDisplay` always absolute               | No relative / auto                            |
| VI `Logs` → "Nhật ký" and other calques         | Obscure in a developer console                |

## Approaches considered

1. **JSONB paths only for every metric.** Works for token/cost/duration via PostgREST `->`. Cannot express Est. Speed (ratio of two JSON fields) as a Refine sorter field without a column or RPC.
2. **Generated columns for all metrics.** Typed btree, extra schema for fields JSONB already filters correctly.
3. **Chosen: JSONB `->` / `->>` for stored metrics; generated column only for Est. Speed.** Verified against `@refinedev/supabase@6.0.0` + postgrest-js URL building.

## Refine + Supabase mapping (verified)

`@refinedev/supabase` `getList`:

- Filters: `field` is passed through to `eq` / `gt` / `ilike` / `or`.
- Sorters: if `field` contains `.`, Refine splits as `foreignTable.column` (wrong for JSONB). JSON operators `->` / `->>` have no `.`, so `.order('usage_metadata->cache_tokens')` becomes `order=usage_metadata->cache_tokens.desc`.

PostgREST JSON columns:

- Text: `usage_metadata->>model=ilike.*flash*` (already used).
- Numbers: `usage_metadata->cache_tokens=gt.9` (`->` compares JSON numbers). `->>` is text (`"80" > "9"` is false).

Never use dotted fields like `usage_metadata.cache_tokens`.

## Design decisions (locked)

1. **JSONB stays the document of record** for usage and performance. No generated columns for prompt/completion/cache/cost/duration.
2. **Est. Speed** is `estimated_speed_tok_per_s NUMERIC GENERATED ALWAYS … STORED` from JSONB. Worker persist unchanged.
3. **Formula:** `completion_tokens / (duration_ms / 1000)` using `usage_metadata.completion_tokens` and `performance_metrics.duration_ms` (API duration, not total). `NULL` when either is missing or `<= 0`. Display `47.0 tok/s` or `—`. Sort `nullsLast`.
4. **Label:** `Est. Speed` in both `en` and `vi`. Tooltip explains the estimate; do not use "Tốc độ ước lượng".
5. **Remove Overhead** from the list table.
6. **Add Cache tokens** after Output.
7. **Format and Stream** move into column filters; drop those toolbar Selects. Request ID stays Advanced.
8. **Datetime preference** cookie `_gp_datetime_format`: `relative` | `exact` | `auto` (default). Appearance tab. Applies to every `DateTimeDisplay`.
9. **Auto:** same civil day in `user_settings.timezone` → relative; otherwise exact. Invalid timezone → exact (no silent UTC). Hover relative → exact tooltip.
10. **i18n hybrid:** nav/identifiers/document titles keep English product terms. Columns/KPI/sentences: Vietnamese + loanwords. Ban: nhật ký (as page name), dấu ống, xoay khóa, sức khỏe, token suốt đời.

## Table columns (left → right)

| Column (en / vi header)    | Refine field                                                   | Sorter | Filter                  |
| -------------------------- | -------------------------------------------------------------- | ------ | ----------------------- |
| Created / Thời gian        | `created_at`                                                   | yes    | RangePicker `gte`/`lte` |
| Model                      | `usage_metadata->>model` OR `usage_metadata->>requested_model` | no     | contains                |
| Status / Trạng thái        | `is_successful`                                                | yes    | enum                    |
| Format                     | `api_format`                                                   | yes    | enum gemini/openai      |
| Stream                     | `is_stream`                                                    | yes    | enum                    |
| Input / Token đầu vào      | `usage_metadata->prompt_tokens`                                | yes    | min–max `between`       |
| Output / Token đầu ra      | `usage_metadata->completion_tokens`                            | yes    | min–max                 |
| Cache / Token cache        | `usage_metadata->cache_tokens`                                 | yes    | min–max                 |
| Cost / Chi phí             | `usage_metadata->estimated_cost_usd`                           | yes    | min–max                 |
| Est. Speed                 | `estimated_speed_tok_per_s`                                    | yes    | min–max                 |
| Duration / Thời gian xử lý | `performance_metrics->total_response_time_ms`                  | yes    | min–max (ms)            |
| Key                        | `proxy_key_id` / `api_key_id`                                  | no     | existing combobox       |
| Actions                    | —                                                              | —      | —                       |

Toolbar: chart range, live pause/resume, refresh, clear filters, Advanced (Request ID). `syncWithLocation` stays on.

Numeric min > max: do not submit. PostgREST errors: existing Refine empty + error notification; no client-side sort fallback.

## Est. Speed SQL

```sql
ALTER TABLE request_logs
ADD COLUMN estimated_speed_tok_per_s numeric
GENERATED ALWAYS AS (
  CASE
    WHEN (usage_metadata->>'completion_tokens') ~ '^[0-9]+$'
     AND (performance_metrics->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$'
     AND (usage_metadata->>'completion_tokens')::numeric > 0
     AND (performance_metrics->>'duration_ms')::numeric > 0
    THEN (usage_metadata->>'completion_tokens')::numeric
         / NULLIF((performance_metrics->>'duration_ms')::numeric / 1000.0, 0)
    ELSE NULL
  END
) STORED;

CREATE INDEX idx_request_logs_user_est_speed
  ON request_logs (user_id, estimated_speed_tok_per_s);
```

Mirror in `packages/database/sql/schema.sql` and `database.types.ts`. TypeScript helper `estimateSpeedTokPerS` must match this formula for display.

## Datetime preference

```text
cookie _gp_datetime_format  (path=/, sameSite=lax, no maxAge — match theme)
        │
        ▼
DateTimeFormatProvider (default from cookies() in root layout)
        │
        ▼
DateTimeDisplay reads mode + user_settings.timezone + Refine locale
```

| Mode       | Behavior                                           |
| ---------- | -------------------------------------------------- |
| `relative` | `Intl.RelativeTimeFormat` for all timestamps       |
| `exact`    | current date + time stack                          |
| `auto`     | relative if civil day matches quota TZ, else exact |

Unknown cookie value → `auto`.

## i18n glossary (locked)

**Nav / titles / documentTitle (keep EN in `vi`):** Logs, API Keys, Proxy API Keys, Console, Combos, Reconciliation, Observability (settings tab).

**Keep VI:** Settings → Cài đặt, Account → Tài khoản, Timezone → Múi giờ, Appearance → Giao diện.

**Logs / KPI:** Est. Speed; Token cache; Token đầu vào / Token đầu ra; Thời gian xử lý; Chi phí; Stream, Model, Token, Request ID as loanwords.

**Actions:** Rotate key (not xoay khóa). View Logs (not xem nhật ký as the resource name).

Full `vi/common.json` is in scope: apply the rules everywhere, including landing leftovers that still say nhật ký.

## Testing

- Unit: `estimateSpeedTokPerS` (happy path, zero duration → null, zero tokens → null).
- Unit: `buildRequestLogSearchFilters` numeric `->` fields, `between`, no `.` in JSON fields; model still `->>` OR.
- Unit: datetime resolver (`relative` / `exact` / `auto` same-day vs other-day; invalid TZ → exact).
- `pnpm i18n:check` (en/vi key parity).
- Assert VI nav keys are `Logs` not `Nhật ký`.

## Out of scope

- Client-side sort/filter of table pages.
- Generated columns for prompt/completion/cache/cost/duration.
- Changing persist/worker payload shape.
- RPC `search_request_logs`.
- Speed from Google usage metadata (does not exist as a field we trust).
