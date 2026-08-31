# P1 — Interactions API and stateful resource affinity

> **SUPERSEDED.** Locked decisions drop Interactions-specific state and resource affinity tables. Generic passthrough may forward those APIs without continuity guarantees. Do not implement this draft.

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 5 (project pools). Spec 2 path parsing changes land here if not already generalized.
**Approach:** Fix model extraction for non-`models/{model}:method` URLs. Persist a mapping from Google resource ids to the originating project pool / key. Follow-up requests that name those resources must reuse that pool.

## Goal

`POST /api/gproxy/gemini/v1beta/interactions` is a first-class Gemini route: `model` comes from the JSON body, not from the path segment `"interactions"`. Multi-turn `previous_interaction_id`, files, explicit caches, and batches stick to the Google project that created them.

## Why

Google recommends the Interactions API for new work. State lives on Google's servers, keyed by `previous_interaction_id`, and is **project-scoped**. Sending a follow-up with a different project's API key 404s or leaks isolation. [Interactions overview](https://ai.google.dev/gemini-api/docs/interactions-overview). Files, cached contents, and batch jobs have the same constraint.

## Path and model extraction

Today `extractProxyDataMiddleware` sets `model` to the last path segment before `:method` (`models/gemini-flash:generateContent` → `gemini-flash`). For `/v1beta/interactions` the last segment is `interactions`.

New unit `packages/core/src/proxy/parse-proxy-path.ts` exporting `parseProxyPath` + `resolveModelAndStream`.

```ts
export interface ParsedProxyPath {
  readonly apiFormat: "gemini" | "openai";
  readonly restPath: string; // after /gemini/ or /openai/
  readonly resourceKind:
    | "models"
    | "interactions"
    | "files"
    | "cachedContents"
    | "batches"
    | "operations"
    | "other";
  readonly urlModel: string | undefined; // models/{id} only
}

export interface ResolvedProxyMeta {
  readonly model: string | undefined;
  readonly stream: boolean;
  readonly affinityHints: readonly AffinityHint[];
}
```

Rules:

- Format still requires `/gemini/` or `/openai/` in the Hono path (adapters already prefix `/api/gproxy`). Invalid → 400, same message as today.
- `resourceKind` from the first rest segment (`v1beta/interactions` → skip version token `v1beta` | `v1` | `v1alpha` then read the next segment).
- **Model:** `urlModel` if `resourceKind === 'models'`; else JSON body `model` (gemini + openai). Never use `interactions` / `files` / `batches` as a model name.
- **Stream:** existing gemini `:streamGenerateContent` / `:stream` / `alt=sse`; openai body `stream`; interactions: `stream: true` in body or `:stream` / SSE accept.
- Forward URL construction stays `resolveUrl(base, restPath + query)` with `key` stripped (spec 2).

Pass `Api-Revision` and other unknown headers through (except stripped hop-by-hop and proxy credential). Do not invent `Api-Revision`.

## Affinity table

```sql
CREATE TABLE provider_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN (
        'interaction', 'file', 'cached_content', 'batch', 'operation'
    )),
    resource_id TEXT NOT NULL,
    project_pool_id UUID REFERENCES google_project_pools(id) ON DELETE SET NULL,
    originating_api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, resource_type, resource_id)
);

CREATE INDEX idx_provider_resources_expires ON provider_resources (expires_at)
    WHERE expires_at IS NOT NULL;
```

RLS: owner user or service_role, all verbs for service_role; users SELECT/DELETE their rows (no direct user INSERT from the browser required).

TTL defaults (used when Google does not give an expiry):

| Type           | Default TTL                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| interaction    | 55 days (paid-tier Interactions storage order of magnitude; refresh `expires_at` on reuse) |
| file           | 48 hours                                                                                   |
| cached_content | 1 hour if unknown                                                                          |
| batch          | 7 days                                                                                     |
| operation      | 24 hours                                                                                   |

Cleanup: extend `cleanup_old_request_logs` **do not**. Add `cleanup_expired_provider_resources()` deleting `expires_at < now()`, `GRANT` service_role. Call it from nowhere automatically in v1 (manual / future cron). Expired rows are ignored on lookup (`expires_at IS NULL OR expires_at > now()`).

## Hint extraction

`packages/core/src/affinity/extract-affinity.ts`

**Request hints** (force routing **before** key selection):

- `previous_interaction_id` → `{ type: 'interaction', id }`
- Path `/interactions/{id}` GET/DELETE/cancel → interaction
- Body `cachedContent` / `cached_content` names (`cachedContents/…`)
- Body file URIs `files/…` inside `file_data.file_uri`, `fileUri`, `media` paths
- Path `/files/{id}`, `/cachedContents/{id}`, `/batches/{id}`, `/operations/{id}`

**Response recordings** (after success, in `BackgroundService` / usage flush so TTFB stays intact):

- JSON `id` on interactions responses (`int_…` or whatever Google returns — store the raw `id` string)
- `name` fields `files/`, `cachedContents/`, `batches/`, `operations/`
- SSE: last `id` / `interaction.id` seen by a small scanner; if parse fails, skip affinity write (do not buffer the whole stream on the hot path). For non-stream JSON, parse once in flush from `responseText` already collected when `save_response_body` is on; **when bodies are not saved**, parse a bounded copy: reuse `UsageStreamParser` pattern with an `AffinityStreamParser` that only keeps resource ids (not full body). Attach in `attachUsageLogging` optional side parser **or** scan the existing `responseText` passed to `onComplete` (already capped). **Decision:** scan the capped `responseText` in `onComplete` (already available). If detailed bodies are off and the cap is 64KiB, ids at the start of Gemini JSON still appear. If the id is after the cap, skip — acceptable.

## Routing rules

`ProjectPoolScheduler.reserveNext` gains `requiredPoolId` / `requiredKeyId`.

```text
hints = extract from request
maps = lookup provider_resources for this user_id
if any hint missing mapping → proceed without pin (Google will 404; we do not invent)
if hints map to multiple distinct pools → 409 {
  error: 'affinity_conflict',
  message: 'Request references resources from different Google projects'
}
else pin requiredPoolId (and requiredKeyId when pool is null)
```

Retry (spec 3): when pinned, `excludeKeyIds` may still skip a failed **key** but **must not** leave the pool. If the pool has no remaining eligible keys, fail (do not steal another project). `key_invalid` on the originating key: try other keys in the **same pool** only.

## Middleware / service wiring

- `extractProxyDataMiddleware` calls `parseProxyPath` + body peek (existing `safelyExtractBodyText`).
- Store `affinityHints` on `proxyRequestDataParsed` (extend the type).
- `ProxyService.selectOptimalApiKey` loads mappings (Supabase select) then passes pin into the scheduler.
- Success `onComplete`: `upsertProviderResources({ userId, apiKeyId, projectPoolId, ids, now })`.

Do not block TTFB on the upsert; `waitUntil` it with the log persist.

## Tests

| Case                                                                    | Expected                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /gemini/v1beta/interactions` body `{ model: 'gemini-3.5-flash' }` | `proxyRequestDataParsed.model === 'gemini-3.5-flash'` |
| `POST /gemini/v1beta/models/gemini-x:generateContent`                   | model `gemini-x` (regression)                         |
| Request with `previous_interaction_id` mapped to pool A                 | reserve only pool A keys                              |
| Two hints, two pools                                                    | 409 affinity_conflict                                 |
| Response id recorded; second request pinned                             | mock supabase insert then select                      |
| Pinned pool, all keys in cooldown                                       | InvalidKeyError / 503 no key, no cross-pool           |
| OpenAI chat completions path                                            | unchanged model from body                             |

## Web UI

No Files/Cache/Batch console (P2). Show page for an API key may list recent `provider_resources` for that `originating_api_key_id` as a simple Refine table (optional). If time-box hits, skip UI and keep table for the proxy only.

## Success criteria

- Interactions traffic is logged under the real model name, not `"interactions"`.
- Follow-up turns stay on the creating project even when another pool has lower load.

## Out of scope

- Proxying Live WebSocket.
- Replaying interaction history in our DB.
- Semantic response cache.
- Implementing Google's Interactions schema translation (we pass through).
