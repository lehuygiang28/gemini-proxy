# Routes — Gemini Proxy Web App

Framework: **Next.js 15 App Router** + **Refine** (`@refinedev/nextjs-router`).  
Auth: protected routes under `(protected)/` require session via `authProviderServer.check()`.

## Refine Resource → Route Map

From `apps/web/src/providers/refine-provider/index.tsx`:

| Resource | List | Create | Edit | Show |
|---|---|---|---|---|
| `dashboard` | `/dashboard` | — | — | — |
| `api_keys` | `/api-keys` | `/api-keys/create` | `/api-keys/edit/:id` | `/api-keys/show/:id` |
| `proxy_api_keys` | `/proxy-api-keys` | `/proxy-api-keys/create` | `/proxy-api-keys/edit/:id` | `/proxy-api-keys/show/:id` |
| `request_logs` | `/request-logs` | — | — | `/request-logs/show/:id` |
| `user_settings` | `/settings` | — | — | — |

Sidebar icons: DashboardOutlined, KeyOutlined, SafetyCertificateOutlined, FileTextOutlined, SettingOutlined.

---

## Public Routes

| URL | File | Layout | Summary |
|---|---|---|---|
| `/` | `apps/web/src/app/page.tsx` | Root | Marketing landing (Hero, Features, Architecture, etc.) |
| `/login` | `apps/web/src/app/login/page.tsx` | Root | Auth login form |
| `/register` | `apps/web/src/app/register/page.tsx` | Root | Registration |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | Root | Password reset request |
| `/update-password` | `apps/web/src/app/update-password/page.tsx` | Root | Password update |

---

## Protected Routes (CustomThemedLayout)

Layout chain: `app/layout.tsx` → `app/(protected)/layout.tsx` (`CustomThemedLayout`) → page.

| URL | File | Extra Layout | Summary |
|---|---|---|---|
| `/dashboard` | `apps/web/src/app/(protected)/dashboard/page.tsx` | — | Ops console: KPI strip, charts, live feed, key health |
| `/api-keys` | `apps/web/src/app/(protected)/api-keys/page.tsx` | — | API keys list (Refine List + Table) |
| `/api-keys/create` | `apps/web/src/app/(protected)/api-keys/create/page.tsx` | — | Create API key form |
| `/api-keys/edit/[id]` | `apps/web/src/app/(protected)/api-keys/edit/[id]/page.tsx` | — | Edit API key |
| `/api-keys/show/[id]` | `apps/web/src/app/(protected)/api-keys/show/[id]/page.tsx` | — | API key detail |
| `/proxy-api-keys` | `apps/web/src/app/(protected)/proxy-api-keys/page.tsx` | — | Proxy keys list |
| `/proxy-api-keys/create` | `apps/web/src/app/(protected)/proxy-api-keys/create/page.tsx` | — | Create proxy key |
| `/proxy-api-keys/edit/[id]` | `apps/web/src/app/(protected)/proxy-api-keys/edit/[id]/page.tsx` | — | Edit proxy key |
| `/proxy-api-keys/show/[id]` | `apps/web/src/app/(protected)/proxy-api-keys/show/[id]/page.tsx` | — | Proxy key detail + quickstart |
| **`/request-logs`** | **`apps/web/src/app/(protected)/request-logs/page.tsx`** | **`request-logs/layout.tsx`** | **Request logs list — redesign target** |
| `/request-logs/show/[id]` | `apps/web/src/app/(protected)/request-logs/show/[id]/page.tsx` | `request-logs/layout.tsx` | Full-page log detail |
| `/request-logs` (modal) | `apps/web/src/app/(protected)/request-logs/@modal/(.)show/[id]/page.tsx` | `request-logs/layout.tsx` | Intercepting modal detail |
| `/settings` | `apps/web/src/app/(protected)/settings/page.tsx` | — | User settings page |

---

## Request Logs Route Details (Redesign Target)

**Primary page:** `apps/web/src/app/(protected)/request-logs/page.tsx`

- Refine `List` + `useTable` on resource `request_logs`
- Live mode toggle (`liveMode: 'auto' | 'off'`) with `ConnectionStatusBadge`
- Collapsible filter panel (`.gp-panel`) with `KeyCombobox`, RangePicker, Select filters
- Data table in `.gp-panel` with columns: keys, status, type, stream, performance, tokens, created (`DateTimeDisplay`), request ID, actions
- Deep-link support: `?api_key_id=` / `?proxy_key_id=` query params
- Navigation to detail: `go({ resource: 'request_logs', action: 'show', id })`

**Parallel routes layout:** `apps/web/src/app/(protected)/request-logs/layout.tsx` renders `{children}` + `{modal}` for drawer vs full-page detail.

---

## Router Provider

Refine uses `@refinedev/nextjs-router` — no separate React Router config file. Route definitions live in:
1. Next.js `app/**/page.tsx` file structure
2. Refine `resources` array in `apps/web/src/providers/refine-provider/index.tsx`
