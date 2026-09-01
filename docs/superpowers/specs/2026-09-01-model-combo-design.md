# Model combo — alias, fallback, and catalog

**Date:** 2026-09-01
**Status:** Draft (awaiting spec file review)
**Parent:** [master architecture](./2026-08-31-p0-p1-master-architecture-design.md) (do not reopen P0/P1 locks)
**Approach:** Dedicated tables. Combo is a tenant-owned ordered alias. Runtime is model-major key round-robin. Dashboard is Refine resources + one shared picker.

## Goal

A user defines named combos (`flash-combo`, or a name that collides with a Google id). The client sends that name as `model`. The gateway expands it to member model ids, tries every eligible `(api_key, member)` pair in combo order, and returns the first success. Availability beats attempt caps.

Operators never type model ids in combo, allowlist, or pricing forms except once, in "Add model".

## Locked decisions

1. Combo = ordered list of **concrete Google model ids**. No nesting. Members are never resolved as combos.
2. Traversal is **model-major**: exhaust eligible keys for `members[0]`, then `members[1]`, …. After the last yield of a wave, the next member starts at the next ring index. A full eligible wave wraps to `startKey`; a partial wave does not immediately reuse the last key.
3. One attempt per `(api_key_id, canonical_model)` per request. Same key is reused on a later member. No cap 50. Ignore `PROXY_MAX_RETRIES`. Stop on success, client abort, or exhausted eligible pairs. Skip hard-cooldown pairs immediately; do not sleep.
4. Cross-request: always start at `members[0]`. `startKey` follows combo strategy (not env).
5. Two-level settings in UI only. **No combo env vars.** `user_settings` holds defaults; each combo may override. Null override = inherit. Non-combo requests keep spec 3 (`PROXY_LOADBALANCE_STRATEGY`, cap 50, `PROXY_MAX_RETRIES`).
6. Strategies: `fallback` | `sticky_until_error` | `stick_n`. Strategy never reorders members.
7. Allowlist matches the **requested name** (combo alias or concrete id, trailing `*` glob unchanged). Listing a combo does not allow its members. Empty allowlist = all names.
8. `GET /v1/models` (OpenAI and Gemini list) injects active combos, then allowlist-filters. Combo name collision **replaces** the Google row. One entry.
9. HTTP 400 / model 404 on a member: skip that member for the rest of the request (do not try other keys on it). Then the next member. Exhaustion returns the last 400.
10. Catalog = builtin `GEMINI_PRICING` ∪ `user_model_catalog` (custom + cached `models.list`). Pricing stays `GEMINI_PRICING` ∪ `custom_model_pricing`.
11. Live Google list is **opt-in from the UI** (button). No write-on-read, no refresh on every Settings visit. Builtin + custom always work if every Gemini key is dead.
12. English in code/docs. Locale keys in `en` and `vi`.

## Non-goals

- CLI combo CRUD
- Nested combos
- Redis / extra microservice
- Re-admit when the member changes mid-request
- Changing spec 3 for non-combo traffic
- Multi-provider routing
- New npm drag-and-drop libraries

## Current code (do not fight it)

- Retry in `ProxyService` is **key-only**, `usedApiKeyIds`, cap via `calculateRetryAttempts`, 400 stops the request.
- Model id: Gemini path last segment before `:`, OpenAI `body.model`. Normalize with `normalizeGeminiModelId` (strip `models/`, lower).
- Cooldown already `(api_key_id, canonical_model)` — use the **member** id, never the combo name.
- `allowed_models` on `proxy_api_keys` is tags + trailing `*` (`globModel` / admit RPC).
- Builtin rows: `listBuiltinModelPricingRows()` from `@gemini-proxy/pricing`.
- `GET /v1/models` already prefixes Gemini list with `v1beta`. Combo merge happens after that fetch (or from catalog cache).
- Refine: `useTable` / `useForm` / `useList`. Master architecture: no `useEffect` copying query data into `form.setFieldsValue`. `initialValues` from the query. Event handlers start with `handle`. `translate('…')` only.
- Observability settings today uses `useEffect` hydration — **do not copy that**. Combo and routing forms follow spec 4 timezone form: query-derived `initialValues`.

## Architecture

Combo applies to **managed generate** (`generateContent`, `streamGenerateContent`, OpenAI chat/completions) and **GET models**. Other passthrough is unchanged (no rewrite, no combo retry).

```text
Client  model=flash-combo
  extractProxyData           requestedModel (normalized)
  resolveCombo(user, name)   hit → members[]  /  miss → [requestedModel]
  admit_proxy_request        p_model = requestedModel
  planComboAttempts          model-major + continuing key RR
  each attempt               rewrite path or body to member
                             cooldown / 401 / 429 / 5xx: next key, same member
                             400 / model 404: skip member, next member
  log + settle               requested_model = alias
                             model / cost = winning member
```

Pure units (one export per file, no `fetch`, do not grow `proxy.service.ts`):

| File (under `packages/core/src/`)   | Export                   |
| ----------------------------------- | ------------------------ |
| `combo/resolve-combo.ts`            | `resolveCombo`           |
| `combo/plan-combo-attempts.ts`      | `planComboAttempts`      |
| `combo/rewrite-upstream-model.ts`   | `rewriteUpstreamModel`   |
| `combo/merge-model-list.ts`         | `mergeModelList`         |
| `combo/effective-combo-strategy.ts` | `effectiveComboStrategy` |

`ProxyService` orchestrates only: load combo + keys, iterate the plan, record stick state, map classifier → skip-member vs skip-key.

## Data model

### `user_settings` (additive)

```sql
ALTER TABLE user_settings
  ADD COLUMN combo_strategy TEXT NOT NULL DEFAULT 'fallback'
    CHECK (combo_strategy IN ('fallback', 'sticky_until_error', 'stick_n')),
  ADD COLUMN combo_stick_after_successes INTEGER
    CHECK (combo_stick_after_successes IS NULL OR combo_stick_after_successes >= 1);
```

If effective strategy is `stick_n` and stick count is null, treat as `fallback`.

### `model_combos`

```sql
CREATE TABLE model_combos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy TEXT NULL
    CHECK (strategy IS NULL OR strategy IN ('fallback', 'sticky_until_error', 'stick_n')),
  stick_after_successes INTEGER NULL
    CHECK (stick_after_successes IS NULL OR stick_after_successes >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  CHECK (char_length(name) BETWEEN 1 AND 64),
  CHECK (name ~ '^[a-z0-9][a-z0-9._-]*$')
);
```

`name` is stored already normalized (`normalizeGeminiModelId`). Application + CHECK reject empty, slash, space.

### `model_combo_members`

```sql
CREATE TABLE model_combo_members (
  combo_id UUID NOT NULL REFERENCES model_combos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  canonical_model TEXT NOT NULL,
  PRIMARY KEY (combo_id, position),
  UNIQUE (combo_id, canonical_model),
  CHECK (char_length(canonical_model) BETWEEN 1 AND 255)
);
```

At least one member: enforce in `save_model_combo` (cannot CHECK easily). Duplicate member ids rejected by UNIQUE.

Members must not equal another combo name of the same user (RPC rejects). They may equal Google ids.

### `user_model_catalog`

```sql
CREATE TABLE user_model_catalog (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('custom', 'google_live')),
  display_name TEXT,
  supports_generate BOOLEAN NOT NULL DEFAULT true,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, model_id)
);
```

Not a pricing table. Custom row = user-added id. `google_live` rows replaced as a set on Sync. Custom ids that later appear on Google stay `custom` (do not delete).

### `model_combo_stick_state`

```sql
CREATE TABLE model_combo_stick_state (
  proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
  combo_id UUID NOT NULL REFERENCES model_combos(id) ON DELETE CASCADE,
  last_api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  consecutive_successes INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_successes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (proxy_key_id, combo_id)
);
```

### RLS

Every new table: `ENABLE ROW LEVEL SECURITY`. Policy: `user_id = auth.uid() OR auth.role() = 'service_role'` (members via combo ownership; stick_state via proxy_key ownership). `updated_at` trigger like `user_settings`.

### Authenticated RPC `save_model_combo`

One Save click, one round trip, atomic member replace.

- `GRANT EXECUTE TO authenticated, service_role`
- `SECURITY DEFINER` with `auth.uid()` must own the row
- Args: `p_id uuid null` (null = insert), `p_name`, `p_strategy`, `p_stick_after_successes`, `p_is_active`, `p_members text[]`
- Normalize name + each member. Reject empty members, duplicate members, or a member equal to **this** combo's name
- Do not reject a member that matches a _different_ combo's name: members are sent to Google as literal ids and are never resolved as combos
- Returns combo id

List reads `model_combos` with `select: '*, model_combo_members(*)'` (Refine `meta.select`). No list view required.

### Logs

No new `request_logs` columns. `usage_metadata` gains `requested_model`, `combo_id`, `combo_name` (null when not a combo). Each `retry_attempts[]` element gains `canonical_model`. Existing `usage_metadata.model` = member that won (or last tried).

## Catalog merge

Read path (picker, list inject), priority **high → low** on id collision:

1. Active combos (tag `Combo`; if id ∈ builtin or catalog, also tag `Overrides`)
2. `user_model_catalog`
3. Builtin `listBuiltinModelPricingRows()`

`mergeModelList` for HTTP list uses the same order: combo replaces Google/custom with the same id.

Picker **member** mode (`concrete`) omits combos so nesting is impossible.

### Sync Google models

Server-only (never the browser with a raw Gemini key):

- Next.js route `POST` `apps/web/src/app/api/model-catalog/sync/route.ts` (session cookie). Cloudflare/api adapters expose the same helper if the dashboard is on that host.
- Uses service role: pick one eligible Gemini key for `auth.uid()`, `GET {GOOGLE_GEMINI_API_BASE_URL}/v1beta/models`, upsert `source='google_live'` for that user (delete stale google_live ids not in the response; keep `custom`).
- `supports_generate = true` when `supportedGenerationMethods` contains `generateContent` **or** id starts with `gemini-` / `gemma-`.
- Failure: 502 JSON `{ error: 'catalog_sync_failed' }`; UI keeps previous rows + builtin. Do not disable combos.

No automatic sync on page load.

## Runtime

### Resolve

```ts
resolveCombo({ combos, requestedModel }) →
  { kind: 'combo', combo, members } | { kind: 'single', members: [requestedModel] }
```

Exact name match on active combo. Inactive combo = miss (falls through to Google id).

### Attempt plan

```ts
planComboAttempts({
  keys,          // eligible, already ordered for this request's startKey
  members,       // combo order
  isPairIneligible, // cooldown / disabled / used
}): Array<{ apiKeyId, canonicalModel }>
```

Algorithm (`keys[0]` is `startKey`; array is the RR ring):

```text
cursor = 0
for member of members:
  waveStart = cursor
  yielded = 0
  for step in 0..keys.length-1:
    k = keys[(waveStart + step) % keys.length]
    if isPairIneligible(k, member): continue
    yield { k, member }
    cursor = (waveStart + step + 1) % keys.length
    yielded += 1
  // yielded == 0 → cursor unchanged; next member retries the same ring position
```

Full wave of K eligible keys lands `cursor` on the key **after** the last yield. `C+3.7` then `A+3.1` when the ring is `[A,B,C]`. Consecutive attempts never reuse the same key when `K > 1` and the pair was eligible.

Example, keys `[A,B,C]`, members `[3.7, 3.1, 2.5, gemma]`, startKey `A`, all eligible:

```text
A+3.7  B+3.7  C+3.7
A+3.1  B+3.1  C+3.1
A+2.5  B+2.5  C+2.5
A+gemma B+gemma C+gemma
```

Request 2 `fallback`, startKey `B`, ring `[B,C,A]`:

```text
B+3.7  C+3.7  A+3.7
B+3.1  C+3.1  A+3.1
…
```

### startKey

`effectiveComboStrategy(global, combo)` then:

| Strategy             | startKey                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `fallback`           | least recent `last_used_at` (stable id tie-break), same as spec 3 `round_robin`            |
| `sticky_until_error` | `stick_state.last_api_key_id` if still eligible, else fallback                             |
| `stick_n`            | sticky; if `consecutive_successes >= N` then the next eligible key after `last_api_key_id` |

Always `members[0]` first.

On 200: upsert stick_state (`last_api_key_id = winner`, `consecutive_successes += 1` if same key else `1`). On `sticky_until_error` when this request had to leave the sticky key: set `last_api_key_id` to the winner (or null if none). On `stick_n` failure that never 200s: leave state (next request still sticky/rotate by count).

### Rewrite

`rewriteUpstreamModel({ request, urlToProxy, apiFormat, fromModel, toModel })`:

- Gemini: replace the model segment in the origin URL and in the request URL path (`models/{from}` → `models/{to}`, including `models/from:generateContent`). Do not rewrite if `from === to`.
- OpenAI: JSON `body.model` → `toModel`; preserve `stream` and other fields. Re-serialize.

Clone the base request each attempt (already done).

### Classifier (combo only)

| Class                                           | Action                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `client_invalid` (400, request/model 404)       | Mark member skipped. Continue plan at next **member**. Do not write cooldown. |
| `key_invalid` (401)                             | Disable key. Continue plan (later pairs with that key are ineligible).        |
| `key_permission` / `rate_limit` / `spend_limit` | Existing cooldown on **member** (or key-wide). Continue plan.                 |
| `transient`                                     | Soft penalty. Continue plan.                                                  |
| Success                                         | Return. Record success on `(key, member)`.                                    |

If the plan is empty at start (all pairs cooled): 429 + `Retry-After` shortest wait among members (min of per-member soonest), same as spec 3.

Last error after exhaustion: last classified error (not a synthetic combo error). JSON may include `gproxy_request_id` only (no `x-gproxy-*`).

### Admit / cost

`p_model = requestedModel` (allowlist A). Token/USD reservation uses **first member with resolvable pricing**, else spec 4 default. Do not call admit again when the member changes. Settle uses actual member usage/cost. Overage blocks the **next** request (spec 4).

### GET models

After origin list (or catalog if origin fails):

1. Map Google ids through `normalizeGeminiModelId`
2. `mergeModelList({ google, builtin, catalog, combos, allowedModels })`
3. OpenAI body: `{ data: [{ id, object: 'model', owned_by: combo ? 'gproxy-combo' : 'google', description }] }`. Combo `description` is `Combo: id1 → id2 → id3` (plain, no marketing).
4. Gemini body: `{ models: [{ name: 'models/' + id, displayName, description, supportedGenerationMethods: ['generateContent'] }] }` for injected combos. Google rows kept as returned except dropped ids replaced by a combo.

Allowlist applied to the **id** (Gemini: strip `models/`).

## UI / UX

Design bar: **one screen, one Save, query-derived state, no copy-into-form effects, no onboarding chrome.**

### Information architecture

| Place                                     | Job                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Sider **Combos**                          | CRUD. Resource `model_combos`. Routes `/combos`, `/combos/create`, `/combos/edit/:id` |
| Settings tab **Routing** (`?tab=routing`) | Global `combo_strategy` + `combo_stick_after_successes` only                          |
| Proxy key allowlist                       | Same `ModelPicker` `mode="requestName"` + glob                                        |
| Pricing                                   | Same picker `mode="concrete"` for override rows (replace free-typed ids)              |
| Request logs Model column                 | If `requested_model` set and ≠ `model`, show `alias → member`                         |

Sider icon: `ClusterOutlined`. `meta.label` via i18n (`combos.title`).

### Refine wiring

- List: `useTable` + `CreateButton` / `EditButton` / `DeleteButton`. `meta.select = '*, model_combo_members(*)'`. `liveMode: 'auto'`. `syncWithLocation`. Soft-delete is **not** used (hard delete combo + cascade members). Confirm delete with existing `Popconfirm` pattern, one sentence: members stop resolving; in-flight names 404 to Google.
- Create/Edit: Refine `Create` / `Edit` + `useForm`. `initialValues` from `queryResult` (edit) or `{ strategy: null, is_active: true, members: [] }` (create). `onFinish` → `supabase.rpc('save_model_combo')` then `redirect: 'list'`.
- Routing tab: `useForm` against `user_settings` like timezone. Default values in `initialValues` when no row. **No `useEffect`.**
- Catalog: `useList('user_model_catalog')` + builtin from `@gemini-proxy/pricing` in `useMemo`. Combos from `useList('model_combos')`. Merge in `useModelCatalog()` (pure function + hook). Sync: `useCustomMutation` → `POST /api/model-catalog/sync`. Button only.

Handlers: `handleSave`, `handleAddMember`, `handleMoveMember`, `handleRemoveMember`, `handleFillPreset`, `handleSyncCatalog`, `handleAddCustomModel`.

### Combos list

Columns, left → right:

| Column   | Content                                                                                     |
| -------- | ------------------------------------------------------------------------------------------- |
| Name     | `name` primary. If name ∈ catalog/builtin, `Tag` "Overrides". Inactive: `Tag` default "Off" |
| Members  | Ordered compact tags `1  gemini-3.7-flash` … wrap. Empty impossible if save RPC holds       |
| Strategy | If `strategy` null: muted `Default · {global}`. Else the strategy label                     |
| Actions  | Edit, Delete                                                                                |

No description column, no owner, no timestamps as primary. Search: name contains (`onSearch`). Empty: Ant `Empty` + `CreateButton`. Image/illustration: none.

### Combo form (create = edit)

Single card. Fields in this order:

1. **Name** — `Input`, normalize on blur (`normalizeGeminiModelId`). Helper: "Clients send this as model". If name matches builtin/catalog: persistent `Alert` type `warning` (not a modal): "Requests for `{id}` will use this combo, not Google." Save is still one click.
2. **Members** — not a multi Select (order is the product). Block:
   - `ModelPicker` `mode="concrete"` `multiple={false}`: choosing an option **appends** if not already in the list, then clears the search box. Keyboard: type, Enter adds.
   - List below: index, id, source tag (`Google` / `Custom`), up, down, remove. Up/down are icon buttons (`ArrowUpOutlined` / `ArrowDownOutlined`), no new DnD dependency. Disable up on row 0 / down on last.
3. **Strategy** — `Switch` "Override default" off by default (`strategy === null`). Off: one line under the switch showing the Routing default (`fallback` / …). On: `Segmented` of three strategies. `stick_n` reveals `InputNumber` min 1, required in that state. No extra "advanced" collapse.
4. **Active** — `Switch` default on. Label "Active". Inactive combos disappear from `GET /v1/models` and resolve miss.

Create-only presets: three `Button` `type="link"` size small **on the members picker row**, not a wizard: `Flash`, `Pro`, `Gemma`. `handleFillPreset` replaces members with catalog/builtin ids that exist in that family (Flash: `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` — skip missing; Pro/Gemma analogous from builtin list). Does not change Name unless Name is empty: then `flash-combo` / `pro-combo` / `gemma-combo`. User can edit after. Zero extra screens.

Footer: Refine Save / Cancel only. No Steps.

Validation: name regex, ≥1 member, unique members (picker won't add dupes). Show form error if RPC rejects member=combo name.

### ModelPicker (shared)

```ts
type ModelPickerMode = "concrete" | "requestName";

function ModelPicker(props: {
  mode: ModelPickerMode;
  value?: string;
  onChange: (modelId: string | undefined) => void;
  disabledIds?: string[];
}): JSX.Element;
```

Allowlist uses a thin wrapper: `mode="requestName"` + `Select` `mode="multiple"` for ids/combo names, plus the existing trailing-`*` tags behavior: user may type `gemini-3.*` as a custom tag (antd `mode="tags"` **only for the glob characters**; options still come from the catalog). Implementation: `Select` `mode="tags"` with `options` from merge, `filterOption` on id. Paste glob still works. Replace the current optionless tags Select on proxy keys.

UX details:

- `showSearch`, `placeholder` via i18n, `optionFilterProp` / custom filter on id
- `optionRender`: id + small `Tag` (`Combo` / `Google` / `Custom` / `Overrides`)
- Group labels: Combos, Gemini, Gemma, Custom (skip empty groups)
- Dropdown footer (`dropdownRender`): `Add model` | `Sync Google models` (`type="link"`). Sync shows `loading` on the button; on success `notification` with count; on fail error notification. Last sync time: `dayjs(max(refreshed_at))` muted, only if any `google_live` row exists
- Add model: `Modal` **from the footer**, 2 fields: id (`Input`), optional USD/1M input+output (reuse pricing numbers). OK writes `user_model_catalog` `custom` and optional `custom_model_pricing` key. Then `onChange` the new id. Escape / Cancel = no write. This is the **only** place a model id is typed
- Do not auto-open the modal. Do not toast on every keystroke

Pricing form: swap the model `Select` to `ModelPicker mode="concrete"` (keep numeric rate fields).

### Routing settings tab

Two controls, stacked, no table:

- `Segmented` strategy (three values)
- `InputNumber` stick count, **visible only** when strategy is `stick_n`
- One `Typography.Paragraph` `type="secondary"`: "Default for combos that do not override. Stronger models stay first; this only picks which Gemini key starts."

Save uses the same primary button pattern as timezone.

### Request logs

Model cell (existing redesign column):

- Combo request: primary `member`; secondary muted `requested_model`
- Non-combo: unchanged
- Retry badge already exists when `retry_attempts.length > 0` — keep it. Attempt detail already lists errors; show `canonical_model` per attempt

Filter "Model" matches **either** `usage_metadata.model` or `requested_model`.

### Copy / i18n (no slop)

Forbidden in locale strings: "journey", "powerful", "seamless", "unlock", "delight", emoji in labels, placeholder lorem.

Examples of required keys (en):

- `combos.title`: Combos
- `combos.empty`: No combos yet
- `combos.fields.name.help`: Sent as the request model
- `combos.overrideWarning`: Requests for {name} will use this combo, not the Google model
- `combos.members.help`: Tried in this order. Each Gemini key is rotated before the next model
- `picker.addModel`: Add model
- `picker.syncGoogle`: Sync Google models

vi keys: same tree, natural Vietnamese, not machine-calqued "Combo mạnh mẽ".

### Accessibility / density

- Icon buttons have `aria-label` via translate
- Do not add extra Cards inside Cards
- Form `layout="vertical"` like proxy-key create
- No auto-save. No `useEffect` to sync catalog. No prefetch that writes DB

## Tests

Pure (colocated `*.test.ts`):

| Case                                                       | Expect                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| 3 keys × 4 members, start A, all eligible                  | A/B/C on m0 then next key after last yield on m1 |
| 2 keys × 4 members                                         | 8 unique pairs, no missing parity                |
| Member with all keys cooled                                | Skip member, do not stall                        |
| `resolveCombo` name equals Google id                       | Combo wins                                       |
| Member equal to this combo's own name                      | RPC reject                                       |
| Member equal to a different combo's name                   | Allowed (literal Google id)                      |
| `rewriteUpstreamModel` Gemini path + OpenAI body           | Only model segment/field changes                 |
| `mergeModelList` collision                                 | Single combo row, allowlist drops unlisted       |
| `effectiveComboStrategy` null + global `stick_n` without N | `fallback`                                       |

Contract (`packages/core/test/proxy-contract/`):

| Case                                          | Expect                                                         |
| --------------------------------------------- | -------------------------------------------------------------- |
| `flash-combo`, 429 on every key for member[0] | Origin calls member[1]                                         |
| 400 on member[0] key A                        | No key B for member[0]; next origin is member[1]               |
| Allowlist `['flash-combo']`                   | Direct `gemini-3.7-flash` 400 `model_denied`; combo allowed    |
| `GET /v1/models` OpenAI + Gemini              | Combo id present; collision hides Google id                    |
| Non-combo `gemini-3.7-flash`                  | Spec 3 cap / `PROXY_MAX_RETRIES` unchanged                     |
| Combo request                                 | `usage_metadata.requested_model` set; cost from winning member |

Web: `ModelPicker` filter + disabledIds; combo form preset skips missing ids; locale parity script already in `pnpm -F web lint`.

## Success criteria

- Client can send `model: "flash-combo"` (Gemini path or OpenAI body) and get a 200 if any `(key, member)` works
- Dashboard: create a combo without typing a builtin id; allowlist pick includes the combo name
- Override names are visually tagged in picker, list, and form Alert
- Sync Google is a button, never a surprising background write
- Non-combo traffic matches spec 3

## Implementation notes

- TDD. Conventional Commits. Migration under `supabase/migrations/`, then mirror `packages/database/sql/schema.sql` + `database.types.ts`
- Combo lookup in the data plane is service_role, scoped by proxy key `user_id`
- Cache combos per request only (in-memory on the request object). No process-global tenant cache
- `proxy.service.ts` stays an orchestrator; new loops live in `combo/*`

## Out of scope (repeat)

CLI, nested combos, env-based combo strategy, raising spec 3 cap for single models, affinity tables, OTel.
