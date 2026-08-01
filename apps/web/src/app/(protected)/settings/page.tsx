'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { List } from '@refinedev/antd';
import { Tabs, Typography } from 'antd';
import { AppearanceSettings, ObservabilitySettingsForm } from '@/features/settings';

const { Title, Paragraph } = Typography;

const TAB_KEYS = ['observability', 'appearance'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function resolveTab(raw: string | null): TabKey {
    if (raw && (TAB_KEYS as readonly string[]).includes(raw)) {
        return raw as TabKey;
    }
    return 'observability';
}

/**
 * App preferences — Observability (DB) + Appearance (cookie).
 * Account profile lives in the header Account modal.
 */
export default function SettingsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = resolveTab(searchParams.get('tab'));

    const items = useMemo(
        () => [
            {
                key: 'observability',
                label: 'Observability',
                children: <ObservabilitySettingsForm />,
            },
            {
                key: 'appearance',
                label: 'Appearance',
                children: <AppearanceSettings />,
            },
        ],
        [],
    );

    return (
        <List title={<Title level={4}>Settings</Title>}>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Control detailed request logging and console preferences.
            </Paragraph>
            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('tab', key);
                    router.replace(`${pathname}?${params.toString()}`);
                }}
                items={items}
            />
        </List>
    );
}
