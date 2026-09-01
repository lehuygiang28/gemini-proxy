'use client';

import React, { useMemo, useState } from 'react';
import { useInvalidate, useNotification, useTranslation } from '@refinedev/core';
import { Button, Input, InputNumber, Modal, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { normalizeGeminiModelId } from '@gemini-proxy/core';
import type { Json } from '@gemini-proxy/database';
import { supabaseBrowserClient } from '@/utils/supabase/client';
import { useModelCatalog } from './use-model-catalog';
import type { PickerModelEntry, PickerModelMode } from './merge-picker-catalog';

type ModelPickerProps = {
    mode: PickerModelMode;
    value?: string;
    onChange: (modelId: string | undefined) => void;
    disabledIds?: string[];
};

const GROUP_LABEL: Record<string, string> = {
    combos: 'picker.groups.combos',
    gemini: 'picker.groups.gemini',
    gemma: 'picker.groups.gemma',
    custom: 'picker.groups.custom',
};

export function ModelPicker(props: ModelPickerProps) {
    const { translate } = useTranslation();
    const catalog = useModelCatalog(props.mode);
    const disabledIds = props.disabledIds;
    const options = useMemo(() => {
        const disabled = new Set(disabledIds ?? []);
        const groups = new Map<
            string,
            Array<{ label: string; value: string; disabled: boolean }>
        >();
        for (const entry of catalog.entries) {
            if (disabled.has(entry.id)) {
                continue;
            }
            const group = groups.get(entry.group) ?? [];
            group.push({
                label: entry.id,
                value: entry.id,
                disabled: false,
            });
            groups.set(entry.group, group);
        }
        return [...groups.entries()].map(([group, children]) => ({
            label: translate(GROUP_LABEL[group] ?? group),
            options: children,
        }));
    }, [disabledIds, catalog.entries, translate]);

    return (
        <Select
            showSearch
            allowClear
            value={props.value ?? null}
            onChange={(value) => props.onChange(typeof value === 'string' ? value : undefined)}
            options={options}
            optionFilterProp="label"
            optionRender={(option) => {
                const entry = catalog.entries.find((item) => item.id === option.value);
                return (
                    <Space size={4}>
                        <span>{String(option.label)}</span>
                        {entry ? (
                            <SourceTag source={entry.source} overrides={entry.overrides} />
                        ) : null}
                    </Space>
                );
            }}
            placeholder={translate('picker.placeholder')}
            style={{ width: '100%' }}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <PickerFooter
                        lastGoogleSyncAt={catalog.lastGoogleSyncAt}
                        onAdded={(modelId) => props.onChange(modelId)}
                    />
                </>
            )}
        />
    );
}

type ModelTagsPickerProps = {
    value?: string[];
    onChange?: (ids: string[]) => void;
};

export function ModelTagsPicker(props: ModelTagsPickerProps) {
    const { translate } = useTranslation();
    const catalog = useModelCatalog('requestName');
    const options = catalog.entries.map((entry) => ({
        label: entry.id,
        value: entry.id,
    }));
    return (
        <Select
            mode="tags"
            showSearch
            value={props.value}
            onChange={(value) => props.onChange?.(value)}
            options={options}
            optionRender={(option) => {
                const entry = catalog.entries.find((item) => item.id === option.value);
                return (
                    <Space size={4}>
                        <span>{String(option.label)}</span>
                        {entry ? (
                            <SourceTag source={entry.source} overrides={entry.overrides} />
                        ) : null}
                    </Space>
                );
            }}
            placeholder={translate('picker.placeholder')}
            style={{ width: '100%' }}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <PickerFooter lastGoogleSyncAt={catalog.lastGoogleSyncAt} />
                </>
            )}
        />
    );
}

function PickerFooter(props: {
    lastGoogleSyncAt: string | null;
    onAdded?: (modelId: string) => void;
}) {
    const { translate } = useTranslation();
    const notification = useNotification();
    const invalidate = useInvalidate();
    const [syncing, setSyncing] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [customId, setCustomId] = useState('');
    const [inputPerMillion, setInputPerMillion] = useState<number | null>(null);
    const [outputPerMillion, setOutputPerMillion] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const handleInvalidateCatalog = async () => {
        await invalidate({ resource: 'user_model_catalog', invalidates: ['list'] });
        await invalidate({ resource: 'user_settings', invalidates: ['list'] });
    };

    const handleSyncCatalog = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/model-catalog/sync', { method: 'POST' });
            const body = (await response.json()) as { ok?: boolean; count?: number };
            if (!response.ok || !body.ok) {
                notification.open({
                    type: 'error',
                    message: translate('picker.syncFailed'),
                });
                return;
            }
            notification.open({
                type: 'success',
                message: translate('picker.syncOk', { count: body.count ?? 0 }),
            });
            await handleInvalidateCatalog();
        } catch {
            notification.open({
                type: 'error',
                message: translate('picker.syncFailed'),
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleAddCustomModel = async () => {
        const modelId = normalizeGeminiModelId(customId);
        if (!modelId) {
            return;
        }
        setSaving(true);
        try {
            const {
                data: { user },
            } = await supabaseBrowserClient.auth.getUser();
            if (!user) {
                return;
            }
            const { error } = await supabaseBrowserClient.from('user_model_catalog').upsert({
                user_id: user.id,
                model_id: modelId,
                source: 'custom',
                supports_generate: true,
            });
            if (error) {
                notification.open({
                    type: 'error',
                    message: translate('picker.addFailed'),
                });
                return;
            }
            if (inputPerMillion != null || outputPerMillion != null) {
                const { data: settings, error: settingsReadError } = await supabaseBrowserClient
                    .from('user_settings')
                    .select('id, custom_model_pricing')
                    .eq('id', user.id)
                    .maybeSingle();
                if (settingsReadError) {
                    notification.open({
                        type: 'error',
                        message: translate('picker.addFailed'),
                    });
                    return;
                }
                const current =
                    settings?.custom_model_pricing &&
                    typeof settings.custom_model_pricing === 'object' &&
                    !Array.isArray(settings.custom_model_pricing)
                        ? settings.custom_model_pricing
                        : {};
                const pricing: Json = {
                    ...current,
                    [modelId]: {
                        inputPerMillion: inputPerMillion ?? 0,
                        outputPerMillion: outputPerMillion ?? 0,
                    },
                };
                const { error: pricingError } = settings?.id
                    ? await supabaseBrowserClient
                          .from('user_settings')
                          .update({ custom_model_pricing: pricing })
                          .eq('id', settings.id)
                    : await supabaseBrowserClient.from('user_settings').insert({
                          id: user.id,
                          custom_model_pricing: pricing,
                      });
                if (pricingError) {
                    notification.open({
                        type: 'error',
                        message: translate('picker.addFailed'),
                    });
                    return;
                }
            }
            await handleInvalidateCatalog();
            setAddOpen(false);
            setCustomId('');
            setInputPerMillion(null);
            setOutputPerMillion(null);
            props.onAdded?.(modelId);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: 8, borderTop: '1px solid var(--gp-border, #333)' }}>
            <Space>
                <Button type="link" size="small" onClick={() => setAddOpen(true)}>
                    {translate('picker.addModel')}
                </Button>
                <Button
                    type="link"
                    size="small"
                    loading={syncing}
                    onClick={() => void handleSyncCatalog()}
                >
                    {translate('picker.syncGoogle')}
                </Button>
            </Space>
            {props.lastGoogleSyncAt ? (
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {translate('picker.lastSync', {
                        time: dayjs(props.lastGoogleSyncAt).format('YYYY-MM-DD HH:mm'),
                    })}
                </Typography.Text>
            ) : null}
            <Modal
                title={translate('picker.addModel')}
                open={addOpen}
                confirmLoading={saving}
                onCancel={() => setAddOpen(false)}
                onOk={() => void handleAddCustomModel()}
            >
                <Typography.Paragraph type="secondary">
                    {translate('picker.addModelHelp')}
                </Typography.Paragraph>
                <Input
                    value={customId}
                    onChange={(event) => setCustomId(event.target.value)}
                    placeholder={translate('picker.modelIdPlaceholder')}
                />
                <Space style={{ marginTop: 12, width: '100%' }} size={12}>
                    <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder={translate('picker.inputUsd')}
                        value={inputPerMillion}
                        onChange={(value) =>
                            setInputPerMillion(typeof value === 'number' ? value : null)
                        }
                    />
                    <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder={translate('picker.outputUsd')}
                        value={outputPerMillion}
                        onChange={(value) =>
                            setOutputPerMillion(typeof value === 'number' ? value : null)
                        }
                    />
                </Space>
            </Modal>
        </div>
    );
}

export function SourceTag({
    source,
    overrides,
}: {
    source: PickerModelEntry['source'] | string;
    overrides: boolean;
}) {
    const { translate } = useTranslation();
    return (
        <>
            {source === 'combo' ? (
                <Tag color="purple">{translate('picker.tag.combo')}</Tag>
            ) : source === 'catalog' ? (
                <Tag>{translate('picker.tag.custom')}</Tag>
            ) : (
                <Tag>{translate('picker.tag.google')}</Tag>
            )}
            {overrides ? <Tag>{translate('picker.tag.overrides')}</Tag> : null}
        </>
    );
}
