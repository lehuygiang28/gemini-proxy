'use client';

import React from 'react';
import { List, ShowButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { Table, Space, Tag } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type RequestLog = Tables<'request_logs'>;

export default function RequestLogsListPage() {
    const { tableProps } = useTable<RequestLog>({
        syncWithLocation: true,
        pagination: { pageSize: 10 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
    });

    return (
        <List>
            <Table<RequestLog>
                {...tableProps}
                rowKey="id"
                columns={[
                    {
                        title: 'Request ID',
                        dataIndex: 'request_id',
                        sorter: true,
                    },
                    {
                        title: 'API Format',
                        dataIndex: 'api_format',
                        render: (v: string) => <Tag>{v}</Tag>,
                        sorter: true,
                    },
                    {
                        title: 'Stream',
                        dataIndex: 'is_stream',
                        render: (v: boolean) => (v ? 'Yes' : 'No'),
                        sorter: true,
                    },
                    {
                        title: 'Successful',
                        dataIndex: 'is_successful',
                        render: (v: boolean) => (v ? 'Yes' : 'No'),
                        sorter: true,
                    },
                    {
                        title: 'Created',
                        dataIndex: 'created_at',
                        render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '-'),
                        sorter: true,
                    },
                    {
                        title: 'Actions',
                        dataIndex: 'actions',
                        render: (_: unknown, record: RequestLog) => (
                            <Space>
                                <ShowButton hideText recordItemId={record.id} />
                            </Space>
                        ),
                    },
                ]}
            />
        </List>
    );
}
