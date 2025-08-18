'use client';

import React from 'react';
import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type ApiKey = Tables<'api_keys'>;

export default function ApiKeysShowPage() {
    const { queryResult } = useShow<ApiKey>();
    const record = queryResult?.data?.data;

    return (
        <Show title={record?.name ?? 'API Key'}>
            <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{record?.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{record?.name}</Descriptions.Item>
                <Descriptions.Item label="Provider">
                    {record?.provider ? <Tag>{record?.provider}</Tag> : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Active">
                    {record?.is_active ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Success Count">{record?.success_count}</Descriptions.Item>
                <Descriptions.Item label="Failure Count">{record?.failure_count}</Descriptions.Item>
                <Descriptions.Item label="Last Used At">
                    {record?.last_used_at ? new Date(record.last_used_at).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                    {record?.created_at ? new Date(record.created_at).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                    {record?.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}
                </Descriptions.Item>
            </Descriptions>
        </Show>
    );
}
