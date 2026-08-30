# Request Logs Page Redesign — OpenRouter-Inspired (A2)

**Date:** 2026-08-30  
**Approach:** A2 — Dynamic activity chart + OpenRouter-style metric table  
**Status:** Approved for implementation planning  
**Superdesign:** [Canvas](https://superdesign.dev/teams/b0873d97-51c3-4835-815f-93500bdd8977/projects/c8c515ad-13ad-4bcc-8edc-434f968c0963?live=1) · [Draft preview](https://p.superdesign.dev/draft/2a49c091-2154-46eb-bb2a-11d3a271b2dc)

## Goal

Redesign `/request-logs` so users can scan what matters: **model, usage, cost, speed, and latency** — not Request IDs or verbose key labels. Adopt OpenRouter Generations UX patterns while keeping Gemini Proxy Signal Deck identity.

## Problem (current UI)

| Issue | Impact |
| ----- | ------ |
| Request ID column in main table | Low-value data consumes horizontal space |
| Keys column is primary, two-line | Users care about model first, keys second |
| No Model / Cost / Speed columns | Data exists in `usage_metadata` but is hidden |
| Performance column is a text blob | API/total/attempts stacked — hard to compare rows |
| No activity overview | OpenRouter shows volume chart; we only have a flat table |
| Large blue retention Alert | Pushes useful content below the fold |

## Design decisions (locked)

1. **Layout:** Ant Design Table with new metric columns (not live-feed rows).
2. **Activity chart:** Full-width bar chart above table with **dynamic time range** picker.
3. **Time ranges:** `24h | 7d | 30d | 90d` — default `7d`.
4. **Request ID:** Removed from table; kept in detail modal + advanced filter.
5. **Chart ↔ table:** Independent — chart shows period volume; table filters apply separately (OpenRouter pattern).

## Information architecture

### Table columns (left → right)

| Column | Source | Display | Sortable |
| ------ | ------ | ------- | -------- |
| Date | `created_at` | `Aug 30, 4:03 AM` | Yes |
| Model | `usage_metadata.model` | Primary: shortened model name. Secondary: format badge + stream indicator. Retry badge when `retry_attempts.length > 0`. | No |
| Status | `is_successful` | Success / Failed tag | Yes |
| Input | `usage_metadata.prompt_tokens` | `3,768 tok` right-aligned mono | No |
| Output | `usage_metadata.completion_tokens` | `2,173 tok` right-aligned mono | No |
| Cost | `usage_metadata.estimated_cost_usd` | `$0.0042` or `—` | No |
| Speed | computed | `completion_tokens / (duration_ms / 1000)` → `47.0 tok/s` | No |
| Duration | `performance_metrics.total_response_time_ms` | `2.7s` | Yes |
| Overhead | computed | `(total_response_time_ms - duration_ms)` → `0.3s` muted | No |
| Key | joined key names | `proxy-name · api-name` truncated, 12px muted | No |
| Actions | — | Eye icon → detail modal | — |

**Removed from table:** Request ID, standalone Type, Stream, Performance blob, wide Keys column.

### Activity chart (A2)

```
┌──────────────────────────────────────────────────────────────┐
│  [24h] [7d] [30d] [90d]              [Filter] [Refresh]      │
│  ▁▂▃▅▇▆▄▃▂▁▂▃▄▅▆▇▆▅▄▃▂▁  ← request volume bars               │
└──────────────────────────────────────────────────────────────┘
```

| Range | Lookback | Bucket granularity | X-axis labels |
| ----- | -------- | ------------------ | ------------- |
| 24h | 1 day | 1 hour | `00:00` … `23:00` |
| 7d | 7 days | 1 hour | `Mon 12:00`, … or day+hour |
| 30d | 30 days | 1 day | `Aug 1`, `Aug 2`, … |
| 90d | 90 days | 1 day | `Jun 1`, … |

Chart uses `--gp-chart-1` bars, `--gp-chart-grid` grid, height ~120px inside `gp-panel`.

### Filters

Keep existing filters; reorganize:

- **Primary row (always visible):** time range control + filter toggle + reset
- **Expanded filters:** Model search (new), API key, Proxy key, Status, Format, Stream, Date range
- **Advanced collapse:** Request ID search (debug only)

Default: filters collapsed (change from current default-open on deep-link only).

### Detail modal

No changes. Request ID, retry timeline, payloads remain here.

## Data & backend (A2 additions)

Current RPC `get_request_logs_statistics(p_days_back)` returns `requests_by_hour` as hourly buckets for the whole period. For A2:

### New RPC: `get_request_logs_volume`

```sql
get_request_logs_volume(
  p_user_id UUID DEFAULT auth.uid(),
  p_range TEXT DEFAULT '7d'  -- '24h' | '7d' | '30d' | '90d'
) RETURNS JSONB
```

Returns:

```json
{
  "range": "7d",
  "bucket": "hour",
  "buckets": { "2026-08-30T04:00:00Z": 12, "2026-08-30T05:00:00Z": 8 },
  "total_requests": 1542,
  "period_start": "2026-08-23T00:00:00Z",
  "period_end": "2026-08-30T10:35:00Z"
}
```

**Bucket rules:**

| `p_range` | `bucket` field | SQL grouping |
| --------- | -------------- | ------------ |
| `24h` | `hour` | `date_trunc('hour', created_at)` last 24h |
| `7d` | `hour` | `date_trunc('hour', created_at)` last 7d |
| `30d` | `day` | `date_trunc('day', created_at)` last 30d |
| `90d` | `day` | `date_trunc('day', created_at)` last 90d |

Fill missing buckets with `0` in the RPC or client so the chart has continuous bars.

**Alternative (if RPC deferred):** Client-side aggregation from paginated logs — rejected for accuracy (pagination misses data).

### Frontend helpers (new)

```typescript
formatSpeed(completionTokens: number, durationMs: number): string
formatRoutingOverhead(totalMs: number, apiMs: number): string
shortModel(model: string | null): string  // move from live-request-feed
```

## Component structure

```
apps/web/src/features/request-logs/
├── components/
│   ├── logs-activity-chart.tsx      # NEW — chart + time range control
│   ├── logs-table-columns.tsx       # NEW — column defs + renderers
│   └── key-combobox.tsx             # existing
├── hooks/
│   └── use-request-logs-volume.ts   # NEW — RPC hook
└── index.ts

apps/web/src/app/(protected)/request-logs/page.tsx  # refactor — compose chart + table
```

## Visual spec

- **Theme:** Signal Deck dark (unchanged CSS vars)
- **Typography:** IBM Plex Sans body, IBM Plex Mono for numeric columns
- **Row height:** ~44px (between live feed 32px and current table ~56px)
- **Alignment:** all numeric columns right-aligned
- **Model column:** widest (~220px), visual anchor
- **Retention notice:** single muted line under title; remove large `Alert` box
- **Live badge:** keep `ConnectionStatusBadge` + pause/resume

## i18n keys (add to en + vi)

- `request_logs.fields.model`, `.input`, `.output`, `.cost`, `.speed`, `.duration`, `.overhead`
- `request_logs.chart.title`, `.range.24h`, `.range.7d`, `.range.30d`, `.range.90d`
- `request_logs.filters.advanced`, `.modelSearch`
- `request_logs.retentionShort` (one-line version)

## Out of scope

- Column customization (gear icon)
- Cost breakdown tooltip
- CSV export
- Chart click-to-filter table rows

## Testing plan

1. **Unit:** `formatSpeed`, `formatRoutingOverhead`, `shortModel` edge cases (0 tokens, 0 ms, null model)
2. **Integration:** RPC returns correct bucket counts for each range
3. **Manual:** Load `/request-logs` — verify columns, chart updates on range change, live refresh, detail modal still shows Request ID, filters work, mobile horizontal scroll acceptable

## Migration path

1. Add RPC migration + TypeScript types
2. Add helpers + chart component
3. Refactor page columns
4. i18n en/vi parity check (`pnpm i18n:check`)
5. Remove old column i18n keys only if unused

## References

- Current page: `apps/web/src/app/(protected)/request-logs/page.tsx`
- Live feed pattern: `apps/web/src/features/observability/components/live-request-feed.tsx`
- OpenRouter Generations UI (reference screenshot in Superdesign project)
- Usage data spec: `docs/superpowers/specs/2026-08-30-usage-logging-cost-design.md`
