# P0 — Authentication parsing, tenant isolation, and log privacy

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Approach:** Keep plaintext secrets. Fix how we _read_, _scope_, _forward_, and _log_ them. Delete client override headers.

## Goal

A proxy request is authenticated by a tenant-owned proxy key, forwarded without leaking that key or hop-by-hop headers, executed only against that tenant's Gemini keys, and persisted with query/body/header redaction that covers Gemini keys — not just `Bearer` and `sk-*`.

## Explicitly out of scope (locked)

- Hashing proxy keys, HMAC lookup, AES-GCM, KMS, `GPROXY_MASTER_KEY`.
- Hiding secrets in the UI after create. `SensitiveKeyDisplay` and copy buttons stay.
- `expires_at` on keys (that is spec 4 if needed).
- Audit log table for reveal/rotate (not requested once hashing was dropped).

## Current bugs

1. `ApiKeyService.getProxyApiKeyFromHeader` only reads `x-goog-api-key` on `/gemini/` and `Authorization` on `/openai/`. Gemini SDKs also send `?key=` and sometimes Bearer. OpenAI split on `' '` can yield `undefined`.
2. `extractProxyDataMiddleware` copies **all** query params onto `urlToProxy`, including `key=<proxy secret>`, so Google may receive the proxy key.
3. `getSmartApiKeys` / `countAvailableApiKeys` / `reserveNextApiKey` filter `.or('user_id.is.null, user_id.eq.${userId}')` even though `api_keys.user_id` is `NOT NULL`. `userId` from context can be typed `string | null`.
4. CLI `UsersManager.getDefaultUser` always takes `listUsers({ perPage: 1 })[0]`. Multi-user deployments attach keys to the wrong owner.
5. `DataSanitizer.sanitizePayloadBody` only redacts `Bearer …` and `sk-…`. Gemini `AIza…` / `AQ.…` keys, `api_key_value`, `password`, and nested JSON fields pass through when `save_request_body` is on.
6. `sanitizeKey` **renames** header keys to `[REDACTED_HEADER]` instead of redacting values. Callers lose the header name for debugging.
7. `proxyOptionsMiddleware` lets a proxy-key holder raise retries and change load-balancing. `shouldTreatOkAsFailure` can turn HTTP 200 into a retry by buffering the body.
8. Error responses set `x-gproxy-error-*` and `x-gproxy-request-id`.

## Design

### 1. Credential extraction

New file `packages/core/src/auth/extract-proxy-credential.ts` (one export: `extractProxyCredential`).

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

Resolution order (first non-empty valid value wins):

1. `x-goog-api-key`
2. `Authorization: Bearer <token>` (case-insensitive scheme)
3. Query `key`

Then `isValidProxyApiKeyValue`. Invalid/empty → `null` → middleware 401 `"API key is required"`.

Do **not** accept `api-key`, cookies, or JSON body secrets as the proxy credential.

`validateProxyApiKeyMiddleware` uses this helper. Lookup stays plaintext `eq('proxy_key_value', value)`. Select `id, user_id, name, is_active, deleted_at` (later specs may widen the select). Inactive / missing / deleted → 401 as today. Soft-deleted (`deleted_at` not null) already excluded.

If `user_id` on the row is null (corrupt row), 500 `"Proxy API key is missing owner"` — do not fall through to global keys.

### 2. Strip secrets from the forwarded request

In `performAttempt` / URL builder:

- Remove `key` and `api_key` from the forwarded query string.
- Continue stripping `HEADERS_REMOVE_TO_ORIGIN` plus any header whose name starts with `x-gproxy-` (defense in depth after the middleware is deleted).
- Overwrite origin auth: gemini → `x-goog-api-key: <gemini secret>`; openai → `Authorization: Bearer <gemini secret>`.
- Do not forward the client's proxy secret.

### 3. Tenant isolation

`ApiKeyParams.userId` becomes `string` (not `string | null`). Every query:

```ts
.eq('user_id', params.userId)
.eq('is_active', true)
.is('deleted_at', null)
```

Delete `.or('user_id.is.null, …')`. Update the comment on `idx_api_keys_selection` in `schema.sql` and any new migration that recreates it (do not rewrite old migrations). `countAvailableApiKeys(c, userId: string)`.

`ProxyService.selectOptimalApiKey` must throw `InvalidKeyError` if `proxyApiKeyData.user_id` is falsy.

### 4. CLI owner resolver

Replace `getDefaultUser` / silent `getFirstUser` with `packages/cli/src/lib/resolve-owner-user.ts`:

```ts
export async function resolveOwnerUserId(input: {
  readonly userId?: string;
  readonly interactive: boolean;
}): Promise<string>;
```

| Situation              | Behavior                                                 |
| ---------------------- | -------------------------------------------------------- |
| `userId` provided      | Validate UUID; `auth.admin.getUserById`; missing → throw |
| 0 auth users           | Throw: create a user first                               |
| 1 auth user            | Return that id; print the existing auto-assign warning   |
| 2+ and `interactive`   | `@inquirer/prompts` `select` of `email (id)`             |
| 2+ and not interactive | Throw: pass `--user-id`                                  |

Use this from `ApiKeysManager.create`, import/sync, `ProxyKeysManager.create`, import/sync, and both command modules. Quick mode (`-q`) is **not** interactive. `Validation.validateUserId` no longer treats empty as optional at the manager layer — empty means "resolve", not "insert null".

List detection: `listUsers({ page: 1, perPage: 2 })` is enough to distinguish 0/1/many; the interactive picker uses a larger page size (100) and paginates if needed.

### 5. Delete client override API

- Delete `packages/core/src/middlewares/proxy-options.middleware.ts`.
- Remove `.use('/*', proxyOptionsMiddleware)` from `app.ts`.
- Remove `ProxyRequestOptions` from `packages/core/src/types/index.ts` and `Variables.proxyRequestOptions`.
- Remove `options` threading from `ProxyService` (`extractRequestContext`, `selectOptimalApiKey`, `retryApiRequest`, synthetic failure path).
- Delete `shouldTreatOkAsFailure`, `handleSyntheticFailure`, `createSyntheticError`, `ZeroCompletionParams`, `SyntheticFailureParams`.
- `selectOptimalApiKey` uses `ConfigService.getLoadBalanceStrategy(c)` and hard-coded selection flags `prioritizeLeastRecentlyUsed: true`, `prioritizeLeastErrors: true`, `prioritizeNewer: true` (current defaults).
- `ResponseHandlerService.handleError`: stop setting `x-gproxy-error-type`, `x-gproxy-error-code`, `x-gproxy-error-message`, `x-gproxy-request-id`. Set `x-request-id` to `requestId`. Keep `gproxy_request_id` in JSON error bodies.

### 6. Health routes (auth bypass)

On `coreApp`, **before** `validateProxyApiKeyMiddleware`:

```ts
.get('/healthz', (c) => c.json({ status: 'ok' }))
.get('/readyz', async (c) => { /* supabase probe */ })
```

`readyz` uses `getSupabaseClient(c).from('proxy_api_keys').select('id').limit(1)`. Success → 200 `{ status: 'ready' }`. Failure → 503 `{ status: 'not_ready' }`. No secrets in the body.

Unauthenticated. Contract tests in spec 1 harness should gain two cases once this lands (add them in this spec's plan).

### 7. Redaction

Extend `DataSanitizer` (same class, no second sanitizer).

**Built-in JSON field names** (case-insensitive, match if the key equals or ends with them):

`authorization`, `api_key`, `apikey`, `api_key_value`, `proxy_key_value`, `proxy_api_key`, `x-goog-api-key`, `x-api-key`, `password`, `secret`, `token`, `access_token`, `refresh_token`, `private_key`, `cookie`.

Values of those fields become `'[REDACTED]'` recursively (objects and arrays). Do **not** rename keys.

**Built-in string patterns** applied to strings after field-name redaction:

- `Bearer <token>`
- `\bsk-[A-Za-z0-9]{20,}\b`
- `\bAIza[A-Za-z0-9_-]{10,}\b`
- `\bAQ\.[A-Za-z0-9._-]{10,}\b` (Google AI Studio style)

**Env:** `PROXY_REDACT_JSON_FIELDS` = comma-separated extra field names, merged into the built-in list. Read via `ConfigService` once per request when sanitizing, or pass `extraFieldNames` from `BackgroundService` so the sanitizer stays pure.

**Headers:** redact **values** of `SENSITIVE_HEADERS`; keep the header name.

**Payload bodies:** `sanitizePayloadBody` must run field-name redaction after JSON parse (walk the object), then re-apply string patterns on leftover strings. Truncation still 64 KiB.

**Do not** restore the old "40+ alphanumeric shredder" on payload bodies (it destroyed model names and SSE). Field-name + explicit regex only.

Call sites: `BackgroundService` request_data / response_data / error_details / provider_error.raw_body. Console logs that print keys must go through `sanitizeString`.

### 8. Auth parsing for mixed paths

`getProxyApiKeyFromHeader` today returns `''` when the path contains neither `/gemini/` nor `/openai/`. After this spec, extraction is **path-independent** (healthz already skipped). Invalid proxy paths still 400 in `extractProxyDataMiddleware`.

## Web UI

No encryption UX. Optional copy-only: none required.

Health is not a UI feature.

CLI help text: document `--user-id` as required when multiple users exist. English strings.

## Tests

| File                                        | Cases                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extract-proxy-credential.test.ts`          | header / bearer / query / invalid / priority order                                                                                                  |
| `sanitizer` tests (new `sanitizer.test.ts`) | nested JSON field, AIza key in body, header value kept name, extra env fields                                                                       |
| `resolve-owner-user` CLI tests              | 0 / 1 / 2 users, invalid uuid, interactive skipped in unit tests by injecting a list function                                                       |
| `api-key.service` tenant query              | mock supabase builder: assert `.eq('user_id', id)` and no `.or` containing `is.null`                                                                |
| contract                                    | missing/invalid/inactive key; `key` query stripped from origin URL; `x-gproxy-retry-max` does not change attempt count (count stays server default) |
| `proxy.service`                             | HTTP 200 with zero completion tokens is **not** retried                                                                                             |

## Success criteria

- Two users in CLI cannot create a key without choosing an owner.
- Request logs cannot store an `AIza` key that appeared in `request_data.body`.
- `rg 'x-gproxy-' packages/core` returns only the strip-to-origin guard (and tests that send the header).
- `rg 'user_id.is.null' packages` returns nothing.

## Out of scope

- Per-body retention TTL (keep the existing 90-day `cleanup_old_request_logs`).
- Proxy-key RPM/model policy (spec 4).
