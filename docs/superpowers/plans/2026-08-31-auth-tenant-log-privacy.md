# Auth, tenant isolation, and log privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Most of this plan has landed on `cursor/auth-tenant-log-privacy-a451`. Remaining Task 4: drop `query-key`, return conflict when both goog and Bearer are present (400).

**Goal:** Path-independent proxy credential extraction, tenant-only Gemini keys, JSON-field redaction, CLI owner resolver, delete `x-gproxy-*` and zero-completion retry, add `/healthz` and `/readyz`.

**Architecture:** Small pure helpers (`extractProxyCredential`, `resolveOwnerUserId`, sanitizer walks) plus middleware/app wiring. No encryption.

**Tech Stack:** TypeScript, Vitest, Hono, Commander, @inquirer/prompts, existing `DataSanitizer`.

## Global Constraints

- Keys stay plaintext and revealable.
- `ApiKeyParams.userId: string` (not null). No `user_id.is.null`.
- Delete `ProxyRequestOptions` entirely.
- HTTP 200 is never turned into a synthetic failure.
- No new `useEffect` in web (this plan has no new forms).
- Spec: [auth/privacy](../specs/2026-08-31-auth-tenant-log-privacy-design.md).

## File map

| File                                                        | Responsibility                          |
| ----------------------------------------------------------- | --------------------------------------- |
| `packages/core/src/auth/extract-proxy-credential.ts`        | Header / Bearer / `?key=`               |
| `packages/core/src/auth/extract-proxy-credential.test.ts`   | Priority and validation                 |
| `packages/core/src/utils/sanitizer.ts`                      | Field-name + Gemini regex redaction     |
| `packages/core/src/utils/sanitizer.test.ts`                 | Nested JSON / AIza / headers            |
| `packages/core/src/app.ts`                                  | Health routes; drop proxyOptions        |
| `packages/core/src/types/index.ts`                          | Drop `ProxyRequestOptions`              |
| `packages/core/src/services/proxy.service.ts`               | Strip query `key`; drop synthetic retry |
| `packages/core/src/services/api-key.service.ts`             | Tenant `.eq('user_id')`                 |
| `packages/core/src/services/response-handler.service.ts`    | `x-request-id` only                     |
| `packages/core/src/services/config.service.ts`              | `PROXY_REDACT_JSON_FIELDS`              |
| `packages/cli/src/lib/resolve-owner-user.ts`                | 0/1/many user rules                     |
| `packages/core/src/middlewares/proxy-options.middleware.ts` | Delete                                  |

---

### Task 1: `extractProxyCredential` + sanitizer

**Interfaces:**

```ts
export interface ExtractedProxyCredential {
  readonly value: string;
  readonly source: "x-goog-api-key" | "authorization" | "query-key";
}
export function extractProxyCredential(input: {
  readonly path: string;
  readonly header: (name: string) => string | undefined;
  readonly queryKey: string | undefined;
}): ExtractedProxyCredential | null;
```

- [ ] **Step 1: Failing tests** in `extract-proxy-credential.test.ts`
  - goog header wins over Bearer and query
  - Bearer when header missing
  - query `key` when both headers missing
  - invalid `isValidProxyApiKeyValue` → null
  - empty Bearer (`Authorization: Bearer`) → null

- [ ] **Step 2: Failing tests** in `sanitizer.test.ts`
  - `{ api_key_value: 'AIzaSyXXXX' }` → value `[REDACTED]`, key name kept
  - nested `{ headers: { authorization: 'Bearer abc' } }`
  - payload string containing `AQ.abcdefghijklmnop`
  - `sanitizeHeaders` keeps the header name
  - extra field `foo_secret` when `extraFieldNames: ['foo_secret']`

- [ ] **Step 3: Implement helpers until PASS**

`sanitizePayloadBody`: parse JSON when possible, walk with field-name list ∪ extraFieldNames, then regex on remaining strings, then truncate.

- [ ] **Step 4: Commit** `test(core): cover proxy credential extraction and JSON redaction` then `fix(core): extract proxy credentials and redact Gemini secrets` if you split TDD commits, or one commit after green.

Prefer two commits: tests-first may be red in CI; **land tests + impl together** in one commit `fix(core): extract credentials and redact nested secrets`.

---

### Task 2: Middleware, health, tenant queries, delete overrides

**Files:** listed in file map for app/proxy/api-key/response-handler/types.

- [ ] **Step 1: Failing contract tests** (harness from spec 1)
  - `GET /healthz` → 200 without a proxy key
  - `GET /readyz` → 200 when supabase mock succeeds; 503 when it throws
  - gemini request with `?key=PROXY` does not send `key` to origin
  - `x-gproxy-retry-max: 99` does not increase attempts (one origin call when first succeeds)
  - 200 body with `candidatesTokenCount: 0` is not retried

- [ ] **Step 2: Implement**
  - `app.ts`: `.get('/healthz')` and `.get('/readyz')` **before** `validateProxyApiKeyMiddleware`. Remove `proxyOptionsMiddleware`.
  - Delete `proxy-options.middleware.ts`.
  - `validateProxyApiKeyMiddleware` uses `extractProxyCredential`. If row `user_id` is null → 500.
  - `ApiKeyService`: `.eq('user_id', params.userId)`; `userId: string`; drop `.or('user_id.is.null…')`.
  - `extractProxyDataMiddleware`: strip `key` and `api_key` from forwarded query (`URLSearchParams.delete`).
  - `ProxyService`: remove options, synthetic failure, `shouldTreatOkAsFailure`. Selection flags hard-coded true. Strip `x-gproxy-*` still.
  - `ResponseHandlerService.handleError`: set `x-request-id`; remove `x-gproxy-*` response headers.
  - `BackgroundService`: pass `ConfigService` extra redact fields into sanitizer.

- [ ] **Step 3: `rg` gates**

Run: `rg 'user_id\\.is\\.null' packages` → no matches. `rg 'x-gproxy-' packages/core/src` → only the origin strip loop.

- [ ] **Step 4: Commit** `fix(core): tenant-scope keys, healthz, and drop x-gproxy overrides`

---

### Task 3: CLI owner resolver

**Files:**

- Create: `packages/cli/src/lib/resolve-owner-user.ts`
- Create: `packages/cli/src/lib/resolve-owner-user.test.ts`
- Modify: `packages/cli/src/lib/users.ts`, `api-keys.ts`, `proxy-keys.ts`, `commands/api-keys.ts`, `commands/proxy-keys.ts`

```ts
export async function resolveOwnerUserId(input: {
  readonly userId?: string;
  readonly interactive: boolean;
  readonly listUsers?: () => Promise<Array<{ id: string; email?: string }>>;
  readonly getUserById?: (id: string) => Promise<{ id: string } | null>;
  readonly selectUser?: (choices: Array<{ id: string; email?: string }>) => Promise<string>;
}): Promise<string>;
```

- [ ] **Step 1: Failing unit tests** (inject list/get/select)
  - 0 users → throws `/No users/`
  - 1 user, no userId → that id
  - 2 users, not interactive, no userId → throws `/--user-id/`
  - 2 users, interactive → `selectUser` called
  - userId invalid UUID → throws
  - userId not found → throws

- [ ] **Step 2: Implement and wire create/import/sync** so they never insert `user_id: null`. Quick mode `interactive: false`.

- [ ] **Step 3: Commit** `fix(cli): require --user-id when multiple users exist`

---

### Task 4: Drop query-key; conflict on both headers

Locked: no `?key=` / `x-api-key`. Both `x-goog-api-key` and `Authorization: Bearer` → 400 `conflicting_credentials`.

- [ ] **Step 1:** Change `extract-proxy-credential.test.ts`: query-only → null; both valid headers → `{ error: 'conflicting_credentials' }`; goog-only and bearer-only still work. Watch RED (query-only currently returns a credential).
- [ ] **Step 2:** Implement. Middleware maps conflict → 400 JSON. Contract: `?key=` only 401; both headers 400.
- [ ] **Step 3:** Commit `fix(core): reject query keys and conflicting proxy credentials`

---

## Spec coverage

Credential sources, query stripping, tenant SQL, CLI 0/1/many, redaction, header deletion, synthetic retry deletion, healthz/readyz, no `?key=`, both-headers 400. Encryption remains out of scope.
