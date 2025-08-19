import { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import React, { Suspense } from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router';
import {
    DashboardOutlined,
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
} from '@ant-design/icons';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@refinedev/antd/dist/reset.css';
import { DevtoolsPanel, DevtoolsProvider } from '@refinedev/devtools';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import { authProviderClient } from '@providers/auth-provider/auth-provider.client';
import { dataProvider } from '@providers/data-provider';
import { ColorModeContextProvider } from '@contexts/color-mode';
import { useNotificationProvider } from '@providers/notification-provider';

export const metadata: Metadata = {
    title: 'Gemini Proxy - API Key Management',
    description:
        'Production-ready admin for managing provider API keys, proxy keys, and request logs built with Ant Design and Supabase',
    icons: {
        icon: '/favicon.ico',
    },
    applicationName: 'Gemini Proxy',
    authors: [
        { name: 'Lê Huy Giang', url: 'mailto:lehuygiang28@gmail.com' },
        { name: 'Lê Huy Giang', url: 'https://github.com/lehuygiang28' },
    ],
    keywords: [
        'API Management',
        'Proxy',
        'AI',
        'Gemini',
        'OpenAI',
        'Google',
        'Github',
        'Gemini proxy',
        'Gemini polling',
        'Gemini balance',
        'Gemini rotate',
        'lehuygiang28',
        'lehuygiang28/gemini-proxy',
    ],
    robots: 'index, follow',
    openGraph: {
        title: 'Gemini Proxy - API Key Management',
        description:
            'Production-ready admin for managing Gemini API keys, proxy keys, and request logs built with Ant Design and Supabase',
        type: 'website',
        
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: 'black',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = cookies();
    const theme = cookieStore.get('theme');
    const defaultMode = theme?.value === 'light' ? 'light' : 'dark';

    return (
        <html lang="en" data-theme={defaultMode}>
            <body>
                <Suspense>
                    <AntdRegistry>
                        <ColorModeContextProvider defaultMode={defaultMode}>
                            <RefineKbarProvider>
                                <Refine
                                    routerProvider={routerProvider}
                                    authProvider={authProviderClient}
                                    dataProvider={dataProvider}
                                    notificationProvider={useNotificationProvider}
                                    resources={[
                                        {
                                            name: 'dashboard',
                                            list: '/dashboard',
                                            meta: {
                                                label: 'Dashboard',
                                                icon: <DashboardOutlined />,
                                            },
                                        },
                                        {
                                            name: 'api_keys',
                                            list: '/api-keys',
                                            create: '/api-keys/create',
                                            edit: '/api-keys/edit/:id',
                                            show: '/api-keys/show/:id',
                                            meta: {
                                                label: 'API Keys',
                                                icon: <KeyOutlined />,
                                            },
                                        },
                                        {
                                            name: 'proxy_api_keys',
                                            list: '/proxy-api-keys',
                                            create: '/proxy-api-keys/create',
                                            edit: '/proxy-api-keys/edit/:id',
                                            show: '/proxy-api-keys/show/:id',
                                            meta: {
                                                label: 'Proxy API Keys',
                                                icon: <SafetyCertificateOutlined />,
                                            },
                                        },
                                        {
                                            name: 'request_logs',
                                            list: '/request-logs',
                                            show: '/request-logs/show/:id',
                                            meta: {
                                                label: 'Request Logs',
                                                icon: <FileTextOutlined />,
                                            },
                                        },
                                    ]}
                                    options={{
                                        syncWithLocation: true,
                                        warnWhenUnsavedChanges: true,
                                        useNewQueryKeys: true,
                                        // Disable Refine branding
                                        disableTelemetry: true,
                                    }}
                                >
                                    {children}
                                    <RefineKbar />
                                </Refine>
                                <DevtoolsProvider>
                                    <DevtoolsPanel />
                                </DevtoolsProvider>
                            </RefineKbarProvider>
                        </ColorModeContextProvider>
                    </AntdRegistry>
                </Suspense>
            </body>
        </html>
    );
}
