'use client';

import React from 'react';
import { List, ShowButton } from '@refinedev/antd';
import {
    Table,
    Space,
    Tag,
    Card,
    Row,
    Col,
    Tooltip,
    theme,
    Statistic,
    Progress,
    Typography,
} from 'antd';
import { ThunderboltOutlined, BugOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import {
    DateTimeDisplay,
    JsonActionsDropdown,
    StatusDisplay,
    AdvancedFilters,
} from '@/components/common';
import { useRetryStatisticsRpc, useServerSideFilters } from '@/hooks';
import {
    getRequestType,
    getRequestTypeColor,
    formatDuration,
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatTokenCount,
} from '@/utils/table-helpers';

const { useToken } = theme;
const { Text } = Typography;

type RequestLog = Tables<'request_logs'>;

// Function to get color based on attempt count
const getAttemptCountColor = (attemptCount: number): string => {
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
const getAttemptCountSeverity = (attemptCount: number): string => {
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

export default function RequestLogsListPage() {
    const { token } = useToken();

    // Use server-side filtering hook
    const { tableProps, filters, setFilters, resetFilters, isLoading, totalCount, filterOptions } =
        useServerSideFilters();

    // Get retry statistics using RPC function
    const { statistics: retryStats, isLoading: statsLoading } = useRetryStatisticsRpc(30);

    const getFormatColor = (apiFormat: string) => {
        return getRequestTypeColor(apiFormat);
    };

    const handleFiltersChange = (newFilters: typeof filters) => {
        setFilters(newFilters);
    };

    const handleReset = () => {
        resetFilters();
    };

    return (
        <List
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: token.marginMD }}>
                    <span>Request Logs</span>
                    {totalCount > 0 && (
                        <Tag color="blue" style={{ marginLeft: 'auto' }}>
                            {totalCount} filtered results
                        </Tag>
                    )}
                </div>
            }
        >
            {/* Enhanced Statistics Dashboard */}
            <Card
                style={{
                    marginBottom: token.marginLG,
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                }}
                bodyStyle={{
                    padding: token.paddingLG,
                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                }}
                loading={statsLoading}
            >
                <div style={{ marginBottom: token.marginMD }}>
                    <Text
                        strong
                        style={{
                            fontSize: token.fontSizeLG,
                            marginBottom: token.marginMD,
                            display: 'block',
                        }}
                    >
                        📊 Request Statistics
                    </Text>
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} sm={6}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                                bodyStyle={{ padding: token.paddingMD }}
                            >
                                <Statistic
                                    title="📈 Total Requests"
                                    value={retryStats?.total_requests || 0}
                                    valueStyle={{
                                        color: token.colorText,
                                        fontSize: token.fontSizeXL,
                                    }}
                                    prefix={
                                        <ClockCircleOutlined
                                            style={{ color: token.colorPrimary }}
                                        />
                                    }
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                                bodyStyle={{ padding: token.paddingMD }}
                            >
                                <Statistic
                                    title="🔄 With Retries"
                                    value={retryStats?.requests_with_retries || 0}
                                    valueStyle={{
                                        color: token.colorWarning,
                                        fontSize: token.fontSizeXL,
                                    }}
                                    prefix={<BugOutlined style={{ color: token.colorWarning }} />}
                                />
                                <Progress
                                    percent={
                                        retryStats?.total_requests
                                            ? Math.round(
                                                  (retryStats.requests_with_retries /
                                                      retryStats.total_requests) *
                                                      100,
                                              )
                                            : 0
                                    }
                                    size="small"
                                    showInfo={false}
                                    strokeColor={token.colorWarning}
                                    style={{ marginTop: token.marginXS }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                                bodyStyle={{ padding: token.paddingMD }}
                            >
                                <Statistic
                                    title="⚡ Total Retry Attempts"
                                    value={retryStats?.total_retry_attempts || 0}
                                    valueStyle={{
                                        color: token.colorError,
                                        fontSize: token.fontSizeXL,
                                    }}
                                    prefix={
                                        <ThunderboltOutlined style={{ color: token.colorError }} />
                                    }
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                                bodyStyle={{ padding: token.paddingMD }}
                            >
                                <Statistic
                                    title="📊 Retry Rate"
                                    value={retryStats?.retry_rate || 0}
                                    suffix="%"
                                    valueStyle={{
                                        color: token.colorInfo,
                                        fontSize: token.fontSizeXL,
                                    }}
                                />
                                <Progress
                                    percent={retryStats?.retry_rate || 0}
                                    size="small"
                                    showInfo={false}
                                    strokeColor={
                                        (retryStats?.retry_rate || 0) > 20
                                            ? token.colorError
                                            : (retryStats?.retry_rate || 0) > 10
                                              ? token.colorWarning
                                              : token.colorSuccess
                                    }
                                    style={{ marginTop: token.marginXS }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Card>

            {/* Advanced Filters */}
            <AdvancedFilters
                onFiltersChange={handleFiltersChange}
                onReset={handleReset}
                loading={isLoading}
                initialFilters={filters}
                filterOptions={filterOptions}
            />

            <div style={{ marginTop: token.marginLG }}>
                <Text
                    strong
                    style={{
                        fontSize: token.fontSizeLG,
                        marginBottom: token.marginMD,
                        display: 'block',
                    }}
                >
                    📋 Request Logs
                </Text>
                <Table<RequestLog>
                    {...tableProps}
                    rowKey="id"
                    style={{
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowSecondary,
                    }}
                    columns={[
                        {
                            title: 'Request ID',
                            dataIndex: 'request_id',
                            render: (value: string, record: RequestLog) => (
                                <div>
                                    <div style={{ fontWeight: 500, color: token.colorText }}>
                                        {value.slice(0, 12)}...
                                    </div>
                                    <div
                                        style={{
                                            fontSize: token.fontSizeSM,
                                            color: token.colorTextSecondary,
                                        }}
                                    >
                                        ID: {record.id.slice(0, 8)}...
                                    </div>
                                </div>
                            ),
                        },
                        {
                            title: 'Type',
                            dataIndex: 'api_format',
                            render: (value: string) => (
                                <Tag color={getFormatColor(value)}>{getRequestType(value)}</Tag>
                            ),
                            sorter: true,
                            filters: [
                                { text: 'Gemini', value: 'gemini' },
                                { text: 'OpenAI', value: 'openai' },
                            ],
                        },
                        {
                            title: 'Stream',
                            dataIndex: 'is_stream',
                            render: (value: boolean) => (
                                <Tag
                                    color={value ? 'blue' : 'default'}
                                    style={{ fontSize: '11px' }}
                                >
                                    {value ? 'Yes' : 'No'}
                                </Tag>
                            ),
                            sorter: true,
                            filters: [
                                { text: 'Streaming', value: true },
                                { text: 'Non-streaming', value: false },
                            ],
                        },
                        {
                            title: 'Status',
                            dataIndex: 'is_successful',
                            render: (_: unknown, record: RequestLog) => (
                                <StatusDisplay record={record} showDetails={true} />
                            ),
                            sorter: true,
                        },
                        {
                            title: 'Performance',
                            render: (_: unknown, record: RequestLog) => {
                                const metrics = extractPerformanceMetrics(
                                    record.performance_metrics,
                                );
                                const retryCount = Array.isArray(record.retry_attempts)
                                    ? record.retry_attempts.length
                                    : 0;
                                const hasRetries = retryCount > 0;
                                const totalAttempts = metrics.attemptCount;
                                const attemptColor = getAttemptCountColor(totalAttempts);
                                const attemptSeverity = getAttemptCountSeverity(totalAttempts);

                                return (
                                    <div>
                                        <div style={{ fontSize: token.fontSizeSM }}>
                                            <span style={{ color: token.colorInfo }}>
                                                Duration: {formatDuration(metrics.duration)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: token.fontSizeSM }}>
                                            <Tooltip title={`Severity: ${attemptSeverity}`}>
                                                <span style={{ color: token.colorTextSecondary }}>
                                                    Attempts:{' '}
                                                    <Tag color={attemptColor}>{totalAttempts}</Tag>
                                                </span>
                                            </Tooltip>
                                        </div>
                                        {hasRetries && (
                                            <div
                                                style={{
                                                    fontSize: token.fontSizeSM,
                                                    color: token.colorError,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {retryCount} Retry Attempt
                                                {retryCount > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                );
                            },
                        },
                        {
                            title: 'Token Usage',
                            render: (_: unknown, record: RequestLog) => {
                                const usage = extractUsageMetadata(record.usage_metadata);
                                return (
                                    <div>
                                        <div style={{ fontSize: token.fontSizeSM }}>
                                            <span style={{ color: token.colorInfo }}>
                                                Total: {formatTokenCount(usage.totalTokens)}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                color: token.colorTextSecondary,
                                            }}
                                        >
                                            <span>
                                                Prompt: {formatTokenCount(usage.promptTokens)}
                                            </span>
                                            {' | '}
                                            <span>
                                                Completion:{' '}
                                                {formatTokenCount(usage.completionTokens)}
                                            </span>
                                        </div>
                                        {usage.model && (
                                            <div
                                                style={{
                                                    fontSize: token.fontSizeSM,
                                                    color: token.colorTextSecondary,
                                                }}
                                            >
                                                Model: {usage.model}
                                            </div>
                                        )}
                                    </div>
                                );
                            },
                        },
                        {
                            title: 'User ID',
                            dataIndex: 'user_id',
                            render: (value: string | null) => (
                                <span
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorTextSecondary,
                                    }}
                                >
                                    {value ? `${value.slice(0, 8)}...` : 'N/A'}
                                </span>
                            ),
                            sorter: true,
                        },
                        {
                            title: 'Proxy Key',
                            dataIndex: 'proxy_key_id',
                            render: (value: string | null) => (
                                <span
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorTextSecondary,
                                    }}
                                >
                                    {value ? `${value.slice(0, 8)}...` : 'N/A'}
                                </span>
                            ),
                            sorter: true,
                        },
                        {
                            title: 'API Key',
                            dataIndex: 'api_key_id',
                            render: (value: string | null) => (
                                <span
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorTextSecondary,
                                    }}
                                >
                                    {value ? `${value.slice(0, 8)}...` : 'N/A'}
                                </span>
                            ),
                            sorter: true,
                        },
                        {
                            title: 'Created',
                            dataIndex: 'created_at',
                            sorter: true,
                            render: (value: string | null) => (
                                <DateTimeDisplay dateString={value} />
                            ),
                        },
                        {
                            title: 'Actions',
                            dataIndex: 'actions',
                            render: (_: unknown, record: RequestLog) => (
                                <Space size="small">
                                    <Tooltip title="View Details">
                                        <ShowButton hideText recordItemId={record.id} />
                                    </Tooltip>
                                    <JsonActionsDropdown record={record} />
                                </Space>
                            ),
                        },
                    ]}
                />
            </div>
        </List>
    );
}
