'use client';

import React from 'react';
import { Tag, Tooltip, Space, Typography, theme } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
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

interface RetryAttemptsBadgeProps {
    retryAttempts: any[];
    compact?: boolean;
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

// Function to get color based on retry attempt count
const getRetryAttemptColor = (attemptCount: number): string => {
    if (attemptCount === 1) {
        return 'success'; // Green for single attempt (success)
    } else if (attemptCount <= 2) {
        return 'warning'; // Yellow for 2 attempts (minor warning)
    } else if (attemptCount <= 4) {
        return 'orange'; // Orange for 3-4 attempts (moderate warning)
    } else if (attemptCount <= 5) {
        return 'volcano'; // Red-orange for 5 attempts (high warning)
    } else if (attemptCount <= 10) {
        return 'red'; // Red for 6-10 attempts (critical)
    } else if (attemptCount <= 20) {
        return 'magenta'; // Magenta for 11-20 attempts (severe)
    } else {
        return 'purple'; // Purple for 20+ attempts (extreme)
    }
};

// Function to get severity level text
const getRetryAttemptSeverity = (attemptCount: number): string => {
    if (attemptCount === 1) {
        return 'Success';
    } else if (attemptCount <= 2) {
        return 'Minor Issue';
    } else if (attemptCount <= 4) {
        return 'Moderate Issue';
    } else if (attemptCount <= 5) {
        return 'High Issue';
    } else if (attemptCount <= 10) {
        return 'Critical Issue';
    } else if (attemptCount <= 20) {
        return 'Severe Issue';
    } else {
        return 'Extreme Issue';
    }
};

export const RetryAttemptsBadge: React.FC<RetryAttemptsBadgeProps> = ({
    retryAttempts,
    compact = true,
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

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    // Get color and severity based on attempt count
    const attemptCount = validRetryAttempts.length;
    const badgeColor = getRetryAttemptColor(attemptCount);
    const severityText = getRetryAttemptSeverity(attemptCount);

    if (compact) {
        // Compact view for list items
        const totalDuration = validRetryAttempts.reduce(
            (sum, attempt) => sum + attempt.duration_ms,
            0,
        );
        const errorTypes = [...new Set(validRetryAttempts.map((attempt) => attempt.error.type))];

        return (
            <Tooltip
                title={
                    <div>
                        <div>
                            <strong>Retry Summary:</strong>
                        </div>
                        <div>• {validRetryAttempts.length} failed attempts</div>
                        <div>• Severity: {severityText}</div>
                        <div>• Total duration: {formatDuration(totalDuration)}</div>
                        <div>• Error types: {errorTypes.join(', ')}</div>
                        <div>
                            • First attempt:{' '}
                            {new Date(validRetryAttempts[0].timestamp).toLocaleTimeString()}
                        </div>
                        <div>
                            • Last attempt:{' '}
                            {new Date(
                                validRetryAttempts[validRetryAttempts.length - 1].timestamp,
                            ).toLocaleTimeString()}
                        </div>
                    </div>
                }
            >
                <Tag
                    color={badgeColor}
                    icon={<ReloadOutlined />}
                    style={{
                        cursor: 'pointer',
                        fontSize: token.fontSizeSM,
                        fontWeight: attemptCount > 2 ? 'bold' : 'normal',
                    }}
                >
                    {validRetryAttempts.length} Retry{validRetryAttempts.length > 1 ? 'ies' : ''}
                </Tag>
            </Tooltip>
        );
    }

    // Detailed view for when compact is false
    return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXS }}>
                <ExclamationCircleOutlined style={{ color: token.colorError }} />
                <Text strong style={{ color: token.colorError }}>
                    {validRetryAttempts.length} Retry Attempt
                    {validRetryAttempts.length > 1 ? 's' : ''}
                </Text>
                <Tag color={badgeColor}>{severityText}</Tag>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: token.marginXXS }}>
                {validRetryAttempts.slice(0, 3).map((attempt, index) => (
                    <Tag key={index} color={getErrorTypeColor(attempt.error.type)}>
                        #{attempt.attempt_number} {attempt.error.type.replace(/_/g, ' ')}
                    </Tag>
                ))}
                {validRetryAttempts.length > 3 && (
                    <Tag color="default">+{validRetryAttempts.length - 3} more</Tag>
                )}
            </div>
        </Space>
    );
};
