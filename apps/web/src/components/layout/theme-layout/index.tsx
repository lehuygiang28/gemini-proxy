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
