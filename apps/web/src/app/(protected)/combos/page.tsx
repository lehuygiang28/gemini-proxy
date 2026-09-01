'use client';

import React from 'react';
import { CreateButton, DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import { useList, useTranslation } from '@refinedev/core';
import { Empty, Input, Space, Table, Tag, Typography } from 'antd';
import type { UserSettings } from '@/features/settings/types';

type ComboRow = {
    id: string;
    name: string;
    is_active: boolean;
    strategy: string | null;
    model_combo_members?: Array<{ position: number; canonical_model: string }>;
};

export default function CombosListPage() {
    const { translate } = useTranslation();
    const { tableProps, searchFormProps } = useTable<ComboRow>({
        resource: 'model_combos',
        syncWithLocation: true,
        liveMode: 'auto',
        meta: { select: '*, model_combo_members(*)' },
        onSearch: (values: { name?: string }) => {
            const name = values.name?.trim();
            return name ? [{ field: 'name', operator: 'contains', value: name }] : [];
        },
    });
    const { result } = useList<UserSettings>({
        resource: 'user_settings',
        pagination: { currentPage: 1, pageSize: 1 },
    });
    const globalStrategy = result?.data?.[0]?.combo_strategy ?? 'fallback';

    return (
        <List
            title={translate('combos.title')}
            headerButtons={<CreateButton>{translate('combos.create')}</CreateButton>}
        >
            <Input.Search
                placeholder={translate('combos.search')}
                style={{ maxWidth: 320, marginBottom: 16 }}
                onSearch={(value) => {
                    searchFormProps.form?.setFieldValue('name', value);
                    searchFormProps.form?.submit();
                }}
            />
            <Table
                {...tableProps}
                rowKey="id"
                locale={{
                    emptyText: (
                        <Empty description={translate('combos.empty')}>
                            <CreateButton />
                        </Empty>
                    ),
                }}
            >
                <Table.Column
                    title={translate('combos.fields.name')}
                    dataIndex="name"
                    render={(name: string, record: ComboRow) => (
                        <Space>
                            <Typography.Text>{name}</Typography.Text>
                            {record.is_active ? null : <Tag>{translate('combos.off')}</Tag>}
                        </Space>
                    )}
                />
                <Table.Column
                    title={translate('combos.fields.members')}
                    dataIndex="model_combo_members"
                    render={(members: ComboRow['model_combo_members']) => (
                        <Space wrap>
                            {[...(members ?? [])]
                                .sort((left, right) => left.position - right.position)
                                .map((member) => (
                                    <Tag key={`${member.position}-${member.canonical_model}`}>
                                        {member.position + 1} {member.canonical_model}
                                    </Tag>
                                ))}
                        </Space>
                    )}
                />
                <Table.Column
                    title={translate('combos.fields.strategy')}
                    dataIndex="strategy"
                    render={(strategy: string | null) =>
                        strategy == null ? (
                            <Typography.Text type="secondary">
                                {translate('combos.defaultStrategy', {
                                    strategy: String(globalStrategy),
                                })}
                            </Typography.Text>
                        ) : (
                            translate(`combos.strategy.${strategy}`)
                        )
                    }
                />
                <Table.Column
                    title={translate('combos.fields.actions')}
                    render={(_: unknown, record: ComboRow) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                            <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
}
