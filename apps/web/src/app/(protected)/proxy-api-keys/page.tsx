'use client';

import React from 'react';
import { List, CreateButton, EditButton, ShowButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { Table, Space, Switch } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type ProxyApiKey = Tables<'proxy_api_keys'>;

export default function ProxyApiKeysListPage() {
    const { tableProps } = useTable<ProxyApiKey>({
        syncWithLocation: true,
        pagination: { pageSize: 10 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
    });

    return (
        <List headerButtons={<CreateButton />}>
            <Table<ProxyApiKey>
                {...tableProps}
                rowKey="id"
                columns={[
                    {
                        title: 'Name',
                        dataIndex: 'name',
                        sorter: true,
                    },
                    {
                        title: 'Key ID',
                        dataIndex: 'key_id',
                        sorter: true,
                    },
                    {
                        title: 'Active',
                        dataIndex: 'is_active',
                        render: (value: boolean) => <Switch checked={value} disabled />,
                        sorter: true,
                    },
                    {
                        title: 'Tokens (prompt/completion/total)',
                        render: (_: unknown, r: ProxyApiKey) =>
                            `${r.prompt_tokens}/${r.completion_tokens}/${r.total_tokens}`,
                    },
                    {
                        title: 'Success',
                        dataIndex: 'success_count',
                        sorter: true,
                    },
                    {
                        title: 'Failure',
                        dataIndex: 'failure_count',
                        sorter: true,
                    },
                    {
                        title: 'Last Used',
                        dataIndex: 'last_used_at',
                        sorter: true,
                        render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '-'),
                    },
                    {
                        title: 'Actions',
                        dataIndex: 'actions',
                        render: (_: unknown, record: ProxyApiKey) => (
                            <Space>
                                <EditButton hideText recordItemId={record.id} />
                                <ShowButton hideText recordItemId={record.id} />
                            </Space>
                        ),
                    },
                ]}
            />
        </List>
    );
}
