'use client';

import React, { PropsWithChildren } from 'react';
import Link from 'next/link';
import { Layout, Menu, theme } from 'antd';
import { usePathname } from 'next/navigation';
import { Header as AppHeader } from '@components/header';

const { Sider, Content } = Layout;

export const AppLayout: React.FC<PropsWithChildren> = ({ children }) => {
    const pathname = usePathname();
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const items = [
        { key: '/dashboard', label: <Link href="/dashboard">Dashboard</Link> },
        { key: '/api-keys', label: <Link href="/api-keys">API Keys</Link> },
        { key: '/proxy-api-keys', label: <Link href="/proxy-api-keys">Proxy API Keys</Link> },
        { key: '/request-logs', label: <Link href="/request-logs">Request Logs</Link> },
    ];

    // Determine selected key based on current path
    const selectedKey =
        items
            .map((i) => i.key)
            .find((key) => pathname === key || pathname?.startsWith(`${key}/`)) || '/dashboard';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider breakpoint="lg" collapsedWidth={64} width={220} theme="light">
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 16,
                        fontWeight: 700,
                    }}
                >
                    Gemini Proxy
                </div>
                <Menu mode="inline" selectedKeys={[selectedKey]} items={items} />
            </Sider>
            <Layout>
                <AppHeader />
                <Content style={{ margin: 16 }}>
                    <div
                        style={{
                            padding: 16,
                            background: colorBgContainer,
                            minHeight: 'calc(100vh - 64px - 32px)',
                        }}
                    >
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};
