# Model Combo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tenant-owned model combos: resolve a requested model name to an ordered member list, retry every eligible `(api_key, member)` pair model-major, inject combos into `GET /v1/models`, and manage them in Refine UI with a shared model picker.

**Architecture:** Pure functions in `packages/core/src/combo/*` plan attempts, rewrite upstream requests, and merge model lists. `ProxyService` iterates the plan without growing path math. Schema is dedicated tables + `save_model_combo` RPC. Dashboard is a Refine `model_combos` resource, Settings Routing tab, and one `ModelPicker`.

**Tech Stack:** TypeScript, Hono, Vitest, Supabase (RLS + RPC), Refine v5 + Ant Design 5, next-intl.

## Global Constraints

- Spec: [model combo](../specs/2026-09-01-model-combo-design.md). Master architecture wins on infrastructure (no Redis, no `x-gproxy-*`, no env combo strategy).
- Combo requests ignore `PROXY_MAX_RETRIES` and the 50-key cap. Non-combo keeps spec 3.
- `client_invalid` (400/404) skips the **member**, not the whole combo request, even though `classifyUpstreamError` sets `retryable: false`.
- Cooldown canonical model is the **member** id, never the combo alias.
- Allowlist matches the **requested** name only.
- English in code. Locale keys in `apps/web/public/locales/en/common.json` and `vi/common.json`.
- One export per new file. No `useEffect` form hydration. Handlers start with `handle`. TDD. Conventional Commits.
- Do not grow `proxy.service.ts` with path/model-list math.

## File map

| File                                                       | Responsibility                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/core/src/combo/combo-types.ts`                   | Shared combo types (`ComboStrategy`, `ResolvedCombo`, `ComboAttempt`) |
| `packages/core/src/combo/effective-combo-strategy.ts`      | Inherit global; `stick_n` without N → `fallback`                      |
| `packages/core/src/combo/resolve-combo.ts`                 | Exact active-name match vs single-model                               |
| `packages/core/src/combo/plan-combo-attempts.ts`           | Model-major ring schedule                                             |
| `packages/core/src/combo/rewrite-upstream-model.ts`        | Gemini path + OpenAI body rewrite                                     |
| `packages/core/src/combo/merge-model-list.ts`              | Catalog merge + HTTP list inject + allowlist                          |
| `packages/core/src/combo/validate-combo-save.ts`           | Name/member rules mirrored by SQL                                     |
| `packages/core/src/combo/select-start-key.ts`              | startKey from strategy + stick state                                  |
| `packages/core/src/combo/skip-plan-member.ts`              | Drop remaining pairs for a skipped member                             |
| `packages/core/src/combo/combo-catalog.ts`                 | Load combos / settings / stick; upsert stick                          |
| `packages/core/src/combo/sync-google-model-catalog.ts`     | Fetch `models.list`, upsert `user_model_catalog`                      |
| `packages/core/src/combo/inject-models-list-response.ts`   | Parse origin list JSON, merge, re-serialize                           |
| `supabase/migrations/20260901120000_model_combos.sql`      | Tables, RLS, `save_model_combo`                                       |
| `packages/database/sql/schema.sql`                         | Mirror                                                                |
| `packages/database/types/database.types.ts`                | Generated-style types                                                 |
| `packages/core/src/services/proxy.service.ts`              | Orchestrate combo plan                                                |
| `packages/core/src/middlewares/proxy-policy.middleware.ts` | Admit cost uses first member with pricing                             |
| `packages/core/src/services/background.service.ts`         | `requested_model` / `combo_*` on usage JSON                           |
| `packages/core/test/proxy-contract/harness.ts`             | Seed combos, catalog, settings, stick                                 |
| `packages/core/test/proxy-contract/combo.test.ts`          | Contract                                                              |
| `apps/web/src/app/api/model-catalog/sync/route.ts`         | Session-authed sync                                                   |
| `apps/web/src/features/models/*`                           | Catalog merge hook + `ModelPicker`                                    |
| `apps/web/src/features/combos/*`                           | List/form                                                             |
| `apps/web/src/features/settings/routing-settings-form.tsx` | Global strategy                                                       |
| `apps/web/src/providers/refine-provider/index.tsx`         | Resource                                                              |
| `apps/web/src/app/(protected)/combos/**`                   | Pages                                                                 |
| Locales `en`/`vi` `common.json`                            | Copy                                                                  |

---

### Task 1: Strategy inherit + resolveCombo

**Files:**

- Create: `packages/core/src/combo/combo-types.ts`
- Create: `packages/core/src/combo/effective-combo-strategy.ts`
- Create: `packages/core/src/combo/effective-combo-strategy.test.ts`
- Create: `packages/core/src/combo/resolve-combo.ts`
- Create: `packages/core/src/combo/resolve-combo.test.ts`
- Modify: `packages/core/src/index.ts` (export the public combo helpers used by web)

**Interfaces:**

- Produces: `ComboStrategy`, `ResolvedCombo`, `effectiveComboStrategy`, `resolveCombo`

- [ ] **Step 1: Write failing tests**

```ts
// effective-combo-strategy.test.ts
import { describe, expect, it } from "vitest";
import { effectiveComboStrategy } from "./effective-combo-strategy";

describe("effectiveComboStrategy", () => {
  it("uses combo override when set", () => {
    const actual = effectiveComboStrategy({
      globalStrategy: "fallback",
      globalStickAfterSuccesses: 3,
      comboStrategy: "sticky_until_error",
      comboStickAfterSuccesses: null,
    });
    expect(actual).toEqual({ strategy: "sticky_until_error", stickAfterSuccesses: null });
  });

  it("inherits global when combo strategy is null", () => {
    const actual = effectiveComboStrategy({
      globalStrategy: "sticky_until_error",
      globalStickAfterSuccesses: null,
      comboStrategy: null,
      comboStickAfterSuccesses: null,
    });
    expect(actual).toEqual({ strategy: "sticky_until_error", stickAfterSuccesses: null });
  });

  it("treats stick_n without N as fallback", () => {
    const actual = effectiveComboStrategy({
      globalStrategy: "stick_n",
      globalStickAfterSuccesses: null,
      comboStrategy: null,
      comboStickAfterSuccesses: null,
    });
    expect(actual).toEqual({ strategy: "fallback", stickAfterSuccesses: null });
  });

  it("keeps stick_n when combo supplies N while global lacks it", () => {
    const actual = effectiveComboStrategy({
      globalStrategy: "fallback",
      globalStickAfterSuccesses: null,
      comboStrategy: "stick_n",
      comboStickAfterSuccesses: 4,
    });
    expect(actual).toEqual({ strategy: "stick_n", stickAfterSuccesses: 4 });
  });
});
```

```ts
// resolve-combo.test.ts
import { describe, expect, it } from "vitest";
import { resolveCombo } from "./resolve-combo";
import type { StoredCombo } from "./combo-types";

const flash: StoredCombo = {
  id: "c1",
  name: "flash-combo",
  isActive: true,
  strategy: null,
  stickAfterSuccesses: null,
  members: ["gemini-3.7-flash", "gemini-3.5-flash"],
};

describe("resolveCombo", () => {
  it("returns combo members on exact active name match", () => {
    const actual = resolveCombo({
      combos: [flash],
      requestedModel: "flash-combo",
    });
    expect(actual).toEqual({
      kind: "combo",
      combo: flash,
      members: ["gemini-3.7-flash", "gemini-3.5-flash"],
    });
  });

  it("combo wins when name equals a Google model id", () => {
    const override: StoredCombo = {
      ...flash,
      name: "gemini-3.7-flash",
      members: ["gemini-3.5-flash-lite"],
    };
    const actual = resolveCombo({
      combos: [override],
      requestedModel: "gemini-3.7-flash",
    });
    expect(actual.kind).toBe("combo");
    expect(actual.members).toEqual(["gemini-3.5-flash-lite"]);
  });

  it("treats inactive combo as miss", () => {
    const actual = resolveCombo({
      combos: [{ ...flash, isActive: false }],
      requestedModel: "flash-combo",
    });
    expect(actual).toEqual({ kind: "single", members: ["flash-combo"] });
  });

  it("normalizes models/ prefix and case before match", () => {
    const actual = resolveCombo({
      combos: [flash],
      requestedModel: "models/Flash-Combo",
    });
    expect(actual.kind).toBe("combo");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gemini-proxy/core exec vitest run src/combo/effective-combo-strategy.test.ts src/combo/resolve-combo.test.ts`

Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

```ts
// combo-types.ts
export const COMBO_STRATEGIES = ["fallback", "sticky_until_error", "stick_n"] as const;
export type ComboStrategy = (typeof COMBO_STRATEGIES)[number];

export type StoredCombo = {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly strategy: ComboStrategy | null;
  readonly stickAfterSuccesses: number | null;
  readonly members: readonly string[];
};

export type ResolvedCombo =
  | { readonly kind: "combo"; readonly combo: StoredCombo; readonly members: readonly string[] }
  | { readonly kind: "single"; readonly members: readonly string[] };

export type EffectiveComboStrategy = {
  readonly strategy: ComboStrategy;
  readonly stickAfterSuccesses: number | null;
};

export type ComboAttempt = {
  readonly apiKeyId: string;
  readonly canonicalModel: string;
};
```

`effectiveComboStrategy`: pick combo strategy if non-null else global; if result is `stick_n` and stick count is null, return `{ strategy: 'fallback', stickAfterSuccesses: null }`; otherwise return strategy + inherited-or-override N (`comboStickAfterSuccesses ?? globalStickAfterSuccesses` when strategy is `stick_n`).

`resolveCombo`: `normalizeGeminiModelId(requestedModel)` and compare to `combo.name` (already stored normalized). First active exact match wins.

- [ ] **Step 4: Run tests — pass**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/combo packages/core/src/index.ts
git commit -m "feat(core): resolve combo names and inherit strategy"
```

---

### Task 2: planComboAttempts + skipPlanMember

**Files:**

- Create: `packages/core/src/combo/plan-combo-attempts.ts`
- Create: `packages/core/src/combo/plan-combo-attempts.test.ts`
- Create: `packages/core/src/combo/skip-plan-member.ts`
- Create: `packages/core/src/combo/skip-plan-member.test.ts`

**Interfaces:**

- Consumes: `ComboAttempt`
- Produces: `planComboAttempts`, `skipPlanMember`

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { planComboAttempts } from "./plan-combo-attempts";

const keys = ["A", "B", "C"] as const;
const members = ["m0", "m1", "m2", "m3"] as const;

describe("planComboAttempts", () => {
  it("walks model-major for 3x4 all eligible starting at A", () => {
    const actual = planComboAttempts({
      keys: [...keys],
      members: [...members],
      isPairIneligible: () => false,
    });
    expect(actual.map((p) => `${p.apiKeyId}+${p.canonicalModel}`)).toEqual([
      "A+m0",
      "B+m0",
      "C+m0",
      "A+m1",
      "B+m1",
      "C+m1",
      "A+m2",
      "B+m2",
      "C+m2",
      "A+m3",
      "B+m3",
      "C+m3",
    ]);
  });

  it("covers all 8 pairs for 2 keys x 4 members", () => {
    const actual = planComboAttempts({
      keys: ["A", "B"],
      members: ["m0", "m1", "m2", "m3"],
      isPairIneligible: () => false,
    });
    const ids = actual.map((p) => `${p.apiKeyId}+${p.canonicalModel}`);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toHaveLength(8);
  });

  it("skips an ineligible pair and continues the ring", () => {
    const cooled = new Set(["B+m0"]);
    const actual = planComboAttempts({
      keys: ["A", "B", "C"],
      members: ["m0", "m1"],
      isPairIneligible: (keyId, model) => cooled.has(`${keyId}+${model}`),
    });
    expect(actual.map((p) => `${p.apiKeyId}+${p.canonicalModel}`)).toEqual([
      "A+m0",
      "C+m0",
      "A+m1",
      "B+m1",
      "C+m1",
    ]);
  });

  it("does not stall when every key is ineligible for a member", () => {
    const actual = planComboAttempts({
      keys: ["A", "B"],
      members: ["m0", "m1"],
      isPairIneligible: (_key, model) => model === "m0",
    });
    expect(actual.map((p) => `${p.apiKeyId}+${p.canonicalModel}`)).toEqual(["A+m1", "B+m1"]);
  });

  it("after a partial wave does not immediately reuse the last yielded key", () => {
    const actual = planComboAttempts({
      keys: ["A", "B", "C"],
      members: ["m0", "m1"],
      isPairIneligible: (key, model) => model === "m0" && key !== "A",
    });
    expect(actual.map((p) => `${p.apiKeyId}+${p.canonicalModel}`)).toEqual([
      "A+m0",
      "B+m1",
      "C+m1",
      "A+m1",
    ]);
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { skipPlanMember } from "./skip-plan-member";

describe("skipPlanMember", () => {
  it("drops remaining pairs for the skipped member and keeps later members", () => {
    const plan = [
      { apiKeyId: "A", canonicalModel: "m0" },
      { apiKeyId: "B", canonicalModel: "m0" },
      { apiKeyId: "A", canonicalModel: "m1" },
    ];
    const actual = skipPlanMember({
      remaining: plan.slice(1),
      skippedModel: "m0",
    });
    expect(actual).toEqual([{ apiKeyId: "A", canonicalModel: "m1" }]);
  });
});
```

- [ ] **Step 2: Run — fail**

`pnpm --filter @gemini-proxy/core exec vitest run src/combo/plan-combo-attempts.test.ts src/combo/skip-plan-member.test.ts`

- [ ] **Step 3: Implement** exactly the spec algorithm (`cursor` / `waveStart` / skip ineligible). `keys[0]` is startKey. `skipPlanMember` filters `canonicalModel === skippedModel`.

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit** `feat(core): plan combo attempts model-major with key ring`

---

### Task 3: rewriteUpstreamModel

**Files:**

- Create: `packages/core/src/combo/rewrite-upstream-model.ts`
- Create: `packages/core/src/combo/rewrite-upstream-model.test.ts`

**Interfaces:**

- Produces: `rewriteUpstreamModel({ request, urlToProxy, apiFormat, fromModel, toModel }) => { request, urlToProxy }`

- [ ] **Step 1: Failing tests**

Gemini: `urlToProxy` `https://origin.test/v1beta/models/flash-combo:generateContent` + request URL same path → `gemini-3.7-flash`. Query string preserved. `from === to` returns same objects (no clone required if identical; still return `{ request, urlToProxy }`).

OpenAI: body `{ model: 'flash-combo', stream: true, messages: [1] }` → `model` replaced, `stream` and `messages` identical. `content-type` stays `application/json`.

- [ ] **Step 2: Fail** `vitest run src/combo/rewrite-upstream-model.test.ts`

- [ ] **Step 3: Implement** Replace `/models/{from}` in URL pathname (from/to already normalized, also try raw). OpenAI: `JSON.parse` body, set `model`, new `Request` with same method/headers/signal.

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit** `feat(core): rewrite Gemini path and OpenAI body for combo members`

---

### Task 4: mergeModelList

**Files:**

- Create: `packages/core/src/combo/merge-model-list.ts`
- Create: `packages/core/src/combo/merge-model-list.test.ts`

**Interfaces:**

- Consumes: `globModel` from `policy/match-model-policy.ts`, `normalizeGeminiModelId`
- Produces: `mergeModelList`, `MergedModelEntry`

```ts
export type MergedModelEntry = {
  readonly id: string;
  readonly source: "combo" | "catalog" | "builtin" | "google";
  readonly overrides: boolean;
  readonly description: string | null;
  readonly members: readonly string[] | null;
};
```

- [ ] **Step 1: Tests**
  - Combo `flash-combo` + google `gemini-3.7-flash` → both ids present; combo first-or-replaced by id.
  - Combo named `gemini-3.7-flash` + google same id → **one** row, `source: 'combo'`, `overrides: true`, `description: 'Combo: gemini-3.5-flash-lite'`.
  - `allowedModels: ['flash-combo']` drops google ids, keeps combo.
  - Empty/null allowlist keeps all.
  - `globModel('flash-*', 'flash-combo')` keeps combo.

- [ ] **Step 2–5:** Implement merge order: combo (active) overwrites map, then catalog ids not in map, then builtin, then leftover google. Filter allowlist on normalized id. Commit `feat(core): merge combo catalog into model lists`

---

### Task 5: validateComboSave + startKey

**Files:**

- Create: `packages/core/src/combo/validate-combo-save.ts`
- Create: `packages/core/src/combo/validate-combo-save.test.ts`
- Create: `packages/core/src/combo/select-start-key.ts`
- Create: `packages/core/src/combo/select-start-key.test.ts`

**Interfaces:**

- Produces: `validateComboSave`, `selectStartKey`

- [ ] **Step 1: Tests for validateComboSave**
  - `'Flash-Combo'` → name `flash-combo`
  - `'models/Foo'` → `foo`
  - empty members → `{ ok: false, error: 'members_required' }`
  - duplicate members after normalize → `{ ok: false, error: 'duplicate_member' }`
  - member equals combo name → `{ ok: false, error: 'member_is_combo_name' }`
  - member equals a **different** combo name string that is a google id → `{ ok: true }` (literal)
  - invalid name `'bad name'` / `''` → `{ ok: false, error: 'invalid_name' }`

- [ ] **Step 1b: Tests for selectStartKey**
  - `fallback`: order by `lastUsedAt` ascending nulls first, then id; return that array (ring).
  - `sticky_until_error`: sticky id first if in list, rest RR.
  - `stick_n` with `consecutiveSuccesses >= N`: sticky id **not** first; next eligible after it is first (rotate remaining as RR).
  - sticky id missing from eligible → same as fallback.

```ts
export function selectStartKey(input: {
  readonly strategy: ComboStrategy;
  readonly stickAfterSuccesses: number | null;
  readonly consecutiveSuccesses: number;
  readonly lastApiKeyId: string | null;
  readonly keys: ReadonlyArray<{ id: string; lastUsedAt: string | null }>;
}): string[]; // ids, index 0 = startKey
```

- [ ] **Step 2–5:** Implement + commit `feat(core): validate combo save and select start key`

---

### Task 6: Migration, schema mirror, types

**Files:**

- Create: `supabase/migrations/20260901120000_model_combos.sql`
- Modify: `packages/database/sql/schema.sql`
- Modify: `packages/database/types/database.types.ts`

No Vitest for SQL. Mirror every column/constraint from the spec. `save_model_combo` must:

```sql
CREATE OR REPLACE FUNCTION save_model_combo(
  p_id UUID,
  p_name TEXT,
  p_strategy TEXT,
  p_stick_after_successes INTEGER,
  p_is_active BOOLEAN,
  p_members TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- auth.uid() required; insert/update only where user_id = auth.uid()
-- lower(btrim) name, strip models/ prefix like normalizeGeminiModelId
-- reject if cardinality(p_members)=0
-- reject duplicate members
-- reject member = name
-- delete members then insert positions 0..n-1
$$;
REVOKE ALL ON FUNCTION save_model_combo FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_model_combo TO authenticated, service_role;
```

RLS policies: `user_id = auth.uid() OR auth.role() = 'service_role'` on `model_combos` and `user_model_catalog`. Members: combo owned by uid. Stick state: proxy_key owned by uid.

Add Functions types in `database.types.ts` for `save_model_combo`. Add table types for all four tables + `user_settings` columns.

Also add `updated_at` triggers using existing `update_updated_at_column()`.

- [ ] **Step 1:** Write migration + schema.sql + types (no production TS besides types).
- [ ] **Step 2:** Commit `feat(db): add model combo tables and save_model_combo rpc`

---

### Task 7: Combo catalog IO + harness seed

**Files:**

- Create: `packages/core/src/combo/combo-catalog.ts`
- Create: `packages/core/src/combo/combo-catalog.test.ts` (mock supabase client: table `from` returns seeded rows)
- Modify: `packages/core/test/proxy-contract/harness.ts`

**Interfaces:**

- Produces: `loadUserCombos(supabase, userId)`, `loadComboDefaults(supabase, userId)`, `loadComboStickState(supabase, proxyKeyId, comboId)`, `upsertComboStickState(...)`

Keep `combo-catalog.ts` as the only file that queries combo tables (one export? spec says one export per file — split if needed):

- `load-user-combos.ts`
- `load-combo-defaults.ts`
- `load-combo-stick-state.ts`
- `upsert-combo-stick-state.ts`

One export each. Tests can live next to `load-user-combos.test.ts` covering the join: `model_combos` + `model_combo_members` ordered by position, inactive included (resolve filters).

Harness: add `seedCombos`, `seedUserSettings`, `seedStickState` to `InvokeCoreOptions`. `from('model_combos')` / members / settings / stick_state in the mock `from()` switch.

- [ ] Commit `feat(core): load combo catalog and stick state from supabase`

---

### Task 8: ProxyService combo loop + contract tests

**Files:**

- Modify: `packages/core/src/services/proxy.service.ts`
- Modify: `packages/core/src/middlewares/proxy-policy.middleware.ts` (estimate USD from first member with pricing when combo resolves — may load combos here **or** resolve after extract; cheaper: resolve in middleware after a small loader, set `c.set('resolvedCombo')`)
- Modify: `packages/core/src/types/index.ts` add `resolvedCombo?: ResolvedCombo` on Variables
- Modify: `packages/core/src/services/background.service.ts` / response-handler usage_metadata
- Create: `packages/core/test/proxy-contract/combo.test.ts`
- Modify: harness `from()` + `originResponses` already supports per-request functions

**Combo loop (do not use `usedApiKeyIds` to ban a key for later members):**

1. Load combos + defaults. `resolveCombo`.
2. If `kind === 'single'`, existing key-only retry (cap 50, `PROXY_MAX_RETRIES`).
3. If combo: `selectStartKey` → `planComboAttempts` with ineligible = used pair **or** cooldown for that member **or** inactive key.
4. For each attempt in plan (iterate; on 400 call `skipPlanMember` on the **rest**).
5. `rewriteUpstreamModel` from requested name to member before `performAttempt`.
6. `recordApiKeyFailure` / success with **member** as canonical model.
7. Ignore `retryBudget` / cap 50.

Policy middleware: if combos loaded, resolve; `estimateGeminiCostUsd({ model: firstMemberWithPricing ?? requested })`. `p_model` stays `requestData.model` (requested name).

Background finalize: add to usage JSON `requested_model`, `combo_id`, `combo_name`. Retry attempts already stored — ensure `canonical_model` is on each attempt object when pushing.

- [ ] **Step 1: Contract tests (fail first)**

```ts
// combo.test.ts — use extraApiKeys, originResponses sequence
it('falls through to member[1] after 429 on every key for member[0]', ...)
it('on 400 for member[0] does not try the second key on member[0]', ...)
it('allowlist flash-combo denies direct gemini-3.7-flash', ...)
it('non-combo still respects PROXY_MAX_RETRIES=0', ...)
it('writes requested_model on finalize usage', ...)
```

Origin URL pathname must contain the **member** id.

For allowlist: `proxyKey: { allowed_models: ['flash-combo'] }` in invoke options (harness already passes proxy key row).

- [ ] **Step 2:** Run `vitest run test/proxy-contract/combo.test.ts` — fail.
- [ ] **Step 3:** Implement loop.
- [ ] **Step 4:** Pass combo tests **and** `test/proxy-contract/` (non-combo unchanged).
- [ ] **Step 5:** Commit `feat(core): retry combo members with key rotation`

---

### Task 9: GET /v1/models inject

**Files:**

- Create: `packages/core/src/combo/inject-models-list-response.ts`
- Create: `packages/core/src/combo/inject-models-list-response.test.ts`
- Modify: `packages/core/src/services/proxy.service.ts` (after successful origin GET list, if path is models list)
- Modify: `packages/core/test/proxy-contract/v1-routing.test.ts` or `combo.test.ts`

Detect list: Gemini GET whose remainder is `models` / `v1beta/models` without `:`; OpenAI GET `models` or `models/`.

`injectModelsListResponse({ apiFormat, originBodyText, combos, catalog, builtinIds, allowedModels })`.

OpenAI origin `{ data: [{ id: 'gemini-3.7-flash' }] }` + combo `flash-combo` → data includes `{ id: 'flash-combo', object: 'model', owned_by: 'gproxy-combo', description: 'Combo: …' }`.

Gemini origin `{ models: [{ name: 'models/gemini-3.7-flash' }] }` + combo named `gemini-3.7-flash` → only combo `name: 'models/gemini-3.7-flash'`.

Existing GET `/v1/models` contract still 200 and still hits origin (inject after).

- [ ] Commit `feat(core): inject combos into GET /v1/models`

---

### Task 10: Google catalog sync

**Files:**

- Create: `packages/core/src/combo/parse-google-models-list.ts` (+ test)
- Create: `packages/core/src/combo/sync-google-model-catalog.ts` (+ test with mock fetch + mock supabase)
- Create: `apps/web/src/app/api/model-catalog/sync/route.ts`

Parse: `{ models: [{ name, displayName, supportedGenerationMethods }] }` → rows with `normalizeGeminiModelId`, `supports_generate` if methods include `generateContent` OR id starts with `gemini-`/`gemma-`.

Sync: pick first eligible key (`reserveNextApiKey` or simple select active), GET `${geminiBase}v1beta/models`, replace `google_live` rows for user, keep `custom`. Return `{ ok: true, count }`. Failure `{ ok: false }`.

Next route: `createClient` from `apps/web/src/utils/supabase/server.ts`, `getUser()`, 401 if missing; then `syncGoogleModelCatalog` with service-role client already used by proxy… **Do not put service role in the browser.** Server route uses `supabaseServiceRole` if the web app has it (same env as gproxy). If the dashboard cannot reach Gemini keys, return 502 `catalog_sync_failed`.

- [ ] Commit `feat(web): sync Google model catalog on demand`

---

### Task 11: ModelPicker + catalog merge (web)

**Files:**

- Create: `apps/web/src/features/models/merge-picker-catalog.ts`
- Create: `apps/web/src/features/models/merge-picker-catalog.test.ts`
- Create: `apps/web/src/features/models/use-model-catalog.ts`
- Create: `apps/web/src/features/models/model-picker.tsx`
- Create: `apps/web/src/features/models/fill-combo-preset.ts`
- Create: `apps/web/src/features/models/fill-combo-preset.test.ts`

`mergePickerCatalog` (pure, same collision rules as core merge; `mode: 'concrete' | 'requestName'`).

`fillComboPreset('flash' | 'pro' | 'gemma', availableIds)`:

- flash ids: `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`
- pro: builtin ids starting `gemini-` containing `pro` from `listBuiltinModelPricingRows` that exist in `availableIds` (keep builtin order)
- gemma: family gemma ids present in availableIds
- skip missing; return `{ name: 'flash-combo' | …, members }`

`ModelPicker`: Ant `Select` `showSearch`, grouped options, tags, footer Add/Sync. Tests for merge + preset only (no enzyme). Disabled ids omitted.

Replace proxy-key `Select mode=tags` with `ModelPicker` wrapper `mode="requestName"` still allowing custom glob tags.

Pricing model field: `ModelPicker mode="concrete"`.

- [ ] Commit `feat(web): add shared model picker and combo presets`

---

### Task 12: Combos CRUD, Routing tab, logs, i18n

**Files:**

- Create: `apps/web/src/features/combos/combo-form-fields.tsx`
- Create: `apps/web/src/app/(protected)/combos/page.tsx`
- Create: `apps/web/src/app/(protected)/combos/create/page.tsx`
- Create: `apps/web/src/app/(protected)/combos/edit/[id]/page.tsx`
- Create: `apps/web/src/features/settings/routing-settings-form.tsx`
- Modify: `apps/web/src/app/(protected)/settings/page.tsx` add tab `routing`
- Modify: `apps/web/src/providers/refine-provider/index.tsx`
- Modify: `apps/web/src/features/request-logs/components/request-log-table-columns.tsx`
- Modify: `apps/web/src/features/request-logs/request-log-table-filter-utils.ts` (+ test) OR filter: `{ operator: 'or', value: [model contains, requested_model contains] }`
- Modify: locales en/vi — keys from spec; **no** journey/powerful/seamless
- Modify: `apps/web/src/features/settings/types.ts` add combo fields
- Modify: `apps/web/src/features/proxy-api-keys/proxy-key-limits-fields.tsx`

List `useTable` resource `model_combos` `meta.select = '*, model_combo_members(*)'`. Form `useForm`; `onFinish` `supabase.rpc('save_model_combo', { p_id, p_name, p_strategy, p_stick_after_successes, p_is_active, p_members })` via browser client (`apps/web/src/utils/supabase/client.ts`). `initialValues` from query. `formKey` remount pattern from timezone form. Override `Alert` when name matches builtin/catalog id.

Logs model cell: if `usage.requested_model` and differs from `usage.model`, primary winning model, secondary muted requested.

- [ ] Run `pnpm -F web exec vitest run` for picker/preset/filter tests and `pnpm -F web lint` (locale parity).
- [ ] Commit `feat(web): combos resource, routing defaults, and log combo labels`

---

## Spec coverage

| Spec item                                                   | Task |
| ----------------------------------------------------------- | ---- |
| resolve + combo wins + inactive miss                        | 1    |
| strategy inherit / stick_n without N                        | 1    |
| model-major plan, 2×4 coverage, skip cooled, partial wave   | 2    |
| rewrite Gemini/OpenAI                                       | 3    |
| merge list + allowlist + override                           | 4    |
| save validation                                             | 5    |
| startKey sticky / stick_n                                   | 5    |
| tables + RPC + RLS                                          | 6    |
| load/upsert stick                                           | 7    |
| proxy loop, 400 skip member, 429 degrade, non-combo cap     | 8    |
| admit requested name; cost first member                     | 8    |
| logs requested_model                                        | 8    |
| GET /v1/models inject                                       | 9    |
| catalog sync button path                                    | 10   |
| ModelPicker + presets                                       | 11   |
| Combos UI, Routing tab, allowlist, pricing, logs cell, i18n | 12   |

## Notes for implementers

- `classifyUpstreamError` `retryable: false` on 400 is correct for **non-combo**. Combo loop branches on `failure.class === 'client_invalid'` **before** the existing `if (!retryable) return`.
- Do not wait in-request for cooldown.
- One export per new file.
- After Task 8, run the full `packages/core` vitest suite.
