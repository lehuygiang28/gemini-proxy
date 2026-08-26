# Web i18n Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out i18n across `apps/web` with Refine’s official Next.js setup (`next-intl` behind `i18nProvider`, UI via `@refinedev/core` `useTranslation`), locales `en` + `vi`, cookie `NEXT_LOCALE`, no URL prefix.

**Architecture:** Root layout loads messages with next-intl from `NEXT_LOCALE`. `NextIntlClientProvider` wraps the tree. Client `RefineProvider` adapts `useTranslations` / `useLocale` / `setUserLocale` into Refine `I18nProvider`. Feature UI never imports `next-intl`. LanguageSwitcher uses Refine `getLocale` / `changeLocale`. Ant Design locale is passed from the layout `locale` into `ColorModeContextProvider` (same cookie → SSR refresh path as theme).

**Tech Stack:** Refine v5 (`@refinedev/core` ^5), Next.js 15 App Router, Ant Design 5, `next-intl` ^3.25.3, cookie `NEXT_LOCALE`.

**Spec:** [docs/superpowers/specs/2026-08-26-web-i18n-rollout-design.md](../specs/2026-08-26-web-i18n-rollout-design.md)

## Global Constraints

- Interpolation is next-intl / ICU: `{resource}`, `{statusCode}` — never i18next `{{resource}}`.
- Feature/page components import `useTranslation` only from `@refinedev/core`.
- `useTranslations` / `useLocale` from `next-intl` are allowed only in `apps/web/src/providers/refine-provider/index.tsx`.
- Locales: `en` (source, fallback), `vi`. Cookie name: `NEXT_LOCALE`. Default: `en`.
- No `/[locale]` routes. Do not add `i18next` / `react-i18next`.
- Do not translate brand names: Gemini, OpenAI, Google AI Studio, Gemini Proxy, lehuygiang28, SDK identifiers, code samples.
- `pnpm` workspace: run web commands with `pnpm --filter web`.
- `global-error.tsx` stays English-only.
- Every `en` key must exist in `vi` (parity script).
- `cookies()` is async (Next 15). Do not copy Refine example’s sync `cookies()`.

## File structure

| Path                                                  | Role                                                 |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `apps/web/src/i18n/config.ts`                         | Cookie name, default locale, supported locales       |
| `apps/web/src/i18n/index.ts`                          | `getUserLocale` / `setUserLocale` server actions     |
| `apps/web/src/i18n/request.ts`                        | next-intl `getRequestConfig`                         |
| `apps/web/src/i18n/antd-locale.ts`                    | `en` → `en_US`, `vi` → `vi_VN`                       |
| `apps/web/src/components/language-switcher/index.tsx` | Shared locale dropdown                               |
| `apps/web/public/locales/en/common.json`              | English catalog                                      |
| `apps/web/public/locales/vi/common.json`              | Vietnamese catalog                                   |
| `apps/web/scripts/check-locale-parity.mjs`            | Fail if en/vi key sets differ                        |
| `apps/web/next.config.mjs`                            | `createNextIntlPlugin('./src/i18n/request.ts')`      |
| `apps/web/src/app/layout.tsx`                         | `html lang`, `NextIntlClientProvider`, pass `locale` |
| `apps/web/src/providers/refine-provider/index.tsx`    | `i18nProvider`; later drop `meta.label`              |
| `apps/web/src/contexts/color-mode/index.tsx`          | `ConfigProvider locale`                              |

---

### Task 1: Foundation (next-intl + i18nProvider + catalogs + switcher)

**Files:**

- Create: `apps/web/src/i18n/config.ts`
- Create: `apps/web/src/i18n/index.ts`
- Create: `apps/web/src/i18n/request.ts`
- Create: `apps/web/src/i18n/antd-locale.ts`
- Create: `apps/web/src/components/language-switcher/index.tsx`
- Create: `apps/web/public/locales/en/common.json`
- Create: `apps/web/public/locales/vi/common.json`
- Create: `apps/web/scripts/check-locale-parity.mjs`
- Modify: `apps/web/package.json` (dependency + `i18n:check` script)
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/providers/refine-provider/index.tsx`
- Modify: `apps/web/src/contexts/color-mode/index.tsx`
- Modify: `apps/web/src/components/header/index.tsx` (mount switcher only; leave other English for Task 2)
- Modify: `apps/web/src/components/landing/index.tsx`
- Modify: `apps/web/src/components/auth-page/index.tsx` (mount switcher only)

**Interfaces:**

- Consumes: existing `RefineProvider`, `ColorModeContextProvider`, `Header`, `LandingPage`, `AuthPage`
- Produces: `SUPPORTED_LOCALES`, `getUserLocale(): Promise<string>`, `setUserLocale(locale: string): Promise<void>`, `resolveAntdLocale(locale: string)`, `LanguageSwitcher`, Refine `i18nProvider`

- [ ] **Step 1: Write the parity script (fails until catalogs exist)**

Create `apps/web/scripts/check-locale-parity.mjs`:

```js
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function flatten(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatten(child, next);
  });
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(readFileSync(join(root, "public/locales/en/common.json"), "utf8"));
const vi = JSON.parse(readFileSync(join(root, "public/locales/vi/common.json"), "utf8"));
const enKeys = flatten(en).sort();
const viKeys = flatten(vi).sort();
const missingInVi = enKeys.filter((key) => !viKeys.includes(key));
const extraInVi = viKeys.filter((key) => !enKeys.includes(key));
if (missingInVi.length > 0 || extraInVi.length > 0) {
  if (missingInVi.length > 0) {
    console.error("Missing in vi:\n" + missingInVi.join("\n"));
  }
  if (extraInVi.length > 0) {
    console.error("Extra in vi:\n" + extraInVi.join("\n"));
  }
  process.exit(1);
}
console.log(`OK ${enKeys.length} keys`);
```

Add to `apps/web/package.json` scripts: `"i18n:check": "node scripts/check-locale-parity.mjs"`.

- [ ] **Step 2: Run parity script to verify it fails**

Run: `pnpm --filter web i18n:check`

Expected: FAIL with `ENOENT` for `public/locales/en/common.json`.

- [ ] **Step 3: Install next-intl**

Run: `pnpm --filter web add next-intl@^3.25.3`

Expected: `apps/web/package.json` lists `"next-intl": "^3.25.3"` (or a 3.x resolve). Do not add i18next packages.

- [ ] **Step 4: Create i18n modules**

`apps/web/src/i18n/config.ts`:

```ts
export const I18N_COOKIE_NAME = "NEXT_LOCALE";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(value: string | undefined): value is AppLocale {
  return value === "en" || value === "vi";
}
```

`apps/web/src/i18n/index.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, I18N_COOKIE_NAME, isAppLocale } from "./config";

export async function getUserLocale(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(I18N_COOKIE_NAME)?.value;
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export async function setUserLocale(locale: string): Promise<void> {
  if (!isAppLocale(locale)) {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set(I18N_COOKIE_NAME, locale);
}
```

`apps/web/src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./index";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../../public/locales/${locale}/common.json`)).default,
  };
});
```

`apps/web/src/i18n/antd-locale.ts`:

```ts
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import type { Locale } from "antd/es/locale";

export function resolveAntdLocale(locale: string): Locale {
  return locale === "vi" ? viVN : enUS;
}
```

- [ ] **Step 5: Write locale catalogs (Refine built-ins + switcher + common)**

Create `apps/web/public/locales/en/common.json` with this exact JSON (next-intl `{placeholders}`):

```json
{
  "pages": {
    "login": {
      "title": "Sign in to your account",
      "subtitle": "Use your email and password to continue.",
      "signin": "Sign in",
      "signup": "Sign up",
      "register": "Register",
      "divider": "or",
      "fields": {
        "email": "Email",
        "password": "Password"
      },
      "errors": {
        "requiredEmail": "Email is required",
        "requiredPassword": "Password is required",
        "validEmail": "Invalid email address"
      },
      "buttons": {
        "submit": "Sign in",
        "forgotPassword": "Forgot password?",
        "noAccount": "Don't have an account?",
        "haveAccount": "Have an account?",
        "rememberMe": "Remember me",
        "createAccount": "Create account"
      }
    },
    "forgotPassword": {
      "title": "Forgot your password?",
      "subtitle": "Enter your email to receive a reset link.",
      "fields": { "email": "Email" },
      "errors": {
        "requiredEmail": "Email is required",
        "validEmail": "Invalid email address"
      },
      "buttons": {
        "submit": "Send reset link",
        "haveAccount": "Have an account?",
        "backToSignIn": "Back to sign in"
      }
    },
    "register": {
      "title": "Sign up for your account",
      "subtitle": "Create an account with your email and a password.",
      "fields": {
        "email": "Email",
        "password": "Password"
      },
      "errors": {
        "requiredEmail": "Email is required",
        "requiredPassword": "Password is required",
        "validEmail": "Invalid email address",
        "minPassword": "At least 8 characters"
      },
      "buttons": {
        "submit": "Create account",
        "haveAccount": "Have an account? Sign in",
        "forgotPassword": "Forgot password?"
      }
    },
    "updatePassword": {
      "title": "Update password",
      "subtitle": "Choose a new password for your account.",
      "validating": "Validating your reset link…",
      "invalidLink": "Reset link is invalid or expired. Request a new one.",
      "validateFailed": "Could not validate the reset link.",
      "requestNewLink": "Request a new reset link",
      "fields": {
        "password": "New password",
        "confirmPassword": "Confirm password"
      },
      "errors": {
        "requiredPassword": "Password required",
        "requiredConfirmPassword": "Confirm password is required",
        "confirmPasswordNotMatch": "Passwords do not match",
        "minPassword": "At least 8 characters"
      },
      "buttons": {
        "submit": "Update password",
        "backToSignIn": "Back to sign in"
      }
    },
    "error": {
      "info": "You may have forgotten to add the {action} component to {resource} resource.",
      "404": "Sorry, the page you visited does not exist.",
      "resource404": "Are you sure you have created the {resource} resource.",
      "backHome": "Back Home"
    }
  },
  "actions": {
    "list": "List",
    "create": "Create",
    "edit": "Edit",
    "show": "Show",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel"
  },
  "buttons": {
    "create": "Create",
    "save": "Save",
    "logout": "Logout",
    "delete": "Delete",
    "edit": "Edit",
    "cancel": "Cancel",
    "confirm": "Are you sure?",
    "filter": "Filter",
    "clear": "Clear",
    "refresh": "Refresh",
    "show": "Show",
    "undo": "Undo",
    "import": "Import",
    "clone": "Clone",
    "notAccessTitle": "You don't have permission to access"
  },
  "warnWhenUnsavedChanges": "Are you sure you want to leave? You have unsaved changes.",
  "notifications": {
    "success": "Successful",
    "error": "Error (status code: {statusCode})",
    "undoable": "You have {seconds} seconds to undo",
    "createSuccess": "Successfully created {resource}",
    "createError": "There was an error creating {resource} (status code: {statusCode})",
    "deleteSuccess": "Successfully deleted {resource}",
    "deleteError": "Error when deleting {resource} (status code: {statusCode})",
    "editSuccess": "Successfully edited {resource}",
    "editError": "Error when editing {resource} (status code: {statusCode})",
    "importProgress": "Importing: {processed}/{total}"
  },
  "loading": "Loading",
  "tags": { "clone": "Clone" },
  "table": { "actions": "Actions" },
  "autoSave": {
    "success": "saved",
    "error": "auto save failure",
    "loading": "saving...",
    "idle": "waiting for changes"
  },
  "documentTitle": {
    "default": "Gemini Proxy",
    "suffix": " | Gemini Proxy"
  },
  "languageSwitcher": {
    "en": "English",
    "vi": "Tiếng Việt",
    "label": "Language"
  },
  "common": {
    "never": "Never",
    "na": "N/A",
    "active": "Active",
    "inactive": "Inactive",
    "enable": "Click to enable",
    "disable": "Click to disable"
  }
}
```

Create `apps/web/public/locales/vi/common.json` with the **same keys**, Vietnamese values:

- `pages.login.title` = `Đăng nhập vào tài khoản`
- `pages.login.subtitle` = `Dùng email và mật khẩu để tiếp tục.`
- `pages.login.signin` = `Đăng nhập`
- `pages.login.signup` = `Đăng ký`
- `pages.login.buttons.submit` = `Đăng nhập`
- `pages.login.buttons.forgotPassword` = `Quên mật khẩu?`
- `pages.login.buttons.createAccount` = `Tạo tài khoản`
- `pages.login.fields.email` = `Email`
- `pages.login.fields.password` = `Mật khẩu`
- `pages.login.errors.requiredEmail` = `Email là bắt buộc`
- `pages.login.errors.requiredPassword` = `Mật khẩu là bắt buộc`
- `pages.login.errors.validEmail` = `Địa chỉ email không hợp lệ`
- `pages.register.title` = `Đăng ký tài khoản`
- `pages.register.subtitle` = `Tạo tài khoản bằng email và mật khẩu.`
- `pages.register.buttons.submit` = `Tạo tài khoản`
- `pages.register.buttons.haveAccount` = `Đã có tài khoản? Đăng nhập`
- `pages.register.errors.minPassword` = `Ít nhất 8 ký tự`
- `pages.forgotPassword.title` = `Quên mật khẩu?`
- `pages.forgotPassword.subtitle` = `Nhập email để nhận liên kết đặt lại.`
- `pages.forgotPassword.buttons.submit` = `Gửi liên kết đặt lại`
- `pages.forgotPassword.buttons.backToSignIn` = `Quay lại đăng nhập`
- `pages.updatePassword.title` = `Cập nhật mật khẩu`
- `pages.updatePassword.subtitle` = `Chọn mật khẩu mới cho tài khoản.`
- `pages.updatePassword.validating` = `Đang xác thực liên kết đặt lại…`
- `pages.updatePassword.invalidLink` = `Liên kết đặt lại không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.`
- `pages.updatePassword.validateFailed` = `Không thể xác thực liên kết đặt lại.`
- `pages.updatePassword.requestNewLink` = `Yêu cầu liên kết đặt lại mới`
- `pages.updatePassword.fields.password` = `Mật khẩu mới`
- `pages.updatePassword.fields.confirmPassword` = `Xác nhận mật khẩu`
- `pages.updatePassword.errors.confirmPasswordNotMatch` = `Mật khẩu không khớp`
- `pages.updatePassword.buttons.submit` = `Cập nhật mật khẩu`
- `pages.error.404` = `Trang bạn truy cập không tồn tại.`
- `pages.error.backHome` = `Về trang chủ`
- `actions.list` = `Danh sách`; `create` = `Tạo`; `edit` = `Sửa`; `show` = `Xem`; `delete` = `Xóa`; `save` = `Lưu`; `cancel` = `Hủy`
- `buttons.logout` = `Đăng xuất`; `refresh` = `Làm mới`; `filter` = `Lọc`; `clear` = `Xóa bộ lọc`
- `warnWhenUnsavedChanges` = `Bạn có chắc muốn rời đi? Các thay đổi chưa được lưu.`
- `notifications.createSuccess` = `Đã tạo {resource} thành công`
- `notifications.deleteSuccess` = `Đã xóa {resource} thành công`
- `notifications.editSuccess` = `Đã sửa {resource} thành công`
- `loading` = `Đang tải`
- `table.actions` = `Thao tác`
- `languageSwitcher.en` = `English`; `vi` = `Tiếng Việt`; `label` = `Ngôn ngữ`
- `common.never` = `Chưa từng`; `na` = `N/A`; `active` = `Bật`; `inactive` = `Tắt`; `enable` = `Bấm để bật`; `disable` = `Bấm để tắt`
- Remaining Refine keys (`notifications.error`, `autoSave.*`, `buttons.notAccessTitle`, `pages.error.info`, …) must be translated in the same file — do not omit keys. Mirror the English tree exactly.

- [ ] **Step 6: Run parity script**

Run: `pnpm --filter web i18n:check`

Expected: `OK <n> keys` (n ≥ 80). FAIL if any key missing in `vi`.

- [ ] **Step 7: Wire next.config, layout, providers**

`apps/web/next.config.mjs`:

```js
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@refinedev/antd", "@uiw/react-json-view"],
  output: "standalone",
};

export default withNextIntl(nextConfig);

initOpenNextCloudflareForDev();
```

In `apps/web/src/app/layout.tsx`:

- Import `NextIntlClientProvider` from `next-intl`
- Import `getLocale`, `getMessages` from `next-intl/server`
- Import `resolveAntdLocale` from `@i18n/antd-locale`
- Inside `RootLayout`: `const locale = await getLocale(); const messages = await getMessages();`
- `<html lang={locale} ...>`
- Wrap `ColorModeContextProvider` with `defaultMode` **and** `locale={locale}`
- Wrap inside that (or around Refine) with:

```tsx
<NextIntlClientProvider locale={locale} messages={messages}>
```

Pass `locale` into `ColorModeContextProvider`.

In `apps/web/src/contexts/color-mode/index.tsx`:

- Extend props: `locale?: string`
- `ConfigProvider` add `locale={resolveAntdLocale(locale ?? 'en')}`

In `apps/web/src/providers/refine-provider/index.tsx` add (keep `meta.label` until Task 2):

```tsx
import type { I18nProvider } from '@refinedev/core';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@i18n';

export function RefineProvider({ children }: PropsWithChildren) {
    const t = useTranslations();
    const i18nProvider: I18nProvider = {
        translate: (key: string, options?: unknown, defaultMessage?: string) => {
            if (typeof options === 'string') {
                return t(key, { defaultMessage: options });
            }
            return t(key, { ...(options as Record<string, unknown> | undefined), defaultMessage });
        },
        changeLocale: setUserLocale,
        getLocale: useLocale,
    };
    return (
        <RefineKbarProvider>
            <Refine i18nProvider={i18nProvider} /* existing props unchanged */>
```

- [ ] **Step 8: LanguageSwitcher + mount points**

`apps/web/src/components/language-switcher/index.tsx`:

```tsx
"use client";

import { DownOutlined } from "@ant-design/icons";
import { useTranslation } from "@refinedev/core";
import { Button, Dropdown, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { I18N_COOKIE_NAME, SUPPORTED_LOCALES } from "@i18n/config";

export function LanguageSwitcher() {
  const { getLocale, changeLocale, translate } = useTranslation();
  const currentLocale = getLocale();
  const router = useRouter();

  const items: MenuProps["items"] = SUPPORTED_LOCALES.map((lang) => ({
    key: lang,
    label: translate(`languageSwitcher.${lang}`),
    onClick: () => {
      void changeLocale(lang).then(() => {
        Cookies.set(I18N_COOKIE_NAME, lang);
        router.refresh();
      });
    },
  }));

  return (
    <Dropdown menu={{ items, selectedKeys: currentLocale ? [currentLocale] : [] }}>
      <Button type="text" aria-label={translate("languageSwitcher.label")}>
        <Space>
          <Typography.Text>
            {translate(`languageSwitcher.${currentLocale === "vi" ? "vi" : "en"}`)}
          </Typography.Text>
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
}
```

Mount `<LanguageSwitcher />` in:

1. `Header` — inside the existing `<Space size={12}>`, **before** the theme `Switch`
2. `LandingPage` — a top bar `div` with `display:flex; justify-content:flex-end; padding`
3. `AuthPage` — above the title, `display:flex; justify-content:flex-end`

- [ ] **Step 9: Verify foundation**

Run:

```bash
pnpm --filter web i18n:check
pnpm --filter web lint
pnpm --filter web build
```

Expected: parity OK; lint pass; build pass.

Manual: open `/` and `/login`, switch to Tiếng Việt, reload — cookie `NEXT_LOCALE=vi`, `<html lang="vi">`. Console header switcher present. Menu labels still English (`meta.label`) until Task 2.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/i18n apps/web/src/components/language-switcher apps/web/public/locales apps/web/scripts/check-locale-parity.mjs apps/web/package.json apps/web/next.config.mjs apps/web/src/app/layout.tsx apps/web/src/providers/refine-provider/index.tsx apps/web/src/contexts/color-mode/index.tsx apps/web/src/components/header/index.tsx apps/web/src/components/landing/index.tsx apps/web/src/components/auth-page/index.tsx pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(web): add Refine next-intl i18nProvider

- Wire official Next.js i18n adapter and en/vi catalogs
- Persist locale in NEXT_LOCALE and expose LanguageSwitcher
EOF
)"
```

---

### Task 2: Shell (resource labels, header, dates, status)

**Files:**

- Modify: `apps/web/public/locales/en/common.json`
- Modify: `apps/web/public/locales/vi/common.json`
- Modify: `apps/web/src/providers/refine-provider/index.tsx` (delete every `meta.label`)
- Modify: `apps/web/src/components/header/index.tsx`
- Modify: `apps/web/src/utils/table-helpers.ts` (`formatDate` / `formatTime` / stop returning `"Never"` / stop exporting English `getStatusText` for UI)
- Modify: `apps/web/src/components/common/DateTimeDisplay.tsx`
- Modify: `apps/web/src/components/common/StatusToggle.tsx`

**Interfaces:**

- Consumes: Task 1 `i18nProvider`, `translate`, `getLocale`
- Produces: resource menu keys `dashboard.dashboard`, `api_keys.api_keys`, `proxy_api_keys.proxy_api_keys`, `request_logs.request_logs`, `user_settings.user_settings` plus `titles.*` and `documentTitle.{resource}.*`

- [ ] **Step 1: Add resource keys to both catalogs**

Merge into `en/common.json` (and matching `vi`):

```json
{
  "header": {
    "account": "Account",
    "settings": "Settings",
    "logout": "Logout",
    "accountMenu": "Account menu"
  },
  "dashboard": {
    "dashboard": "Console",
    "titles": { "list": "Console" }
  },
  "api_keys": {
    "api_keys": "API Keys",
    "titles": {
      "list": "API Keys",
      "create": "Create API Key",
      "edit": "Edit API Key",
      "show": "Show API Key"
    }
  },
  "proxy_api_keys": {
    "proxy_api_keys": "Proxy API Keys",
    "titles": {
      "list": "Proxy API Keys",
      "create": "Create Proxy API Key",
      "edit": "Edit Proxy API Key",
      "show": "Show Proxy API Key"
    }
  },
  "request_logs": {
    "request_logs": "Logs",
    "titles": { "list": "Logs", "show": "Show Log" }
  },
  "user_settings": {
    "user_settings": "Settings",
    "titles": { "list": "Settings" }
  },
  "documentTitle": {
    "default": "Gemini Proxy",
    "suffix": " | Gemini Proxy",
    "dashboard": { "list": "Console | Gemini Proxy" },
    "api_keys": {
      "list": "API Keys | Gemini Proxy",
      "show": "#{id} API Key | Gemini Proxy",
      "edit": "#{id} Edit API Key | Gemini Proxy",
      "create": "Create API Key | Gemini Proxy"
    },
    "proxy_api_keys": {
      "list": "Proxy API Keys | Gemini Proxy",
      "show": "#{id} Proxy API Key | Gemini Proxy",
      "edit": "#{id} Edit Proxy API Key | Gemini Proxy",
      "create": "Create Proxy API Key | Gemini Proxy"
    },
    "request_logs": {
      "list": "Logs | Gemini Proxy",
      "show": "#{id} Log | Gemini Proxy"
    },
    "user_settings": { "list": "Settings | Gemini Proxy" }
  }
}
```

Vietnamese menu: `dashboard.dashboard` = `Bảng điều khiển`; `api_keys.api_keys` = `API Keys` (brand-style, keep “API Keys” or use `Khóa API` — use `Khóa API`); `proxy_api_keys.proxy_api_keys` = `Khóa proxy`; `request_logs.request_logs` = `Nhật ký`; `user_settings.user_settings` = `Cài đặt`. Header: `account` = `Tài khoản`; `settings` = `Cài đặt`; `logout` = `Đăng xuất`; `accountMenu` = `Menu tài khoản`.

- [ ] **Step 2: Run `pnpm --filter web i18n:check`**

Expected: PASS with increased key count.

- [ ] **Step 3: Drop `meta.label` and translate header chrome**

In `refine-provider`, delete `label: 'Console' | 'API Keys' | ...` from every `meta`. Keep `icon`.

In `header/index.tsx`:

```tsx
const { translate, getLocale } = useTranslation();
// menu items:
label: translate('header.account'),
label: translate('header.settings'),
label: translate('header.logout'),
aria-label={translate('header.accountMenu')}
```

Keep existing `translate('warnWhenUnsavedChanges', '...')` — catalog now supplies the key.

- [ ] **Step 4: Locale-aware dates and status**

`formatDate` / `formatTime` in `table-helpers.ts`:

```ts
export const formatDate = (dateString: string | null | undefined, locale: string): string => {
  if (!dateString) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(dateString));
};

export const formatTime = (dateString: string | null | undefined, locale: string): string => {
  if (!dateString) return "";
  return new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(new Date(dateString));
};
```

Remove the `'Never'` return. Update every `formatDate(` / `formatTime(` call site to pass `getLocale()` (Task 2: `DateTimeDisplay` only; later tasks fix remaining call sites — grep `formatDate(` and pass locale in the same PR if they are client components). If a call site is a non-component helper, thread `locale: string` through.

`DateTimeDisplay.tsx` add `'use client'` if missing, then:

```tsx
const { translate, getLocale } = useTranslation();
if (!dateString) {
  return <Text type="secondary">{translate("common.never")}</Text>;
}
const locale = getLocale();
// formatDate(dateString, locale) / formatTime(dateString, locale)
```

`StatusToggle.tsx`:

```tsx
const { translate } = useTranslation();
<Badge status={getStatusValue(isActive)} text={translate(isActive ? 'common.active' : 'common.inactive')} />
<Tooltip title={translate(isActive ? 'common.disable' : 'common.enable')}>
```

Stop using `getStatusText` from this component. Leave `getStatusText` unused or delete it if no remaining callers (`rg getStatusText apps/web`).

- [ ] **Step 5: Verify**

Run: `pnpm --filter web i18n:check && pnpm --filter web lint`

Manual: `/dashboard` sider in `vi` shows `Bảng điều khiển`, `Khóa API`, `Khóa proxy`, `Nhật ký`, `Cài đặt`. Header Account/Settings/Logout translated. Theme switch unchanged.

- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize shell labels and dates

- Drive sider from i18n resource keys instead of meta.label
- Format dates with the app locale and translate header chrome
EOF
)"
```

---

### Task 3: Auth pages

**Files:**

- Modify: `apps/web/src/components/auth-page/index.tsx`
- Modify: `apps/web/src/app/update-password/update-password-client.tsx`

**Interfaces:**

- Consumes: `pages.login|register|forgotPassword|updatePassword.*` from Task 1 catalogs
- Produces: zero hardcoded auth chrome (Supabase error `.message` may still display as returned)

- [ ] **Step 1: Replace AuthPage copy with `translate`**

At top of `AuthPage`:

```tsx
const { translate } = useTranslation();
```

Replace `titles` useMemo:

```tsx
const titles = useMemo(() => {
  switch (type) {
    case "register":
      return {
        title: translate("pages.register.title"),
        submit: translate("pages.register.buttons.submit"),
      };
    case "forgotPassword":
      return {
        title: translate("pages.forgotPassword.title"),
        submit: translate("pages.forgotPassword.buttons.submit"),
      };
    case "updatePassword":
      return {
        title: translate("pages.updatePassword.title"),
        submit: translate("pages.updatePassword.buttons.submit"),
      };
    default:
      return {
        title: translate("pages.login.title"),
        submit: translate("pages.login.buttons.submit"),
      };
  }
}, [type, translate]);
```

Replace hardcoded strings:

| Current                                | Key                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Account created. Check your email...` | `pages.register.infoCreated` — **add this key to en+vi** (`Check your email to confirm, then sign in.`)       |
| `Password updated. Sign in...`         | `pages.updatePassword.infoUpdated`                                                                            |
| `Password reset email sent...`         | `pages.forgotPassword.infoSent`                                                                               |
| `Login failed`                         | `pages.login.errors.failed`                                                                                   |
| `Register failed`                      | `pages.register.errors.failed`                                                                                |
| `Failed to send reset email`           | `pages.forgotPassword.errors.failed`                                                                          |
| `Failed to update password`            | `pages.updatePassword.errors.failed`                                                                          |
| `Something went wrong`                 | `notifications.error` without status, or add `common.genericError` = `Something went wrong` / `Đã xảy ra lỗi` |
| Footer `Create account`                | `pages.login.buttons.createAccount`                                                                           |
| Footer `Forgot password?`              | `pages.login.buttons.forgotPassword`                                                                          |
| Footer `Have an account? Sign in`      | `pages.register.buttons.haveAccount`                                                                          |
| Footer `Back to sign in`               | `pages.forgotPassword.buttons.backToSignIn`                                                                   |
| Subtitles                              | `pages.*.subtitle`                                                                                            |
| Form labels/rules                      | `pages.login.fields.*` and `pages.login.errors.*` / `pages.updatePassword.errors.*`                           |

Add the extra keys listed above to both JSON files before coding. Run `i18n:check`.

`footerLinks` must depend on `[type, translate]`.

- [ ] **Step 2: Update-password gate**

In `update-password-client.tsx` use `useTranslation()`:

- Title: `translate('pages.updatePassword.title')`
- Loading: `translate('pages.updatePassword.validating')`
- Fallback invalid: `translate('pages.updatePassword.invalidLink')`
- Catch: `translate('pages.updatePassword.validateFailed')`
- Links: `pages.updatePassword.requestNewLink`, `pages.forgotPassword.buttons.backToSignIn`

- [ ] **Step 3: Verify**

Run: `pnpm --filter web i18n:check && pnpm --filter web lint`

Manual: `/login`, `/register`, `/forgot-password` in `vi` — titles, buttons, validation messages Vietnamese. Switcher still top-right.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize auth pages via Refine pages.* keys

- Custom AuthPage and reset-link gate read the official catalog
EOF
)"
```

---

### Task 4: API Keys CRUD

**Files:**

- Modify: `apps/web/public/locales/en/common.json` and `vi/common.json` (`api_keys.fields`, placeholders, create-flow chrome)
- Modify: `apps/web/src/app/(protected)/api-keys/page.tsx`
- Modify: `apps/web/src/app/(protected)/api-keys/create/page.tsx`
- Modify: `apps/web/src/app/(protected)/api-keys/edit/[id]/page.tsx`
- Modify: `apps/web/src/app/(protected)/api-keys/show/[id]/page.tsx`

**Interfaces:**

- Consumes: `api_keys.titles.*`, `common.active|inactive`, `table.actions`
- Produces: `api_keys.fields.*`, `api_keys.placeholders.*`, `api_keys.create.*`

- [ ] **Step 1: Add keys (en + vi)**

```json
{
  "api_keys": {
    "fields": {
      "name": "Name",
      "apiKey": "API Key",
      "provider": "Provider",
      "status": "Status",
      "health": "Health",
      "usage": "Usage Statistics",
      "tokens": "Token Usage",
      "lastUsed": "Last Used",
      "lastError": "Last Error",
      "details": "API Key Details"
    },
    "placeholders": {
      "searchName": "Search API key names...",
      "allProviders": "All Providers",
      "allStatus": "All Status",
      "nameExample": "e.g., My App Key",
      "selectProvider": "Select provider",
      "keyName": "Key Name",
      "apiKey": "API Key"
    },
    "create": {
      "manual": "Manual Entry",
      "bulkPaste": "Bulk Paste",
      "importJson": "Import JSON",
      "bulkPlaceholder": "Paste API keys here, separated by commas, spaces, new lines, semicolons, or pipes.",
      "jsonPlaceholder": "Paste a JSON array of API keys."
    }
  }
}
```

Vietnamese: `name` = `Tên`; `status` = `Trạng thái`; `health` = `Sức khỏe`; `usage` = `Thống kê sử dụng`; `tokens` = `Token`; `lastUsed` = `Dùng lần cuối`; `lastError` = `Lỗi gần nhất`; `details` = `Chi tiết khóa API`; placeholders translated equivalently.

- [ ] **Step 2: `i18n:check` must pass**

- [ ] **Step 3: Wire pages**

Each page: `const { translate } = useTranslation();`

List columns: `title: translate('api_keys.fields.name')` (and the other field keys). Search/select placeholders from `api_keys.placeholders.*`. List title: omit hardcoded title so Refine uses `api_keys.titles.list`, or set `title={translate('api_keys.titles.list')}`.

Create/edit form `Form.Item label` and `Input placeholder` from the same keys. Create tabs: `api_keys.create.manual|bulkPaste|importJson`.

Show page field labels from `api_keys.fields.*`.

Grep each file for remaining quoted English UI strings (`rg "placeholder=|title: '|label:"`) and replace.

- [ ] **Step 4: Verify** — `/api-keys` table headers + create form in `vi`. `pnpm --filter web i18n:check && pnpm --filter web lint`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize API Keys CRUD

- Externalize list/create/edit/show chrome into api_keys catalog keys
EOF
)"
```

---

### Task 5: Proxy API Keys + quickstart

**Files:**

- Modify: both locale JSON files
- Modify: `apps/web/src/app/(protected)/proxy-api-keys/page.tsx`
- Modify: `create/page.tsx`, `edit/[id]/page.tsx`, `show/[id]/page.tsx`
- Modify: `apps/web/src/features/proxy-quickstart/components/proxy-quick-start.tsx`
- Modify: `apps/web/src/features/proxy-quickstart/components/copy-row.tsx` (`aria-label` only; code values stay English)

**Interfaces:**

- Consumes: Task 4 patterns
- Produces: `proxy_api_keys.fields.*`, `proxy_api_keys.tabs.keys|quickstart`, `proxy_quickstart.*`

- [ ] **Step 1: Add keys**

```json
{
  "proxy_api_keys": {
    "fields": {
      "name": "Name",
      "proxyKey": "Proxy API Key",
      "status": "Status",
      "health": "Health",
      "usage": "Usage Statistics",
      "tokens": "Token Usage",
      "lastUsed": "Last Used",
      "details": "Proxy API Key Details"
    },
    "placeholders": {
      "searchName": "Search proxy API key names...",
      "allStatus": "All Status",
      "nameExample": "e.g., My App Key",
      "enterOrGenerate": "Enter your API key or generate one below"
    },
    "tabs": { "keys": "Keys", "quickstart": "Quick start" }
  },
  "proxy_quickstart": {
    "empty": "Create an active proxy key first",
    "selectKey": "Select key",
    "selectKeyWarning": "Select a proxy key",
    "copy": "Copy",
    "copied": "Copied",
    "openaiBase": "OpenAI base",
    "openaiChat": "OpenAI chat",
    "geminiBase": "Gemini base",
    "geminiV1beta": "Gemini v1beta",
    "apiKey": "API key",
    "openaiAuth": "OpenAI auth",
    "geminiAuth": "Gemini auth",
    "sdkOpenai": "OpenAI SDK",
    "sdkGemini": "Gemini SDK",
    "curlOpenai": "curl OpenAI",
    "curlGemini": "curl Gemini",
    "copyAria": "Copy {label}"
  }
}
```

Keep SDK/product words in `vi` where they are brand (`OpenAI`, `Gemini`, `curl`). Translate chrome (`empty`, `selectKey`, `copy`, `copied`).

- [ ] **Step 2: `i18n:check`**

- [ ] **Step 3: Wire components** — `translate` on tab labels, columns, placeholders, Empty, CopyRow labels, snippet Copy button, SDK select option labels. Do not translate template literal code in `proxy-quick-start.tsx`.

`copy-row.tsx`: `aria-label={translate('proxy_quickstart.copyAria', { label })}`

- [ ] **Step 4: Verify** `/proxy-api-keys` tabs + quickstart in `vi`. lint + i18n:check.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize proxy API keys and quickstart chrome

- Keep SDK samples in English; translate UI labels only
EOF
)"
```

---

### Task 6: Request logs

**Files:**

- Modify: locale JSON
- Modify: `apps/web/src/app/(protected)/request-logs/page.tsx`
- Modify: `apps/web/src/app/(protected)/request-logs/show/[id]/page.tsx`
- Modify: `apps/web/src/components/RequestLogDetails.tsx`
- Modify: `apps/web/src/features/request-logs/components/key-identity-card.tsx`
- Modify: `apps/web/src/features/request-logs/components/user-identity-card.tsx`
- Modify: `apps/web/src/features/request-logs/components/key-combobox.tsx` (placeholder prop may stay; default English placeholder must use translate at caller)

**Interfaces:**

- Produces: `request_logs.fields.*`, `request_logs.placeholders.*`, `request_logs.identity.*`

- [ ] **Step 1: Add keys**

```json
{
  "request_logs": {
    "fields": {
      "keys": "Keys",
      "status": "Status",
      "type": "Type",
      "stream": "Stream",
      "performance": "Performance",
      "tokens": "Tokens",
      "created": "Created",
      "requestId": "Request ID",
      "body": "Body",
      "headersMeta": "Headers & meta"
    },
    "placeholders": {
      "searchRequestId": "Search request ID…",
      "selectFormat": "Select format",
      "selectStatus": "Select status",
      "selectStream": "Select stream type",
      "searchApiKey": "Search API key by name…",
      "searchProxyKey": "Search proxy key by name…"
    },
    "identity": {
      "apiKey": "API key",
      "proxyKey": "Proxy key",
      "authenticated": "Authenticated user",
      "anonymous": "Anonymous",
      "userId": "User ID",
      "copyUserId": "Copy user ID",
      "copyKeyId": "Copy {title} ID"
    }
  }
}
```

- [ ] **Step 2: `i18n:check`**

- [ ] **Step 3: Wire** every `title:` / `placeholder=` / identity label in the files above. `DateTimeDisplay` already locale-aware. Pass `getLocale()` into any remaining `formatDate` in this feature.

- [ ] **Step 4: Verify** `/request-logs` filters + detail drawer in `vi`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize request logs list and detail

- Translate table chrome and identity cards; leave payloads raw
EOF
)"
```

---

### Task 7: Dashboard / observability

**Files:**

- Modify: locale JSON
- Modify: `apps/web/src/features/observability/components/console-toolbar.tsx`
- Modify: `apps/web/src/features/observability/components/kpi-strip.tsx` (builders take `translate`)
- Modify: `apps/web/src/app/(protected)/dashboard/page.tsx` (pass `translate` into builders)
- Modify: `charts-row.tsx`, `live-request-feed.tsx`, `key-health-panel.tsx`, `key-health-badge.tsx`, `connection-status-badge.tsx`
- Modify: `apps/web/src/features/observability/hooks/use-realtime-connection-status.ts` — return `state` only; translate label in the badge

**Interfaces:**

- Change `buildConsoleKpiItems` / `buildTokenUsageKpiItems` to accept `translate: (key: string, options?: Record<string, unknown>) => string`
- Change connection hook to return `{ state }` without English `label`

- [ ] **Step 1: Add keys**

```json
{
  "observability": {
    "title": "Console",
    "subtitle": "Ops overview, live request feed, and key health",
    "pause": "Pause",
    "resume": "Resume",
    "refresh": "Refresh",
    "last7": "Last 7 days",
    "last30": "Last 30 days",
    "last90": "Last 90 days",
    "kpi": {
      "requests": "Requests",
      "requestsHint": "Period-scoped request count",
      "successRate": "Success rate",
      "avgLatency": "Avg latency",
      "activeKeys": "Active keys",
      "retryRate": "Retry rate",
      "inputTokens": "Input tokens",
      "outputTokens": "Output tokens",
      "cacheTokens": "Cache tokens",
      "totalTokens": "Total tokens",
      "periodHint": "Last {days} days from request logs",
      "periodHintDefault": "Period-scoped from request logs"
    },
    "emptyHourly": "No hourly data",
    "emptyFormat": "No format data",
    "waitingRequests": "Waiting for requests",
    "ok": "OK",
    "fail": "Fail",
    "noKeys": "No keys yet",
    "apiKey": "API key",
    "proxyKey": "Proxy key",
    "successRateTitle": "Success {rate}%",
    "realtimeTitle": "Realtime: {label}",
    "connection": {
      "live": "Live",
      "connecting": "Connecting",
      "paused": "Paused",
      "offline": "Offline"
    }
  }
}
```

- [ ] **Step 2: `i18n:check`**

- [ ] **Step 3: Implement**

`use-realtime-connection-status.ts` — delete `label` from the return type; badge maps `state` → `translate('observability.connection.' + state)`.

`buildConsoleKpiItems(input, translate)`:

```ts
label: translate('observability.kpi.requests'),
hint: translate('observability.kpi.requestsHint'),
```

`buildTokenUsageKpiItems`: `translate('observability.kpi.periodHint', { days: input.periodDays })`.

Dashboard page: `const { translate } = useTranslation(); buildConsoleKpiItems({...}, translate)`.

Toolbar/charts/feed/panel: replace every English string listed in the grep (`Waiting for requests`, `No hourly data`, `Pause`, `Resume`, …).

- [ ] **Step 4: Verify** `/dashboard` KPIs, period select, live/pause, empty states in `vi`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize console observability chrome

- Pass translate into KPI builders; map realtime states to catalog keys
EOF
)"
```

---

### Task 8: Settings + account modal

**Files:**

- Modify: locale JSON
- Modify: `apps/web/src/app/(protected)/settings/page.tsx`
- Modify: `apps/web/src/features/settings/appearance-settings.tsx`
- Modify: `apps/web/src/features/settings/observability-settings-form.tsx`
- Modify: `apps/web/src/features/settings/account-settings-modal.tsx`
- Modify: `apps/web/src/features/settings/account-settings-form.tsx`

- [ ] **Step 1: Add keys**

```json
{
  "settings": {
    "title": "Settings",
    "subtitle": "Control detailed request logging and console preferences.",
    "tabs": { "observability": "Observability", "appearance": "Appearance" },
    "appearance": {
      "title": "Appearance",
      "colorMode": "Color mode",
      "dark": "Dark",
      "light": "Light",
      "hint": "Stored in a browser cookie. Does not affect request logging."
    },
    "observability": {
      "saved": "Settings saved",
      "savedDesc": "Observability preferences updated for new request logs.",
      "saveFailed": "Failed to save settings",
      "banner": "Detailed log bodies are off by default",
      "detailed": "Detailed observability",
      "detailedExtra": "Master switch. When off, logs stay headers-only (current default).",
      "saveRequest": "Save request bodies",
      "saveRequestExtra": "Persist the outbound request JSON/text on request_logs.request_data.body.",
      "saveResponse": "Save response bodies",
      "saveResponseExtra": "Persist the AI response (including streamed wire format) on response_data.body."
    }
  },
  "account": {
    "title": "Account",
    "profile": "Profile",
    "email": "Email",
    "security": "Security",
    "sectionsAria": "Account sections",
    "signInRequired": "Sign in to manage your account.",
    "displayName": "Display name",
    "displayNamePlaceholder": "Your name",
    "maxChars": "Max {max} characters",
    "profileUpdated": "Profile updated",
    "profileUpdatedDesc": "Your display name was saved.",
    "profileFailed": "Profile update failed",
    "newEmail": "New email",
    "currentPassword": "Current password",
    "emailRequested": "Email change requested",
    "emailRequestedDesc": "Check your inbox to confirm the new email (and the old one if Secure email change is enabled).",
    "emailFailed": "Email change failed",
    "newPassword": "New password",
    "confirmPassword": "Confirm new password",
    "passwordUpdated": "Password updated",
    "passwordUpdatedDesc": "Your password was changed successfully.",
    "passwordFailed": "Password change failed",
    "enterEmail": "Enter an email",
    "validEmail": "Enter a valid email",
    "enterCurrentPassword": "Enter your current password",
    "enterNewPassword": "Enter a new password",
    "minPassword": "At least 8 characters",
    "confirmRequired": "Confirm your new password",
    "mismatch": "Passwords do not match",
    "noEmail": "No email on this account"
  }
}
```

- [ ] **Step 2: `i18n:check` then replace every listed string in those five files.** `NAV_ITEMS` cannot stay as a module-level English constant — build it inside the component with `translate`.

- [ ] **Step 3: Verify** `/settings` tabs + appearance + observability form + Account modal in `vi`.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize settings and account modal

- Move profile/security copy into account.* catalog keys
EOF
)"
```

---

### Task 9: Landing

**Files:**

- Modify: locale JSON (`landing.*`)
- Modify: `HeroSection.tsx`, `FeaturesSection.tsx`, `FooterSection.tsx`, `ArchitectureSection.tsx`, `DeploymentSection.tsx`, `TechStackSection.tsx`, `CodeExamplesSection.tsx` (section titles / tab chrome only; code bodies stay English)
- Modify: `apps/web/src/app/layout.tsx` `metadata` — next-intl `getTranslations` is allowed **only in this server layout** for `title`/`description`, OR keep English SEO metadata (product is English-branded). **Decision in this plan:** localize `metadata.title` / `description` with `getTranslations` from `next-intl/server` in `layout.tsx` using keys `landing.meta.title` / `landing.meta.description`. This is a server file, not feature UI; do not use it as precedent for client pages.

- [ ] **Step 1: Add `landing` keys covering every user-visible marketing string**

Required English keys (mirror into `vi`):

```json
{
  "landing": {
    "meta": {
      "title": "Gemini Proxy - API Key Management",
      "description": "Production-ready admin for managing provider API keys, proxy keys, and request logs built with Ant Design and Supabase"
    },
    "hero": {
      "badgeMit": "MIT License",
      "tagline": "Production-Ready API Proxy for Google Gemini",
      "body": "Secure key management, intelligent load balancing, comprehensive monitoring, and seamless streaming. Deploy anywhere with our multi-platform support.",
      "getStarted": "Get Started",
      "github": "View on GitHub"
    },
    "features": {
      "heading": "Core Features",
      "subheading": "Everything you need to manage, monitor, and scale your Gemini API usage",
      "apiKeys": {
        "title": "API Key Management",
        "body": "Secure storage and intelligent rotation of multiple Google Gemini API keys with real-time usage tracking.",
        "t1": "Secure Storage",
        "t2": "Key Rotation",
        "t3": "Usage Analytics"
      },
      "loadBalancing": {
        "title": "Load Balancing",
        "body": "Intelligent request distribution across multiple API keys with automatic failover and retry mechanisms.",
        "t1": "Auto Distribution",
        "t2": "Failover",
        "t3": "Retry Logic"
      },
      "monitoring": {
        "title": "Monitoring & Analytics",
        "body": "Real-time request logging, performance metrics, cost tracking, and comprehensive dashboards.",
        "t1": "Real-time Logs",
        "t2": "Performance Metrics",
        "t3": "Cost Tracking"
      },
      "security": {
        "title": "Security & Access Control",
        "body": "Proxy API key management, request authentication, rate limiting, and secure environment handling.",
        "t1": "Authentication",
        "t2": "Rate Limiting",
        "t3": "Secure Storage"
      },
      "logging": {
        "title": "Comprehensive Logging",
        "body": "Detailed request/response logs with performance metrics, retry attempts, and export capabilities.",
        "t1": "Request Logs",
        "t2": "Response Tracking",
        "t3": "Export Data"
      },
      "platforms": {
        "title": "Multi-Platform Support",
        "body": "Deploy anywhere with support for Next.js, Vercel, Cloudflare, Appwrite, and standalone servers.",
        "t1": "Next.js",
        "t2": "Vercel",
        "t3": "Cloudflare"
      }
    },
    "footer": {
      "blurb": "Production-ready proxy for Google Gemini with secure key management, intelligent load balancing, and comprehensive monitoring.",
      "quickLinks": "Quick Links",
      "dashboard": "Dashboard",
      "github": "GitHub Repository",
      "issues": "Report Issues",
      "builtWith": "Built With",
      "copyright": "© {year} Gemini Proxy • Made with ❤️ by"
    }
  }
}
```

Also add these keys (en + full vi) so Task 9 has no leftover English headings:

```json
{
  "landing": {
    "architecture": {
      "heading": "Architecture",
      "subheading": "Simple, secure, and scalable architecture for production use",
      "howItWorks": "How It Works",
      "yourApp": "Your Application",
      "yourAppBody": "Makes API requests using your preferred SDK",
      "proxyBody": "Intelligently routes requests to healthy API keys, logs request/response data, and manages load balancing",
      "geminiApi": "Google Gemini API",
      "geminiApiBody": "Processes your AI requests",
      "dataStorage": "Data Storage",
      "dataStorageBody": "All data is securely stored in Supabase PostgreSQL with Row Level Security (RLS) enabled for maximum protection. API keys, request logs, and analytics are stored with proper access controls and are accessible only to authorized users.",
      "security": "Security Features",
      "securityBody": "Built with enterprise-grade security including RLS policies, typed RPCs, secure environment handling, and comprehensive audit logging for compliance."
    },
    "deployment": {
      "heading": "Deployment Options",
      "subheading": "Choose the deployment option that best fits your needs",
      "platforms": "Supported Platforms:",
      "web": {
        "title": "Next.js Web App",
        "badge": "Full-Stack",
        "body": "Complete solution with web interface + API proxy in one deployment. Built-in dashboard for managing API keys and monitoring.",
        "t1": "Web Dashboard",
        "t2": "API Proxy",
        "t3": "User Management"
      },
      "api": {
        "title": "Standalone API",
        "badge": "API-Only",
        "body": "Lightweight Node.js API server with minimal resource usage. Perfect for custom deployments and microservices.",
        "t1": "Lightweight",
        "t2": "Customizable",
        "t3": "Scalable"
      },
      "edge": {
        "title": "Edge Functions",
        "badge": "Serverless",
        "body": "Deploy to Vercel, Cloudflare, or Appwrite for global CDN distribution and automatic scaling.",
        "t1": "Global CDN",
        "t2": "Auto-scaling",
        "t3": "Low Latency"
      }
    },
    "tech": {
      "heading": "Tech Stack",
      "subheading": "Built with modern, production-ready technologies",
      "nextDesc": "React framework with App Router",
      "reactDesc": "UI library for building interfaces",
      "tsDesc": "Typed JavaScript at any scale",
      "refineDesc": "React-based admin panel framework",
      "antdDesc": "Enterprise UI design language",
      "supabaseDesc": "Open source Firebase alternative",
      "categoryFramework": "Framework",
      "categoryLibrary": "Library",
      "categoryLanguage": "Language",
      "categoryUi": "UI Library",
      "categoryDatabase": "Database"
    },
    "examples": {
      "heading": "Integration Examples",
      "subheading": "Get started in minutes with our comprehensive SDK examples",
      "copy": "Copy",
      "copied": "Copied!",
      "officialSdk": "Official SDK",
      "compatible": "Compatible",
      "modern": "Modern",
      "googleDesc": "Use the official Google Generative AI SDK with our proxy endpoint:",
      "openaiDesc": "Use OpenAI-compatible clients with our proxy endpoint:",
      "aiSdkDesc": "Use Vercel AI SDK with our proxy endpoint (note the /v1beta path):"
    }
  }
}
```

Keep `tech.name` values (`Next.js 15`, `Refine v5`, …) untranslated. Translate `description` and `category` via the keys above. Code sample `code` strings stay English.

- [ ] **Step 2: `i18n:check`**

- [ ] **Step 3: Convert each landing section to `useTranslation()`**

`FeaturesSection`: build the `features` array **inside** the component with `translate('landing.features.apiKeys.title')` etc. Drop emoji-in-title if it fights translation (keep emoji as separate prefix in JSX: `{icon} {translate(...)}`).

`HeroSection`: translate tagline, body, buttons. Keep title `Gemini Proxy`. Keep badge brand names (TypeScript, Next.js 15, Supabase, Ant Design). Translate only `MIT License`.

`FooterSection`: `translate('landing.footer.copyright', { year: new Date().getFullYear() })` plus the following name link (not translated).

`layout.tsx` metadata: `const t = await getTranslations(); title: t('landing.meta.title')`.

- [ ] **Step 4: Verify** `/` in `vi` — hero, features, footer. Code blocks still English. Switcher top-right.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): localize landing marketing copy

- Keep product name and code samples in English
EOF
)"
```

---

### Task 10: Gate (parity, leftover strings, build)

**Files:**

- Create/modify: `apps/web/scripts/check-locale-parity.mjs` (already from Task 1)
- Modify: `apps/web/package.json` if `i18n:check` is not in `lint` — add `"lint": "eslint . && node scripts/check-locale-parity.mjs"` **or** keep lint separate and document `i18n:check` in CI. This repo’s web lint is `eslint .`. Add `i18n:check` as a second lint command without breaking eslint: `"lint": "eslint . && node scripts/check-locale-parity.mjs"`.
- Grep leftovers and fix in the owning feature files.

**Interfaces:** none new.

- [ ] **Step 1: Write failing leftover hunt**

Run:

```bash
rg -n "placeholder=\"[A-Za-z]" apps/web/src --glob '*.tsx'
rg -n "title: '" apps/web/src --glob '*.tsx'
rg -n "label: '" apps/web/src --glob '*.tsx'
```

Expected after Tasks 1–9: only brand strings, code, or `global-error.tsx`. Any remaining user-facing English in protected/auth/landing must be moved to catalogs in this task (add keys + translate, `i18n:check`).

- [ ] **Step 2: Confirm `formatDate(` / `formatTime(` / `getStatusText(`**

Run: `rg "formatDate\\(|formatTime\\(|getStatusText\\(" apps/web/src`

Every `formatDate`/`formatTime` must pass `locale`. `getStatusText` must have zero UI callers.

- [ ] **Step 3: Fold parity into web lint**

`apps/web/package.json` `"lint": "eslint . && node scripts/check-locale-parity.mjs"`

- [ ] **Step 4: Full verify**

```bash
pnpm --filter web i18n:check
pnpm --filter web lint
pnpm --filter web build
```

Expected: all pass.

Manual checklist:

1. Landing `/` switcher en ↔ vi; reload keeps locale; `document.documentElement.lang` matches
2. `/login` switcher same cookie
3. Console header switcher; sider labels follow locale
4. `/api-keys` table pagination in `vi` uses Ant Design `vi_VN`
5. A log timestamp changes format between `en` and `vi`
6. `/api/gproxy` route file untouched (`git diff -- apps/web/src/app/api` empty)
7. No `/vi/` or `/en/` routes in `apps/web/src/app`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(web): enforce locale catalog parity in lint

- Fail lint when en/vi keys drift; clear leftover hardcoded chrome
EOF
)"
```

---

## Self-review

**Spec coverage:**

| Spec requirement                                 | Task                  |
| ------------------------------------------------ | --------------------- |
| next-intl + i18nProvider + cookie, no URL prefix | 1                     |
| LanguageSwitcher on header + landing + auth      | 1                     |
| Ant Design locale en_US/vi_VN                    | 1                     |
| Refine built-in catalog keys                     | 1                     |
| Drop `meta.label`, resource keys, header, dates  | 2                     |
| Auth `pages.*`                                   | 3                     |
| API Keys                                         | 4                     |
| Proxy keys + quickstart                          | 5                     |
| Request logs                                     | 6                     |
| Dashboard / observability                        | 7                     |
| Settings + account                               | 8                     |
| Landing                                          | 9                     |
| Parity script, lint/build, gproxy untouched      | 10                    |
| `global-error` English-only                      | 10 (do not translate) |

**Interpolation:** plan uses `{name}` (next-intl / Refine i18n-nextjs example), not the i18next `{{name}}` shown in the SPA provider docs.

**Type consistency:** `setUserLocale(locale: string): Promise<void>`; `getUserLocale(): Promise<string>`; `LanguageSwitcher` uses Refine `useTranslation`; KPI builders take `translate` callback.
