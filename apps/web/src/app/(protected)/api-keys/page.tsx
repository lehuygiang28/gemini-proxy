'use client';

import React from 'react';
import { List, CreateButton, EditButton, ShowButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { Table, Space, Switch, Tag } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type ApiKey = Tables<'api_keys'>;

export default function ApiKeysListPage() {
    const { tableProps } = useTable<ApiKey>({
        syncWithLocation: true,
        pagination: { pageSize: 10 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
    });

    return (
        <List headerButtons={<CreateButton />}>
            <Table<ApiKey>
                {...tableProps}
                rowKey="id"
                columns={[
                    {
                        title: 'Name',
                        dataIndex: 'name',
                        sorter: true,
                    },
                    {
                        title: 'Provider',
                        dataIndex: 'provider',
                        render: (value: string) => (value ? <Tag>{value}</Tag> : '-'),
                        sorter: true,
                    },
                    {
                        title: 'Active',
                        dataIndex: 'is_active',
                        render: (value: boolean) => <Switch checked={value} disabled />,
                        sorter: true,
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
                        title: 'Updated',
                        dataIndex: 'updated_at',
                        sorter: true,
                        render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '-'),
                    },
                    {
                        title: 'Actions',
                        dataIndex: 'actions',
                        render: (_: unknown, record: ApiKey) => (
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
