'use client';

import React from 'react';
import { List } from '@refinedev/antd';
import { Tabs, Typography } from 'antd';
import { AppearanceSettings, ObservabilitySettingsForm } from '@/features/settings';

const { Title, Paragraph } = Typography;

/**
 * Account settings — Observability (DB) + Appearance (cookie).
 */
export default function SettingsPage() {
    return (
        <List title={<Title level={4}>Settings</Title>}>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Control detailed request logging and console preferences for your account.
            </Paragraph>
            <Tabs
                defaultActiveKey="observability"
                items={[
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
                ]}
            />
        </List>
    );
}
