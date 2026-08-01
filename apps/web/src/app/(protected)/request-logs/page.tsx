'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, useTable } from '@refinedev/antd';
import { useGo, type LiveModeProps } from '@refinedev/core';
import {
    Table,
    Space,
    Tag,
    Row,
    Col,
    Tooltip,
    theme,
    Typography,
    Button,
    Form,
    Select,
    DatePicker,
    Input,
    Badge,
    Alert,
} from 'antd';
import {
    FilterOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    DashboardOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay } from '@/components/common';
import { ConnectionStatusBadge } from '@/features/observability';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCount,
    getAttemptCountColor,
    getAttemptCountSeverity,
    getRequestTypeColor,
    getRequestType,
} from '@/utils/table-helpers';

const { useToken } = theme;
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

type RequestLog = Tables<'request_logs'> & {
    api_keys?: { id: string; name: string; deleted_at: string | null } | null;
    proxy_api_keys?: { id: string; name: string; deleted_at: string | null } | null;
};

interface RequestLogSearch {
    request_id?: string;
    api_format?: string;
    is_successful?: boolean;
    is_stream?: boolean;
    user_id?: string;
    api_key_id?: string;
    proxy_key_id?: string;
    date_range?: [string, string];
}

/**
 * Request logs history with Refine liveMode auto updates.
 */
export default function RequestLogsListPage() {
    const { token } = useToken();
    const go = useGo();
    const [isLive, setIsLive] = useState(true);
    const liveMode: NonNullable<LiveModeProps['liveMode']> = isLive ? 'auto' : 'off';

    const { tableProps, searchFormProps, tableQuery } = useTable<RequestLog>({
        syncWithLocation: true,
        resource: 'request_logs',
        liveMode,
        meta: {
            select: 'id, request_id, api_format, is_stream, is_successful, performance_metrics, usage_metadata, retry_attempts, user_id, created_at, api_key_id, proxy_key_id, api_keys(id,name,deleted_at), proxy_api_keys(id,name,deleted_at)',
        },
        pagination: {
            pageSize: 20,
        },
        sorters: {
            initial: [{ field: 'created_at', order: 'desc' }],
        },
        onSearch: (data) => {
            const values = data as RequestLogSearch;
            const searchFilters: Array<{
                field: string;
                operator: 'contains' | 'eq' | 'gte' | 'lte';
                value: unknown;
            }> = [];

            if (values.request_id) {
                searchFilters.push({
                    field: 'request_id',
                    operator: 'contains',
                    value: values.request_id,
                });
            }
            if (values.api_format) {
                searchFilters.push({
                    field: 'api_format',
                    operator: 'eq',
                    value: values.api_format,
                });
            }
            if (values.is_successful !== undefined) {
                searchFilters.push({
                    field: 'is_successful',
                    operator: 'eq',
                    value: values.is_successful,
                });
            }
            if (values.is_stream !== undefined) {
                searchFilters.push({
                    field: 'is_stream',
                    operator: 'eq',
                    value: values.is_stream,
                });
            }
            if (values.user_id) {
                searchFilters.push({
                    field: 'user_id',
                    operator: 'contains',
                    value: values.user_id,
                });
            }
            if (values.api_key_id) {
                searchFilters.push({
                    field: 'api_key_id',
                    operator: 'eq',
                    value: values.api_key_id,
                });
            }
            if (values.proxy_key_id) {
                searchFilters.push({
                    field: 'proxy_key_id',
                    operator: 'eq',
                    value: values.proxy_key_id,
                });
            }
            if (values.date_range && values.date_range.length === 2) {
                searchFilters.push({
                    field: 'created_at',
                    operator: 'gte',
                    value: values.date_range[0],
                });
                searchFilters.push({
                    field: 'created_at',
                    operator: 'lte',
                    value: values.date_range[1],
                });
            }
            return searchFilters;
        },
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const apiKeyId = params.get('api_key_id');
        const proxyKeyId = params.get('proxy_key_id');
        if (!apiKeyId && !proxyKeyId) {
            return;
        }
        searchFormProps.form?.setFieldsValue({
            api_key_id: apiKeyId ?? undefined,
            proxy_key_id: proxyKeyId ?? undefined,
        });
        searchFormProps.form?.submit();
        // Apply deep-link filters once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleViewDetails = useCallback(
        (record: RequestLog) => {
            go({
                to: {
                    resource: 'request_logs',
                    action: 'show',
                    id: record.id,
                },
            });
        },
        [go],
    );

    const handleResetFilters = useCallback(() => {
        searchFormProps.form?.resetFields();
        searchFormProps.form?.submit();
    }, [searchFormProps.form]);

    const tableColumns = useMemo(
        () => [
            {
                title: 'Request ID',
                dataIndex: 'request_id',
                key: 'request_id',
                render: (value: string, record: RequestLog) => (
                    <div>
                        <div className="gp-live-mono" style={{ color: 'var(--gp-text)' }}>
                            {value.slice(0, 12)}…
                        </div>
                        <div
                            style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}
                        >
                            {record.id.slice(0, 8)}…
                        </div>
                    </div>
                ),
            },
            {
                title: 'Type',
                dataIndex: 'api_format',
                key: 'api_format',
                render: (value: string) => (
                    <Tag color={getRequestTypeColor(value)} style={{ borderRadius: 2 }}>
                        {getRequestType(value)}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: 'Stream',
                dataIndex: 'is_stream',
                key: 'is_stream',
                render: (value: boolean) => (
                    <Tag color={value ? 'processing' : 'default'} style={{ borderRadius: 2 }}>
                        {value ? 'Yes' : 'No'}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: 'Status',
                dataIndex: 'is_successful',
                key: 'is_successful',
                render: (value: boolean) => (
                    <Tag color={value ? 'success' : 'error'} style={{ borderRadius: 2 }}>
                        {value ? 'Success' : 'Failed'}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: 'Keys',
                key: 'keys',
                render: (_: unknown, record: RequestLog) => (
                    <Space size={4} direction="vertical">
                        <div>
                            <Tag style={{ borderRadius: 2, marginRight: 6 }}>Proxy</Tag>
                            <span style={{ fontSize: token.fontSizeSM }}>
                                {record.proxy_api_keys?.name ||
                                    (record.proxy_key_id
                                        ? `${record.proxy_key_id.slice(0, 8)}…`
                                        : 'N/A')}
                                {record.proxy_api_keys?.deleted_at ? ' (deleted)' : ''}
                            </span>
                        </div>
                        <div>
                            <Tag style={{ borderRadius: 2, marginRight: 6 }}>API</Tag>
                            <span style={{ fontSize: token.fontSizeSM }}>
                                {record.api_keys?.name ||
                                    (record.api_key_id
                                        ? `${record.api_key_id.slice(0, 8)}…`
                                        : 'N/A')}
                                {record.api_keys?.deleted_at ? ' (deleted)' : ''}
                            </span>
                        </div>
                    </Space>
                ),
            },
            {
                title: 'Performance',
                key: 'performance',
                render: (_: unknown, record: RequestLog) => {
                    const metrics = extractPerformanceMetrics(record.performance_metrics);
                    const retryCount = Array.isArray(record.retry_attempts)
                        ? record.retry_attempts.length
                        : 0;
                    return (
                        <div style={{ fontSize: token.fontSizeSM }}>
                            <div>API: {formatDuration(metrics.duration_ms)}</div>
                            <div>Total: {formatDuration(metrics.total_response_time_ms)}</div>
                            <Tooltip
                                title={`Severity: ${getAttemptCountSeverity(metrics.attempt_count)}`}
                            >
                                <span>
                                    Attempts:{' '}
                                    <Tag
                                        color={getAttemptCountColor(metrics.attempt_count)}
                                        style={{ borderRadius: 2 }}
                                    >
                                        {metrics.attempt_count}
                                    </Tag>
                                </span>
                            </Tooltip>
                            {retryCount > 0 && (
                                <div style={{ color: token.colorError }}>
                                    {retryCount} retr{retryCount > 1 ? 'ies' : 'y'}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                title: 'Tokens',
                key: 'token_usage',
                render: (_: unknown, record: RequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <div style={{ fontSize: token.fontSizeSM }}>
                            <div>{formatTokenCount(usage.total_tokens)}</div>
                            <div style={{ color: token.colorTextSecondary }}>
                                {formatTokenCount(usage.prompt_tokens)} /{' '}
                                {formatTokenCount(usage.completion_tokens)}
                            </div>
                        </div>
                    );
                },
            },
            {
                title: 'Created',
                dataIndex: 'created_at',
                key: 'created_at',
                sorter: true,
                render: (value: string | null) => <DateTimeDisplay dateString={value} />,
            },
            {
                title: '',
                key: 'actions',
                render: (_: unknown, record: RequestLog) => (
                    <Tooltip title="View details">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(record)}
                        />
                    </Tooltip>
                ),
            },
        ],
        [token, handleViewDetails],
    );

    return (
        <List
            title={
                <Space>
                    <span>Logs</span>
                    {tableProps.pagination && (
                        <Badge
                            count={tableProps.pagination.total}
                            showZero
                            color={token.colorPrimary}
                        />
                    )}
                    <ConnectionStatusBadge paused={!isLive} />
                </Space>
            }
            headerButtons={
                <Space>
                    <Button icon={<DashboardOutlined />} onClick={() => go({ to: '/dashboard' })}>
                        Console
                    </Button>
                    <Button
                        icon={isLive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={() => setIsLive((value) => !value)}
                    >
                        {isLive ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => void tableQuery.refetch()}
                        loading={tableQuery.isFetching}
                    >
                        Refresh
                    </Button>
                </Space>
            }
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                    isLive
                        ? 'Live updates on — table refreshes when new request logs arrive.'
                        : 'Live updates paused — resume to auto-refresh on new logs.'
                }
                description="Detailed request logs older than 90 days are removed automatically. Lifetime usage totals on API keys and proxy keys are kept."
            />

            <div className="gp-panel" style={{ marginBottom: 12, padding: 16 }}>
                <Space style={{ marginBottom: 12 }}>
                    <FilterOutlined />
                    <Text strong>Filters</Text>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetFilters}
                        size="small"
                        type="text"
                    >
                        Reset
                    </Button>
                </Space>
                <Form {...searchFormProps} layout="vertical">
                    <Row gutter={[12, 8]}>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Request ID" name="request_id">
                                <Search
                                    placeholder="Search request ID…"
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="API Format" name="api_format">
                                <Select placeholder="Select format" allowClear>
                                    <Select.Option value="gemini">Gemini</Select.Option>
                                    <Select.Option value="openai">OpenAI</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Status" name="is_successful">
                                <Select placeholder="Select status" allowClear>
                                    <Select.Option value={true}>Successful</Select.Option>
                                    <Select.Option value={false}>Failed</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Stream" name="is_stream">
                                <Select placeholder="Select stream type" allowClear>
                                    <Select.Option value={true}>Streaming</Select.Option>
                                    <Select.Option value={false}>Non-streaming</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="API key ID" name="api_key_id">
                                <Input placeholder="Filter by api_key_id" allowClear />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Proxy key ID" name="proxy_key_id">
                                <Input placeholder="Filter by proxy_key_id" allowClear />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Date range" name="date_range">
                                <RangePicker
                                    style={{ width: '100%' }}
                                    showTime
                                    format="YYYY-MM-DD HH:mm:ss"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </div>

            <div className="gp-panel" style={{ padding: 0 }}>
                <Table<RequestLog>
                    {...tableProps}
                    rowKey="id"
                    columns={tableColumns}
                    scroll={{ x: 1100 }}
                />
            </div>
        </List>
    );
}
