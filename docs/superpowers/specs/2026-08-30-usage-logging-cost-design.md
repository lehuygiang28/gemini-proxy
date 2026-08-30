# Usage logging, token accuracy, and Gemini cost estimate

**Date:** 2026-08-30
**Approach:** A — TransformStream tee + `waitUntil` retry + atomic SQL increments. No Queue.
**Decisions locked:** Do not bill `toolUsePromptTokenCount` in USD v1. Snapshot `estimated_cost_usd` at persist time.

## Goal

Parse every Gemini/OpenAI-compat token bucket without double-counting, persist the raw provider usage object, stop buffering streams before TTFB, and show an **estimate** of Standard paid Gemini cost on logs and the dashboard.

## Current bugs (must fix)

1. `handleSuccess` awaits `response.clone().text()` before returning — streams are fully buffered.
2. `user_settings` is loaded on the critical path.
3. Parser ignores `thoughtsTokenCount`, `toolUsePromptTokenCount`, `responseTokenCount`, non-`STOP` finish reasons, and OpenAI usage-only chunks.
4. `raw_metadata` stores `{ model, apiFormat, responseId }` instead of the provider usage object.
5. API key usage is read-modify-write (lost updates under concurrency).
6. Insert failures are swallowed (`Promise.allSettled` + no retry).
7. Cloudflare `waitUntil` is 30s after handler return — must not wrap the whole stream consume.

## Logging pipeline

Parse inside a `TransformStream` that is the response body (Worker stays alive while the client is connected). `waitUntil` covers **DB persist only** after `flush()`.

```text
Gemini Response.body
  → TransformStream.transform: enqueue(chunk) + parser.push(chunk)
  → TransformStream.flush: parser.finish() → persist + waitUntil(retry)
  → client receives first byte immediately
```

- Do not `waitUntil(read entire stream)`. Clock starts at handler return; long SSE would cancel parse.
- `await` persist inside `flush()` is allowed (does not delay TTFB).
- Client abort: persist last parsed usage.
- Parse fail: still insert the log; tokens 0; `raw_metadata.parse_error = true`.
- `onZeroCompletionTokens` may still buffer a clone (existing retry flag).
- `user_settings` and optional request-body capture run at persist time, not before return.
- `app.ts` must not flush the in-memory operations Map before stream `flush` (that would persist zeros and drop the real usage). Persist from success `flush` / error handler only.

`executeWithWaitUntil`: Hono `executionCtx.waitUntil` first (no destructure), then `@vercel/functions`, then `await`. Do not `return` after an optional-chain no-op.

Persist retry: 3 attempts, delays 200ms then 800ms, on **request_logs upsert** only. Throw on insert error so retry runs.

Atomic counters (service_role RPC, no fetch-then-update):

```sql
UPDATE api_keys SET
  success_count = success_count + p_success,
  failure_count = failure_count + p_failure,
  prompt_tokens = prompt_tokens + p_prompt,
  completion_tokens = completion_tokens + p_completion,
  total_tokens = total_tokens + p_total,
  last_used_at = CASE WHEN p_success > 0 THEN now() ELSE last_used_at END,
  last_error_at = CASE WHEN p_failure > 0 THEN now() ELSE last_error_at END
WHERE id = p_id;
```

Same for `proxy_api_keys`. `completion_tokens` on keys stays **visible output only** (not thoughts). `total_tokens` uses provider `total`.

## Token mapping

Canonical JSONB on `request_logs.usage_metadata`:

| Field                    | Gemini native                                | OpenAI-compat                                                                 |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `prompt_tokens`          | `promptTokenCount`                           | `prompt_tokens`                                                               |
| `cache_tokens`           | `cachedContentTokenCount`                    | `prompt_tokens_details.cached_tokens` or `input_tokens_details.cached_tokens` |
| `completion_tokens`      | `candidatesTokenCount ?? responseTokenCount` | `completion_tokens`                                                           |
| `thoughts_tokens`        | `thoughtsTokenCount`                         | `completion_tokens_details.reasoning_tokens` or remainder                     |
| `tool_use_prompt_tokens` | `toolUsePromptTokenCount`                    | 0 unless present                                                              |
| `total_tokens`           | `totalTokenCount`                            | `total_tokens`                                                                |
| `raw_metadata`           | full `usageMetadata` object                  | full `usage` object                                                           |

Google identity: `total = prompt + candidates + thoughts + toolUse`. `cache ⊂ prompt`. `candidates` does **not** include thoughts.

Incremental parser (`UsageStreamParser`): SSE line buffer; keep latest usage; never `break` on `STOP`; accept every Gemini `finishReason`; accept OpenAI chunks that have `usage` with empty `choices`.

`parseFromResponseBody` stays as a wrapper (zero-completion retry + tests).

## Cost formula (no double-count)

Official: [tokens](https://ai.google.dev/gemini-api/docs/tokens), [thinking](https://ai.google.dev/gemini-api/docs/thinking) (“response pricing is the sum of output tokens and thinking tokens”), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [cache billing](https://discuss.ai.google.dev/t/question-about-gemini-api-caching-pricing/107349).

```text
cache      = min(cache, prompt)
uncached   = prompt - cache
visible    = completion
thoughts   = thoughtsTokenCount || reasoning_tokens || max(total - prompt - visible - toolUse, 0)

if visible >= thoughts AND (prompt + visible + toolUse) >= total - 1:
  output_billable = visible          # thoughts already inside completion (OpenAI o-style)
else:
  output_billable = visible + thoughts  # Gemini native / Gemini OpenAI-compat

cost = (uncached * input + cache * cached_input + output_billable * output) / 1e6
```

Never: `prompt * input + cache * cached`; never `total * rate`; never add `toolUse` to USD in v1 (Google Search grounding is a per-query fee; same field is used for URL/file tools). Never estimate cache storage $/hour.

Long-context Pro tiers: compare **`prompt_tokens` (includes cache)** to 200k.

Unknown model → `estimated_cost_usd: null`. Snapshot `estimated_cost_usd` + `pricing_version` (`asOf`) at persist. Dashboard sums stored USD, does not reprice history.

Standard paid text rates (`asOf: 2026-08-30`), USD / 1M:

| Model                    |               Input | Cached input | Output (incl. thinking) |
| ------------------------ | ------------------: | -----------: | ----------------------: |
| `gemini-3.6-flash`       |                1.50 |         0.15 |                    7.50 |
| `gemini-3.5-flash`       |                1.50 |         0.15 |                    9.00 |
| `gemini-3.5-flash-lite`  |                0.30 |         0.03 |                    2.50 |
| `gemini-3.1-flash-lite`  |                0.25 |        0.025 |                    1.50 |
| `gemini-3.1-pro-preview` | 2.00 / 4.00 (>200k) |  0.20 / 0.40 |           12.00 / 18.00 |
| `gemini-3-flash-preview` |                0.50 |         0.05 |                    3.00 |
| `gemini-2.5-pro`         | 1.25 / 2.50 (>200k) | 0.125 / 0.25 |           10.00 / 15.00 |
| `gemini-2.5-flash`       |                0.30 |         0.03 |                    2.50 |
| `gemini-2.5-flash-lite`  |                0.10 |         0.01 |                    0.40 |
| `gemini-2.0-flash`       |                0.10 |        0.025 |                    0.40 |
| `gemini-2.0-flash-lite`  |               0.075 |            — |                    0.30 |

Match: strip `models/`, lowercase, longest-prefix. v1 text/image/video input rate only (not audio surcharge, image-out, TTS, Live, Veo, embeddings, grounding).

## UI / stats

- `get_request_logs_statistics` adds `thoughts_tokens`, `tool_use_prompt_tokens`, `estimated_cost_usd`.
- Dashboard token KPI strip: thoughts + estimated cost. Cache KPI stays a **hit count**, not added to prompt.
- Request log detail: prompt, cache, completion, thoughts, tool-use, total, estimated USD (or “—” if null). Label estimate as estimate.

## Tests

Vitest on `@gemini-proxy/core`:

1. Gemini non-stream Google forum example: prompt 11500, cache 10000, candidates 1000, thoughts 10000 → uncached 1500; output 11000; cache not double-counted.
2. Gemini stream `finishReason: MAX_TOKENS` wins last usage.
3. OpenAI stream: finish chunk without usage, following usage-only chunk with `reasoning_tokens`; remainder vs subset detector does not double-count.
4. SSE JSON split across two TCP chunks.
5. Alias `gemini-2.5-flash-preview-05-20` → 2.5-flash rates; unknown model → null cost.

## Out of scope

Cloudflare Queues, grounding query fees, cache storage hourly, Batch/Flex/Priority rates, per-modality audio input, invoice reconciliation with Google.
