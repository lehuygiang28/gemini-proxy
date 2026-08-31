# Interactions API and resource affinity Implementation Plan

> **SUPERSEDED.** Interaction/resource affinity tables are out of this program. Do not implement.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct model extraction for `/interactions` and pin follow-up resource ids to the originating Google project pool (or singleton key).

**Architecture:** Pure `parseProxyPath` / `extractAffinityHints`. `provider_resources` upsert on success `onComplete`. Scheduler `requiredPoolId` / `requiredKeyId` from spec 5.

**Tech Stack:** TypeScript, Vitest, Supabase, existing `safelyExtractBodyText`.

## Global Constraints

- Depends on spec 5 scheduler pin args.
- Pass-through Interactions JSON; do not translate schemas.
- Do not buffer streams for affinity; scan capped `responseText` in `onComplete`.
- Cross-pool hints → 409 `affinity_conflict`.
- Spec: [interactions](../specs/2026-08-31-interactions-resource-affinity-design.md).

## File map

| File                                                             | Responsibility                 |
| ---------------------------------------------------------------- | ------------------------------ |
| `packages/core/src/proxy/parse-proxy-path.ts`                    | format, kind, url model        |
| `packages/core/src/affinity/extract-affinity.ts`                 | request hints + response ids   |
| `packages/core/src/affinity/upsert-provider-resources.ts`        | supabase upsert                |
| `packages/core/src/middlewares/extract-proxy-data.middleware.ts` | use parser                     |
| `packages/core/src/services/proxy.service.ts`                    | pin before reserve             |
| `packages/core/src/types/index.ts`                               | `affinityHints` on parsed data |
| `supabase/migrations/<ts>_provider_resources.sql`                | table                          |

---

### Task 1: Path parser + hint extractors

```ts
export function parseProxyPath(path: string): ParsedProxyPath | { error: "invalid_path" };

export function resolveModelAndStream(input: {
  readonly parsed: ParsedProxyPath;
  readonly body: unknown;
  readonly query: Record<string, string>;
}): { model: string | undefined; stream: boolean };

export function extractRequestAffinityHints(input: {
  readonly parsed: ParsedProxyPath;
  readonly body: unknown;
}): AffinityHint[];

export function extractResponseResourceIds(text: string): AffinityHint[];
```

- [ ] **Step 1: Failing tests**
  - `/gemini/v1beta/models/gemini-x:generateContent` → kind models, urlModel `gemini-x`
  - `/gemini/v1beta/interactions` + body `{ model: 'gemini-3.5-flash', previous_interaction_id: 'int_1' }` → model flash, hint interaction `int_1`
  - last path segment `interactions` is **not** the model
  - `/openai/v1/chat/completions` + body model unchanged
  - `/gemini/v1beta/files/abc` → file hint `files/abc` or `abc` (lock: store Google `name` as returned, e.g. `files/abc`)
  - response JSON `{ "id": "int_9" }` on interactions kind → record `int_9`
  - response `name: "cachedContents/xyz"` → cached_content
  - missing `/gemini/` or `/openai/` → invalid_path

- [ ] **Step 2: Implement until PASS**

- [ ] **Step 3: Commit** `feat(core): parse Interactions paths and affinity resource ids`

---

### Task 2: Table + lookup + pin + upsert

- [ ] **Step 1: Migration** as spec. Unique `(user_id, resource_type, resource_id)`. RLS. Cleanup function `cleanup_expired_provider_resources()`.

- [ ] **Step 2: Contract tests**
  - interactions POST logs/reserves with model from body (mock select keys; assert scheduler requiredPool from mapping)
  - mapping pool A + previous_interaction_id → origin fetch uses only pool A key
  - two hints two pools → 409 no fetch
  - pinned pool all keys cooling → error, no cross-pool
  - generateContent regression still works

- [ ] **Step 3: Wire extract middleware** to set `model`, `stream`, `affinityHints`.

- [ ] **Step 4: ProxyService** loads mappings (`eq user_id`, `in resource_id`, not expired). Conflict → `ProxyError` 409 `affinity_conflict` `retryable: false`. Pass pin into scheduler. Retry excludes keys but keeps `requiredPoolId`.

- [ ] **Step 5: `onComplete` upsert** `waitUntil`. TTL defaults from spec. `ON CONFLICT (user_id, resource_type, resource_id) DO UPDATE expires_at`.

- [ ] **Step 6: Commit** `feat(core): pin Gemini resources to the originating project pool`

---

### Task 3: Optional key-show resources table

If the show page is easy: Refine `useList` `provider_resources` filter `originating_api_key_id`. Otherwise skip (spec allows). Prefer skip if it needs new RLS user INSERT (users only SELECT). List is enough.

- [ ] **Step 1: Skip or add read-only table + i18n**

- [ ] **Step 2: Commit only if UI landed** `feat(web): list provider resource affinity on API key show`

---

## Spec coverage

Model extraction bug, request hints, response scan, pin, 409, same-pool retry, TTL defaults, no Live WS, no Files console.
