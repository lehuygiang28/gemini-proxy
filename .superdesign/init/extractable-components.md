# Extractable Components — Gemini Proxy Web App

Menu of reusable `DraftComponent` candidates for Superdesign. Focus: request-logs redesign + Signal Deck console patterns.

---

## Layout Components

### CustomThemedLayout
- **Source:** `apps/web/src/components/layout/theme-layout/index.tsx`
- **Category:** layout
- **Description:** Viewport-locked app shell wrapping Refine ThemedLayout with scrollable content on `--gp-bg-base`
- **Extractable props:** `initialSiderCollapsed` (boolean, default: `false`)
- **Hardcoded:** Header/Sider/Title component refs, `gp-console gp-app-shell` classes, content padding from Ant token

### CustomSider
- **Source:** `apps/web/src/components/layout/theme-layout/custom-sider.tsx`
- **Category:** layout
- **Description:** Refine-driven sidebar menu with collapse + mobile drawer
- **Extractable props:** `activeItemDisabled` (boolean), `fixed` (boolean), `siderItemsAreCollapsed` (boolean)
- **Hardcoded:** Menu items from Refine resources, collapse icons, drawer width 200px, breakpoint `lg`

### Header
- **Source:** `apps/web/src/components/header/index.tsx`
- **Category:** layout
- **Description:** Top bar with language switcher, theme toggle, user avatar dropdown
- **Extractable props:** `sticky` (boolean, default: `true`)
- **Hardcoded:** Menu items (Account, Settings, Logout), avatar initials logic, `gp-user-menu-*` classes

### CustomTitle
- **Source:** `apps/web/src/components/layout/theme-layout/custom-title.tsx`
- **Category:** layout
- **Description:** Sidebar brand link — 🔑 + "Gemini Proxy"
- **Extractable props:** `collapsed` (boolean)
- **Hardcoded:** Logo emoji, app name text, link href `/`

### LanguageSwitcher
- **Source:** `apps/web/src/components/language-switcher/index.tsx`
- **Category:** layout
- **Description:** EN/VI locale dropdown in header
- **Extractable props:** none
- **Hardcoded:** Supported locales from `@i18n/config`, trigger min-width 132px

---

## Basic Components — Observability / Request Logs

### ConnectionStatusBadge
- **Source:** `apps/web/src/features/observability/components/connection-status-badge.tsx`
- **Category:** basic
- **Description:** Realtime connection dot + label (live/connecting/paused/offline)
- **Extractable props:** `paused` (boolean, default: `false`)
- **Hardcoded:** `gp-conn`, `gp-conn-dot` classes, state colors from CSS, i18n keys under `observability.connection.*`

### LiveRequestFeed
- **Source:** `apps/web/src/features/observability/components/live-request-feed.tsx`
- **Category:** basic
- **Description:** Dense grid feed with status border-left, row highlight on new entries — **reference for request-logs table redesign**
- **Extractable props:** `logs` (array), `loading` (boolean), `onRowClick` (callback)
- **Hardcoded:** Column grid template, `gp-live-feed` / `gp-live-row` classes, Tag colors, 1200ms highlight timeout

### ConsoleToolbar
- **Source:** `apps/web/src/features/observability/components/console-toolbar.tsx`
- **Category:** basic
- **Description:** Page chrome with title, period select, pause/live, refresh — pattern mirrored in request-logs List headerButtons
- **Extractable props:** `selectedDays`, `isLive`, `isRefreshing`, `onDaysChange`, `onRefresh`, `onToggleLive`
- **Hardcoded:** Period options (7/30/90 days), icon choices, title i18n keys

### KpiStrip
- **Source:** `apps/web/src/features/observability/components/kpi-strip.tsx`
- **Category:** basic
- **Description:** Horizontal KPI cells with tick animation on value change
- **Extractable props:** `items` (KpiItem[]), `loading` (boolean)
- **Hardcoded:** `gp-kpi-strip` / `gp-kpi-cell` grid, tone colors via `data-tone`, 280ms tick duration

### DateTimeDisplay
- **Source:** `apps/web/src/components/common/DateTimeDisplay.tsx`
- **Category:** basic
- **Description:** Stacked locale-formatted date + time for table cells
- **Extractable props:** `dateString`, `showTime` (boolean, default: `true`)
- **Hardcoded:** `formatDate`/`formatTime` helpers, "never" fallback i18n

### KeyCombobox
- **Source:** `apps/web/src/features/request-logs/components/key-combobox.tsx`
- **Category:** basic
- **Description:** Searchable select for API/proxy key filters
- **Extractable props:** `resource` (`'api_keys' | 'proxy_api_keys'`), `value`, `onChange`, `placeholder`, `allowClear`
- **Hardcoded:** Label format `name · shortId`, pageSize 200, Refine `useList` query

### StatusToggle
- **Source:** `apps/web/src/components/common/StatusToggle.tsx`
- **Category:** basic
- **Description:** Active/inactive badge + enable/disable switch
- **Extractable props:** `isActive`, `onToggle`, `loading`
- **Hardcoded:** Badge status colors, switch size `small`, i18n active/inactive labels

---

## Request Logs Page Sections (page-local, extractable as composites)

### RequestLogsFilterPanel
- **Source:** inline in `apps/web/src/app/(protected)/request-logs/page.tsx` (`.gp-panel` filter block)
- **Category:** basic
- **Description:** Collapsible filter form with active-filter tags and localStorage persistence
- **Extractable props:** `filtersOpen`, `activeFilterCount`, `formValues`, `onToggle`, `onReset`, `searchFormProps`
- **Hardcoded:** Filter fields (request_id, api_format, is_successful, is_stream, api_key_id, proxy_key_id, date_range), `gp.logs.filtersOpen` localStorage key

### RequestLogsTable
- **Source:** inline in `apps/web/src/app/(protected)/request-logs/page.tsx` (Table + columns)
- **Category:** basic
- **Description:** Paginated sortable log table in `.gp-panel`
- **Extractable props:** `tableProps`, `isLive`, `onViewDetails`, `onCopyRequestId`
- **Hardcoded:** Column definitions, Tag colors via `getRequestTypeColor`/`getAttemptCountColor`, scroll x 1100

### RequestLogsListHeader
- **Source:** inline in `apps/web/src/app/(protected)/request-logs/page.tsx` (Refine List title + headerButtons)
- **Category:** basic
- **Description:** Title with total badge, connection badge, dashboard link, pause/live, refresh
- **Extractable props:** `total`, `isLive`, `isFetching`, `onToggleLive`, `onRefresh`, `onGoDashboard`
- **Hardcoded:** Badge color from `token.colorPrimary`, button icons, i18n keys

---

## Panel / Surface Primitives (CSS classes, not components)

### GpPanel
- **Source:** `apps/web/src/app/globals.css` (`.gp-panel`, `.gp-panel-sunken`)
- **Category:** basic
- **Description:** Raised/sunken bordered surface used for filters and table wrapper
- **Extractable props:** `variant` (`'raised' | 'sunken'`), `padding`
- **Hardcoded:** `--gp-bg-raised` / `--gp-bg-sunken`, `--gp-border`, `--gp-radius`

### GpChip
- **Source:** `apps/web/src/app/globals.css` (`.gp-chip`)
- **Category:** basic
- **Description:** Small inline label chip (e.g. "Proxy" / "API" prefix in keys column)
- **Extractable props:** `state` (`'active' | 'degraded' | 'disabled'` for dot variant)
- **Hardcoded:** Font size 11px, border-radius 2px, background `--gp-bg-hover`
