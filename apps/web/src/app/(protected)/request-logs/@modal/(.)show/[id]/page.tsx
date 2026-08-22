'use client';

import React from 'react';
import { Modal, Typography, Alert, Spin, Button, theme } from 'antd';
import { useOne, useResourceParams, useBack } from '@refinedev/core';
import { RequestLogDetails } from '@/components/RequestLogDetails';
import type { RequestLog } from '@/types/request-log.types';
import { REQUEST_LOG_DETAIL_SELECT } from '@/constants/request-log-select';

const { Title, Text } = Typography;
const { useToken } = theme;

/**
 * Request Log Details Modal
 * Shows comprehensive information about a specific request log in a modal
 * Intercepts the /show/[id] route for modal display
 */
export default function RequestLogDetailsModal() {
    const { token } = useToken();
    const { id: requestId } = useResourceParams();
    const back = useBack();

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

    const handleClose = () => {
        back();
    };

    if (isLoading) {
        return (
            <Modal
                title="Request Log Details"
                open={true}
                onCancel={handleClose}
                footer={null}
                width={1200}
                style={{ top: 10 }}
                styles={{
                    body: {
                        maxHeight: '90vh',
                        overflowX: 'hidden',
                        padding: token.paddingMD,
                        background: token.colorBgContainer,
                    },
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignContent: 'center',
                        alignItems: 'center',
                        height: '400px',
                        background: token.colorBgContainer,
                    }}
                >
                    <Spin size="large" />
                </div>
            </Modal>
        );
    }

    if (isError || !requestLog) {
        return (
            <Modal
                title="Request Log Details"
                open={true}
                onCancel={handleClose}
                footer={null}
                width={800}
            >
                <Alert
                    message="Request Log Not Found"
                    description="The requested log could not be found or you don't have permission to view it."
                    type="error"
                    showIcon
                    action={<Button onClick={handleClose}>Close</Button>}
                />
            </Modal>
        );
    }

    const log = requestLog;

    return (
        <Modal
            title={
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        Request Log Details
                    </Title>
                    <Text type="secondary" style={{ fontSize: '12px' }} className="gp-live-mono">
                        {log.request_id}
                    </Text>
                </div>
            }
            open={true}
            onCancel={handleClose}
            footer={null}
            width={1200}
            style={{ top: 10 }}
            styles={{
                body: {
                    maxHeight: '90vh',
                    overflowX: 'hidden',
                    padding: token.paddingMD,
                    background: token.colorBgContainer,
                },
            }}
        >
            <RequestLogDetails requestLog={log} isModal={true} />
        </Modal>
    );
}
