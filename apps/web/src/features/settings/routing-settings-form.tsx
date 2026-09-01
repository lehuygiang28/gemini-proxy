'use client';

import React from 'react';
import { Button, Form, InputNumber, Segmented, Typography } from 'antd';
import {
    useCreate,
    useGetIdentity,
    useList,
    useNotification,
    useTranslation,
    useUpdate,
} from '@refinedev/core';
import type { UserSettings } from './types';

type Identity = { id?: string };
type RoutingValues = {
    combo_strategy: string;
    combo_stick_after_successes: number | null;
};

export function RoutingSettingsForm() {
    const { translate } = useTranslation();
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const notification = useNotification();
    const { result, query } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId ? [{ field: 'id', operator: 'eq', value: userId }] : [],
        pagination: { currentPage: 1, pageSize: 1 },
        queryOptions: { enabled: Boolean(userId) },
    });
    const existing = result?.data?.[0];
    const { mutateAsync: createSettings } = useCreate<UserSettings>();
    const { mutateAsync: updateSettings } = useUpdate<UserSettings>();
    const formKey = `${userId ?? 'anon'}:${existing?.updated_at ?? 'new'}:${query.isFetched ? 'ready' : 'loading'}`;

    const handleSave = async (values: RoutingValues) => {
        if (!userId) {
            return;
        }
        try {
            const payload = {
                combo_strategy: values.combo_strategy,
                combo_stick_after_successes:
                    values.combo_strategy === 'stick_n' ? values.combo_stick_after_successes : null,
            };
            if (existing?.id) {
                await updateSettings({
                    resource: 'user_settings',
                    id: userId,
                    values: payload,
                    successNotification: false,
                });
            } else {
                await createSettings({
                    resource: 'user_settings',
                    values: { id: userId, ...payload },
                    successNotification: false,
                });
            }
            await query.refetch();
            notification.open({
                type: 'success',
                message: translate('settings.routing.saved'),
            });
        } catch {
            notification.open({
                type: 'error',
                message: translate('settings.routing.saveFailed'),
            });
        }
    };

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">{translate('settings.tabs.routing')}</div>
            <Form
                key={formKey}
                layout="vertical"
                initialValues={{
                    combo_strategy: existing?.combo_strategy ?? 'fallback',
                    combo_stick_after_successes: existing?.combo_stick_after_successes ?? 3,
                }}
                onFinish={(values) => void handleSave(values as RoutingValues)}
                disabled={identityLoading || !query.isFetched}
            >
                <Form.Item label={translate('settings.routing.strategy')} name="combo_strategy">
                    <Segmented
                        options={[
                            { label: translate('combos.strategy.fallback'), value: 'fallback' },
                            {
                                label: translate('combos.strategy.sticky_until_error'),
                                value: 'sticky_until_error',
                            },
                            { label: translate('combos.strategy.stick_n'), value: 'stick_n' },
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    noStyle
                    shouldUpdate={(prev, next) => prev.combo_strategy !== next.combo_strategy}
                >
                    {({ getFieldValue }) =>
                        getFieldValue('combo_strategy') === 'stick_n' ? (
                            <Form.Item
                                label={translate('settings.routing.stickAfter')}
                                name="combo_stick_after_successes"
                                rules={[{ required: true, type: 'number', min: 1 }]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Typography.Paragraph type="secondary">
                    {translate('settings.routing.help')}
                </Typography.Paragraph>
                <Button type="primary" htmlType="submit">
                    {translate('buttons.save')}
                </Button>
            </Form>
        </div>
    );
}
