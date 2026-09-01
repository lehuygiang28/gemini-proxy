# P0 — Tenant ownership, CLI, auth, and log privacy

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Status:** Approved (locked decisions + continue). Replaces the frozen draft that accepted `?key=`.
**Approach:** Keep plaintext secrets. Fix how we read, scope, forward, and log them. Delete client override headers. Do not accept query `?key=` or `x-api-key`.

## Goal

A proxy request is authenticated by a tenant-owned proxy key, forwarded without leaking that key or hop-by-hop headers, executed only against that tenant's Gemini keys, and persisted with redaction that covers Gemini keys — not just `Bearer` and `sk-*`.

## Explicitly out of scope (locked)

- Hashing, HMAC lookup, AES-GCM, KMS, `GPROXY_MASTER_KEY`.
- Hiding secrets in the UI after create. `SensitiveKeyDisplay` and copy/rotate stay.
- `/v1` format detection and path normalize (spec 3). This spec makes extraction path-independent and forbids `?key=`.
- Proxy-key RPM / timezone / expiry enforcement (spec 4).
- Audit log table for reveal/rotate.

## Current bugs

1. `extractProxyCredential` still accepts query `key` (`source: 'query-key'`). Locked decision: no `?key=`, no `x-api-key`.
2. Both `x-goog-api-key` and `Authorization: Bearer` present is first-wins. Locked: `400`.
3. `extractProxyDataMiddleware` historically copied `key=` onto the origin URL (partially stripped; keep the strip as defense in depth).
4. Reservation queries historically used `.or('user_id.is.null, user_id.eq.${userId}')`.
5. CLI `getDefaultUser` historically took `listUsers({ perPage: 1 })[0]`.
6. Sanitizer missed `AIza…` / `AQ.…` and renamed header keys.
7. `proxyOptionsMiddleware` / zero-completion synthetic retry / `x-gproxy-*` response headers.

## Design

### 1. Credential extraction

File: `packages/core/src/auth/extract-proxy-credential.ts`.

```ts
export type ProxyCredentialConflict = {
  readonly error: "conflicting_credentials";
};

export interface ExtractedProxyCredential {
  readonly value: string;
  readonly source: "x-goog-api-key" | "authorization";
}

export function extractProxyCredential(input: {
  readonly header: (name: string) => string | undefined;
}): ExtractedProxyCredential | ProxyCredentialConflict | null;
```

Rules (path-independent):

- Read `x-goog-api-key` (trimmed, non-empty).
- Read `Authorization` only when the scheme is `Bearer` (case-insensitive) and the token is non-empty. Other schemes are ignored (not a credential).
- Ignore `x-api-key`, query `key`, cookies, and JSON body secrets.
- If **both** goog header and Bearer token are present → `{ error: 'conflicting_credentials' }` (middleware returns **400**, not 401).
- If one is present and `isValidProxyApiKeyValue` fails → treat as missing (`null` → 401).
- If neither → `null` → 401 `"API key is required"`.

`validateProxyApiKeyMiddleware` looks up `proxy_key_value` in plaintext. Select `id, user_id, name, is_active, deleted_at`. Unknown / inactive / deleted → 401. Null `user_id` on the row → 500 `"Proxy API key is missing owner"`.

### 2. Strip secrets from the forwarded request

- Delete `key` and `api_key` from the forwarded query even though they are not credentials (defense).
- Strip `HEADERS_REMOVE_TO_ORIGIN` and any header whose name starts with `x-gproxy-`.
- Origin auth: gemini → `x-goog-api-key: <gemini secret>`; openai → `Authorization: Bearer <gemini secret>`.
- Never forward the client's proxy secret.

### 3. Tenant isolation

`ApiKeyParams.userId: string`. Every Gemini-key query:

```ts
.eq('user_id', params.userId)
.eq('is_active', true)
.is('deleted_at', null)
```

No `.or('user_id.is.null, …')`. `countAvailableApiKeys(c, userId: string)`. Missing owner on the proxy row → `InvalidKeyError`.

### 4. CLI owner resolver

`packages/cli/src/lib/resolve-owner-user.ts`:

| Situation              | Behavior                                                 |
| ---------------------- | -------------------------------------------------------- |
| `userId` provided      | Validate UUID; `auth.admin.getUserById`; missing → throw |
| 0 auth users           | Throw before insert                                      |
| 1 auth user            | Auto-assign that id                                      |
| 2+ and interactive     | Select `email (id)`                                      |
| 2+ and not interactive | Throw: pass `--user-id`                                  |

Same helper for Gemini keys and proxy keys (create, import, sync). Quick mode (`-q`) is not interactive. Detect 0/1/many with `listUsers({ page: 1, perPage: 2 })`.

### 5. Delete client override API

- Delete `proxyOptionsMiddleware`, `ProxyRequestOptions`, `shouldTreatOkAsFailure`, synthetic zero-completion retry.
- `ResponseHandlerService.handleError`: no `x-gproxy-*` response headers. Set `x-request-id` to the request id. Keep `gproxy_request_id` in JSON.

### 6. Health routes

On `coreApp` before auth:

- `GET /healthz` → `200 { "status": "ok" }`
- `GET /readyz` → probe `proxy_api_keys` `select id limit 1` → `200 { "status": "ready" }` or `503 { "status": "not_ready" }`. No secrets in the body.

### 7. Redaction

Extend `DataSanitizer`. Built-in JSON field names (case-insensitive, key equals or ends with): `authorization`, `api_key`, `apikey`, `api_key_value`, `proxy_key_value`, `proxy_api_key`, `x-goog-api-key`, `x-api-key`, `password`, `secret`, `token`, `access_token`, `refresh_token`, `private_key`, `cookie`. Values → `'[REDACTED]'`. Do not rename keys.

String patterns: `Bearer <token>`, `\bsk-[A-Za-z0-9]{20,}\b`, `\bAIza[A-Za-z0-9_-]{10,}\b`, `\bAQ\.[A-Za-z0-9._-]{10,}\b`.

`PROXY_REDACT_JSON_FIELDS` = extra comma-separated field names. Header **values** of `SENSITIVE_HEADERS` redacted; names kept. Truncation 64 KiB. No 40+ alphanumeric shredder.

## Tests

| File                               | Cases                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `extract-proxy-credential.test.ts` | goog only; bearer only; both → conflict; `?key=` ignored; `x-api-key` ignored; invalid value → null                     |
| sanitizer                          | nested JSON field, AIza in body, header name kept                                                                       |
| `resolve-owner-user`               | 0 / 1 / 2 users, invalid uuid                                                                                           |
| contract                           | missing/unknown/inactive 401; both headers 400; origin URL has no `key=`; `x-gproxy-retry-max` does not change attempts |
| proxy.service                      | HTTP 200 + zero completion tokens is not retried                                                                        |

## Success criteria

- Two CLI users cannot insert a key without choosing an owner.
- Request logs cannot store an `AIza` key from `request_data`.
- `rg "query-key" packages/core/src` is empty.
- `rg "user_id.is.null" packages` is empty.
- `rg "x-gproxy-" packages/core/src` is only the strip-to-origin guard.

## Out of scope

- `/v1` routing (spec 3).
- Policy columns (spec 4).
