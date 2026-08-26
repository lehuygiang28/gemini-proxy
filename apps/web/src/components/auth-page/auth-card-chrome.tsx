'use client';

import type { ReactNode } from 'react';
import { Card, Space, theme } from 'antd';
import { LanguageSwitcher } from '@components/language-switcher';

type AuthCardChromeProps = {
    children: ReactNode;
};

export function AuthCardChrome({ children }: AuthCardChromeProps) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                display: 'grid',
                placeItems: 'center',
                minHeight: '100dvh',
                padding: token.padding,
                background: token.colorBgLayout,
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: token.colorBgContainer,
                    boxShadow: token.boxShadow,
                    borderRadius: token.borderRadiusLG,
                }}
                variant="borderless"
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <LanguageSwitcher />
                    </div>
                    {children}
                </Space>
            </Card>
        </div>
    );
}
