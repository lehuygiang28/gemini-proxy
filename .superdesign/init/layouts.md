# Layouts — Gemini Proxy Web App

Protected pages use `CustomThemedLayout` (Refine `ThemedLayout` + Ant Design `Layout`) with fixed viewport shell. Request-logs redesign inherits this chrome.

---

## Root Layout

**Path:** `apps/web/src/app/layout.tsx`  
**Description:** Server root — fonts (IBM Plex Sans/Mono), `data-theme` from cookie, provider stack (AntdRegistry → ColorMode → Intl → Refine).

Key structure:
- `<html data-theme={defaultMode} className={font variables}>`
- `<body className="gp-scrollable-root">` with nested providers
- Imports `./globals.css` for Signal Deck CSS vars

---

## Protected App Layout

**Path:** `apps/web/src/app/(protected)/layout.tsx`  
**Description:** Server auth gate; wraps all authenticated routes in `CustomThemedLayout`.

```tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { authProviderServer } from '@providers/auth-provider/auth-provider.server';
import { CustomThemedLayout } from '@components/layout/theme-layout';

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
    const { authenticated, redirectTo } = await authProviderServer.check();

    if (!authenticated) {
        redirect(redirectTo || '/login');
    }

    return <CustomThemedLayout>{children}</CustomThemedLayout>;
}
```

---

## Request Logs Layout (Parallel Routes)

**Path:** `apps/web/src/app/(protected)/request-logs/layout.tsx`  
**Description:** Renders list page + intercepting modal slot for detail drawer.

```tsx
import React from 'react';

/**
 * Request Logs Layout with Parallel Routes
 * Supports both modal and full page views
 */
export default function RequestLogsLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <>
            {children}
            {modal}
        </>
    );
}
```

---

## CustomThemedLayout

**Path:** `apps/web/src/components/layout/theme-layout/index.tsx`  
**Description:** App shell — viewport-locked `gp-app-shell gp-console`, Refine ThemedLayout with custom Header/Sider/Title, scrollable content area on `--gp-bg-base`.

```tsx
'use client';

import { CSSProperties, ReactNode } from 'react';
import { Layout, theme } from 'antd';
import { ThemedLayout } from '@refinedev/antd';

import { Header } from '@components/header';
import { CustomSider } from './custom-sider';
import { CustomTitle } from './custom-title';

const { useToken } = theme;

interface CustomThemedLayoutV2Props {
    children: ReactNode;
    initialSiderCollapsed?: boolean;
}

export function CustomThemedLayout({
    children,
    initialSiderCollapsed = false,
}: CustomThemedLayoutV2Props) {
    const { token } = useToken();

    const layoutStyles: CSSProperties = {
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        background: token.colorBgContainer,
    };

    const contentStyles: CSSProperties = {
        background: 'var(--gp-bg-base)',
        padding: token.paddingLG,
    };

    return (
        <Layout style={layoutStyles} className="gp-console gp-app-shell">
            <ThemedLayout
                Header={Header}
                Sider={CustomSider}
                Title={CustomTitle}
                initialSiderCollapsed={initialSiderCollapsed}
            >
                <Layout.Content style={contentStyles}>{children}</Layout.Content>
            </ThemedLayout>
        </Layout>
    );
}
```

---

## CustomSider

**Path:** `apps/web/src/components/layout/theme-layout/custom-sider.tsx`  
**Description:** Refine menu-driven sidebar; collapsible on desktop, Drawer on mobile (`lg` breakpoint).

```tsx
import React, { useContext, type CSSProperties, type ReactNode } from 'react';
import {
    Layout,
    Menu,
    Grid,
    Drawer,
    Button,
    theme,
    ConfigProvider,
    type MenuProps,
} from 'antd';
import {
    UnorderedListOutlined,
    BarsOutlined,
    LeftOutlined,
    RightOutlined,
} from '@ant-design/icons';
import {
    type TreeMenuItem,
    useMenu,
    useLink,
} from '@refinedev/core';
import {
    useThemedLayoutContext,
    type RefineThemedLayoutSiderProps,
} from '@refinedev/antd';
import { CustomTitle } from './custom-title';

const drawerButtonStyles: CSSProperties = {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
    position: 'fixed',
    top: 64,
    zIndex: 999,
};

type MenuItem = NonNullable<MenuProps['items']>[number];

function buildMenuItems(
    tree: TreeMenuItem[],
    selectedKey: string | undefined,
    Link: ReturnType<typeof useLink>,
    siderCollapsed: boolean,
    activeItemDisabled: boolean,
): MenuItem[] {
    return tree.map((item) => {
        const { key, children, meta, list } = item;
        const label = item?.label ?? meta?.label ?? item.name;
        const icon = meta?.icon ?? <UnorderedListOutlined />;
        if (children.length > 0) {
            return {
                key: String(key),
                icon,
                label,
                children: buildMenuItems(
                    children,
                    selectedKey,
                    Link,
                    siderCollapsed,
                    activeItemDisabled,
                ),
            };
        }
        const isSelected = key === selectedKey;
        const linkStyle: CSSProperties =
            activeItemDisabled && isSelected ? { pointerEvents: 'none' } : {};
        return {
            key: String(key),
            icon,
            label: (
                <>
                    <Link to={list ?? ''} style={linkStyle}>
                        {label}
                    </Link>
                    {!siderCollapsed && isSelected ? (
                        <div className="ant-menu-tree-arrow" />
                    ) : null}
                </>
            ),
            style: linkStyle,
        };
    });
}

/**
 * Themed sider using Ant Design Menu `items` (not deprecated children/Menu.Item).
 */
export function CustomSider({
    Title: TitleFromProps,
    meta,
    fixed,
    activeItemDisabled = false,
    siderItemsAreCollapsed = true,
}: RefineThemedLayoutSiderProps) {
    const { token } = theme.useToken();
    const {
        siderCollapsed,
        setSiderCollapsed,
        mobileSiderOpen,
        setMobileSiderOpen,
    } = useThemedLayoutContext();
    const direction = useContext(ConfigProvider.ConfigContext)?.direction;
    const Link = useLink();
    const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });
    const breakpoint = Grid.useBreakpoint();
    const isMobile = typeof breakpoint.lg === 'undefined' ? false : !breakpoint.lg;
    const RenderToTitle = TitleFromProps ?? CustomTitle;

    const defaultExpandMenuItems = siderItemsAreCollapsed
        ? []
        : menuItems.map(({ key }) => key).filter((key): key is string => Boolean(key));

    const items: MenuItem[] = buildMenuItems(
        menuItems,
        selectedKey,
        Link,
        siderCollapsed,
        activeItemDisabled,
    );

    const renderMenu = (): ReactNode => (
        <Menu
            className="gp-scrollable"
            selectedKeys={selectedKey ? [selectedKey] : []}
            defaultOpenKeys={[...defaultOpenKeys, ...defaultExpandMenuItems]}
            mode="inline"
            style={{
                paddingTop: 8,
                border: 'none',
                overflow: 'auto',
                flex: 1,
                minHeight: 0,
            }}
            onClick={() => {
                setMobileSiderOpen(false);
            }}
            items={items}
        />
    );

    if (isMobile) {
        return (
            <>
                <Drawer
                    open={mobileSiderOpen}
                    onClose={() => setMobileSiderOpen(false)}
                    placement={direction === 'rtl' ? 'right' : 'left'}
                    closable={false}
                    width={200}
                    styles={{ body: { padding: 0 } }}
                    maskClosable
                >
                    <Layout>
                        <Layout.Sider
                            style={{
                                height: '100dvh',
                                backgroundColor: token.colorBgContainer,
                                borderRight: `1px solid ${token.colorBgElevated}`,
                            }}
                        >
                            <div
                                style={{
                                    width: 200,
                                    padding: '0 16px',
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    height: 64,
                                    backgroundColor: token.colorBgElevated,
                                }}
                            >
                                <RenderToTitle collapsed={false} />
                            </div>
                            {renderMenu()}
                        </Layout.Sider>
                    </Layout>
                </Drawer>
                <Button
                    style={drawerButtonStyles}
                    size="large"
                    onClick={() => setMobileSiderOpen(true)}
                    icon={<BarsOutlined />}
                />
            </>
        );
    }

    const siderStyles: CSSProperties = {
        backgroundColor: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBgElevated}`,
        height: '100%',
        overflow: 'hidden',
    };
    if (fixed) {
        siderStyles.position = 'fixed';
        siderStyles.top = 0;
        siderStyles.height = '100dvh';
        siderStyles.zIndex = 999;
    }

    const OpenIcon = direction === 'rtl' ? RightOutlined : LeftOutlined;
    const CollapsedIcon = direction === 'rtl' ? LeftOutlined : RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;

    return (
        <>
            {fixed ? (
                <div
                    style={{
                        width: siderCollapsed ? 80 : 200,
                        transition: 'all 0.2s',
                    }}
                />
            ) : null}
            <Layout.Sider
                style={siderStyles}
                collapsible
                collapsed={siderCollapsed}
                onCollapse={(collapsed, type) => {
                    if (type === 'clickTrigger') {
                        setSiderCollapsed(collapsed);
                    }
                }}
                collapsedWidth={80}
                breakpoint="lg"
                trigger={
                    <Button
                        type="text"
                        style={{
                            borderRadius: 0,
                            height: '100%',
                            width: '100%',
                            backgroundColor: token.colorBgElevated,
                        }}
                    >
                        <IconComponent style={{ color: token.colorPrimary }} />
                    </Button>
                }
            >
                <div
                    style={{
                        width: siderCollapsed ? 80 : 200,
                        padding: siderCollapsed ? 0 : '0 16px',
                        display: 'flex',
                        justifyContent: siderCollapsed ? 'center' : 'flex-start',
                        alignItems: 'center',
                        height: 64,
                        backgroundColor: token.colorBgElevated,
                        fontSize: 14,
                    }}
                >
                    <RenderToTitle collapsed={siderCollapsed} />
                </div>
                {renderMenu()}
            </Layout.Sider>
        </>
    );
}
```

---

## CustomTitle

**Path:** `apps/web/src/components/layout/theme-layout/custom-title.tsx`  
**Description:** Sidebar/header brand — 🔑 icon + "Gemini Proxy" link to `/`.

```tsx
import { CSSProperties } from 'react';
import Link from 'next/link';
import { Typography, theme } from 'antd';

const { Title, Text } = Typography;
const { useToken } = theme;

interface TitleProps {
    collapsed: boolean;
}

/**
 * Logo and App Name here
 * @param param0
 * @returns
 */
export function CustomTitle({ collapsed }: TitleProps) {
    const { token } = useToken();

    const titleStyles: CSSProperties = {
        margin: 0,
        color: token.colorText,
        fontWeight: 700,
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading4,
        display: 'flex',
        alignItems: 'center',
        gap: token.marginSM,
    };

    const iconStyles: CSSProperties = {
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading3,
        color: token.colorPrimary,
    };

    return (
        <Link href={'/'}>
            <Title level={5} style={titleStyles}>
                <span style={iconStyles}>🔑</span>
                {!collapsed && (
                    <Text strong style={{ fontSize: 20, color: token.colorText }}>
                        Gemini Proxy
                    </Text>
                )}
            </Title>
        </Link>
    );
}
```

---

## Header

**Path:** `apps/web/src/components/header/index.tsx`  
**Description:** Top bar — language switcher, dark/light toggle, user avatar dropdown (account modal, settings, logout). Sticky 64px height.

```tsx
'use client';

import { ColorModeContext } from '@contexts/color-mode';
import type { RefineThemedLayoutHeaderProps } from '@refinedev/antd';
import { useGetIdentity, useLogout, useWarnAboutChange, useTranslation } from '@refinedev/core';
import {
    DownOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Layout as AntdLayout, Avatar, Dropdown, Menu, Space, Switch, theme } from 'antd';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { AccountSettingsModal } from '@/features/settings';
import { LanguageSwitcher } from '@components/language-switcher';

const { useToken } = theme;

type IUser = {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
};

function initialsFrom(user?: IUser | null): string {
    const source = user?.name?.trim() || user?.email?.trim() || '?';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

function displayNameFrom(user: IUser | null | undefined, fallback: string): string {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name && email && name.toLowerCase() !== email.toLowerCase()) {
        return name;
    }
    if (email) {
        return email.split('@')[0] || fallback;
    }
    return name || fallback;
}

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({ sticky = true }) => {
    const { token } = useToken();
    const { data: user } = useGetIdentity<IUser>();
    const { mode, setColorMode } = useContext(ColorModeContext);
    const router = useRouter();
    const { mutate: logout } = useLogout();
    const { warnWhen, setWarnWhen } = useWarnAboutChange();
    const { translate } = useTranslation();
    const [accountOpen, setAccountOpen] = useState(false);

    const headerStyles: React.CSSProperties = {
        backgroundColor: token.colorBgElevated,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0 24px',
        height: 64,
        flexShrink: 0,
        lineHeight: '64px',
    };

    if (sticky) {
        headerStyles.position = 'sticky';
        headerStyles.top = 0;
        headerStyles.zIndex = 1;
    }

    const handleLogout = useCallback(() => {
        if (warnWhen) {
            const confirmed = window.confirm(translate('warnWhenUnsavedChanges'));
            if (!confirmed) {
                return;
            }
            setWarnWhen(false);
        }
        logout();
    }, [warnWhen, setWarnWhen, translate, logout]);

    const menuItems: MenuProps['items'] = useMemo(
        () => [
            {
                key: 'account',
                icon: <UserOutlined />,
                label: translate('header.account'),
                onClick: () => setAccountOpen(true),
            },
            {
                key: 'settings',
                icon: <SettingOutlined />,
                label: translate('header.settings'),
                onClick: () => router.push('/settings'),
            },
            { type: 'divider' },
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: translate('header.logout'),
                danger: true,
                onClick: () => handleLogout(),
            },
        ],
        [router, handleLogout, translate],
    );

    const primaryLabel = displayNameFrom(user, translate('header.account'));
    const email = user?.email?.trim();

    return (
        <AntdLayout.Header style={headerStyles}>
            <Space size={12} align="center">
                <LanguageSwitcher />
                <Switch
                    checkedChildren="🌛"
                    unCheckedChildren="🔆"
                    onChange={() => setColorMode(mode === 'light' ? 'dark' : 'light')}
                    defaultChecked={mode === 'dark'}
                />
                {user ? (
                    <>
                        <Dropdown
                            trigger={['click']}
                            placement="bottomRight"
                            popupRender={() => (
                                <div className="gp-user-menu-panel">
                                    <div className="gp-user-menu-identity">
                                        <Avatar
                                            className="gp-user-menu-identity-avatar"
                                            src={user.avatar || undefined}
                                            alt={primaryLabel}
                                            size={40}
                                        >
                                            {user.avatar ? null : initialsFrom(user)}
                                        </Avatar>
                                        <div className="gp-user-menu-identity-text">
                                            <span className="gp-user-menu-identity-name">
                                                {primaryLabel}
                                            </span>
                                            {email ? (
                                                <span className="gp-user-menu-identity-email">
                                                    {email}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Menu
                                        className="gp-user-menu-list"
                                        selectable={false}
                                        items={menuItems}
                                    />
                                </div>
                            )}
                        >
                            <button
                                type="button"
                                className="gp-user-menu-trigger"
                                aria-label={translate('header.accountMenu')}
                                aria-haspopup="menu"
                            >
                                <Avatar
                                    className="gp-user-menu-avatar"
                                    src={user.avatar || undefined}
                                    alt={primaryLabel}
                                    size={32}
                                >
                                    {user.avatar ? null : initialsFrom(user)}
                                </Avatar>
                                <DownOutlined className="gp-user-menu-chevron" aria-hidden />
                            </button>
                        </Dropdown>
                        <AccountSettingsModal
                            open={accountOpen}
                            onClose={() => setAccountOpen(false)}
                        />
                    </>
                ) : null}
            </Space>
        </AntdLayout.Header>
    );
};
```
