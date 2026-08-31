'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { List } from '@refinedev/antd';
import { useTranslation } from '@refinedev/core';
import { Tabs, Typography } from 'antd';
import {
    AppearanceSettings,
    ObservabilitySettingsForm,
    PricingSettingsForm,
    TimezoneSettingsForm,
} from '@/features/settings';

const { Title, Paragraph } = Typography;

const TAB_KEYS = ['observability', 'pricing', 'timezone', 'appearance'] as const;
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
    const { translate } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = resolveTab(searchParams.get('tab'));

    const items = useMemo(
        () => [
            {
                key: 'observability',
                label: translate('settings.tabs.observability'),
                children: <ObservabilitySettingsForm />,
            },
            {
                key: 'pricing',
                label: translate('settings.tabs.pricing'),
                children: <PricingSettingsForm />,
            },
            {
                key: 'timezone',
                label: translate('settings.tabs.timezone'),
                children: <TimezoneSettingsForm />,
            },
            {
                key: 'appearance',
                label: translate('settings.tabs.appearance'),
                children: <AppearanceSettings />,
            },
        ],
        [translate],
    );

    return (
        <List title={<Title level={4}>{translate('settings.title')}</Title>}>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {translate('settings.subtitle')}
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
