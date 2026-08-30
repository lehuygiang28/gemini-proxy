# Theme — Signal Deck (Gemini Proxy)

Framework: Next.js 15 + Ant Design 5 via `ConfigProvider`. CSS custom properties in `globals.css` drive the ops-console look; Ant tokens are synced via `buildSignalDeckTheme`.

## Part 1 — Compact Token Summary

### Color palette

| Token | Dark (`:root`, `[data-theme='dark']`) | Light (`[data-theme='light']`) |
|---|---|---|
| `--gp-bg-base` | `#0b0e11` | `#f4f6f8` |
| `--gp-bg-raised` | `#12161c` | `#ffffff` |
| `--gp-bg-sunken` | `#07090c` | `#eef1f4` |
| `--gp-bg-hover` | `#1a2029` | `#e8ecf0` |
| `--gp-bg-active` | `#1e2733` | `#dfe5eb` |
| `--gp-border` | `#243040` | `#d0d7de` |
| `--gp-border-subtle` | `#1a222d` | `#e6eaef` |
| `--gp-border-strong` | `#334155` | `#afb8c1` |
| `--gp-text` | `#e6edf3` | `#1f2328` |
| `--gp-text-secondary` | `#8b9aab` | `#59636e` |
| `--gp-text-muted` | `#5c6b7a` | `#8b949e` |
| `--gp-accent` | `#2bb8a8` | `#1a9e90` |
| `--gp-accent-hover` | `#3dcbba` | — |
| `--gp-accent-muted` | `rgba(43,184,168,0.14)` | `rgba(26,158,144,0.1)` |
| `--gp-success` | `#3ecf8e` | — |
| `--gp-warn` | `#e3b341` | — |
| `--gp-error` | `#f07178` | — |
| `--gp-info` | `#5ba3f5` | — |
| `--gp-stream-ok` | `var(--gp-success)` | — |
| `--gp-stream-fail` | `var(--gp-error)` | — |
| `--gp-stream-live` | `var(--gp-accent)` | — |
| `--gp-chart-1` | `#2bb8a8` | — |
| `--gp-chart-2` | `#5ba3f5` | — |
| `--gp-chart-3` | `#e3b341` | — |
| `--gp-chart-5` | `#f07178` | — |
| `--gp-chart-grid` | `#1a222d` | `#e6eaef` |
| `--gp-chart-axis` | `#5c6b7a` | `#8b949e` |

### Ant Design tokens (`buildSignalDeckTheme`)

| Token | Dark | Light |
|---|---|---|
| `colorPrimary` | `#2bb8a8` | `#1a9e90` |
| `colorSuccess` | `#3ecf8e` | `#3ecf8e` |
| `colorWarning` | `#e3b341` | `#e3b341` |
| `colorError` | `#f07178` | `#f07178` |
| `colorInfo` | `#5ba3f5` | `#5ba3f5` |
| `colorBgBase` | `#0b0e11` | `#f4f6f8` |
| Layout `bodyBg` | `#0b0e11` | `#f4f6f8` |
| Layout `headerBg` / `siderBg` | `#12161c` | `#ffffff` |

### Typography

| Token | Value |
|---|---|
| `--gp-font-sans` | IBM Plex Sans (400/500/600, latin + vietnamese) |
| `--gp-font-mono` | IBM Plex Mono (400/500, latin) |
| Base font size (Ant) | `13px` |
| `fontSizeSM` | `12px` |
| `fontSizeLG` | `16px` |
| Console body | `13px` (`.gp-console`) |
| Section titles | `12px`, uppercase, letter-spacing `0.04em` (`.gp-section-title`) |
| Live feed rows | `12px` primary, `11px` secondary |

### Spacing & layout

| Token | Value |
|---|---|
| `--gp-radius` | `4px` |
| `--gp-console-gap` | `12px` |
| `--gp-console-pad` | `16px` |
| `--gp-feed-row-height` | `32px` |
| Ant `padding` / `paddingLG` / `paddingSM` | `12` / `16` / `8` |
| Ant `margin` / `marginLG` / `marginSM` | `12` / `16` / `8` |
| Control heights | `32` / `40` / `28` (default / LG / SM) |

### Border radius

| Context | Value |
|---|---|
| Global `--gp-radius` | `4px` |
| Ant `borderRadius` | `4px` |
| Ant `borderRadiusSM` | `2px` |
| Tags / chips | `2px` |
| User menu panel | `8px` |

### Shadows

Ant box shadows disabled (`boxShadow: 'none'`). Panels use `1px solid var(--gp-border)` borders instead. User menu dropdown: `0 8px 24px rgba(0,0,0,0.45)` dark / `0.12` light.

### Breakpoints (CSS media queries)

| Breakpoint | Usage |
|---|---|
| `640px` | Account modal nav stacks |
| `900px` | Live feed hides columns 5–6 |
| `1100px` | Charts/console main grid → single column |
| Ant `lg` | Sidebar → mobile drawer |

### Key utility classes (request-logs redesign)

| Class | Purpose |
|---|---|
| `.gp-panel` | Raised surface: bg-raised + border + radius |
| `.gp-panel-sunken` | Sunken surface (live feed container) |
| `.gp-live-feed` / `.gp-live-row` | Dense grid feed pattern (dashboard reference) |
| `.gp-live-mono` | Monospace truncated text |
| `.gp-chip` | Small inline label chip |
| `.gp-conn` / `.gp-conn-dot` | Realtime connection badge |
| `.gp-app-shell` / `.gp-console` | Viewport-locked protected shell |

---

## Part 2 — Raw Source

### `apps/web/src/constants/observability-theme.ts`

```typescript
import type { ThemeConfig } from 'antd';

/** Signal Deck density + semantic tokens for Ant ConfigProvider. */
export const SIGNAL_DECK_PRIMARY = '#2bb8a8';
export const SIGNAL_DECK_SUCCESS = '#3ecf8e';
export const SIGNAL_DECK_WARNING = '#e3b341';
export const SIGNAL_DECK_ERROR = '#f07178';
export const SIGNAL_DECK_INFO = '#5ba3f5';

export type SignalDeckMode = 'dark' | 'light';

/**
 * Builds Ant Design theme tokens for the Signal Deck ops console look.
 */
export function buildSignalDeckTheme(
    mode: SignalDeckMode,
    selectedTheme: ThemeConfig,
    algorithms: ThemeConfig['algorithm'],
): ThemeConfig {
    const isLight = mode === 'light';
    return {
        algorithm: algorithms,
        token: {
            ...selectedTheme?.token,
            colorPrimary: isLight ? '#1a9e90' : SIGNAL_DECK_PRIMARY,
            colorSuccess: SIGNAL_DECK_SUCCESS,
            colorWarning: SIGNAL_DECK_WARNING,
            colorError: SIGNAL_DECK_ERROR,
            colorInfo: SIGNAL_DECK_INFO,
            colorBgBase: isLight ? '#f4f6f8' : '#0b0e11',
            borderRadius: 4,
            borderRadiusLG: 4,
            borderRadiusSM: 2,
            fontSize: 13,
            fontSizeLG: 16,
            fontSizeSM: 12,
            controlHeight: 32,
            controlHeightLG: 40,
            controlHeightSM: 28,
            padding: 12,
            paddingLG: 16,
            paddingSM: 8,
            margin: 12,
            marginLG: 16,
            marginSM: 8,
            boxShadow: 'none',
            boxShadowSecondary: 'none',
            boxShadowTertiary: 'none',
            fontFamily: 'var(--gp-font-sans)',
            fontFamilyCode: 'var(--gp-font-mono)',
        },
        components: {
            ...selectedTheme?.components,
            Layout: {
                ...selectedTheme?.components?.Layout,
                bodyBg: isLight ? '#f4f6f8' : '#0b0e11',
                headerBg: isLight ? '#ffffff' : '#12161c',
                siderBg: isLight ? '#ffffff' : '#12161c',
            },
            Card: {
                ...selectedTheme?.components?.Card,
                borderRadiusLG: 4,
                boxShadowTertiary: 'none',
            },
            Button: {
                ...selectedTheme?.components?.Button,
                borderRadius: 4,
                controlHeight: 32,
                controlHeightLG: 40,
                controlHeightSM: 28,
            },
            Input: {
                ...selectedTheme?.components?.Input,
                borderRadius: 4,
                controlHeight: 32,
                controlHeightLG: 40,
                controlHeightSM: 28,
            },
            Tag: {
                borderRadiusSM: 2,
            },
            Menu: {
                itemBorderRadius: 4,
            },
        },
    };
}
```

### `apps/web/src/contexts/color-mode/index.tsx`

```tsx
'use client';

import React, { type PropsWithChildren, createContext, useEffect, useState } from 'react';
import { ConfigProvider, App as AntdApp, theme, type ThemeConfig } from 'antd';
import { RefineThemes } from '@refinedev/antd';
import Cookies from 'js-cookie';
import { THEME_COOKIE_NAME } from '@constants';
import { buildSignalDeckTheme } from '@constants/observability-theme';
import { resolveAntdLocale } from '@i18n/antd-locale';

export type ColorMode = 'dark' | 'light';

type ColorModeContextType = {
    mode: ColorMode;
    setColorMode: (mode: ColorMode) => void;
    toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>({} as ColorModeContextType);

type ColorModeContextProviderProps = {
    defaultMode?: ColorMode;
    locale?: string;
};

export const ColorModeContextProvider: React.FC<
    PropsWithChildren<ColorModeContextProviderProps>
> = ({ children, defaultMode, locale }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setModeState] = useState(defaultMode || 'dark');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            const themeCookie = Cookies.get(THEME_COOKIE_NAME) === 'light' ? 'light' : 'dark';
            setModeState(themeCookie);
        }
    }, [isMounted]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const setColorMode = (newMode: ColorMode) => {
        setModeState(newMode);
        Cookies.set(THEME_COOKIE_NAME, newMode);
    };

    const toggleColorMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setColorMode(newMode);
    };

    const { darkAlgorithm, defaultAlgorithm } = theme;

    const themeConfig = (selectedTheme: ThemeConfig): ThemeConfig =>
        buildSignalDeckTheme(
            mode,
            selectedTheme,
            mode === 'light' ? defaultAlgorithm : darkAlgorithm,
        );

    return (
        <ColorModeContext.Provider
            value={{
                mode,
                setColorMode,
                toggleColorMode,
            }}
        >
            <ConfigProvider
                theme={themeConfig(RefineThemes.Blue)}
                locale={resolveAntdLocale(locale ?? 'en')}
                warning={{
                    strict: false,
                }}
            >
                <AntdApp>{children}</AntdApp>
            </ConfigProvider>
        </ColorModeContext.Provider>
    );
};
```

### `apps/web/src/app/globals.css`

See repository file `apps/web/src/app/globals.css` — 911 lines. Key sections:

- `:root` / `[data-theme='dark']` and `[data-theme='light']` CSS variables (lines 1–56)
- User menu + account modal styles (lines 64–448)
- `.gp-app-shell`, `.gp-console`, `.gp-panel`, `.gp-kpi-strip` (lines 450–579)
- `.gp-live-feed`, `.gp-live-row`, `.gp-live-mono` — **LiveRequestFeed reference pattern** (lines 581–664)
- `.gp-conn`, `.gp-chip`, `.gp-section-title` (lines 666–754)
- Responsive breakpoints + scrollbars (lines 815–910)

Full file path for context bundle: `apps/web/src/app/globals.css`

**Note:** No Tailwind config — styling is Ant Design tokens + CSS variables + utility classes.
