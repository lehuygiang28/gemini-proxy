'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Collapse,
    Empty,
    Form,
    InputNumber,
    Segmented,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
    useCreate,
    useGetIdentity,
    useList,
    useNotification,
    useTranslation,
    useUpdate,
} from '@refinedev/core';
import { listBuiltinModelPricingRows, type BuiltinModelPricingRow } from '@gemini-proxy/pricing';
import {
    DEFAULT_USER_SETTINGS,
    type ModelPricingRow,
    type UserSettings,
    type UserSettingsFormValues,
} from './types';

const { Text, Paragraph } = Typography;

function formatUsd(value: number): string {
    if (value === 0) {
        return '$0';
    }
    const digits = value < 0.1 ? 3 : value < 1 ? 2 : 2;
    return `$${value.toFixed(digits).replace(/\.?0+$/, '') || '0'}`;
}

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
type FamilyFilter = 'all' | 'gemini' | 'gemma';

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
    const [referenceFilter, setReferenceFilter] = useState('');
    const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('all');

    const allBuiltinRows = useMemo(() => listBuiltinModelPricingRows(), []);
    const modelOptions = useMemo(
        () =>
            allBuiltinRows.map((row) => ({
                value: row.modelId,
                label: row.modelId,
            })),
        [allBuiltinRows],
    );
    const builtinById = useMemo(
        () => new Map(allBuiltinRows.map((row) => [row.modelId, row])),
        [allBuiltinRows],
    );

    const { result, query } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId ? [{ field: 'id', operator: 'eq', value: userId }] : [],
        pagination: { currentPage: 1, pageSize: 1 },
        queryOptions: { enabled: Boolean(userId) },
    });

    const existing = result?.data?.[0];
    const { mutateAsync: createSettings } = useCreate<UserSettings>();
    const { mutateAsync: updateSettings } = useUpdate<UserSettings>();
    const overrideRows = Form.useWatch('pricing_rows', form) ?? [];

    const referenceRows = useMemo(() => {
        const q = referenceFilter.trim().toLowerCase();
        return allBuiltinRows
            .filter((row) => familyFilter === 'all' || row.family === familyFilter)
            .filter((row) => !q || row.modelId.includes(q))
            .map((row) => ({ key: row.modelId, ...row }));
    }, [allBuiltinRows, familyFilter, referenceFilter]);

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

    const addOverrideFromBuiltin = (row: BuiltinModelPricingRow) => {
        const current: ModelPricingRow[] = form.getFieldValue('pricing_rows') ?? [];
        if (current.some((item) => item.modelId === row.modelId)) {
            return;
        }
        form.setFieldsValue({
            pricing_rows: [
                ...current,
                {
                    modelId: row.modelId,
                    inputPerMillion: row.inputPerMillion,
                    outputPerMillion: row.outputPerMillion,
                    cachedInputPerMillion: row.cachedInputPerMillion,
                },
            ],
        });
    };

    const fillOverrideFromBuiltin = (index: number, modelId: string) => {
        const row = builtinById.get(modelId);
        if (!row) {
            return;
        }
        const current: ModelPricingRow[] = [...(form.getFieldValue('pricing_rows') ?? [])];
        current[index] = {
            ...current[index],
            modelId,
            inputPerMillion: row.inputPerMillion,
            outputPerMillion: row.outputPerMillion,
            cachedInputPerMillion: row.cachedInputPerMillion,
        };
        form.setFieldsValue({ pricing_rows: current });
    };

    const handleSave = async (values: UserSettingsFormValues) => {
        if (!userId) {
            return;
        }
        setSaving(true);
        try {
            const rows = values.pricing_rows ?? [];
            const modelIds = rows.map((row) => row.modelId?.trim().toLowerCase()).filter(Boolean);
            if (new Set(modelIds).size !== modelIds.length) {
                notification.open({
                    type: 'error',
                    message: translate('settings.pricing.saveFailed'),
                    description: translate('settings.pricing.duplicateModel'),
                });
                return;
            }
            const custom_model_pricing = pricingJsonFromRows(rows);
            const payload = { custom_model_pricing };
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

    const hasOverrides = overrideRows.length > 0;

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">{translate('settings.tabs.pricing')}</div>
            <Paragraph type="secondary" style={{ marginBottom: 20, maxWidth: 640 }}>
                {translate('settings.pricing.intro')}
            </Paragraph>

            <Form
                form={form}
                layout="vertical"
                initialValues={{ ...DEFAULT_USER_SETTINGS, pricing_rows: [] }}
                onFinish={(values) => void handleSave(values)}
                disabled={query.isLoading || saving}
            >
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {translate('settings.pricing.yourPricesTitle')}
                </Typography.Title>

                <Form.List name="pricing_rows">
                    {(fields, { add, remove }) => (
                        <>
                            {!hasOverrides ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <Space direction="vertical" size={4}>
                                            <Text>
                                                {translate('settings.pricing.yourPricesEmpty')}
                                            </Text>
                                            <Text type="secondary">
                                                {translate('settings.pricing.yourPricesEmptyDesc')}
                                            </Text>
                                        </Space>
                                    }
                                    style={{ margin: '8px 0 16px' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    {fields.map((field) => (
                                        <div
                                            key={field.key}
                                            className="gp-panel-sunken"
                                            style={{
                                                padding: 12,
                                                borderRadius: 8,
                                                display: 'grid',
                                                gap: 12,
                                                gridTemplateColumns:
                                                    'minmax(180px, 1.4fr) repeat(2, minmax(100px, 1fr)) auto',
                                                alignItems: 'start',
                                            }}
                                        >
                                            <Form.Item
                                                name={[field.name, 'modelId']}
                                                label={translate('settings.pricing.modelLabel')}
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
                                                <Select
                                                    showSearch
                                                    optionFilterProp="label"
                                                    options={modelOptions}
                                                    placeholder={translate(
                                                        'settings.pricing.modelPlaceholder',
                                                    )}
                                                    onChange={(modelId) =>
                                                        fillOverrideFromBuiltin(field.name, modelId)
                                                    }
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                name={[field.name, 'inputPerMillion']}
                                                label={translate('settings.pricing.sendLabel')}
                                                style={{ margin: 0 }}
                                                rules={[{ required: true }]}
                                                tooltip={translate(
                                                    'settings.pricing.perMillionHint',
                                                )}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={0.01}
                                                    prefix="$"
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                name={[field.name, 'outputPerMillion']}
                                                label={translate('settings.pricing.receiveLabel')}
                                                style={{ margin: 0 }}
                                                rules={[{ required: true }]}
                                                tooltip={translate(
                                                    'settings.pricing.perMillionHint',
                                                )}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={0.01}
                                                    prefix="$"
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                            <Button
                                                type="text"
                                                danger
                                                onClick={() => remove(field.name)}
                                                style={{ marginTop: 30 }}
                                            >
                                                {translate('buttons.delete')}
                                            </Button>
                                            <Form.Item
                                                name={[field.name, 'cachedInputPerMillion']}
                                                label={translate('settings.pricing.cacheLabel')}
                                                style={{ margin: 0, gridColumn: '1 / -2' }}
                                                tooltip={translate('settings.pricing.cacheHint')}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={0.01}
                                                    prefix="$"
                                                    placeholder={translate(
                                                        'settings.pricing.cacheOptional',
                                                    )}
                                                    style={{ width: 160 }}
                                                />
                                            </Form.Item>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Space wrap style={{ marginBottom: 20 }}>
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={() =>
                                        add({
                                            modelId: undefined,
                                            inputPerMillion: 0,
                                            outputPerMillion: 0,
                                        })
                                    }
                                >
                                    {translate('settings.pricing.addModel')}
                                </Button>
                                <Button type="primary" htmlType="submit" loading={saving}>
                                    {translate('buttons.save')}
                                </Button>
                            </Space>
                        </>
                    )}
                </Form.List>

                <Collapse
                    ghost
                    items={[
                        {
                            key: 'defaults',
                            label: translate('settings.pricing.defaultPricesTitle', {
                                count: allBuiltinRows.length,
                            }),
                            children: (
                                <>
                                    <Paragraph type="secondary" style={{ marginTop: 0 }}>
                                        {translate('settings.pricing.defaultPricesDesc')}
                                    </Paragraph>
                                    <Space wrap style={{ marginBottom: 12 }}>
                                        <Segmented
                                            value={familyFilter}
                                            onChange={(value) =>
                                                setFamilyFilter(value as FamilyFilter)
                                            }
                                            options={[
                                                {
                                                    label: translate('settings.pricing.filterAll'),
                                                    value: 'all',
                                                },
                                                {
                                                    label: translate(
                                                        'settings.pricing.filterGemini',
                                                    ),
                                                    value: 'gemini',
                                                },
                                                {
                                                    label: translate(
                                                        'settings.pricing.filterGemma',
                                                    ),
                                                    value: 'gemma',
                                                },
                                            ]}
                                        />
                                        <Select
                                            showSearch
                                            allowClear
                                            placeholder={translate(
                                                'settings.pricing.referenceSearch',
                                            )}
                                            style={{ minWidth: 260 }}
                                            options={modelOptions}
                                            value={referenceFilter || undefined}
                                            onChange={(value) => setReferenceFilter(value ?? '')}
                                            filterOption={(input, option) =>
                                                (option?.label as string)
                                                    ?.toLowerCase()
                                                    .includes(input.toLowerCase()) ?? false
                                            }
                                        />
                                    </Space>
                                    <Table
                                        size="small"
                                        pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                        dataSource={referenceRows}
                                        columns={[
                                            {
                                                title: translate('settings.pricing.modelLabel'),
                                                dataIndex: 'modelId',
                                                render: (modelId: string, row) => (
                                                    <Space size={6}>
                                                        <Text>{modelId}</Text>
                                                        <Tag
                                                            bordered={false}
                                                            color={
                                                                row.family === 'gemini'
                                                                    ? 'blue'
                                                                    : 'purple'
                                                            }
                                                        >
                                                            {translate(
                                                                `settings.pricing.family.${row.family}`,
                                                            )}
                                                        </Tag>
                                                    </Space>
                                                ),
                                            },
                                            {
                                                title: translate('settings.pricing.sendLabel'),
                                                dataIndex: 'inputPerMillion',
                                                width: 100,
                                                render: (v: number) => formatUsd(v),
                                            },
                                            {
                                                title: translate('settings.pricing.receiveLabel'),
                                                dataIndex: 'outputPerMillion',
                                                width: 100,
                                                render: (v: number) => formatUsd(v),
                                            },
                                            {
                                                title: '',
                                                width: 120,
                                                render: (_, row) => {
                                                    const customized = overrideRows.some(
                                                        (item) => item?.modelId === row.modelId,
                                                    );
                                                    return (
                                                        <Button
                                                            type="link"
                                                            size="small"
                                                            icon={<EditOutlined />}
                                                            disabled={customized}
                                                            onClick={() =>
                                                                addOverrideFromBuiltin(row)
                                                            }
                                                        >
                                                            {customized
                                                                ? translate(
                                                                      'settings.pricing.customized',
                                                                  )
                                                                : translate(
                                                                      'settings.pricing.customize',
                                                                  )}
                                                        </Button>
                                                    );
                                                },
                                            },
                                        ]}
                                    />
                                </>
                            ),
                        },
                    ]}
                />
            </Form>
        </div>
    );
}
