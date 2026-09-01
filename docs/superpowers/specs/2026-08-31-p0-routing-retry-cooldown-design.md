# P0 — `/v1` routing, passthrough, retry, and cooldown

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 2 (tenant-owned keys, no `?key=`, no `x-gproxy-*`, no synthetic retry).
**Status:** Approved (locked). This is spec 3. Do not implement whole-key cooldown, in-request wait, or 5xx hard lock.
**Approach:** Canonical `/v1` with credential-based format detection. Pure modules classify errors and compute hard cooldown / soft penalty. Do not wait in-request for a cooled key. Port helpers from `feat/auto-detect-api-format` only; do not merge that branch.

## Goal

Clients call `https://host/v1/...` with either `x-goog-api-key` or `Authorization: Bearer`. The gateway detects Gemini vs OpenAI-compatible, forwards the operation, retries across eligible Gemini keys (one attempt each, cap 50), and persists hard cooldown scoped to `api_key + canonical model` unless a structured error proves a key-wide or project/spend-wide failure.

## Public paths

Canonical (advertise in README only):

```text
https://host/v1/...
```

Normalize before routing (pure function `normalizeV1Path`):

| Input                   | Output               |
| ----------------------- | -------------------- |
| `/v1/models/...`        | `/v1/models/...`     |
| `/v1/v1/models/...`     | `/v1/models/...`     |
| `/v1/v1beta/models/...` | `/v1beta/models/...` |

Preserve the raw query string, including repeated parameters (`URLSearchParams` / raw `c.req.url` search). Do not drop duplicate keys.

Legacy (keep working, do not advertise):

- `/api/gproxy/gemini/*` → Gemini (path already names the format; credential still required).
- `/api/gproxy/openai/*` → OpenAI-compatible.

`coreApp` owns `/v1`, `/v1beta` (after normalize), `/gemini`, `/openai`, `/healthz`, `/readyz`.

Adapters:

- Serve `/v1/*` by mounting `coreApp` at `/` (or a dedicated `/v1` rewrite that preserves the `/v1` prefix into `coreApp`).
- Keep existing `/api/gproxy` `basePath` mount.
- Next.js: add `apps/web/src/app/v1/[[...slug]]/route.ts` exporting the same handlers as gproxy, with a Hono app that does **not** strip `/v1`. Cloudflare and `apps/api` mount both prefixes.

## Format detection (`/v1` only)

Reuse spec 2 `extractProxyCredential`:

| Credential                          | `apiFormat`                                  |
| ----------------------------------- | -------------------------------------------- |
| `x-goog-api-key` only               | `gemini`                                     |
| Strict `Authorization: Bearer` only | `openai`                                     |
| Both                                | `400` `{ error: 'conflicting_credentials' }` |
| Neither / invalid                   | `401`                                        |

Path is not the sole format signal. `/v1/chat/completions` with `x-goog-api-key` is Gemini (unusual but allowed); `/v1/models/...:generateContent` with Bearer is OpenAI-compatible.

Legacy `/gemini` and `/openai` keep format from the path. Conflicting headers still 400 (spec 2).

## Origin URL

Gemini: `GOOGLE_GEMINI_API_BASE_URL` + normalized path **without** the `/v1` gateway prefix when the remainder already starts with `v1beta` or `v1`; if the remainder is `models/...`, prefix `v1beta/`.

OpenAI: `GOOGLE_OPENAI_API_BASE_URL` + remainder after `/v1` (typical `chat/completions`).

Do not invent extra path rewriting beyond the normalize table. Port tests from `feat/auto-detect-api-format` when they match these rules; skip path-only detector tests that contradict credential detection.

## Managed vs passthrough

**Managed** (parse model, usage/cost, retry, model policy, token/cost guardrail — policy itself is spec 4):

- Gemini `generateContent`, `streamGenerateContent`
- OpenAI-compatible endpoints (`/chat/completions`, `/completions`, `/embeddings`, `/models`, …)

**Best-effort passthrough** for every other remainder:

- Forward method, raw query, body, status, safe response headers.
- No endpoint-specific state. No affinity table.
- Auth + (spec 4) expiry, RPM, request/day only. No model/token/cost policy without a parser.
- Do **not** retry a generic mutation when delivery is unknown (network error after the request may have been sent). Safe to retry GET-like reads and managed endpoints with a clear status.

## Retry contract

- Default: try every eligible provider key. At most one attempt per key per logical request. Safety cap 50 distinct keys.
- Do not wait for a key in hard cooldown. Skip it.
- `PROXY_MAX_RETRIES=0` → first attempt only.
- `PROXY_MAX_RETRIES=N` (N ≥ 0) → at most N retries after the first attempt (max attempts = N+1, still ≤ eligible keys and ≤ 50).
- `-1` or unset → all eligible keys (cap 50).
- Ineligible: inactive, deleted, hard-cooldown for this model (or key-wide), already used in this request.
- Managed: retry clear `401/403/408/429/5xx`. Do not retry client `400`.
- Client disconnect aborts upstream (`AbortSignal` merge).
- Timeout (`PROXY_UPSTREAM_TIMEOUT_MS`, default 120000): wait for **response headers** only. Do not cut the body/stream after the first byte.

Delete in-loop sleep that waits for another key's cooldown. `PROXY_RETRY_BASE_DELAY_MS` / `PROXY_RETRY_MAX_DELAY_MS` are not used for hard-cooldown waits. Soft penalty is ordering only.

## Classifier

Keep `packages/core/src/retry/classify-upstream-error.ts`. Inputs: `{ status, headers, bodyText }`. Parse JSON `error.status`, `error.details[]`. **Do not parse prose in `error.message` for cooldown duration.**

| Class                                                                          | Retry other keys? | This key                                                                                            |
| ------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
| `client_invalid` (400, request 404)                                            | No                | Untouched                                                                                           |
| `key_invalid` (401; 403 `API_KEY_INVALID`)                                     | Yes               | Disable key (`is_active=false`, `disabled_reason='invalid_key'`)                                    |
| `key_permission` (other 403)                                                   | Yes               | **Key-wide** hard cooldown 15m if structured details say API disabled / billing; else key+model 15m |
| `rate_limit` (429)                                                             | Yes               | Hard cooldown `key + canonical model` unless structured details prove project/spend-wide → key-wide |
| `spend_limit` (429 + structured billing/quota 0)                               | Yes               | **Key-wide** hard cooldown 1h                                                                       |
| `transient` (408, 5xx, timeout)                                                | Yes               | Soft penalty only (below)                                                                           |
| Network/fetch failure on a **mutation** (POST/PATCH/PUT/DELETE) in passthrough | No                | Soft penalty                                                                                        |
| Network/fetch failure on managed generateContent / chat completions            | Yes               | Soft penalty                                                                                        |

## Hard cooldown

Default scope: `(api_key_id, canonical_model)`. Canonical model is the parsed model string, or `*` when unknown.

Key-wide scope (`canonical_model = '*'` or a null model column meaning all models): only when structured error proves credential invalid (already disabled), permission/API disabled, or project/spend-wide quota.

Signals for duration, latest instant wins:

1. `google.rpc.RetryInfo.retryDelay` (protobuf duration / seconds string)
2. `Retry-After` integer seconds (clamp 1–3600) or HTTP-date (if past → 1s)
3. Structured quota-reset metadata if present in `error.details`

If none: `rate_limit` 60s, `key_permission` 900s, `spend_limit` 3600s.

Persist in Postgres so every runtime sees it:

```sql
CREATE TABLE api_key_model_cooldowns (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  canonical_model TEXT NOT NULL,
  cooldown_until TIMESTAMPTZ NOT NULL,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (api_key_id, canonical_model)
);
```

Keep `api_keys.cooldown_until` for **key-wide** locks only (permission/spend/invalid is disable). Reservation skips a key when:

- key-wide `api_keys.cooldown_until > now()`, or
- row in `api_key_model_cooldowns` for this model or for `*` with `cooldown_until > now()`.

Success of `(key, model)` deletes that model row and does **not** clear other models. Success does not re-enable a disabled key.

If every eligible key is in hard cooldown, return **429 immediately** with JSON `{ error: 'rate_limit', message, gproxy_request_id }` and optional `Retry-After` set to the shortest remaining wait in seconds (integer). Do not hang.

## Soft penalty

`500/502/503/504` (and transient timeout): do **not** hard-lock. Immediately try the next eligible key. Deprioritize the failing `(key, model)` for `min(30000, retryDelayMs if RetryInfo/Retry-After present else 30000)` using in-memory ordering plus `last_error_at` (already on `api_keys`). Still selectable if nothing healthier remains. Success clears the penalty (`last_error_at` behind `last_used_at` as today). If every key returns `5xx`, exhaust eligible keys then return the last error.

Do not put `5xx` into `api_key_model_cooldowns`.

## Selection

`PROXY_LOADBALANCE_STRATEGY`: `round_robin` (least recent `last_used_at`) or `sticky_until_error` (prefer last successful key for this proxy key if it is eligible). No third value. One Gemini key = one Google project; do not group keys.

## Extracted units

| File                                                 | Export                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `packages/core/src/routing/normalize-v1-path.ts`     | `normalizeV1Path`                                        |
| `packages/core/src/routing/detect-api-format.ts`     | `detectApiFormat` (from credential source + legacy path) |
| `packages/core/src/routing/build-origin-url.ts`      | `buildOriginUrl`                                         |
| `packages/core/src/retry/classify-upstream-error.ts` | existing                                                 |
| `packages/core/src/retry/compute-cooldown.ts`        | duration + scope (`key` vs `key_model`)                  |
| `packages/core/src/retry/create-timeout-signal.ts`   | header-wait timeout + client abort                       |

Do not grow `proxy.service.ts` with path math.

## Tests

| Case                                                         | Expected                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `POST /v1/models/gemini-flash:generateContent` + goog header | origin Gemini, 200                                                                 |
| `POST /v1/chat/completions` + Bearer                         | origin OpenAI                                                                      |
| `/v1/v1beta/models/...`                                      | origin path `v1beta/models/...`                                                    |
| `/v1/v1/models/...`                                          | origin path `v1beta/models/...` or `v1/models/...` per normalize table             |
| both headers                                                 | 400                                                                                |
| `?key=` only                                                 | 401                                                                                |
| 429 on key A model M                                         | key A model M skipped; key A model N still eligible; key B used for M              |
| 401 on key A                                                 | A disabled; B used                                                                 |
| 503 on key A                                                 | B used immediately; A still eligible as fallback; wall-clock < 100ms when B exists |
| all keys in hard cooldown                                    | 429, no origin wait                                                                |
| `PROXY_MAX_RETRIES=0`                                        | one origin call                                                                    |
| passthrough POST + network error                             | no retry                                                                           |
| client abort                                                 | upstream aborted                                                                   |
| legacy `/gemini/...`                                         | still works                                                                        |

## Success criteria

- README quickstart uses `/v1` only; legacy documented as compatibility.
- Contract tests cover the table above.
- No in-request sleep for hard cooldown.

## Out of scope

- Project pools.
- Affinity tables.
- OTel.
- Timezone / proxy-key RPM (spec 4).
