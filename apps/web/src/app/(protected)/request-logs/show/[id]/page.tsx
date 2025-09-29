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
