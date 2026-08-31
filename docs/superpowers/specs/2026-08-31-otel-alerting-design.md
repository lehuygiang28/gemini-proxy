# P1 — OpenTelemetry, reliability signals, and generic webhooks

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 3 (`retry_attempts[].duration_ms/waited_ms/class`), spec 4 (quota windows), spec 5 (pool names). Can implement against whatever of 4–6 has already landed; missing fields are omitted from spans.
**Approach:** Optional OTLP/HTTP exporter via `fetch`. No Node SDK. Generic HTTPS webhook for threshold alerts. Follow OpenTelemetry GenAI semantic conventions.

## Goal

Production operators can see TTFT, retry wait, cache-hit tokens, finish reason, project pool, and client disconnect in traces and in `request_logs.performance_metrics`. They can receive a JSON POST when a proxy key or project pool crosses 50/80/100% of a configured limit.

## Non-goals

- Slack, Discord, email, PagerDuty adapters.
- `@opentelemetry/sdk-node`, auto-instrumentation, or collectors bundled into Workers.
- Changing the cost formula (audio/TTS/Live remain unbilled; spec P2).

## In-process metrics (always on)

Extend `performance_metrics` JSON written by `BackgroundService` (no migration required; JSONB):

```ts
export interface RequestPerformanceMetrics {
  readonly duration_ms: number; // upstream successful attempt
  readonly total_response_time_ms: number;
  readonly ttft_ms: number | null;
  readonly output_tokens_per_second: number | null;
  readonly attempt_count: number;
  readonly retry_wait_ms: number;
  readonly client_aborted: boolean;
  readonly finish_reason: string | null;
  readonly cache_tokens: number;
  readonly project_pool_id: string | null;
  readonly service_tier: string | null; // from body or response if present
}
```

**TTFT:** in `attachUsageLogging` `TransformStream.transform`, record `Date.now() - start` on the first enqueue. Pass to `onComplete`. Null for empty-body responses.

**output_tokens_per_second:** `visibleCompletionTokens / (duration_ms / 1000)` when duration > 0 and completion > 0; else null. Same formula as the request-logs UI.

**finish_reason:** extend `UsageStreamParser` to keep the last Gemini `finishReason` / OpenAI `finish_reason`. Do not break existing token tests; add one fixture.

**client_aborted:** true when the downstream cancel path runs (already tested) or upstream abort reason is client.

`retry_attempts` entries (spec 3) already have `waited_ms` and `class`. Sum `waited_ms` into `retry_wait_ms`.

Trace/session/user: if request JSON has `user` / `session_id` / `metadata.user_id` (common gateway fields), copy **redacted** into `performance_metrics.client_metadata` as `{ user: string | undefined, session: string | undefined }` only when the values are short strings (≤128 chars). Do not store nested objects. Spec 2 sanitizer still runs on request_data.

## W3C `traceparent`

If the incoming request has `traceparent`, parse version 00 (`[version]-[trace-id]-[parent-id]-[flags]`). Use that `trace-id` as the span id parent. Generate a new span id (`crypto.getRandomValues` 8 bytes hex). Inject `traceparent` onto the **upstream** request so Google (if they honor it) and our exporter share the trace. If header absent, generate both ids. Invalid header → generate new.

Do not require `tracestate`.

## OTLP exporter

`packages/core/src/telemetry/otlp-exporter.ts` — one export `exportSpan(span, env)`.

- If `PROXY_OTEL_OTLP_ENDPOINT` is empty, no-op.
- `POST {endpoint}/v1/traces` (if endpoint already ends with `/v1/traces`, do not duplicate).
- Headers: `content-type: application/json` plus `PROXY_OTEL_OTLP_HEADERS` parsed as `k=v,k2=v2`.
- Body: OTLP JSON `resourceSpans` with one span. Resource attributes: `service.name=gemini-proxy`, `service.version` from `packages/core/package.json` is optional; use literal `gemini-proxy`.
- Span name: `gen_ai.chat` when model generate/interactions; `http.proxy` otherwise.
- Attributes (skip nulls), aligned with [OTel GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/):
  - `gen_ai.provider.name` = `gcp.gen_ai`
  - `gen_ai.request.model`
  - `gen_ai.operation.name` = `chat` | `generate_content` | `interactions` | `embeddings` | `other`
  - `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`
  - `http.response.status_code`
  - `gemini_proxy.request_id`
  - `gemini_proxy.project_pool_id`
  - `gemini_proxy.attempt_count`
  - `gemini_proxy.ttft_ms`
  - `gemini_proxy.client_aborted`
- Span kind: `CLIENT` for upstream. Times: start = requestStartTime, end = now at persist.

Call `exportSpan` inside `waitUntil` after persist. Failures `console.warn`; never fail the client response. Timeout the exporter fetch at 5s via `createTimeoutSignal`.

No metric exporter in v1 (traces + logs are enough).

## Webhooks

`user_settings` columns:

```sql
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS alert_webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS alert_on_percent INTEGER[] NOT NULL DEFAULT '{50,80,100}';
```

Check: URL must be `https://` or `http://localhost` (allow local dev). Reject other schemes in the UI validator and in `BackgroundService` (skip invalid).

`alert_on_percent` default `{50,80,100}`. Values outside 1–100 ignored.

**Debounce table:**

```sql
CREATE TABLE alert_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('proxy_key', 'project_pool')),
    scope_id UUID NOT NULL,
    channel TEXT NOT NULL, -- 'rpm' | 'tpm' | 'rpd' | 'daily_budget' | 'monthly_budget'
    percent INTEGER NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_start TIMESTAMPTZ NOT NULL,
    UNIQUE (scope_type, scope_id, channel, percent, window_start)
);
```

After settle (spec 4) and pool window increment (spec 5), compute `used/limit * 100` for each configured limit. For each threshold `t` in `alert_on_percent` where `used/limit*100 >= t`, `INSERT … ON CONFLICT DO NOTHING`. If insert succeeds, POST webhook.

Payload:

```json
{
  "event": "quota_threshold",
  "percent": 80,
  "channel": "rpm",
  "scope_type": "proxy_key",
  "scope_id": "…",
  "scope_name": "prod-bot",
  "used": 80,
  "limit": 100,
  "window_start": "2026-08-31T12:00:00Z",
  "request_id": "…"
}
```

`fetch` timeout 5s. No retries in v1 (insert already happened; a lost POST is acceptable). Do not send secrets (no API keys).

Settings UI: `ObservabilitySettingsForm` gains `alert_webhook_url` (Input) and a read-only note that thresholds are 50/80/100 unless we expose a `Select mode="multiple"`. Expose the array with Refine `useForm` initialValues from the settings row. Prefer converting that form off `useEffect` in the same change: `key={existing?.updated_at}` + `initialValues` so React remounts instead of `setFieldsValue`. If that refactor is risky, add the new fields with the existing effect **only if** the file is already effect-based — master spec says do not add **new** effects; replacing the effect with remount is in scope.

## Health

No change beyond spec 2. Optionally `readyz` could check last OTLP failure — skip.

## Tests

- TTFT: transform test asserts `onComplete` second arg metrics include `ttft_ms >= 0`.
- Parser finish_reason fixture.
- `traceparent` parse valid/invalid.
- OTLP exporter: endpoint unset → no fetch; set → POST JSON contains `gen_ai.request.model`.
- Webhook debounce: two settles in the same minute at 80% → one insert / one POST.
- Sanitizer: webhook URL not logged with query secrets (redact).

## Success criteria

- With `PROXY_OTEL_OTLP_ENDPOINT` unset, behavior matches today plus richer `performance_metrics`.
- With endpoint set, one span per completed request (success or final error).
- 80% RPM on a limited proxy key produces exactly one webhook per minute window.

## Out of scope

- Slack signatures, Discord bot tokens.
- Trace sampling flags beyond honoring `traceparent` flags passthrough.
- Dashboard charts for TTFT (request log column may show speed already). Optional: request-logs table already has speed; add TTFT later.
