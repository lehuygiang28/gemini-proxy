'use client';

import React from 'react';
import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions } from 'antd';
import type { Tables } from '@gemini-proxy/database';

type RequestLog = Tables<'request_logs'>;

export default function RequestLogsShowPage() {
    const { queryResult } = useShow<RequestLog>();
    const record = queryResult?.data?.data;

    return (
        <Show title={record?.request_id ?? 'Request Log'}>
            <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{record?.id}</Descriptions.Item>
                <Descriptions.Item label="Request ID">{record?.request_id}</Descriptions.Item>
                <Descriptions.Item label="API Format">{record?.api_format}</Descriptions.Item>
                <Descriptions.Item label="Is Stream">
                    {record?.is_stream ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Is Successful">
                    {record?.is_successful ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="API Key ID">{record?.api_key_id}</Descriptions.Item>
                <Descriptions.Item label="Proxy Key ID">
                    {record?.proxy_key_id ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Request Data">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.request_data, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Response Data">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.response_data, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Usage Metadata">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.usage_metadata, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Retry Attempts">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.retry_attempts, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Performance Metrics">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.performance_metrics, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Error Details">
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(record?.error_details, null, 2)}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                    {record?.created_at ? new Date(record.created_at).toLocaleString() : '-'}
                </Descriptions.Item>
            </Descriptions>
        </Show>
    );
}
