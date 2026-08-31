# P1 — Google project pools and quota-aware scheduler

> **SUPERSEDED.** Locked decisions drop Google project pools, `google_project_pools` / `google_projects`, and a project-level scheduler. Each Gemini API key belongs to its own Google project. Do not implement this draft.

**Date:** 2026-08-31
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md)
**Depends on:** spec 3 (`cooldown_until` on keys). Spec 4 is independent but merge order prefers 4 then 5.
**Approach:** Operators group Gemini keys by Google Cloud / AI Studio **project**. The scheduler picks a pool first (quota domain), then a key inside that pool. Keys with no pool behave as a singleton pool of one.

## Goal

Rotating ten keys that share one Google project must not be treated as ten quota buckets. Dashboard shows which project is in cooldown or near its declared RPM/TPM/RPD.

## Why

Google rate limits (RPM/TPM/RPD) are enforced per Google project, not per API key. [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Multiple keys in the same project share the same ceiling.

## Schema

```sql
CREATE TABLE google_project_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    google_project_id TEXT,
    tier TEXT,
    rpm_limit INTEGER,
    tpm_limit INTEGER,
    rpd_limit INTEGER,
    cooldown_until TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT google_project_pools_name_len CHECK (char_length(name) BETWEEN 1 AND 255)
);

CREATE UNIQUE INDEX google_project_pools_user_name_uidx
    ON google_project_pools (user_id, name);

CREATE INDEX google_project_pools_user ON google_project_pools (user_id);

ALTER TABLE api_keys
    ADD COLUMN project_pool_id UUID REFERENCES google_project_pools(id) ON DELETE SET NULL;

CREATE INDEX idx_api_keys_project_pool
    ON api_keys (project_pool_id)
    WHERE deleted_at IS NULL AND project_pool_id IS NOT NULL;

CREATE TABLE project_pool_quota_windows (
    project_pool_id UUID NOT NULL REFERENCES google_project_pools(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    token_count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (project_pool_id, window_type, window_start)
);
```

RLS: `user_id = auth.uid() OR service_role` on `google_project_pools`. Windows: visible if the parent pool is.

`google_project_id` and `tier` are optional labels (`free-tier`, `tier-1`, `tier-2`, `tier-3`, or free text). They are **not** verified against Google.

`updated_at` trigger reuses `update_updated_at_column()`.

## Implicit singleton pools

A key with `project_pool_id IS NULL` is scheduled as its own pool id `null:<api_key_id>`. No row is created automatically (avoids junk pools). Spec 6 affinity stores `project_pool_id` nullable plus `originating_api_key_id` always; when the pool is null, affinity pins the **key** (same as pinning a singleton pool).

Operators **should** attach keys that share a Google project to one pool. The UI copy says this explicitly.

## Scheduler algorithm

Replace the body of `ApiKeyService.reserveNextApiKey` with `ProjectPoolScheduler.reserveNext({ userId, excludeKeyIds, excludePoolIds, preferKeyId })` in `packages/core/src/scheduler/project-pool-scheduler.ts`.

1. **Sticky** (`PROXY_LOADBALANCE_STRATEGY=sticky_until_error` and `preferKeyId`): if that key is active, not cooled down, same user, and its **pool** is not cooled down, reserve it (existing optimistic `last_used_at` CAS). Else fall through.
2. Load candidate keys: same tenant filters as spec 2+3 (`user_id`, active, not deleted, `cooldown_until` elapsed), excluding `excludeKeyIds`.
3. Group by `project_pool_id` (null keys = independent groups).
4. Drop groups whose pool row has `cooldown_until > now()` or whose declared window is exhausted (`request_count >= rpm_limit` for current minute, etc.). Null limits = not exhausted.
5. **Pick a group:** weighted least-load.
   - Load score = `0.5 * (minute_requests / rpm_limit_or_inf) + 0.5 * (minute_tokens / tpm_limit_or_inf)`.
   - If both limits null, score = `minute_requests` (raw) so traffic spreads across unused pools.
   - Ties: prefer the group whose selected key has oldest `last_used_at`.
6. **Pick a key inside the group:** existing round-robin on `last_used_at`, tie-break `last_error_at`, `failure_count`, `created_at` (same as today). CAS reserve `last_used_at`.
7. If CAS loses, try the next key in the group, then the next group.

`max concurrent` per pool is **not** a separate column in v1 (proxy-key `max_concurrent` is spec 4). Do not invent pool inflight without a requirement.

### Cooldown propagation (spec 3 classes)

When `recordApiKeyFailure` runs:

| Key class        | Pool effect                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `key_invalid`    | No pool cooldown (other keys in the project may still work)                  |
| `key_permission` | Cooldown **pool** 15m (API disabled / billing is project-scoped)             |
| `rate_limit`     | Cooldown **pool** using the same Retry-After / 60s default                   |
| `spend_limit`    | Cooldown **pool** 1h                                                         |
| `transient`      | Key cooldown only (do not punish the whole project for a 502 on one replica) |

Increment pool `consecutive_failures` on pool cooldowns; reset on any success from a key in that pool.

Admit against `project_pool_quota_windows` in the same scheduler call (best-effort increment). If RPM would exceed, skip the pool. This is **declared** quota, not Google's real counter. Operators copy limits from AI Studio.

## Web UI

New Refine resource `google_project_pools`:

- Routes: `/project-pools`, `/project-pools/create`, `/project-pools/edit/:id`, `/project-pools/show/:id`.
- Sider: icon `CloudServerOutlined` (or `ClusterOutlined`), label i18n `project_pools.titles.list`.
- Fields: name, google_project_id, tier, rpm/tpm/rpd, read-only cooldown.
- API key create/edit: optional `Select` of pools for the current user (`useList` `google_project_pools`). Import review table gets a pool column (optional, default empty).

Follow `proxy-api-keys` page structure (Create + `useForm` + side Steps). **No new `useEffect` for form hydration.**

Dashboard `key-health-panel`: group keys by pool name; badge when `cooldown_until > now()`.

## Config

`PROXY_LOADBALANCE_STRATEGY` still `round_robin` | `sticky_until_error`. Round-robin now means "least-load across pools, then RR across keys." Do not add a third env value.

## Tests

- Two keys, same `project_pool_id`, pool `rpm_limit = 1`: second reserve in the same minute returns null / `InvalidKeyError` even though a second key exists.
- Two keys, **different** pools, pool limits null: both reservable; first pool used then second (least-load).
- Null `project_pool_id` keys do not share quota.
- 429 on key A cools the pool; key B in the same pool is not selected; key C in another pool is.
- 401 on key A does not cool the pool; key B in the same pool is selected.
- Sticky preferKeyId skipped when pool is in cooldown.

## Success criteria

- README/docs state quota is per Google project and keys must be grouped.
- Operators can create a pool and attach keys without SQL.

## Out of scope

- Auto-detect Google project id from the key.
- Calling Google's quota API.
- Weight sliders per pool (equal weight; load score is enough).
