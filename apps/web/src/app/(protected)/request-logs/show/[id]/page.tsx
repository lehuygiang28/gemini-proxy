'use client';

import React from 'react';
import { useGo, useResourceParams, useOne } from '@refinedev/core';
import { Button, Alert, Spin, theme } from 'antd';
import { Show } from '@refinedev/antd';
import { RequestLogDetails } from '@/components/RequestLogDetails';
import type { RequestLog } from '@/types/request-log.types';
import { REQUEST_LOG_DETAIL_SELECT } from '@/constants/request-log-select';

const { useToken } = theme;

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
            select: REQUEST_LOG_DETAIL_SELECT,
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

    return (
        <Show>
            <RequestLogDetails requestLog={requestLog} isModal={false} />
        </Show>
    );
}
