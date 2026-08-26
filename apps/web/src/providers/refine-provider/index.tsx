'use client';

import React, { type PropsWithChildren } from 'react';
import {
    DashboardOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    FileTextOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useNotificationProvider } from '@refinedev/antd';
import { Refine, type I18nProvider } from '@refinedev/core';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import routerProvider from '@refinedev/nextjs-router';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@i18n';
import { authProviderClient } from '@providers/auth-provider/auth-provider.client';
import { dataProvider } from '@providers/data-provider';
import { createLiveProvider } from '@providers/live-provider';
import { supabaseBrowserClient } from '@utils/supabase/client';

const appLiveProvider = createLiveProvider(supabaseBrowserClient);

/**
 * Client-only Refine shell — liveProvider must not be constructed in a Server Component.
 */
export function RefineProvider({ children }: PropsWithChildren) {
    const t = useTranslations();
    const i18nProvider: I18nProvider = {
        translate: (key: string, options?: unknown, defaultMessage?: string) => {
            if (typeof options === 'string') {
                return t(key, { defaultMessage: options });
            }
            return t(key, {
                ...(options as Record<string, unknown> | undefined),
                defaultMessage,
            });
        },
        changeLocale: setUserLocale,
        getLocale: useLocale,
    };
    return (
        <RefineKbarProvider>
            <Refine
                routerProvider={routerProvider}
                authProvider={authProviderClient}
                dataProvider={dataProvider}
                liveProvider={appLiveProvider}
                notificationProvider={useNotificationProvider}
                i18nProvider={i18nProvider}
                options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    projectId: '64BVSR-vqtbDM-0z7Jfd',
                    disableTelemetry: true,
                    liveMode: 'auto',
                }}
                resources={[
                    {
                        name: 'dashboard',
                        list: '/dashboard',
                        meta: {
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
                            icon: <SafetyCertificateOutlined />,
                        },
                    },
                    {
                        name: 'request_logs',
                        list: '/request-logs',
                        show: '/request-logs/show/:id',
                        meta: {
                            icon: <FileTextOutlined />,
                        },
                    },
                    {
                        name: 'user_settings',
                        list: '/settings',
                        meta: {
                            icon: <SettingOutlined />,
                        },
                    },
                ]}
            >
                {children}
                <RefineKbar />
            </Refine>
        </RefineKbarProvider>
    );
}
