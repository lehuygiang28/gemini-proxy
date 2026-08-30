'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Space, Table, Typography } from 'antd';
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
    type ModelPricingRow,
    type UserSettings,
    type UserSettingsFormValues,
} from './types';

const { Text } = Typography;

const BUILTIN_GEMMA_MODELS: ModelPricingRow[] = [
    {
        key: 'gemma-4-26b-a4b-it',
        modelId: 'gemma-4-26b-a4b-it',
        inputPerMillion: 0.07,
        outputPerMillion: 0.34,
        cachedInputPerMillion: 0.035,
    },
    {
        key: 'gemma-4-31b-it',
        modelId: 'gemma-4-31b-it',
        inputPerMillion: 0.09,
        outputPerMillion: 0.34,
        cachedInputPerMillion: 0.045,
    },
];

function rowsFromPricingJson(value: unknown): ModelPricingRow[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }
    return Object.entries(value as Record<string, Record<string, number>>).map(
        ([modelId, rates], index) => ({
            key: `${modelId}-${index}`,
            modelId,
            inputPerMillion: Number(rates.inputPerMillion) || 0,
            outputPerMillion: Number(rates.outputPerMillion) || 0,
            cachedInputPerMillion:
                rates.cachedInputPerMillion != null
                    ? Number(rates.cachedInputPerMillion)
                    : undefined,
        }),
    );
}

function pricingJsonFromRows(rows: ModelPricingRow[]): Record<string, Record<string, number>> {
    const out: Record<string, Record<string, number>> = {};
    for (const row of rows) {
        const modelId = row.modelId?.trim().toLowerCase();
        if (!modelId) {
            continue;
        }
        out[modelId] = {
            inputPerMillion: row.inputPerMillion,
            outputPerMillion: row.outputPerMillion,
            ...(row.cachedInputPerMillion != null
                ? { cachedInputPerMillion: row.cachedInputPerMillion }
                : {}),
        };
    }
    return out;
}

type Identity = { id?: string };

/**
 * Per-model USD/1M token overrides (user_settings.custom_model_pricing).
 */
export function PricingSettingsForm() {
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

    const builtinRows = BUILTIN_GEMMA_MODELS;

    useEffect(() => {
        if (!userId || query.isLoading) {
            return;
        }
        form.setFieldsValue({
            detailed_observability: existing?.detailed_observability ?? false,
            save_request_body: existing?.save_request_body ?? false,
            save_response_body: existing?.save_response_body ?? false,
            pricing_rows: rowsFromPricingJson(existing?.custom_model_pricing ?? {}),
        });
    }, [userId, existing, query.isLoading, form]);

    const handleSave = async (values: UserSettingsFormValues) => {
        if (!userId) {
            return;
        }
        setSaving(true);
        try {
            const custom_model_pricing = pricingJsonFromRows(values.pricing_rows ?? []);
            const payload = {
                detailed_observability: existing?.detailed_observability ?? false,
                save_request_body: existing?.save_request_body ?? false,
                save_response_body: existing?.save_response_body ?? false,
                custom_model_pricing,
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
                message: translate('settings.pricing.saved'),
                description: translate('settings.pricing.savedDesc'),
            });
        } catch {
            notification.open({
                type: 'error',
                message: translate('settings.pricing.saveFailed'),
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
            <div className="gp-section-title">{translate('settings.tabs.pricing')}</div>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={translate('settings.pricing.banner')}
                description={translate('settings.pricing.bannerDesc')}
            />
            <Typography.Title level={5} style={{ marginTop: 0 }}>
                {translate('settings.pricing.builtinTitle')}
            </Typography.Title>
            <Table
                size="small"
                pagination={false}
                style={{ marginBottom: 24 }}
                dataSource={builtinRows}
                columns={[
                    { title: translate('settings.pricing.modelId'), dataIndex: 'modelId' },
                    {
                        title: translate('settings.pricing.inputPerM'),
                        dataIndex: 'inputPerMillion',
                        render: (v: number) => `$${v}`,
                    },
                    {
                        title: translate('settings.pricing.outputPerM'),
                        dataIndex: 'outputPerMillion',
                        render: (v: number) => `$${v}`,
                    },
                    {
                        title: translate('settings.pricing.cachePerM'),
                        dataIndex: 'cachedInputPerMillion',
                        render: (v: number) => `$${v}`,
                    },
                ]}
            />
            <Typography.Title level={5}>{translate('settings.pricing.overridesTitle')}</Typography.Title>
            <Form
                form={form}
                layout="vertical"
                initialValues={{ ...DEFAULT_USER_SETTINGS, pricing_rows: [] }}
                onFinish={(values) => void handleSave(values)}
                disabled={query.isLoading || saving}
            >
                <Form.List name="pricing_rows">
                    {(fields, { add, remove }) => (
                        <>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={fields.map((field) => ({ ...field, key: field.key }))}
                                columns={[
                                    {
                                        title: translate('settings.pricing.modelId'),
                                        render: (_, field) => (
                                            <Form.Item
                                                name={[field.name, 'modelId']}
                                                style={{ margin: 0 }}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: translate(
                                                            'settings.pricing.modelRequired',
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Input placeholder="gemma-4-26b-a4b-it" />
                                            </Form.Item>
                                        ),
                                    },
                                    {
                                        title: translate('settings.pricing.inputPerM'),
                                        render: (_, field) => (
                                            <Form.Item
                                                name={[field.name, 'inputPerMillion']}
                                                style={{ margin: 0 }}
                                                rules={[{ required: true }]}
                                            >
                                                <InputNumber min={0} step={0.01} style={{ width: 100 }} />
                                            </Form.Item>
                                        ),
                                    },
                                    {
                                        title: translate('settings.pricing.outputPerM'),
                                        render: (_, field) => (
                                            <Form.Item
                                                name={[field.name, 'outputPerMillion']}
                                                style={{ margin: 0 }}
                                                rules={[{ required: true }]}
                                            >
                                                <InputNumber min={0} step={0.01} style={{ width: 100 }} />
                                            </Form.Item>
                                        ),
                                    },
                                    {
                                        title: translate('settings.pricing.cachePerM'),
                                        render: (_, field) => (
                                            <Form.Item
                                                name={[field.name, 'cachedInputPerMillion']}
                                                style={{ margin: 0 }}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={0.01}
                                                    style={{ width: 100 }}
                                                />
                                            </Form.Item>
                                        ),
                                    },
                                    {
                                        title: '',
                                        width: 48,
                                        render: (_, field) => (
                                            <Button
                                                type="link"
                                                danger
                                                onClick={() => remove(field.name)}
                                            >
                                                {translate('buttons.delete')}
                                            </Button>
                                        ),
                                    },
                                ]}
                            />
                            <Button
                                type="dashed"
                                onClick={() => add({ modelId: '', inputPerMillion: 0, outputPerMillion: 0 })}
                                style={{ marginTop: 12, marginBottom: 16 }}
                            >
                                {translate('settings.pricing.addRow')}
                            </Button>
                        </>
                    )}
                </Form.List>
                <Space>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        {translate('buttons.save')}
                    </Button>
                </Space>
            </Form>
        </div>
    );
}
