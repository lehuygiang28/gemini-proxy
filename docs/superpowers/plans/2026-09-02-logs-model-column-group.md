# Logs Model Column Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Format and Stream back inside the Model cell and its filter popover so the logs table is 11 scannable columns, while token / cache / cost / Est. Speed / duration stay independently sortable.

**Architecture:** No schema or Refine filter-mapping change. `api_format` and `is_stream` remain CrudFilter fields on the existing search Form; they move from standalone columns into `ModelFilterDropdown`. Cell badge rules live in a small pure helper so TDD does not require rendering Ant Table.

**Tech Stack:** Refine v5 `useTable` + Ant Design Table, existing `RequestLogSearch` form, Vitest.

**Spec:** [2026-09-02-logs-model-column-group-design.md](../specs/2026-09-02-logs-model-column-group-design.md)

## Global Constraints

- Approach A only: group Format + Stream into Model. Do not stack tokens or duration+speed.
- Do not add Format/Stream toolbar Selects. Request ID stays Advanced.
- Do not add sorters for `api_format` or `is_stream`. Status / time / numeric columns keep `sorter: true`. Est. Speed keeps `nullsLast`.
- Cache tokens stay a column after Output. Overhead stays gone.
- Filter mapping (`buildRequestLogSearchFilters`) and deep-link hydration stay as they are.
- Clear all stays `setFieldsValue(blankRequestLogSearchValues())` then `setFilters([], 'replace')`.
- JSONB `->` / `->>`, generated `estimated_speed_tok_per_s`, datetime cookie, hybrid i18n glossary, worker persist: do not touch.
- TDD: failing test first for each unit of behavior. English code. Conventional Commits.

## File map

```text
apps/web/src/features/request-logs/request-log-table-column-specs.ts
apps/web/src/features/request-logs/request-log-table-column-specs.test.ts
apps/web/src/features/request-logs/request-log-table-filter-utils.ts
apps/web/src/features/request-logs/request-log-table-filter-utils.test.ts
apps/web/src/features/request-logs/request-log-model-column.ts          # NEW — cell badge rules
apps/web/src/features/request-logs/request-log-model-column.test.ts     # NEW
apps/web/src/features/request-logs/components/request-log-table-columns.tsx
apps/web/src/features/request-logs/index.ts                            # export helper if columns import from barrel
```

Do not modify: filter field paths, data provider, SQL, `page.tsx` toolbar, locale glossary.

---

### Task 1: Column spec — eleven keys, Format/Stream off the table

**Files:**

- Modify: `apps/web/src/features/request-logs/request-log-table-column-specs.test.ts`
- Modify: `apps/web/src/features/request-logs/request-log-table-column-specs.ts`

**Interfaces:**

- Consumes: existing `REQUEST_LOG_TABLE_COLUMN_SPECS`
- Produces: specs without `api_format` / `is_stream` keys; `model.filter === 'model'` and `model.sorter === false`

- [ ] **Step 1: Write the failing tests**

Replace the order assertion and the “Format and Stream on sortable enum columns” example in `request-log-table-column-specs.test.ts`:

```ts
it("orders eleven columns and hosts Format/Stream on Model, not as headers", () => {
  expect(REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => column.key)).toEqual([
    "created_at",
    "model",
    "is_successful",
    "prompt_tokens",
    "completion_tokens",
    "cache_tokens",
    "estimated_cost_usd",
    "estimated_speed_tok_per_s",
    "total_response_time_ms",
    "key",
    "actions",
  ]);
  expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === "api_format")).toBe(false);
  expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === "is_stream")).toBe(false);
  expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === "overhead")).toBe(false);

  const byKey = Object.fromEntries(
    REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => [column.key, column]),
  );
  expect(byKey.model).toMatchObject({ sorter: false, filter: "model" });
  expect(byKey.is_successful).toMatchObject({
    dataIndex: "is_successful",
    sorter: true,
    filter: "enum",
  });
});
```

Delete the old `it('puts Format and Stream on sortable enum columns', …)` block.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-table-column-specs.test.ts`

Expected: FAIL — received array still includes `'api_format'` and `'is_stream'` after `'is_successful'`.

- [ ] **Step 3: Drop the two column specs**

In `request-log-table-column-specs.ts`, delete these two entries only:

```ts
{ key: 'api_format', dataIndex: 'api_format', sorter: true, filter: 'enum' },
{ key: 'is_stream', dataIndex: 'is_stream', sorter: true, filter: 'enum' },
```

Leave `model` as `{ key: 'model', sorter: false, filter: 'model' }`. Leave cache / speed / duration specs unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-table-column-specs.test.ts`

Expected: PASS (all examples in that file).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/request-logs/request-log-table-column-specs.ts \
  apps/web/src/features/request-logs/request-log-table-column-specs.test.ts
git commit -m "fix(web): drop Format and Stream from logs column specs"
```

---

### Task 2: Model filter icon — active for format or stream alone

**Files:**

- Modify: `apps/web/src/features/request-logs/request-log-table-filter-utils.ts`
- Modify: `apps/web/src/features/request-logs/request-log-table-filter-utils.test.ts`

**Interfaces:**

- Consumes: `hasActiveFilter`, `hasModelFilter`, `CrudFilter[]`
- Produces: `hasModelColumnFilter(filters: CrudFilter[]): boolean` — true if model text, `api_format`, or `is_stream` is active. `is_stream: false` counts as active (`hasActiveFilter` already treats `false` as set because it only rejects `undefined` / `null` / `''`).

Do not change `buildRequestLogSearchFilters` or `hasModelFilter` (model-text-only).

- [ ] **Step 1: Write the failing tests**

Append to `request-log-table-filter-utils.test.ts` (add `hasModelColumnFilter` to the import from `./request-log-table-filter-utils`):

```ts
describe("hasModelColumnFilter", () => {
  it("is active when only api_format or only is_stream is set", () => {
    expect(hasModelColumnFilter([{ field: "api_format", operator: "eq", value: "openai" }])).toBe(
      true,
    );
    expect(hasModelColumnFilter([{ field: "is_stream", operator: "eq", value: false }])).toBe(true);
    expect(hasModelColumnFilter([{ field: "is_successful", operator: "eq", value: true }])).toBe(
      false,
    );
  });

  it("is active when the model contains OR filter is set", () => {
    expect(hasModelColumnFilter(buildRequestLogSearchFilters({ model: "flash" }))).toBe(true);
    expect(hasModelColumnFilter([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-table-filter-utils.test.ts`

Expected: FAIL — `hasModelColumnFilter` is not exported.

- [ ] **Step 3: Implement `hasModelColumnFilter`**

Add next to `hasModelFilter` in `request-log-table-filter-utils.ts`:

```ts
export function hasModelColumnFilter(filters: CrudFilter[]): boolean {
  return (
    hasModelFilter(filters) ||
    hasActiveFilter(filters, "api_format") ||
    hasActiveFilter(filters, "is_stream")
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-table-filter-utils.test.ts`

Expected: PASS. Existing `buildRequestLogSearchFilters` examples still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/request-logs/request-log-table-filter-utils.ts \
  apps/web/src/features/request-logs/request-log-table-filter-utils.test.ts
git commit -m "feat(web): treat Format/Stream as Model column filters"
```

---

### Task 3: Model cell presentation helper

**Files:**

- Create: `apps/web/src/features/request-logs/request-log-model-column.ts`
- Create: `apps/web/src/features/request-logs/request-log-model-column.test.ts`

**Interfaces:**

- Produces:

```ts
export type ModelColumnPresentation = {
  apiFormat: string;
  showStream: boolean;
  showRetries: boolean;
  retryCount: number;
};

export function modelColumnPresentation(input: {
  apiFormat: string;
  isStream: boolean;
  retryCount: number;
}): ModelColumnPresentation;
```

Rules from spec: Format always shown (`apiFormat` passed through); Stream only when `isStream === true`; retries only when `retryCount > 0`. Requested-model hiding stays in existing `comboLogModelLabels` — do not duplicate.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { modelColumnPresentation } from "./request-log-model-column";

describe("modelColumnPresentation", () => {
  it("always keeps format and hides non-stream and zero retries", () => {
    expect(
      modelColumnPresentation({ apiFormat: "openai", isStream: false, retryCount: 0 }),
    ).toEqual({
      apiFormat: "openai",
      showStream: false,
      showRetries: false,
      retryCount: 0,
    });
  });

  it("shows stream tag and retries when present", () => {
    expect(modelColumnPresentation({ apiFormat: "gemini", isStream: true, retryCount: 2 })).toEqual(
      {
        apiFormat: "gemini",
        showStream: true,
        showRetries: true,
        retryCount: 2,
      },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-model-column.test.ts`

Expected: FAIL — cannot find module `./request-log-model-column`.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/features/request-logs/request-log-model-column.ts`:

```ts
export type ModelColumnPresentation = {
  apiFormat: string;
  showStream: boolean;
  showRetries: boolean;
  retryCount: number;
};

export function modelColumnPresentation(input: {
  apiFormat: string;
  isStream: boolean;
  retryCount: number;
}): ModelColumnPresentation {
  const retryCount = input.retryCount;
  return {
    apiFormat: input.apiFormat,
    showStream: input.isStream,
    showRetries: retryCount > 0,
    retryCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/features/request-logs/request-log-model-column.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/request-logs/request-log-model-column.ts \
  apps/web/src/features/request-logs/request-log-model-column.test.ts
git commit -m "feat(web): encode Model Format/Stream badge rules"
```

---

### Task 4: Wire columns — grouped cell + popover, delete Format/Stream columns

**Files:**

- Modify: `apps/web/src/features/request-logs/components/request-log-table-columns.tsx`
- Modify: `apps/web/src/features/request-logs/index.ts` (optional export of `modelColumnPresentation`)

**Interfaces:**

- Consumes: `hasModelColumnFilter`, `modelColumnPresentation`, `comboLogModelLabels`, `getRequestType`, `getRequestTypeColor`
- Produces: Model column with combined filterDropdown; no `key: 'api_format'` / `key: 'is_stream'` columns; Model `sorter` omitted/false

There is no RTL harness in this app. The failing coverage for this task is Task 1 (specs) plus a full `vitest run` after the wire-up. Do not add a React renderer test.

- [ ] **Step 1: Confirm Task 1 tests still describe the desired table (already green on specs file)**

If Task 1 was committed, this step is a no-op check: specs file has eleven keys.

- [ ] **Step 2: Extend `ModelFilterDropdown`**

Replace the dropdown body so Reset clears `model`, `api_format`, and `is_stream`, and the body is a vertical stack (same Select option lists that live in `FormatFilterDropdown` / `StreamFilterDropdown` today):

```tsx
onReset={() => {
    clearFilters?.();
    resetSearchFields(searchFormProps, ['model', 'api_format', 'is_stream']);
    confirm({ closeDropdown: true });
    submitSearchForm(searchFormProps);
}}
```

```tsx
<Space direction="vertical" style={{ width: '100%' }} size={8}>
    <Form.Item name="model" noStyle key={modelFieldKey} initialValue={...}>
        <Input allowClear placeholder={translate('request_logs.placeholders.searchModel')} ... />
    </Form.Item>
    <div>
        <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
            {translate('request_logs.fields.format')}
        </div>
        <Form.Item name="api_format" noStyle>
            <Select allowClear style={{ width: '100%' }} placeholder={translate('request_logs.placeholders.selectFormat')}
                options={[
                    { value: 'gemini', label: 'Gemini' },
                    { value: 'openai', label: 'OpenAI' },
                ]}
            />
        </Form.Item>
    </div>
    <div>
        <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
            {translate('request_logs.fields.stream')}
        </div>
        <Form.Item name="is_stream" noStyle>
            <Select allowClear style={{ width: '100%' }} placeholder={translate('request_logs.placeholders.selectStream')}
                options={[
                    { value: true, label: translate('request_logs.stream.streaming') },
                    { value: false, label: translate('request_logs.stream.nonStreaming') },
                ]}
            />
        </Form.Item>
    </div>
</Space>
```

Keep `FilterDropdownShell` width at 260 unless the three fields clip — then set that shell instance to `width: 280` only.

- [ ] **Step 3: Model filter icon uses `hasModelColumnFilter`**

```tsx
color: hasModelColumnFilter(filters) ? token.colorPrimary : undefined,
```

Import `hasModelColumnFilter` from `../request-log-table-filter-utils`. Stop using `hasModelFilter` in this file if nothing else needs it.

- [ ] **Step 4: Model cell stack**

After `comboLogModelLabels(usage)`:

```tsx
const presentation = modelColumnPresentation({
  apiFormat: record.api_format,
  isStream: record.is_stream,
  retryCount: Array.isArray(record.retry_attempts) ? record.retry_attempts.length : 0,
});
```

Under the requested-model line, render tags then retries:

```tsx
<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
  <Tag
    color={getRequestTypeColor(presentation.apiFormat)}
    style={{ margin: 0, borderRadius: 2, fontSize: 10 }}
  >
    {getRequestType(presentation.apiFormat)}
  </Tag>
  {presentation.showStream ? (
    <Tag color="processing" style={{ margin: 0, borderRadius: 2, fontSize: 10 }}>
      {translate("request_logs.stream.streaming")}
    </Tag>
  ) : null}
</div>;
{
  presentation.showRetries ? (
    <div style={{ color: token.colorError, fontSize: 11, marginTop: 2 }}>
      {translate("request_logs.metrics.retries", { count: presentation.retryCount })}
    </div>
  ) : null;
}
```

Order: primary name → requested (if any) → tags → retries. Widen Model `width` from 220 to 240 if tags wrap poorly; do not exceed 260.

- [ ] **Step 5: Delete standalone Format and Stream columns and their dropdown functions**

Remove the two column objects with `key: 'api_format'` and `key: 'is_stream'` (including `sorter: true`). Delete `FormatFilterDropdown` and `StreamFilterDropdown` once unused.

Do not add `sorter` on Model.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter web exec vitest run src/features/request-logs`

Expected: PASS, including column specs (11 keys), `hasModelColumnFilter`, `modelColumnPresentation`, and unchanged filter mapping tests.

Run: `pnpm --filter web exec eslint src/features/request-logs/components/request-log-table-columns.tsx src/features/request-logs/request-log-table-column-specs.ts src/features/request-logs/request-log-table-filter-utils.ts src/features/request-logs/request-log-model-column.ts`

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/request-logs/components/request-log-table-columns.tsx \
  apps/web/src/features/request-logs/index.ts
git commit -m "feat(web): group Format and Stream into logs Model column"
```

- [ ] **Step 8: Manual check on `/request-logs`**

Login `demo@example.com` / `password123`. Confirm:

1. No Format or Stream column headers.
2. Model cell shows Format tag always; Streaming tag only on stream rows; no “Không stream” tag.
3. Model filter popover can set OpenAI; URL gets `filters[n][field]=api_format`; table shrinks; filter icon highlighted.
4. Popover Reset clears model + format + stream only.
5. Toolbar Clear all still clears everything.
6. Est. Speed / token columns still sort.

---

## Self-review (spec coverage)

| Spec item                                                                  | Task                         |
| -------------------------------------------------------------------------- | ---------------------------- |
| Drop Format/Stream columns; not toolbar                                    | 1, 4                         |
| Model cell: name, requested, Format always, Stream if true, retries if > 0 | 3, 4                         |
| Combined Model popover; Reset three fields                                 | 4                            |
| Icon active if any of model / format / stream                              | 2, 4                         |
| No Format/Stream sort                                                      | 1, 4                         |
| Cache column stays; numeric sort/filter unchanged                          | 1 (order)                    |
| Clear all / deep-link / JSONB / Est. Speed / i18n                          | constraints; no file changes |
| Unit: eleven keys; icon when only format or stream                         | 1, 2                         |
| `buildRequestLogSearchFilters` tests stay valid                            | 2 step 4                     |

No TBD. No “similar to Task N” without code. `hasModelColumnFilter` / `modelColumnPresentation` names are consistent across tasks.
