'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Space, Switch, Typography } from 'antd';
import {
    useCreate,
    useGetIdentity,
    useList,
    useNotification,
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
    const [form] = Form.useForm<UserSettingsFormValues>();
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const notification = useNotification();
    const [saving, setSaving] = useState(false);

    const { result, query } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId
            ? [{ field: 'id', operator: 'eq', value: userId }]
            : [],
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
                message: 'Settings saved',
                description: 'Observability preferences updated for new request logs.',
            });
        } catch (error) {
            notification.open({
                type: 'error',
                message: 'Failed to save settings',
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setSaving(false);
        }
    };

    if (identityLoading || !userId) {
        return <Text type="secondary">Loading account…</Text>;
    }

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">Observability</div>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Detailed log bodies are off by default"
                description={
                    <>
                        When enabled, sanitized request/response bodies are stored on new logs (up
                        to {Math.round(PAYLOAD_BODY_MAX_CHARS / 1024)} KiB). Streaming responses are
                        included when the proxy buffers the full upstream body for token parsing.
                        Bodies may contain prompts or completions — enable only if you accept the
                        storage and privacy trade-off.
                    </>
                }
            />
            <Form
                form={form}
                layout="vertical"
                initialValues={DEFAULT_USER_SETTINGS}
                onFinish={(values) => void handleSave(values)}
                disabled={query.isLoading || saving}
            >
                <Form.Item
                    label="Detailed observability"
                    name="detailed_observability"
                    valuePropName="checked"
                    extra="Master switch. When off, logs stay headers-only (current default)."
                >
                    <Switch />
                </Form.Item>
                <Form.Item
                    label="Save request bodies"
                    name="save_request_body"
                    valuePropName="checked"
                    extra="Persist the outbound request JSON/text on request_logs.request_data.body."
                >
                    <Switch disabled={!detailed} />
                </Form.Item>
                <Form.Item
                    label="Save response bodies"
                    name="save_response_body"
                    valuePropName="checked"
                    extra="Persist the AI response (including streamed wire format) on response_data.body."
                >
                    <Switch disabled={!detailed} />
                </Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        Save
                    </Button>
                    <Button
                        onClick={() => {
                            form.setFieldsValue(DEFAULT_USER_SETTINGS);
                        }}
                    >
                        Reset to defaults
                    </Button>
                </Space>
            </Form>
        </div>
    );
}
