'use client';

import React from 'react';
import { Button, Form, Select, Typography } from 'antd';
import {
    useCreate,
    useGetIdentity,
    useList,
    useNotification,
    useTranslation,
    useUpdate,
} from '@refinedev/core';
import { isSupportedIanaTimeZone } from '@gemini-proxy/core';
import { normalizeTimezone } from './normalize-timezone';
import type { UserSettings } from './types';

const { Text } = Typography;

type Identity = { id?: string };

function ianaTimeZoneOptions(): Array<{ value: string; label: string }> {
    const values =
        typeof Intl.supportedValuesOf === 'function' ? [...Intl.supportedValuesOf('timeZone')] : [];
    if (!values.includes('UTC')) {
        values.unshift('UTC');
    }
    return values.map((timeZone) => ({ value: timeZone, label: timeZone }));
}

/**
 * IANA timezone for civil day/month quota windows.
 * Initial values come from the loaded record (or UTC). No useEffect hydration.
 */
export function TimezoneSettingsForm() {
    const { translate } = useTranslation();
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const notification = useNotification();
    const timeZoneOptions = ianaTimeZoneOptions();

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

    const handleSave = async (values: { timezone?: string }) => {
        if (!userId) {
            return;
        }
        try {
            const timezone = normalizeTimezone(values.timezone);
            if (existing?.id) {
                await updateSettings({
                    resource: 'user_settings',
                    id: userId,
                    values: { timezone },
                    successNotification: false,
                });
            } else {
                await createSettings({
                    resource: 'user_settings',
                    values: { id: userId, timezone },
                    successNotification: false,
                });
            }
            await query.refetch();
            notification.open({
                type: 'success',
                message: translate('settings.timezone.saved'),
                description: translate('settings.timezone.savedDesc'),
            });
        } catch {
            notification.open({
                type: 'error',
                message: translate('settings.timezone.saveFailed'),
                description: translate('settings.timezone.invalid'),
            });
        }
    };

    if (identityLoading || !userId) {
        return <Text type="secondary">{translate('loading')}</Text>;
    }

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">{translate('settings.tabs.timezone')}</div>
            <Form
                key={formKey}
                layout="vertical"
                initialValues={{ timezone: existing?.timezone ?? 'UTC' }}
                onFinish={(values) => void handleSave(values)}
                disabled={query.isLoading}
            >
                <Form.Item
                    label={translate('settings.timezone.label')}
                    name="timezone"
                    extra={translate('settings.timezone.extra')}
                    rules={[
                        {
                            validator: (_rule, value: string): Promise<void> =>
                                isSupportedIanaTimeZone(value)
                                    ? Promise.resolve()
                                    : Promise.reject(
                                          new Error(translate('settings.timezone.invalid')),
                                      ),
                        },
                    ]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={timeZoneOptions}
                        placeholder={translate('settings.timezone.placeholder')}
                    />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={query.isFetching}>
                    {translate('buttons.save')}
                </Button>
            </Form>
        </div>
    );
}
