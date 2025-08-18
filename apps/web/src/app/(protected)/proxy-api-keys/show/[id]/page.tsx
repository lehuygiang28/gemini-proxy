'use client';

import React from 'react';
import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type ProxyApiKey = Tables<'proxy_api_keys'>;

export default function ProxyApiKeysShowPage() {
    const { queryResult } = useShow<ProxyApiKey>();
    const record = queryResult?.data?.data;

    return (
        <Show title={record?.name ?? 'Proxy API Key'}>
            <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{record?.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{record?.name}</Descriptions.Item>
                <Descriptions.Item label="Key ID">{record?.key_id}</Descriptions.Item>
                <Descriptions.Item label="Active">
                    {record?.is_active ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Prompt Tokens">{record?.prompt_tokens}</Descriptions.Item>
                <Descriptions.Item label="Completion Tokens">
                    {record?.completion_tokens}
                </Descriptions.Item>
                <Descriptions.Item label="Total Tokens">{record?.total_tokens}</Descriptions.Item>
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
