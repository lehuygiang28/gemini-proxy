'use client';

import React, { useMemo, useState } from 'react';
import { useInvalidate, useNotification, useTranslation } from '@refinedev/core';
import { Button, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { supabaseBrowserClient } from '@/utils/supabase/client';
import { useModelCatalog } from './use-model-catalog';
import type { PickerModelMode } from './merge-picker-catalog';

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
    const { entries } = useModelCatalog(props.mode);
    const disabledIds = props.disabledIds;
    const options = useMemo(() => {
        const disabled = new Set(disabledIds ?? []);
        const groups = new Map<
            string,
            Array<{ label: string; value: string; disabled: boolean }>
        >();
        for (const entry of entries) {
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
    }, [disabledIds, entries, translate]);

    return (
        <Select
            showSearch
            allowClear
            value={props.value}
            onChange={(value) => props.onChange(typeof value === 'string' ? value : undefined)}
            options={options}
            optionFilterProp="label"
            placeholder={translate('picker.placeholder')}
            style={{ width: '100%' }}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <PickerFooter />
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
    const { entries } = useModelCatalog('requestName');
    const options = entries.map((entry) => ({
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
            placeholder={translate('picker.placeholder')}
            style={{ width: '100%' }}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <PickerFooter />
                </>
            )}
        />
    );
}

function PickerFooter() {
    const { translate } = useTranslation();
    const notification = useNotification();
    const invalidate = useInvalidate();
    const [syncing, setSyncing] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [customId, setCustomId] = useState('');

    const handleInvalidateCatalog = async () => {
        await invalidate({ resource: 'user_model_catalog', invalidates: ['list'] });
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
        const modelId = customId.trim().toLowerCase();
        if (!modelId) {
            return;
        }
        const {
            data: { user },
        } = await supabaseBrowserClient.auth.getUser();
        if (!user) {
            return;
        }
        await supabaseBrowserClient.from('user_model_catalog').upsert({
            user_id: user.id,
            model_id: modelId,
            source: 'custom',
            supports_generate: true,
        });
        await handleInvalidateCatalog();
        setAddOpen(false);
        setCustomId('');
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
            <Modal
                title={translate('picker.addModel')}
                open={addOpen}
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
            </Modal>
        </div>
    );
}

export function SourceTag({ source, overrides }: { source: string; overrides: boolean }) {
    const { translate } = useTranslation();
    if (overrides) {
        return <Tag>{translate('picker.tag.overrides')}</Tag>;
    }
    if (source === 'combo') {
        return <Tag color="purple">{translate('picker.tag.combo')}</Tag>;
    }
    if (source === 'catalog') {
        return <Tag>{translate('picker.tag.custom')}</Tag>;
    }
    return <Tag>{translate('picker.tag.google')}</Tag>;
}
