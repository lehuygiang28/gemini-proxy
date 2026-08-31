# OpenTelemetry, reliability signals, and generic webhooks Implementation Plan

> **SUPERSEDED.** OpenTelemetry / OTLP is out of this program. Do not implement.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always persist TTFT, abort, finish reason, and retry wait on `performance_metrics`. Optionally export OTLP/HTTP traces and POST a generic webhook at 50/80/100% quota.

**Architecture:** Extend `attachUsageLogging` + `UsageStreamParser`. Thin `fetch` OTLP exporter (no Node SDK). `alert_dispatches` unique constraint debounce. Settings URL on `user_settings`.

**Tech Stack:** TypeScript, Vitest, `crypto.getRandomValues`, existing waitUntil.

## Global Constraints

- Depends on spec 3 retry_attempts fields; specs 4–5 for quota channels (omit missing).
- `PROXY_OTEL_OTLP_ENDPOINT` unset → no export.
- HTTPS webhook or `http://localhost` only. No Slack/Discord.
- Do not fail the client if telemetry/webhook fails.
- Prefer remounting `ObservabilitySettingsForm` over adding `useEffect`.
- Spec: [otel](../specs/2026-08-31-otel-alerting-design.md).

## File map

| File                                                             | Responsibility              |
| ---------------------------------------------------------------- | --------------------------- |
| `packages/core/src/utils/usage-log-stream.ts`                    | ttft_ms                     |
| `packages/core/src/utils/usage-metadata-parser.ts`               | finish_reason               |
| `packages/core/src/telemetry/traceparent.ts`                     | parse/generate              |
| `packages/core/src/telemetry/otlp-exporter.ts`                   | POST traces                 |
| `packages/core/src/telemetry/quota-webhook.ts`                   | debounce + POST             |
| `packages/core/src/services/background.service.ts`               | metrics + export + alert    |
| `packages/core/src/services/proxy.service.ts`                    | inject traceparent upstream |
| `supabase/migrations/<ts>_alerts_and_webhook.sql`                | columns + table             |
| `apps/web/src/features/settings/observability-settings-form.tsx` | webhook URL                 |

---

### Task 1: TTFT, finish_reason, traceparent

- [ ] **Step 1: Failing tests**
  - `attachUsageLogging` `onComplete` receives `ttft_ms` number after first enqueue (existing stream test; extend callback or add metrics object — **Decision:** add optional `onComplete(usage, responseText, extras)` where `extras: { ttft_ms, client_aborted }`. Update existing tests to ignore extra args.)
  - parser fixture with `finishReason: 'MAX_TOKENS'`
  - `parseTraceparent('00-' + 32hex + '-' + 16hex + '-01')` ok; garbage → null
  - `createTraceparent(parent)` returns version 00

- [ ] **Step 2: Implement** `crypto.getRandomValues` for span ids. `performAttempt` sets outgoing `traceparent`.

- [ ] **Step 3: BackgroundService** writes `performance_metrics` fields from spec. `output_tokens_per_second` via existing visible completion / duration. `retry_wait_ms` sum of attempts.

- [ ] **Step 4: Commit** `feat(core): record TTFT finish reason and W3C traceparent`

---

### Task 2: OTLP exporter

```ts
export async function exportSpan(input: {
  readonly endpoint: string | undefined;
  readonly headersEnv: string | undefined;
  readonly span: OtlpSpanInput;
}): Promise<void>;
```

- [ ] **Step 1: Tests**
  - undefined endpoint → `fetch` not called
  - endpoint `https://otlp.example/v1/traces` → POST JSON `resourceSpans` includes `gen_ai.request.model`
  - endpoint without path suffix appends `/v1/traces`
  - fetch throw → swallowed (no throw)

- [ ] **Step 2: Call from persist `waitUntil`**. Timeout 5s via `createTimeoutSignal`.

- [ ] **Step 3: Commit** `feat(core): export optional OTLP HTTP traces`

---

### Task 3: Webhook + settings UI

Migration: `alert_webhook_url`, `alert_on_percent INTEGER[] DEFAULT '{50,80,100}'`, `alert_dispatches` unique `(scope_type, scope_id, channel, percent, window_start)`.

```ts
export async function maybeDispatchQuotaAlert(input: {
  readonly supabase: SupabaseClient;
  readonly userId: string;
  readonly webhookUrl: string | null;
  readonly percents: number[];
  readonly scopeType: "proxy_key" | "project_pool";
  readonly scopeId: string;
  readonly scopeName: string;
  readonly channel: "rpm" | "tpm" | "rpd" | "daily_budget" | "monthly_budget";
  readonly used: number;
  readonly limit: number;
  readonly windowStart: string;
  readonly requestId: string;
}): Promise<void>;
```

Skip if `limit <= 0` or url invalid. Compute percent. For each threshold ≤ percent, insert; on row inserted, POST payload from spec.

- [ ] **Step 1: Tests** two calls same window 80% → one fetch. Invalid `javascript:` url → no fetch.

- [ ] **Step 2: Invoke after settle** (proxy key windows) and after pool window increment. Read settings in persist path (already loads `user_settings`).

- [ ] **Step 3: UI** webhook Input; remount form with `key={existing?.updated_at ?? 'new'}` and `initialValues` including the URL. Remove the existing `useEffect` if that is a small safe change; otherwise do not add a second effect.

- [ ] **Step 4: i18n en/vi, schema mirror, types**

- [ ] **Step 5: Commit** `feat: generic quota webhooks and observability webhook setting`

---

## Spec coverage

performance_metrics shape, TTFT, tok/s, finish_reason, client_aborted, traceparent, OTLP attrs, webhook debounce, 50/80/100, no Slack, exporter isolation from client path.
