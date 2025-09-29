'use client';

import { CSSProperties, ReactNode } from 'react';
import { Layout, theme } from 'antd';
import { ThemedLayout } from '@refinedev/antd';

import { Header } from '@components/header';
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
        minHeight: '100vh',
        background: token.colorBgContainer,
    };

    const contentStyles: CSSProperties = {
        background: token.colorBgContainer,
        padding: token.paddingLG,
    };

    return (
        <Layout style={layoutStyles}>
            <ThemedLayout
                Header={Header}
                Title={CustomTitle}
                initialSiderCollapsed={initialSiderCollapsed}
            >
                <Layout.Content style={contentStyles}>{children}</Layout.Content>
            </ThemedLayout>
        </Layout>
    );
}
