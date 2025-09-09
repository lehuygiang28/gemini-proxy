'use client';

import React from 'react';
import { Tag, Tooltip, Space } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';

type RequestLog = Tables<'request_logs'>;

interface StatusDisplayProps {
    record: RequestLog;
    showDetails?: boolean;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ record, showDetails = true }) => {
    // Extract status code from response_data
    const getStatusCode = (record: RequestLog): number | null => {
        try {
            if (record.response_data && typeof record.response_data === 'object') {
                const responseData = record.response_data as Record<string, any>;
                return responseData.status || null;
            }
        } catch (error) {
            // Fallback to is_successful field
        }
        return null;
    };

    const getStatusInfo = (record: RequestLog) => {
        const statusCode = getStatusCode(record);
        const isSuccessful = record.is_successful;
        const retryCount = Array.isArray(record.retry_attempts) ? record.retry_attempts.length : 0;

        // Determine status based on status code or is_successful
        if (statusCode !== null) {
            if (statusCode >= 200 && statusCode < 300) {
                return {
                    type: 'success',
                    color: 'green',
                    text: `${statusCode} Success`,
                    icon: <CheckCircleOutlined />,
                    description: 'Request completed successfully',
                };
            } else if (statusCode === 429) {
                return {
                    type: 'rate_limit',
                    color: 'orange',
                    text: `${statusCode} Rate Limited`,
                    icon: <ClockCircleOutlined />,
                    description: 'Request rate limited by provider',
                };
            } else if (statusCode >= 400 && statusCode < 500) {
                return {
                    type: 'client_error',
                    color: 'red',
                    text: `${statusCode} Client Error`,
                    icon: <CloseCircleOutlined />,
                    description: 'Client-side error occurred',
                };
            } else if (statusCode >= 500) {
                return {
                    type: 'server_error',
                    color: 'red',
                    text: `${statusCode} Server Error`,
                    icon: <CloseCircleOutlined />,
                    description: 'Server-side error occurred',
                };
            } else {
                return {
                    type: 'unknown',
                    color: 'default',
                    text: `${statusCode} Unknown`,
                    icon: <ExclamationCircleOutlined />,
                    description: 'Unknown status code',
                };
            }
        } else {
            // Fallback to is_successful field
            return {
                type: isSuccessful ? 'success' : 'failed',
                color: isSuccessful ? 'green' : 'red',
                text: isSuccessful ? 'Success' : 'Failed',
                icon: isSuccessful ? <CheckCircleOutlined /> : <CloseCircleOutlined />,
                description: isSuccessful ? 'Request completed successfully' : 'Request failed',
            };
        }
    };

    const statusInfo = getStatusInfo(record);
    const retryCount = Array.isArray(record.retry_attempts) ? record.retry_attempts.length : 0;

    return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Tooltip title={statusInfo.description}>
                <Tag
                    color={statusInfo.color}
                    icon={statusInfo.icon}
                    style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: 500,
                        borderRadius: '4px',
                    }}
                >
                    {statusInfo.text}
                </Tag>
            </Tooltip>

            {showDetails && retryCount > 0 && (
                <div style={{ fontSize: '11px', color: '#666' }}>
                    {retryCount} retry attempt{retryCount > 1 ? 's' : ''}
                </div>
            )}

            {showDetails && !record.is_successful && record.error_details && (
                <div style={{ fontSize: '11px', color: '#ff4d4f' }}>Error occurred</div>
            )}
        </Space>
    );
};
