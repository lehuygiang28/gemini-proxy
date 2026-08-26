'use client';

import type { ReactNode } from 'react';
import { Card, Space, theme } from 'antd';
import { HeaderlessPageChrome } from '@components/headerless-page-chrome';

type AuthCardChromeProps = {
    children: ReactNode;
};

export function AuthCardChrome({ children }: AuthCardChromeProps) {
    const { token } = theme.useToken();
    return (
        <HeaderlessPageChrome>
            <div
                style={{
                    display: 'grid',
                    placeItems: 'center',
                    minHeight: '100dvh',
                    padding: token.padding,
                    paddingTop: token.controlHeight + token.padding * 2,
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
                        {children}
                    </Space>
                </Card>
            </div>
        </HeaderlessPageChrome>
    );
}
