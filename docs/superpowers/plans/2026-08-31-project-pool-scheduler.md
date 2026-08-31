# Google project pools and quota-aware scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group Gemini keys by Google project. Schedule pool-first then key. Propagate 429/spend/permission cooldowns to the pool, not 401.

**Architecture:** `google_project_pools` + `api_keys.project_pool_id`. `ProjectPoolScheduler.reserveNext` replaces the inner loop of `ApiKeyService.reserveNextApiKey`. Null pool = singleton group.

**Tech Stack:** Supabase, Vitest, Refine resource, Ant Design.

## Global Constraints

- Depends on spec 3 cooldown columns.
- Quota is declared by the operator, not scraped from Google.
- `PROXY_LOADBALANCE_STRATEGY` values unchanged (`round_robin` means least-load pools).
- No auto-detect of Google project id.
- Spec: [project pools](../specs/2026-08-31-project-pool-scheduler-design.md).

## File map

| File                                                                  | Responsibility        |
| --------------------------------------------------------------------- | --------------------- |
| `packages/core/src/scheduler/project-pool-scheduler.ts`               | group, score, reserve |
| `packages/core/src/scheduler/project-pool-scheduler.test.ts`          | least-load / pin      |
| `packages/core/src/retry/record-key-outcome.ts`                       | also cooldown pool    |
| `supabase/migrations/<ts>_google_project_pools.sql`                   | tables                |
| `apps/web/src/app/(protected)/project-pools/**`                       | CRUD pages            |
| `apps/web/src/providers/refine-provider/index.tsx`                    | resource              |
| `apps/web/src/app/(protected)/api-keys/edit/[id]/page.tsx`            | pool select           |
| `apps/web/src/features/observability/components/key-health-panel.tsx` | cooldown by pool      |

---

### Task 1: Scheduler unit tests + implementation

Feed the scheduler **in-memory candidates** (do not hit supabase in unit tests). Extract `selectPoolAndKey(candidates, windows, now, excludeKeyIds)` as a pure function; `reserveNext` wraps it with fetch + CAS.

```ts
export interface SchedulerCandidate {
  readonly id: string;
  readonly projectPoolId: string | null;
  readonly lastUsedAt: string | null;
  readonly lastErrorAt: string | null;
  readonly failureCount: number;
  readonly createdAt: string | null;
  readonly cooldownUntil: string | null;
  readonly isActive: boolean;
}

export interface PoolWindowState {
  readonly poolId: string;
  readonly cooldownUntil: string | null;
  readonly rpmLimit: number | null;
  readonly tpmLimit: number | null;
  readonly minuteRequests: number;
  readonly minuteTokens: number;
}

export function selectPoolAndKey(input: {
  readonly candidates: SchedulerCandidate[];
  readonly pools: PoolWindowState[];
  readonly nowMs: number;
  readonly excludeKeyIds: string[];
  readonly preferKeyId: string | null;
  readonly requiredPoolId: string | null;
  readonly requiredKeyId: string | null;
}): { keyId: string; poolId: string | null } | null;
```

- [ ] **Step 1: Failing tests**
  - two keys same pool `rpmLimit=1` `minuteRequests=1` → null
  - two keys different pools, equal empty windows → first by oldest `lastUsedAt` then the other on second call with exclude
  - null pool ids do not share rpm
  - `requiredPoolId` ignores other pools
  - sticky `preferKeyId` skipped when pool cooldown in the future
  - load score prefers the pool with lower `minuteRequests/rpmLimit`

- [ ] **Step 2: Implement pure selector + `reserveNext` CAS loop calling existing `tryReserve` pattern** (move CAS helpers if needed, do not duplicate poorly).

- [ ] **Step 3: `ApiKeyService.reserveNextApiKey` delegates to scheduler**

- [ ] **Step 4: Commit** `feat(core): schedule Gemini keys by Google project pool`

---

### Task 2: Migration + pool cooldown on classified failures

- [ ] **Step 1: SQL** as spec. RLS. `updated_at` trigger. `api_keys.project_pool_id` FK `ON DELETE SET NULL`.

- [ ] **Step 2: `recordApiKeyFailure`** also updates pool for `rate_limit` | `spend_limit` | `key_permission`. Not for `key_invalid` or `transient`.

Contract test: 429 on key A → key B same pool not fetched; key C other pool fetched.

- [ ] **Step 3: Mirror schema.sql + types**

- [ ] **Step 4: Commit** `feat(db): add google_project_pools and key pool cooldown`

---

### Task 3: Web resource

Pages modeled on `proxy-api-keys` (Create with Steps sidebar, list, edit, show). Resource name `google_project_pools`. Routes `/project-pools`. Sider icon `ClusterOutlined`.

API key edit: `Select` of pools (`useList` resource `google_project_pools`). Create/import: optional pool on review table if cheap; otherwise edit-only attach is enough **if** create form also has the Select for manual tab. Add Select on manual create values so new keys can join a pool.

Help `Alert`: quota is per Google project; keys in the same AI Studio project must share a pool.

i18n en/vi. No `useEffect` hydration.

Dashboard: badge when pool or key `cooldown_until > now`.

- [ ] **Step 1: Implement pages + Refine resource + locales**

- [ ] **Step 2: locale parity + web tests still pass**

- [ ] **Step 3: Commit** `feat(web): manage Google project pools and attach API keys`

---

## Spec coverage

Implicit singleton, least-load, sticky + pool cooldown, 401 vs 429 propagation, UI CRUD, dashboard badge. Weights sliders omitted.
