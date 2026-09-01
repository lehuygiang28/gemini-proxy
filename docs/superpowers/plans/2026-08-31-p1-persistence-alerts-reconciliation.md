# Persistence reliability, dashboard alerts, and reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Idempotent finalize RPC so origin success stays a client success; stale reservations stay fail-closed; dashboard retry/reconcile.

**Architecture:** One `finalize_proxy_request` SECURITY DEFINER RPC. JS retries 3× on waitUntil then inserts `proxy_reconciliation_needed`. Refine list + retry action.

**Tech Stack:** Supabase, Vitest, Refine, Ant Design.

## Global Constraints

- Spec: [persistence](../specs/2026-08-31-p1-persistence-alerts-reconciliation-design.md).
- Persistence failure must not convert upstream success into a client error.
- No auto-release of stale reservations.
- No OTel / Slack / email.
- TDD. No new `useEffect` hydration. i18n en/vi.

## File map

| File                                                             | Responsibility                         |
| ---------------------------------------------------------------- | -------------------------------------- |
| `supabase/migrations/20260831050000_finalize_proxy_request.sql`  | RPC + reconciliation table             |
| `packages/core/src/services/background.service.ts`               | call finalize, retry, insert stale row |
| `apps/web/src/app/(protected)/reconciliation/**`                 | list + retry                           |
| `apps/web/src/providers/refine-provider/index.tsx`               | resource                               |
| `packages/core/test/proxy-contract/finalize-reliability.test.ts` | client 200 on RPC fail                 |

---

### Task 1: Finalize RPC + idempotent counters

- [ ] **Step 1:** SQL as spec. `GRANT EXECUTE TO service_role`. Conflict on `request_id` / `proxy_key_settlements` skips counter increment.
- [ ] **Step 2:** Mirror schema.sql + types.
- [ ] **Step 3:** Commit `feat(db): finalize proxy request logs and settlement atomically`

### Task 2: waitUntil retry + fail-open client

- [ ] **Step 1:** Failing contract: origin 200, finalize errors twice then ok → status 200 and 3 RPC calls; always-fail → 200 + reconciliation insert + next admit still denied on token_day_limit=1.
- [ ] **Step 2:** BackgroundService 3 attempts, jitter ≤2s, then insert `proxy_reconciliation_needed`. Never throw to client after origin success.
- [ ] **Step 3:** Commit `feat(core): retry finalize without failing successful upstream responses`

### Task 3: Dashboard reconcile

- [ ] **Step 1:** Refine resource, list unresolved, `handleRetry` → `reconcile_proxy_request`. Badge when count > 0. Locales en/vi.
- [ ] **Step 2:** Locale parity + web tests.
- [ ] **Step 3:** Commit `feat(web): retry stale proxy reservations from the dashboard`

## Spec coverage

Single-transaction finalize, idempotency, fail-open client, fail-closed reservation, no auto-release, dashboard reconcile.
