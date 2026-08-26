'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Space, Switch, Typography } from 'antd';
import {
    useCreate,
    useGetIdentity,
    useList,
    useNotification,
    useTranslation,
    useUpdate,
} from '@refinedev/core';
import {
    DEFAULT_USER_SETTINGS,
    PAYLOAD_BODY_MAX_CHARS,
    type UserSettings,
    type UserSettingsFormValues,
} from './types';

const { Text } = Typography;

type Identity = { id?: string };

/**
 * Observability toggles persisted on user_settings (id = auth user id).
 */
export function ObservabilitySettingsForm() {
    const { translate } = useTranslation();
    const [form] = Form.useForm<UserSettingsFormValues>();
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const notification = useNotification();
    const [saving, setSaving] = useState(false);

    const { result, query } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId ? [{ field: 'id', operator: 'eq', value: userId }] : [],
        pagination: { currentPage: 1, pageSize: 1 },
        queryOptions: { enabled: Boolean(userId) },
    });

    const existing = result?.data?.[0];
    const { mutateAsync: createSettings } = useCreate<UserSettings>();
    const { mutateAsync: updateSettings } = useUpdate<UserSettings>();
    const detailed = Form.useWatch('detailed_observability', form);

    useEffect(() => {
        if (!userId || query.isLoading) {
            return;
        }
        form.setFieldsValue({
            detailed_observability: existing?.detailed_observability ?? false,
            save_request_body: existing?.save_request_body ?? false,
            save_response_body: existing?.save_response_body ?? false,
        });
    }, [userId, existing, query.isLoading, form]);

    const handleSave = async (values: UserSettingsFormValues) => {
        if (!userId) {
            return;
        }
        setSaving(true);
        try {
            const payload = {
                detailed_observability: values.detailed_observability,
                save_request_body: values.detailed_observability
                    ? Boolean(values.save_request_body)
                    : false,
                save_response_body: values.detailed_observability
                    ? Boolean(values.save_response_body)
                    : false,
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
                message: translate('settings.observability.saved'),
                description: translate('settings.observability.savedDesc'),
            });
        } catch {
            notification.open({
                type: 'error',
                message: translate('settings.observability.saveFailed'),
                description: translate('common.genericError'),
            });
        } finally {
            setSaving(false);
        }
    };

    if (identityLoading || !userId) {
        return <Text type="secondary">{translate('loading')}</Text>;
    }

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">{translate('settings.tabs.observability')}</div>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={translate('settings.observability.banner')}
                description={translate('settings.observability.bannerDesc', {
                    kib: Math.round(PAYLOAD_BODY_MAX_CHARS / 1024),
                })}
            />
            <Form
                form={form}
                layout="vertical"
                initialValues={DEFAULT_USER_SETTINGS}
                onFinish={(values) => void handleSave(values)}
                disabled={query.isLoading || saving}
            >
                <Form.Item
                    label={translate('settings.observability.detailed')}
                    name="detailed_observability"
                    valuePropName="checked"
                    extra={translate('settings.observability.detailedExtra')}
                >
                    <Switch />
                </Form.Item>
                <Form.Item
                    label={translate('settings.observability.saveRequest')}
                    name="save_request_body"
                    valuePropName="checked"
                    extra={translate('settings.observability.saveRequestExtra')}
                >
                    <Switch disabled={!detailed} />
                </Form.Item>
                <Form.Item
                    label={translate('settings.observability.saveResponse')}
                    name="save_response_body"
                    valuePropName="checked"
                    extra={translate('settings.observability.saveResponseExtra')}
                >
                    <Switch disabled={!detailed} />
                </Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        {translate('buttons.save')}
                    </Button>
                    <Button
                        onClick={() => {
                            form.setFieldsValue(DEFAULT_USER_SETTINGS);
                        }}
                    >
                        {translate('settings.observability.reset')}
                    </Button>
                </Space>
            </Form>
        </div>
    );
}
