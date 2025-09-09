'use client';

import React, { useState } from 'react';
import { List, ShowButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { Table, Space, Tag, Button, Input, Select, Card, Row, Col, Tooltip, theme } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay, JsonDisplay, RetryAttemptsBadge } from '@/components/common';
import { useRetryStatisticsRpc } from '@/hooks/use-retry-statistics-rpc';
import {
    getRequestType,
    getRequestTypeColor,
    formatDuration,
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatTokenCount,
} from '@/utils/table-helpers';

const { Search } = Input;
const { Option } = Select;
const { useToken } = theme;

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
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [formatFilter, setFormatFilter] = useState<string>('all');
    const [retryFilter, setRetryFilter] = useState<string>('all');

    const { tableProps, searchFormProps } = useTable<RequestLog>({
        syncWithLocation: true,
        pagination: { pageSize: 20 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
    });

    // Get retry statistics using RPC function
    const { statistics: retryStats, isLoading: statsLoading } = useRetryStatisticsRpc(30);

    const getStatusColor = (isSuccessful: boolean) => {
        return isSuccessful ? 'green' : 'red';
    };

    const getStatusText = (isSuccessful: boolean) => {
        return isSuccessful ? 'Success' : 'Failed';
    };

    const getFormatColor = (apiFormat: string) => {
        return getRequestTypeColor(apiFormat);
    };

    return (
        <List title="Request Logs">
            {/* Retry Statistics */}
            <Card
                style={{ marginBottom: token.marginMD }}
                bodyStyle={{ padding: token.paddingMD }}
                loading={statsLoading}
            >
                <Row gutter={[token.marginLG, token.marginMD]}>
                    <Col xs={24} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: token.fontSizeHeading3,
                                    fontWeight: 'bold',
                                    color: token.colorText,
                                }}
                            >
                                {retryStats?.total_requests || 0}
                            </div>
                            <div
                                style={{
                                    fontSize: token.fontSizeSM,
                                    color: token.colorTextSecondary,
                                }}
                            >
                                Total Requests
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: token.fontSizeHeading3,
                                    fontWeight: 'bold',
                                    color: token.colorWarning,
                                }}
                            >
                                {retryStats?.requests_with_retries || 0}
                            </div>
                            <div
                                style={{
                                    fontSize: token.fontSizeSM,
                                    color: token.colorTextSecondary,
                                }}
                            >
                                With Retries
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: token.fontSizeHeading3,
                                    fontWeight: 'bold',
                                    color: token.colorError,
                                }}
                            >
                                {retryStats?.total_retry_attempts || 0}
                            </div>
                            <div
                                style={{
                                    fontSize: token.fontSizeSM,
                                    color: token.colorTextSecondary,
                                }}
                            >
                                Total Retry Attempts
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: token.fontSizeHeading3,
                                    fontWeight: 'bold',
                                    color: token.colorInfo,
                                }}
                            >
                                {retryStats?.retry_rate || 0}%
                            </div>
                            <div
                                style={{
                                    fontSize: token.fontSizeSM,
                                    color: token.colorTextSecondary,
                                }}
                            >
                                Retry Rate
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Filters */}
            <Card style={{ marginBottom: token.marginMD }} bodyStyle={{ padding: token.paddingMD }}>
                <Row gutter={[token.marginMD, token.marginMD]} align="middle">
                    <Col xs={24} sm={8}>
                        <Search
                            placeholder="Search by request ID..."
                            allowClear
                            onSearch={(value) => {
                                setSearchText(value);
                                searchFormProps.form?.setFieldsValue({ request_id: value });
                                searchFormProps.form?.submit();
                            }}
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: '100%' }}
                        >
                            <Option value="all">All Status</Option>
                            <Option value="success">Success</Option>
                            <Option value="failed">Failed</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            placeholder="Filter by format"
                            value={formatFilter}
                            onChange={setFormatFilter}
                            style={{ width: '100%' }}
                        >
                            <Option value="all">All Formats</Option>
                            <Option value="gemini">Gemini</Option>
                            <Option value="openai">OpenAI</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            placeholder="Filter by retries"
                            value={retryFilter}
                            onChange={setRetryFilter}
                            style={{ width: '100%' }}
                        >
                            <Option value="all">All Requests</Option>
                            <Option value="with_retries">With Retries</Option>
                            <Option value="no_retries">No Retries</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                searchFormProps.form?.resetFields();
                                setSearchText('');
                                setStatusFilter('all');
                                setFormatFilter('all');
                                setRetryFilter('all');
                            }}
                            style={{ width: '100%' }}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Table<RequestLog>
                {...tableProps}
                rowKey="id"
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
                        title: 'Status',
                        dataIndex: 'is_successful',
                        render: (value: boolean, record: RequestLog) => {
                            const retryCount = Array.isArray(record.retry_attempts)
                                ? record.retry_attempts.length
                                : 0;
                            const hasRetries = retryCount > 0;

                            return (
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: token.marginXS,
                                        }}
                                    >
                                        <Tag color={getStatusColor(value)}>
                                            {getStatusText(value)}
                                        </Tag>
                                        {hasRetries && (
                                            <RetryAttemptsBadge
                                                retryAttempts={record.retry_attempts as any[]}
                                            />
                                        )}
                                    </div>
                                    {hasRetries && (
                                        <div
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                color: token.colorTextSecondary,
                                                marginTop: token.marginXXS,
                                            }}
                                        >
                                            {value
                                                ? 'Succeeded after retries'
                                                : 'Failed after retries'}
                                        </div>
                                    )}
                                </div>
                            );
                        },
                        sorter: true,
                    },
                    {
                        title: 'Performance',
                        render: (_: unknown, record: RequestLog) => {
                            const metrics = extractPerformanceMetrics(record.performance_metrics);
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
                                            {retryCount} Retry Attempt{retryCount > 1 ? 's' : ''}
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
                                        <span>Prompt: {formatTokenCount(usage.promptTokens)}</span>
                                        {' | '}
                                        <span>
                                            Completion: {formatTokenCount(usage.completionTokens)}
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
                        title: 'Request Data',
                        dataIndex: 'request_data',
                        render: (value: any) => (
                            <JsonDisplay
                                data={value}
                                title="Request"
                                maxPreviewLength={50}
                                collapsible={true}
                            />
                        ),
                    },
                    {
                        title: 'Response Data',
                        dataIndex: 'response_data',
                        render: (value: any) => (
                            <JsonDisplay
                                data={value}
                                title="Response"
                                maxPreviewLength={50}
                                collapsible={true}
                            />
                        ),
                    },
                    {
                        title: 'Error Details',
                        dataIndex: 'error_details',
                        render: (value: any) =>
                            value ? (
                                <JsonDisplay
                                    data={value}
                                    title="Error"
                                    maxPreviewLength={50}
                                    collapsible={true}
                                />
                            ) : (
                                <span style={{ color: token.colorTextDisabled }}>No errors</span>
                            ),
                    },
                    {
                        title: 'Created',
                        dataIndex: 'created_at',
                        sorter: true,
                        render: (value: string | null) => <DateTimeDisplay dateString={value} />,
                    },
                    {
                        title: 'Actions',
                        dataIndex: 'actions',
                        render: (_: unknown, record: RequestLog) => (
                            <Space>
                                <Tooltip title="View Details">
                                    <ShowButton hideText recordItemId={record.id} />
                                </Tooltip>
                            </Space>
                        ),
                    },
                ]}
            />
        </List>
    );
}
