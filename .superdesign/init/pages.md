# Page Dependency Trees — Gemini Proxy Web App

Candidate `--context-file` sets for Superdesign. Prioritized for **request-logs redesign**.

---

## /request-logs (Request Logs List) — PRIMARY TARGET

**Entry:** `apps/web/src/app/(protected)/request-logs/page.tsx`

**Summary:** Refine List page with live auto-refresh, collapsible filters, Ant Design Table in Signal Deck panels. Uses same connection badge + pause/live pattern as dashboard.

**Dependencies:**
- `apps/web/src/components/common/DateTimeDisplay.tsx`
  - `apps/web/src/utils/table-helpers.ts`
    - `apps/web/src/constants/providers.ts`
- `apps/web/src/features/observability/components/connection-status-badge.tsx`
  - `apps/web/src/features/observability/hooks/use-realtime-connection-status.ts`
    - `apps/web/src/utils/supabase/client.ts`
- `apps/web/src/features/request-logs/components/key-combobox.tsx`
- `apps/web/src/features/request-logs/resolve-key-label.ts`
- `apps/web/src/constants/request-log-select.ts`
- `apps/web/src/types/request-log.types.ts`
- `apps/web/src/utils/table-helpers.ts`

**Layout chain (not imported by page, but wraps render):**
- `apps/web/src/app/(protected)/request-logs/layout.tsx`
- `apps/web/src/app/(protected)/layout.tsx`
  - `apps/web/src/components/layout/theme-layout/index.tsx`
    - `apps/web/src/components/header/index.tsx`
      - `apps/web/src/components/language-switcher/index.tsx`
      - `apps/web/src/features/settings/` (AccountSettingsModal)
    - `apps/web/src/components/layout/theme-layout/custom-sider.tsx`
      - `apps/web/src/components/layout/theme-layout/custom-title.tsx`
- `apps/web/src/app/globals.css`

**Design reference (dashboard live feed — not imported, same visual language):**
- `apps/web/src/features/observability/components/live-request-feed.tsx`
  - `apps/web/src/utils/table-helpers.ts`

---

## /request-logs/show/:id (Detail — Modal + Full Page)

**Entry:** `apps/web/src/app/(protected)/request-logs/show/[id]/page.tsx`  
**Modal entry:** `apps/web/src/app/(protected)/request-logs/@modal/(.)show/[id]/page.tsx`

**Dependencies:**
- `apps/web/src/components/RequestLogDetails.tsx`
  - `apps/web/src/features/request-logs/components/key-identity-card.tsx`
  - `apps/web/src/features/request-logs/components/user-identity-card.tsx`
  - `apps/web/src/components/common/json-tree-viewer.tsx`
  - `apps/web/src/components/common/DateTimeDisplay.tsx`
  - `apps/web/src/constants/request-log-select.ts`
  - `apps/web/src/utils/table-helpers.ts`

---

## /dashboard (Ops Console — LiveRequestFeed Reference)

**Entry:** `apps/web/src/app/(protected)/dashboard/page.tsx`

**Summary:** Signal Deck console with KPI strip, charts, live request feed, key health panel.

**Dependencies:**
- `apps/web/src/features/observability/components/console-toolbar.tsx`
  - `apps/web/src/features/observability/components/connection-status-badge.tsx`
- `apps/web/src/features/observability/components/kpi-strip.tsx`
  - `apps/web/src/utils/table-helpers.ts`
- `apps/web/src/features/observability/components/charts-row.tsx`
- `apps/web/src/features/observability/components/live-request-feed.tsx`
- `apps/web/src/features/observability/components/key-health-panel.tsx`
  - `apps/web/src/features/observability/components/key-health-badge.tsx`
- `apps/web/src/hooks/useRpc.ts`

---

## /api-keys (API Keys List)

**Entry:** `apps/web/src/app/(protected)/api-keys/page.tsx`

**Dependencies:**
- `apps/web/src/components/common/StatusToggle.tsx`
  - `apps/web/src/utils/table-helpers.ts`
- `apps/web/src/components/common/DateTimeDisplay.tsx`
- `apps/web/src/components/common/SensitiveKeyDisplay.tsx`
- `apps/web/src/components/common/UsageStatistics.tsx`

---

## /proxy-api-keys (Proxy Keys List)

**Entry:** `apps/web/src/app/(protected)/proxy-api-keys/page.tsx`

**Dependencies:**
- `apps/web/src/components/common/StatusToggle.tsx`
- `apps/web/src/components/common/DateTimeDisplay.tsx`
- `apps/web/src/components/common/SensitiveKeyDisplay.tsx`
- `apps/web/src/features/proxy-quickstart/components/proxy-quick-start.tsx`
  - `apps/web/src/features/proxy-quickstart/components/copy-row.tsx`

---

## /settings

**Entry:** `apps/web/src/app/(protected)/settings/page.tsx`

**Dependencies:**
- `apps/web/src/features/settings/` (settings forms, account sections)

---

## / (Landing)

**Entry:** `apps/web/src/app/page.tsx`

**Dependencies:**
- `apps/web/src/components/landing/HeroSection.tsx`
- `apps/web/src/components/landing/FeaturesSection.tsx`
- `apps/web/src/components/landing/ArchitectureSection.tsx`
- `apps/web/src/components/landing/CodeExamplesSection.tsx`
- `apps/web/src/components/landing/DeploymentSection.tsx`
- `apps/web/src/components/landing/TechStackSection.tsx`
- `apps/web/src/components/landing/FooterSection.tsx`

---

## /login

**Entry:** `apps/web/src/app/login/page.tsx`

**Dependencies:**
- `apps/web/src/components/auth-page/index.tsx`
  - `apps/web/src/components/auth-page/auth-card-chrome.tsx`
