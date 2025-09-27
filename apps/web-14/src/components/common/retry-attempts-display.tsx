'use client';

import React from 'react';
import { Card, Timeline, Tag, Typography, Space, Tooltip, theme } from 'antd';
import {
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    KeyOutlined,
    BugOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

interface RetryAttempt {
    attempt_number: number;
    api_key_id: string;
    error: {
        message: string;
        type: string;
        status?: number;
        code?: string;
    };
    duration_ms: number;
    timestamp: string;
    provider_error?: {
        status?: number;
        headers?: Record<string, string>;
        raw_body?: string;
    };
}

// Type guard to check if the data is a valid retry attempt
const isValidRetryAttempt = (data: any): data is RetryAttempt => {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.attempt_number === 'number' &&
        typeof data.api_key_id === 'string' &&
        typeof data.error === 'object' &&
        data.error !== null &&
        typeof data.error.message === 'string' &&
        typeof data.error.type === 'string' &&
        typeof data.duration_ms === 'number' &&
        typeof data.timestamp === 'string'
    );
};

interface RetryAttemptsDisplayProps {
    retryAttempts: any[]; // Accept any array and validate each item
    collapsible?: boolean;
    title?: string;
}

export const RetryAttemptsDisplay: React.FC<RetryAttemptsDisplayProps> = ({
    retryAttempts,
    collapsible = true,
    title = 'Retry Attempts',
}) => {
    const { token } = useToken();

    if (!retryAttempts || retryAttempts.length === 0) {
        return null;
    }

    // Filter and validate retry attempts
    const validRetryAttempts = retryAttempts.filter(isValidRetryAttempt) as RetryAttempt[];

    if (validRetryAttempts.length === 0) {
        return null;
    }

    const getErrorTypeColor = (type: string) => {
        switch (type) {
            case 'rate_limit_error':
                return 'orange';
            case 'invalid_key_error':
                return 'red';
            case 'server_error':
                return 'purple';
            case 'network_error':
                return 'blue';
            case 'validation_error':
                return 'volcano';
            default:
                return 'default';
        }
    };

    const getErrorIcon = (type: string) => {
        switch (type) {
            case 'rate_limit_error':
                return <ClockCircleOutlined style={{ color: token.colorWarning }} />;
            case 'invalid_key_error':
                return <KeyOutlined style={{ color: token.colorError }} />;
            case 'server_error':
                return <BugOutlined style={{ color: token.colorError }} />;
            case 'network_error':
                return <ExclamationCircleOutlined style={{ color: token.colorInfo }} />;
            case 'validation_error':
                return <CloseCircleOutlined style={{ color: token.colorError }} />;
            default:
                return <CloseCircleOutlined style={{ color: token.colorTextSecondary }} />;
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return `${text.substring(0, maxLength)}...`;
    };

    const timelineItems = validRetryAttempts.map((attempt, index) => {
        const isLastAttempt = index === validRetryAttempts.length - 1;

        return {
            color: token.colorError,
            dot: getErrorIcon(attempt.error.type),
            children: (
                <div style={{ marginBottom: token.marginMD }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {/* Attempt Header */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Space>
                                <Text strong style={{ color: token.colorText }}>
                                    Attempt #{attempt.attempt_number}
                                </Text>
                                <Tag color={getErrorTypeColor(attempt.error.type)}>
                                    {attempt.error.type.replace(/_/g, ' ').toUpperCase()}
                                </Tag>
                                {attempt.error.status && (
                                    <Tag color="default">HTTP {attempt.error.status}</Tag>
                                )}
                            </Space>
                            <Space size="small">
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    {formatDuration(attempt.duration_ms)}
                                </Text>
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    {formatTimestamp(attempt.timestamp)}
                                </Text>
                            </Space>
                        </div>

                        {/* API Key ID */}
                        <div>
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                API Key:{' '}
                                <Text code style={{ fontSize: token.fontSizeSM }}>
                                    {attempt.api_key_id.slice(0, 8)}...
                                </Text>
                            </Text>
                        </div>

                        {/* Error Message */}
                        <div>
                            <Text strong style={{ color: token.colorError }}>
                                {attempt.error.message}
                            </Text>
                            {attempt.error.code && (
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        marginLeft: token.marginXS,
                                    }}
                                >
                                    (Code: {attempt.error.code})
                                </Text>
                            )}
                        </div>

                        {/* Provider Error Details */}
                        {attempt.provider_error && (
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <Text style={{ fontSize: token.fontSizeSM }}>
                                            Provider Error Details
                                        </Text>
                                        {attempt.provider_error.status && (
                                            <Tag color="default">
                                                {attempt.provider_error.status}
                                            </Tag>
                                        )}
                                    </Space>
                                }
                                style={{
                                    backgroundColor: token.colorBgContainer,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    marginTop: token.marginXS,
                                }}
                            >
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    {/* Provider Headers */}
                                    {attempt.provider_error.headers &&
                                        Object.keys(attempt.provider_error.headers).length > 0 && (
                                            <div>
                                                <Text strong style={{ fontSize: token.fontSizeSM }}>
                                                    Headers:
                                                </Text>
                                                <div
                                                    style={{
                                                        backgroundColor: token.colorBgElevated,
                                                        padding: token.paddingXS,
                                                        borderRadius: token.borderRadiusSM,
                                                        marginTop: token.marginXXS,
                                                        maxHeight: 100,
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    <pre
                                                        style={{
                                                            margin: 0,
                                                            fontSize: token.fontSizeSM,
                                                            color: token.colorTextSecondary,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        {JSON.stringify(
                                                            attempt.provider_error.headers,
                                                            null,
                                                            2,
                                                        )}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                    {/* Provider Body */}
                                    {attempt.provider_error.raw_body && (
                                        <div>
                                            <Text strong style={{ fontSize: token.fontSizeSM }}>
                                                Response Body:
                                            </Text>
                                            <Tooltip title={attempt.provider_error.raw_body}>
                                                <div
                                                    style={{
                                                        backgroundColor: token.colorBgElevated,
                                                        padding: token.paddingXS,
                                                        borderRadius: token.borderRadiusSM,
                                                        marginTop: token.marginXXS,
                                                        maxHeight: 100,
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    <pre
                                                        style={{
                                                            margin: 0,
                                                            fontSize: token.fontSizeSM,
                                                            color: token.colorTextSecondary,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        {truncateText(
                                                            attempt.provider_error.raw_body,
                                                            200,
                                                        )}
                                                    </pre>
                                                </div>
                                            </Tooltip>
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        )}
                    </Space>
                </div>
            ),
        };
    });

    return (
        <Card
            title={
                <Space>
                    <Text strong>{title}</Text>
                    <Tag color="error">{validRetryAttempts.length} Failed Attempts</Tag>
                </Space>
            }
            style={{ marginBottom: token.marginLG }}
        >
            <Timeline items={timelineItems} style={{ marginTop: token.marginMD }} />

            {/* Summary */}
            <div
                style={{
                    marginTop: token.marginLG,
                    padding: token.paddingMD,
                    backgroundColor: token.colorBgElevated,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text strong style={{ color: token.colorText }}>
                        Retry Summary
                    </Text>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text type="secondary">
                            Total Attempts: <Text strong>{validRetryAttempts.length}</Text>
                        </Text>
                        <Text type="secondary">
                            Total Duration:{' '}
                            <Text strong>
                                {formatDuration(
                                    validRetryAttempts.reduce(
                                        (sum, attempt) => sum + attempt.duration_ms,
                                        0,
                                    ),
                                )}
                            </Text>
                        </Text>
                    </div>
                    <Text type="secondary">
                        Time Range:{' '}
                        <Text strong>
                            {formatTimestamp(validRetryAttempts[0].timestamp)} -{' '}
                            {formatTimestamp(
                                validRetryAttempts[validRetryAttempts.length - 1].timestamp,
                            )}
                        </Text>
                    </Text>
                </Space>
            </div>
        </Card>
    );
};
