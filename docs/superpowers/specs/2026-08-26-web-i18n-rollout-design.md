# Web i18n Rollout Design

**Date:** 2026-08-26  
**Scope:** `apps/web` only (Refine v5 + Next.js 15 App Router + Ant Design 5). Not API, CLI, or worker packages.  
**Locales:** `en` (source / fallback) and `vi`.  
**Decisions locked:** Approach A (official Refine Next.js), LanguageSwitcher on console header + landing + auth.

## Goal

Roll out i18n across every user-facing surface in the web app using Refine’s official Next.js setup: `next-intl` behind Refine `i18nProvider`, with UI reading translations only through `@refinedev/core` `useTranslation` / `useTranslate`. No workarounds: no `useTranslate()` without a provider, no `react-i18next` on this Next.js app, no `/[locale]` URL prefix, no calling `next-intl` hooks from feature UI.

Authoritative references:

- [i18n Provider](https://refine.dev/core/docs/i18n/i18n-provider/)
- [useTranslation](https://refine.dev/core/docs/i18n/hooks/use-translation/)
- [i18n Next.js example](https://github.com/refinedev/refine/tree/main/examples/i18n-nextjs)

## Current state (authoritative)

- `RefineProvider` has no `i18nProvider`.
- No `i18next`, `next-intl`, or locale JSON files.
- Root layout hardcodes `<html lang="en">`.
- `Header` already calls `useTranslate()` with a default-message fallback (`warnWhenUnsavedChanges`). Without a provider this is Refine’s no-op fallback — that pattern is forbidden after this work.
- Resource `meta.label` values are hardcoded English (`Console`, `API Keys`, `Proxy API Keys`, `Logs`, `Settings`).
- Theme already uses cookie `THEME_COOKIE_NAME` via `js-cookie` + `cookies()` in the root layout. Locale follows the same cookie model.

## Architecture

Match Refine `examples/i18n-nextjs`:

1. `next-intl` loads messages for the request from cookie `NEXT_LOCALE`.
2. Root layout wraps the tree with `NextIntlClientProvider`.
3. Client `RefineProvider` builds `I18nProvider` from `next-intl` `useTranslations` / `useLocale` and the `setUserLocale` server action.
4. Feature UI uses only `@refinedev/core` `useTranslation`.
5. Locale is **not** in the path. Existing routes (`/dashboard`, `/login`, `/api/gproxy`, …) stay unchanged.

```text
cookie NEXT_LOCALE
        │
        ▼
src/i18n/request.ts  (getRequestConfig)
        │
        ▼
layout.tsx  html lang={locale} + NextIntlClientProvider
        │
        ▼
RefineProvider  i18nProvider.translate/getLocale/changeLocale
        │
        ▼
useTranslation() in Header, pages, features
        │
        ▼
changeLocale → setUserLocale + Cookies.set('NEXT_LOCALE') → router.refresh()
```

### Dependencies

Add to `apps/web`:

- `next-intl` `^3.25.3` (same major as Refine’s i18n-nextjs example; compatible with Next 15)

Do **not** add `i18next`, `react-i18next`, `i18next-http-backend`, or `i18next-browser-languagedetector`. Those are the SPA stack; Refine’s Next.js example does not use them.

### Files to create

| File                                                  | Responsibility                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/web/src/i18n/config.ts`                         | `I18N_COOKIE_NAME = 'NEXT_LOCALE'`, `DEFAULT_LOCALE = 'en'`, `SUPPORTED_LOCALES = ['en', 'vi'] as const` |
| `apps/web/src/i18n/index.ts`                          | Server actions `getUserLocale()`, `setUserLocale(locale)` using **async** `cookies()` (Next 15)          |
| `apps/web/src/i18n/request.ts`                        | `getRequestConfig` from `next-intl/server`; load `public/locales/${locale}/common.json`                  |
| `apps/web/src/i18n/antd-locale.ts`                    | Map `en` → `antd/locale/en_US`, `vi` → `antd/locale/vi_VN`                                               |
| `apps/web/src/components/language-switcher/index.tsx` | Dropdown using Refine `useTranslation().getLocale/changeLocale`                                          |
| `apps/web/public/locales/en/common.json`              | Source catalog                                                                                           |
| `apps/web/public/locales/vi/common.json`              | Full Vietnamese catalog (every key present)                                                              |

`@i18n` already resolves via existing tsconfig `"@*": ["./src/*"]`.

### Files to modify (wiring)

| File                                               | Change                                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/next.config.mjs`                         | Wrap config with `createNextIntlPlugin('./src/i18n/request.ts')`. Keep `transpilePackages`, `output: 'standalone'`, and `initOpenNextCloudflareForDev()`. |
| `apps/web/src/app/layout.tsx`                      | `const locale = await getLocale(); const messages = await getMessages();` set `<html lang={locale}>`; wrap children with `NextIntlClientProvider`.        |
| `apps/web/src/providers/refine-provider/index.tsx` | Import `./i18n` side-effect not required (next-intl plugin + provider). Build and pass `i18nProvider`. Remove `meta.label` from all resources.            |
| `apps/web/src/contexts/color-mode/index.tsx`       | Pass Ant Design `ConfigProvider locale={antdLocale}` from current Refine locale.                                                                          |
| `apps/web/package.json`                            | Add `next-intl`.                                                                                                                                          |

### i18nProvider contract

Implement inside `RefineProvider` exactly as Refine’s Next.js example, with Next 15 cookie actions:

```ts
import type { I18nProvider } from "@refinedev/core";
import { useLocale, useTranslations } from "next-intl";
import { setUserLocale } from "@i18n";

const t = useTranslations();

const i18nProvider: I18nProvider = {
  translate: (key: string, options?: unknown, defaultMessage?: string) => {
    if (typeof options === "string") {
      return t(key, { defaultMessage: options });
    }
    return t(key, { ...(options as object), defaultMessage } as never);
  },
  changeLocale: setUserLocale,
  getLocale: useLocale,
};
```

`useTranslations` / `useLocale` are allowed **only** in `RefineProvider` (the adapter). Everywhere else uses `@refinedev/core`.

`getUserLocale` / `setUserLocale` must `await cookies()` (this app already awaits cookies for theme). Invalid cookie values resolve to `DEFAULT_LOCALE`.

`setUserLocale` must no-op (or clamp) when `locale` is not in `SUPPORTED_LOCALES`.

### LanguageSwitcher

One shared client component, copied from Refine’s example header:

- `const { getLocale, changeLocale } = useTranslation();`
- Items: `en` → English, `vi` → Tiếng Việt
- `onClick`: `changeLocale(lang); Cookies.set('NEXT_LOCALE', lang); router.refresh();`
- Selected key = `getLocale()`
- Mount points: console `Header` (next to theme switch), landing (top of `LandingPage`, end-aligned like the console header), auth card (`AuthPage`, above the title)

Do not duplicate switcher logic in those three parents.

### Ant Design locale

`ConfigProvider` in `ColorModeContextProvider` must set `locale` from `antd-locale.ts`. This localizes Pagination, DatePicker, Empty, Table defaults. It does **not** replace Refine keys for Refine buttons.

`DateTimeDisplay` and `formatDate` / `formatTime` in `table-helpers.ts` currently call `toLocaleDateString()` / `toLocaleTimeString()` with no locale (browser default) and hardcode `"Never"`. After i18n:

- `formatDate` / `formatTime` take a `locale: string` argument and use `Intl.DateTimeFormat(locale, …)`. They return `''` when the date is missing — they never return the word `"Never"`.
- `DateTimeDisplay` (client) calls `translate('common.never')` for empty values and passes `getLocale()` into the helpers.

Do not call `useTranslation` inside `table-helpers.ts`. `formatTokenCount` compact suffixes (`K`/`M`) stay as SI abbreviations. Call sites that currently render `'N/A'` use `translate('common.na')` in the component.

### Resource labels

`useMenu()` in `custom-sider.tsx` uses `item.label ?? meta.label ?? item.name`. Refine fills `item.label` from i18n when `meta.label` is omitted. Therefore **delete** every `meta.label` in `RefineProvider` resources. Keep `meta.icon`.

Required catalog keys:

| Resource name    | Menu key                        | Titles                                          |
| ---------------- | ------------------------------- | ----------------------------------------------- |
| `dashboard`      | `dashboard.dashboard`           | `dashboard.titles.list`                         |
| `api_keys`       | `api_keys.api_keys`             | `api_keys.titles.{list,create,edit,show}`       |
| `proxy_api_keys` | `proxy_api_keys.proxy_api_keys` | `proxy_api_keys.titles.{list,create,edit,show}` |
| `request_logs`   | `request_logs.request_logs`     | `request_logs.titles.{list,show}`               |
| `user_settings`  | `user_settings.user_settings`   | `user_settings.titles.list`                     |

Brand string `"Gemini Proxy"` in `custom-title.tsx` stays untranslated (product name).

## Message catalog

Single namespace, Refine default path:

- `apps/web/public/locales/en/common.json`
- `apps/web/public/locales/vi/common.json`

No per-feature JSON files. No extra next-intl namespaces.

### Layer 1 — Refine built-in keys

Copy the official schema from the i18n Provider “Translation file” section into both locale files, then translate `vi`. Required top-level groups:

- `pages.login`, `pages.forgotPassword`, `pages.register`, `pages.updatePassword`, `pages.error`
- `actions`, `buttons`, `notifications`, `warnWhenUnsavedChanges`, `loading`, `tags`, `table`, `autoSave`
- `documentTitle` including `documentTitle.default`, `documentTitle.suffix`, and per-resource `documentTitle.{resource}.{list,show,edit,create}` for `dashboard`, `api_keys`, `proxy_api_keys`, `request_logs`, `user_settings`

Auth UI in this app is a **custom** `AuthPage`, not Refine `<AuthPage />`. It still must use the official `pages.*` keys so Refine notifications/buttons and our forms share one catalog.

### Layer 2 — App resource + surface keys

Same file, nested objects:

- `header.*` — Account, Settings, Logout, Account menu aria-label
- `languageSwitcher.en`, `languageSwitcher.vi`
- `common.never`, `common.na`, `common.active`, `common.inactive`
- `landing.*` — hero, features, architecture, deployment, footer, tech stack (marketing copy only; code samples stay English)
- `observability.*` — KPI labels, toolbar ranges, connection states, chart titles
- `settings.*` — tabs, appearance, observability form
- `account.*` — profile / email / security sections in the account modal
- `proxy_quickstart.*` — tab labels, SDK picker labels that are UI chrome (not code)
- `api_keys.fields.*`, `proxy_api_keys.fields.*`, `request_logs.fields.*`

### Copy rules

- Complete sentences. Named interpolation uses next-intl / ICU: `Successfully created {resource}` (Refine `i18n-nextjs` example). Never i18next `{{resource}}`. Never concatenate translated fragments.
- Plurals: ICU via next-intl, e.g. `{count, plural, one {# request} other {# requests}}`. Vietnamese uses `other` (CLDR one-form); still include `one`/`other` in `en` and a natural `other` in `vi`.
- Do **not** translate: API secrets, emails, UUIDs, raw JSON payloads, code blocks, brand/product names (`Gemini`, `OpenAI`, `Google AI Studio`, `Gemini Proxy`, SDK names).
- `PROVIDERS.googleaistudio.label` stays `"Google AI Studio"` (brand).
- Every `en` key exists in `vi`. Missing `vi` is a defect, not a fallback strategy for shipped keys. Runtime fallback to `en` is only for unknown/new keys during development.

### Fallback and errors

- Unknown cookie → `en`.
- Missing message: do not throw. next-intl `getRequestConfig` / provider must not crash the tree. Show English if present, otherwise the key.
- `global-error.tsx` is outside the Refine/next-intl tree. Leave it English-only. Do not hardcode a parallel Vietnamese string there.
- `not-found.tsx` uses Refine `ErrorComponent` inside `Authenticated` and **is** covered by the provider — use catalog `pages.error.*`.

## Component usage

Allowed in feature/page components:

```ts
import { useTranslation } from "@refinedev/core";

const { translate, getLocale, changeLocale } = useTranslation();
```

`useTranslate()` is allowed only as the Refine alias for `translate`, and only after `i18nProvider` exists.

Forbidden:

- `useTranslations` / `useLocale` / `useMessages` from `next-intl` outside `RefineProvider`
- Hardcoded user-facing strings in JSX, `placeholder`, `title`, `label`, `notification.open`, `window.confirm`, `aria-label`
- `meta.label` on resources
- String-built sentences (`'Deleted ' + name`)

Refine table/form titles use `translate('api_keys.titles.list')` (or omit so Refine infers from the resource). Notifications use `notifications.*` with `resource` interpolated from the resource menu key.

## Out of scope

- `src/app/api/**` and `src/app/auth/**` route handlers
- `src/app/api/gproxy/**`
- Translating user-generated or stored data (key names, log bodies)
- RTL / `dir` (neither `en` nor `vi` is RTL)
- TMS, DeepL automation, pseudo-locale CI (can be a later spec)
- Changing URL structure
- i18n for `apps/api` or packages

## Rollout phases

Each phase must leave the app bootable (`refine dev` / `refine build`) and locale-switchable.

1. **Foundation** — deps, i18n modules, next-intl plugin, provider, cookie, Ant Design locale, LanguageSwitcher, both `common.json` files with Refine built-in keys + `languageSwitcher` + `common.*`.
2. **Shell** — Header, sider (via dropping `meta.label`), document titles, unsaved-changes confirm.
3. **Auth** — login / register / forgot-password / update-password via `pages.*`.
4. **API Keys** — list, create, edit, show.
5. **Proxy API Keys + quickstart** — list, create, edit, show, quickstart chrome.
6. **Request logs** — list, show, intercepting modal, `RequestLogDetails`.
7. **Dashboard / observability** — KPIs, toolbar, charts, live feed, key health.
8. **Settings + account modal** — settings tabs, appearance, observability form, account sections.
9. **Landing** — all marketing sections except code sample bodies.
10. **Gate** — key-parity check `en` vs `vi`, locale persist across reload, switcher on header + login + landing, Ant Design pagination in `vi`, `pnpm --filter web lint` and `pnpm --filter web build`, `/api/gproxy` untouched.

## Testing and verification

No existing web test runner is required to introduce a heavy e2e framework. Verification for this spec:

1. **Catalog parity script** (Node, run in CI or `apps/web` script): flatten both JSON files; fail if key sets differ.
2. **Manual locale switch:** set English, reload, still English; switch to Vietnamese on landing, login, and console header; cookie `NEXT_LOCALE=vi`; `document.documentElement.lang === 'vi'`.
3. **Ant Design:** open a table with pagination in `vi` — “Trang” / Vietnamese locale strings, not English “Previous/Next” from antd default.
4. **Dates:** a log row’s timestamp follows `vi` or `en` locale, not the OS locale when they disagree.
5. **Build:** `pnpm --filter web lint` and `pnpm --filter web build` pass.
6. **Regression:** middleware and `/api/gproxy` still work; no `/vi/` routes exist.

## Engineering rule after rollout

New user-facing copy in `apps/web` is added to both locale files in the same change, and rendered with `useTranslation` from `@refinedev/core`. Default-message overloads are for safety only, not as a substitute for catalog entries.
