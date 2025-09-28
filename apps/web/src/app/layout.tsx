import '@ant-design/v5-patch-for-react-19';
import '@refinedev/antd/dist/reset.css';

import React, { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { useNotificationProvider } from '@refinedev/antd';
import { Refine } from '@refinedev/core';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import routerProvider from '@refinedev/nextjs-router';

import { ColorModeContextProvider } from '@contexts/color-mode';
import { DevtoolsProvider } from '@providers/devtools';
import { authProviderClient } from '@providers/auth-provider/auth-provider.client';
import { dataProvider } from '@providers/data-provider';
import { THEME_COOKIE_NAME } from '@constants';

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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const theme = cookieStore.get(THEME_COOKIE_NAME);
    const defaultMode = theme?.value === 'light' ? 'light' : 'dark';

    return (
        <html lang="en" data-theme={defaultMode}>
            <body>
                <Suspense>
                    <RefineKbarProvider>
                        <AntdRegistry>
                            <ColorModeContextProvider defaultMode={defaultMode}>
                                <DevtoolsProvider>
                                    <Refine
                                        routerProvider={routerProvider}
                                        authProvider={authProviderClient}
                                        dataProvider={dataProvider}
                                        notificationProvider={useNotificationProvider}
                                        options={{
                                            syncWithLocation: true,
                                            warnWhenUnsavedChanges: true,
                                            projectId: '64BVSR-vqtbDM-0z7Jfd',
                                            disableTelemetry: true,
                                        }}
                                    >
                                        {children}
                                        <RefineKbar />
                                    </Refine>
                                </DevtoolsProvider>
                            </ColorModeContextProvider>
                        </AntdRegistry>
                    </RefineKbarProvider>
                </Suspense>
            </body>
        </html>
    );
}
