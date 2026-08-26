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

function displayNameFrom(user?: IUser | null): string {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name && email && name.toLowerCase() !== email.toLowerCase()) {
        return name;
    }
    if (email) {
        return email.split('@')[0] || 'Account';
    }
    return name || 'Account';
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
            const confirmed = window.confirm(
                translate(
                    'warnWhenUnsavedChanges',
                    'Are you sure you want to leave? You have unsaved changes.',
                ),
            );
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

    const primaryLabel = displayNameFrom(user);
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
