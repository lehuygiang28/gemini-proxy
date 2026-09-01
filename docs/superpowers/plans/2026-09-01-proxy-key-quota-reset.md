# Proxy-key quota reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operators zero selected current quota windows (minute / day / month) for one proxy key so it immediately has full remaining quota at the same limits, without rewriting logs or lifetime counters.

**Architecture:** Extract `proxy_quota_window_starts` from live `admit_proxy_request`. `reset_proxy_key_quota` and `current_proxy_key_quota` are `SECURITY DEFINER` RPCs (same window math, owner check, `RAISE` on error). Web list + show open one Refine modal. CLI `gproxy proxy-keys reset-quota <id>` calls the write RPC.

**Tech Stack:** Supabase SQL, Refine `useCustom` / `useCustomMutation` / `useInvalidate`, Ant Design `Modal` via `ConfirmAlertModal`, Commander CLI, Vitest.

## Global Constraints

- Spec: [quota reset](../specs/2026-09-01-proxy-key-quota-reset-design.md)
- Zero **usage**, not limits. Do not `DELETE` window rows.
- Do not rewrite `request_logs`, lifetime counters, `inflight_count`, or unselected / past windows.
- In-flight settle still adds token/USD to the same `window_start`.
- `RAISE EXCEPTION` on errors; success JSON `{ reset, skipped }`. Never HTTP 200 `{ ok: false }`.
- Data plane never calls reset.
- Web: Refine only. No `supabase-js`, no `queryClient`, no `useResetProxyQuota` wrapper, no edit/create/bulk.
- Window types: `minute` | `day` | `month`. Canonical order minute, day, month.
- English code/docs; i18n en+vi.

## File map

| File                                                                   | Responsibility                       |
| ---------------------------------------------------------------------- | ------------------------------------ |
| `packages/core/src/policy/quota-window-types.ts`                       | Checkbox/flag → `p_window_types`     |
| `supabase/migrations/20260901010000_reset_proxy_key_quota.sql`         | Helper + RPCs + admit refactor       |
| `packages/database/sql/schema.sql`                                     | Mirror                               |
| `packages/database/types/database.types.ts`                            | RPC Args/Returns                     |
| `packages/cli/src/lib/proxy-keys.ts`                                   | `resetQuota`                         |
| `packages/cli/src/commands/proxy-keys.ts`                              | `reset-quota` command                |
| `apps/web/src/components/common/ConfirmAlertModal.tsx`                 | optional `children`, `okButtonProps` |
| `apps/web/src/features/proxy-api-keys/proxy-key-quota-reset-modal.tsx` | Refine modal                         |
| `apps/web/src/app/(protected)/proxy-api-keys/page.tsx`                 | List icon                            |
| `apps/web/src/app/(protected)/proxy-api-keys/show/[id]/page.tsx`       | Show button                          |
| `apps/web/src/types/rpc.types.ts`                                      | Validators                           |
| `apps/web/public/locales/{en,vi}/common.json`                          | `proxy_api_keys.quotaReset.*`        |

---

### Task 1: Window-type payload helper (TDD)

**Files:**

- Create: `packages/core/src/policy/quota-window-types.ts`
- Create: `packages/core/src/policy/quota-window-types.test.ts`
- Modify: `packages/core/src/index.ts` (export)

**Interfaces:**

- Produces: `ProxyQuotaWindowType`, `PROXY_QUOTA_WINDOW_TYPES`, `selectedQuotaWindowTypes()`, `isProxyQuotaWindowType()`

- [ ] **Step 1: Failing tests** in `quota-window-types.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { selectedQuotaWindowTypes, isProxyQuotaWindowType } from "./quota-window-types";

describe("selectedQuotaWindowTypes", () => {
  it("returns canonical minute, day, month order", () => {
    expect(selectedQuotaWindowTypes({ month: true, minute: true, day: true })).toEqual([
      "minute",
      "day",
      "month",
    ]);
  });
  it("omits unchecked windows", () => {
    expect(selectedQuotaWindowTypes({ minute: false, day: true, month: false })).toEqual(["day"]);
  });
  it("returns empty when none selected", () => {
    expect(selectedQuotaWindowTypes({ minute: false, day: false, month: false })).toEqual([]);
  });
});

describe("isProxyQuotaWindowType", () => {
  it("accepts minute day month and rejects others", () => {
    expect(isProxyQuotaWindowType("minute")).toBe(true);
    expect(isProxyQuotaWindowType("week")).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @gemini-proxy/core test src/policy/quota-window-types.test.ts` — FAIL (module missing)

- [ ] **Step 3: Implement**

```ts
export const PROXY_QUOTA_WINDOW_TYPES = ["minute", "day", "month"] as const;
export type ProxyQuotaWindowType = (typeof PROXY_QUOTA_WINDOW_TYPES)[number];

export function isProxyQuotaWindowType(value: string): value is ProxyQuotaWindowType {
  return (PROXY_QUOTA_WINDOW_TYPES as readonly string[]).includes(value);
}

export function selectedQuotaWindowTypes(selected: {
  readonly minute: boolean;
  readonly day: boolean;
  readonly month: boolean;
}): ProxyQuotaWindowType[] {
  return PROXY_QUOTA_WINDOW_TYPES.filter((windowType) => selected[windowType]);
}
```

Export from `packages/core/src/index.ts`.

- [ ] **Step 4: Re-run tests** — PASS

- [ ] **Step 5: Commit** `feat(core): add proxy quota window type helper`

---

### Task 2: SQL helper + RPCs + admit refactor

**Files:**

- Create: `supabase/migrations/20260901010000_reset_proxy_key_quota.sql`
- Modify: `packages/database/sql/schema.sql` (replace inlined window math in `admit_proxy_request`; append new functions)
- Modify: `packages/database/types/database.types.ts` (`Functions`)

**Interfaces:**

- Consumes: live admit window formula (unexpired day/month reuse)
- Produces: `proxy_quota_window_starts(uuid, text)`, `reset_proxy_key_quota(uuid, text[])`, `current_proxy_key_quota(uuid)`

SQL must:

1. `CREATE FUNCTION proxy_quota_window_starts(p_proxy_key_id UUID, p_tz TEXT) RETURNS TABLE (minute_start TIMESTAMPTZ, day_start TIMESTAMPTZ, month_start TIMESTAMPTZ)` — copy admit's minute/`date_trunc` + unexpired day/month SELECT + civil fallback. `REVOKE ALL FROM PUBLIC`. No GRANT to authenticated/anon/service_role.
2. `CREATE OR REPLACE FUNCTION admit_proxy_request(...)` identical except replace the three window assignments with `SELECT * INTO minute_start, day_start, month_start FROM proxy_quota_window_starts(p_proxy_key_id, owner_tz);`
3. `reset_proxy_key_quota`:
   - Lock key `FOR UPDATE`, deleted → `RAISE` `P0002`
   - Non-service_role and `user_id <> (SELECT auth.uid())` → `RAISE` `42501`
   - Invalid/empty/duplicate window types → `RAISE` `22023`
   - Invalid timezone catalog → `RAISE` `22023`
   - For each requested type in canonical order: `FOR UPDATE` current row; zero five counters or skip
   - Return `jsonb_build_object('reset', to_jsonb(reset_arr), 'skipped', to_jsonb(skipped_arr))`
   - `GRANT EXECUTE` to `authenticated`, `service_role`
4. `current_proxy_key_quota`: same auth/timezone/helper, no `FOR UPDATE`, JSON per spec (always `window_start`, `exists`, counters)
5. Allowed on inactive/expired. Not deleted.
6. Do not INSERT a window to zero it. Do not touch `inflight_count` / logs / lifetime.

Hand-edit `database.types.ts` Functions (remote gen may be unavailable):

```ts
current_proxy_key_quota: { Args: { p_proxy_key_id: string }; Returns: Json };
reset_proxy_key_quota: {
    Args: { p_proxy_key_id: string; p_window_types: string[] };
    Returns: Json;
};
```

- [ ] **Step 1: Write migration + schema mirror + types**

- [ ] **Step 2: Commit** `feat(db): add proxy-key quota reset RPCs`

---

### Task 3: CLI `reset-quota`

**Files:**

- Modify: `packages/cli/src/lib/proxy-keys.ts`
- Modify: `packages/cli/src/commands/proxy-keys.ts`
- Create: `packages/cli/src/lib/selected-quota-windows.test.ts` (if flags stay in command, test `selectedQuotaWindowTypes` is already core — add CLI mapping test in `packages/cli/src/lib/proxy-keys-reset-quota.test.ts` that tests a tiny mapper)

Add in `proxy-keys.ts`:

```ts
static async resetQuota(
    id: string,
    windowTypes: Array<'minute' | 'day' | 'month'>,
): Promise<{ reset: string[]; skipped: string[] }> {
    await supabase.init();
    const { data, error } = await supabase.client.rpc('reset_proxy_key_quota', {
        p_proxy_key_id: id,
        p_window_types: windowTypes,
    });
    if (error) {
        throw new Error(`Failed to reset proxy key quota: ${error.message}`);
    }
    const payload = data as { reset?: string[]; skipped?: string[] } | null;
    return {
        reset: payload?.reset ?? [],
        skipped: payload?.skipped ?? [],
    };
}
```

Command (after `delete`):

```ts
proxyKeys
  .command("reset-quota <id>")
  .description("Reset current quota windows for a proxy API key")
  .option("--minute", "Reset the current minute (RPM) window")
  .option("--day", "Reset the current day (RPD + token/day) window")
  .option("--month", "Reset the current month (USD) window")
  .option("-f, --force", "Skip confirmation")
  .action(async (id, options) => {
    const windowTypes = selectedQuotaWindowTypes({
      minute: Boolean(options.minute),
      day: Boolean(options.day),
      month: Boolean(options.month),
    });
    if (windowTypes.length === 0) {
      throw new Error("Select at least one window: --minute, --day, and/or --month");
    }
    const proxyKey = await ProxyKeysManager.getById(id);
    if (!proxyKey) {
      throw new Error("Proxy API key not found");
    }
    if (!options.force) {
      const confirmed = await confirm({
        message: `Reset current ${windowTypes.join(", ")} quota for "${proxyKey.name}"?`,
        default: false,
      });
      if (!confirmed) {
        console.log(colors.yellow("Operation cancelled"));
        return;
      }
    }
    const spinner = ora("Resetting proxy key quota...").start();
    try {
      const result = await ProxyKeysManager.resetQuota(id, windowTypes);
      spinner.succeed(
        `Reset: ${result.reset.join(", ") || "none"}; skipped: ${result.skipped.join(", ") || "none"}`,
      );
    } catch (error) {
      spinner.fail("Failed to reset proxy key quota");
      throw error;
    }
  });
```

Zero flags: throw before RPC (commander still invokes action).

- [ ] **Step 1: Implement CLI + run** `pnpm --filter @lehuygiang28/gemini-proxy-cli test`

- [ ] **Step 2: Commit** `feat(cli): add proxy-keys reset-quota`

---

### Task 4: Web modal (Refine) + list/show

**Files:**

- Modify: `ConfirmAlertModal.tsx` — `children?: React.ReactNode`, `okButtonProps?: ModalProps['okButtonProps']`, `confirmLoading?: boolean`
- Create: `apps/web/src/features/proxy-api-keys/proxy-key-quota-reset-modal.tsx`
- Create: `apps/web/src/features/proxy-api-keys/selected-quota-windows.test.ts` (re-export/use core helper — test rpc validators instead)
- Modify: `apps/web/src/types/rpc.types.ts` + `.test.ts`
- Modify: list + show pages
- Modify: `en/common.json`, `vi/common.json`

Modal (no extra data hook file):

- `useCustom` `url: 'rpc/current_proxy_key_quota'`, payload `p_proxy_key_id`, `queryOptions.enabled: open && Boolean(proxyKeyId)`
- `useCustomMutation` `url: 'rpc/reset_proxy_key_quota'`
- `useInvalidate` `proxy_api_keys` list+detail after success; also invalidate the custom query
- Local checkbox state, default all true when `open` becomes true (reset state in `destroyOnHidden` / when open flips)
- Confirm disabled if `selectedQuotaWindowTypes` is empty or mutation pending
- Do not block on usage loading

List: `UndoOutlined` icon + `setResetKeyId(record.id)`. Widen actions column to `240`.

Show: `headerButtons` Reset quota `Button` + existing defaults.

i18n keys under `proxy_api_keys.quotaReset`: `action`, `title`, `description`, `confirm`, `minute`, `day`, `month`, `usageRequests`, `usageTokens`, `usageUsd`, `success`, `successSkipped`, `failed`, `failedDesc`.

Validators:

```ts
case 'reset_proxy_key_quota':
    return (
        typeof paramObj.p_proxy_key_id === 'string' &&
        paramObj.p_proxy_key_id.length > 0 &&
        Array.isArray(paramObj.p_window_types) &&
        paramObj.p_window_types.length > 0
    );
case 'current_proxy_key_quota':
    return typeof paramObj.p_proxy_key_id === 'string' && paramObj.p_proxy_key_id.length > 0;
```

Response: object with `reset`+`skipped` arrays for write; object with `minute`/`day`/`month` for read.

- [ ] **Step 1: Failing rpc.types tests**

- [ ] **Step 2: Implement validators, modal, pages, i18n**

- [ ] **Step 3: Run** `pnpm --filter web test src/types/rpc.types.test.ts src/features/proxy-api-keys` and `pnpm --filter web i18n:check`

- [ ] **Step 4: Commit** `feat(web): reset proxy-key quota from list and show`

---

## Spec coverage

| Spec section                                        | Task |
| --------------------------------------------------- | ---- |
| Shared window helper + admit refactor               | 2    |
| `reset_proxy_key_quota` / `current_proxy_key_quota` | 2    |
| In-flight / no DELETE / no lifetime rewrite         | 2    |
| CLI                                                 | 3    |
| Web list+show modal, Refine-only                    | 4    |
| Errors RAISE                                        | 2    |
| Window type payload tests                           | 1, 4 |

SQL integration against live Postgres is optional if local Supabase is down; migration is still the source of truth.
