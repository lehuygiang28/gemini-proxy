'use client';

import React from 'react';
import { useGo, useResourceParams } from '@refinedev/core';
import { Button, Alert, Spin, theme } from 'antd';
import { useOne } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';
import { RequestLogDetails } from '@/components/RequestLogDetails';
import { Show } from '@refinedev/antd';

const { useToken } = theme;

type RequestLog = Tables<'request_logs'>;

export default function RequestLogShowPage() {
    const { token } = useToken();
    const { id: requestId } = useResourceParams();
    const go = useGo();

    const {
        result: requestLog,
        query: { isLoading, isError },
    } = useOne<RequestLog>({
        resource: 'request_logs',
        id: requestId,
        meta: {
            select: `
                *,
                api_keys!api_key_id(
                    id,
                    name,
                    provider,
                    is_active,
                    user_id,
                    created_at,
                    last_used_at,
                    success_count,
                    failure_count,
                    total_tokens,
                    prompt_tokens,
                    completion_tokens
                ),
                proxy_api_keys!proxy_key_id(
                    id,
                    name,
                    is_active,
                    user_id,
                    created_at,
                    last_used_at,
                    success_count,
                    failure_count,
                    total_tokens,
                    prompt_tokens,
                    completion_tokens
                )
            `,
        },
    });

    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                    background: token.colorBgContainer,
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (isError || !requestLog) {
        return (
            <Alert
                message="Request Log Not Found"
                description="The requested log could not be found or you don't have permission to view it."
                type="error"
                showIcon
                action={
                    <Button onClick={() => go({ to: '/request-logs' })}>
                        Back to Request Logs
                    </Button>
                }
            />
        );
    }

    const log = requestLog;

    return (
        <Show>
            <RequestLogDetails requestLog={log} isModal={false} />
        </Show>
    );
}
