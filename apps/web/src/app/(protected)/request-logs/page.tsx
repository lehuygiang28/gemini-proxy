'use client';

import React, { useCallback, useMemo } from 'react';
import { List, useTable } from '@refinedev/antd';
import { useGo, useNotification } from '@refinedev/core';
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
    Button,
    Form,
    Select,
    DatePicker,
    Input,
    Badge,
    Spin,
} from 'antd';
import {
    ThunderboltOutlined,
    BugOutlined,
    ClockCircleOutlined,
    FilterOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    DownloadOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay } from '@/components/common';
import { useRetryStatistics } from '@/hooks/useRpc';
// no side-effect fetching; use Refine meta select instead

const { useToken } = theme;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

type RequestLog = Tables<'request_logs'> & {
    api_keys?: { id: string; name: string } | null;
    proxy_api_keys?: { id: string; name: string } | null;
};

interface RequestLogSearch {
    request_id?: string;
    api_format?: string;
    is_successful?: boolean;
    is_stream?: boolean;
    user_id?: string;
    date_range?: [string, string];
}

// Utility functions for better performance
const getRequestType = (apiFormat: string): string => {
    return apiFormat === 'gemini' ? 'Gemini' : 'OpenAI';
};

const getRequestTypeColor = (apiFormat: string): string => {
    return apiFormat === 'gemini' ? 'blue' : 'green';
};

const formatDuration = (duration: number): string => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
};

const formatTokenCount = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
};

const extractPerformanceMetrics = (metrics: unknown) => {
    if (!metrics || typeof metrics !== 'object' || metrics === null) {
        return { duration: 0, attemptCount: 1 };
    }

    const metricsObj = metrics as Record<string, unknown>;
    return {
        duration: (metricsObj.duration as number) || 0,
        attemptCount: (metricsObj.attemptCount as number) || 1,
    };
};

const extractUsageMetadata = (usage: unknown) => {
    if (!usage || typeof usage !== 'object' || usage === null) {
        return { totalTokens: 0, promptTokens: 0, completionTokens: 0, model: null };
    }

    const usageObj = usage as Record<string, unknown>;
    return {
        totalTokens: (usageObj.total_tokens as number) || 0,
        promptTokens: (usageObj.prompt_tokens as number) || 0,
        completionTokens: (usageObj.completion_tokens as number) || 0,
        model: (usageObj.model as string) || null,
    };
};

const getAttemptCountColor = (attemptCount: number): string => {
    if (attemptCount === 1) return 'success';
    if (attemptCount <= 2) return 'warning';
    if (attemptCount <= 4) return 'orange';
    if (attemptCount <= 5) return 'volcano';
    if (attemptCount <= 10) return 'red';
    if (attemptCount <= 20) return 'magenta';
    return 'purple';
};

const getAttemptCountSeverity = (attemptCount: number): string => {
    if (attemptCount === 1) return 'Success';
    if (attemptCount <= 2) return 'Minor Issue';
    if (attemptCount <= 4) return 'Moderate Issue';
    if (attemptCount <= 5) return 'High Issue';
    if (attemptCount <= 10) return 'Critical Issue';
    if (attemptCount <= 20) return 'Severe Issue';
    return 'Extreme Issue';
};

export default function RequestLogsListPage() {
    const { token } = useToken();
    const go = useGo();
    const notification = useNotification();

    // Get retry statistics using RPC function
    const {
        query: { isLoading: retryStatsLoading },
        result: retryStatsResult,
    } = useRetryStatistics({ p_days_back: 30 });
    const retryStats = retryStatsResult?.data;

    const { tableProps, searchFormProps } = useTable<RequestLog>({
        syncWithLocation: true,
        resource: 'request_logs',
        meta: {
            select: 'id, request_id, api_format, is_stream, is_successful, performance_metrics, usage_metadata, user_id, created_at, api_key_id, proxy_key_id, api_keys(id,name), proxy_api_keys(id,name)',
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

    const handleExportData = useCallback(() => {
        notification.open({
            type: 'success',
            message: 'Export Feature',
            description: 'Export functionality will be implemented in the next version.',
        });
    }, [notification]);

    const handleResetFilters = useCallback(() => {
        searchFormProps.form?.resetFields();
        searchFormProps.form?.submit();
    }, [searchFormProps.form]);

    // Memoized statistics cards for better performance
    const statisticsCards = useMemo(
        () => (
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
                            prefix={<ClockCircleOutlined style={{ color: token.colorPrimary }} />}
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
                            prefix={<ThunderboltOutlined style={{ color: token.colorError }} />}
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
        ),
        [retryStats, token],
    );

    // Memoized table columns for better performance
    const tableColumns = useMemo(
        () => [
            {
                title: 'Request ID',
                dataIndex: 'request_id',
                key: 'request_id',
                render: (value: string, record: RequestLog) => (
                    <div>
                        <div style={{ fontWeight: 500, color: token.colorText }}>
                            {value.slice(0, 12)}...
                        </div>
                        <div
                            style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}
                        >
                            ID: {record.id.slice(0, 8)}...
                        </div>
                    </div>
                ),
            },
            {
                title: 'Type',
                dataIndex: 'api_format',
                key: 'api_format',
                render: (value: string) => (
                    <Tag color={getRequestTypeColor(value)}>{getRequestType(value)}</Tag>
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
                key: 'is_stream',
                render: (value: boolean) => (
                    <Tag color={value ? 'blue' : 'default'} style={{ fontSize: '11px' }}>
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
                key: 'is_successful',
                render: (value: boolean) => (
                    <Tag color={value ? 'success' : 'error'}>{value ? 'Success' : 'Failed'}</Tag>
                ),
                sorter: true,
            },
            {
                title: 'Keys',
                key: 'keys',
                render: (_: unknown, record: RequestLog) => {
                    const apiName = record.api_keys?.name;
                    const apiId = record.api_key_id;
                    const proxyName = record.proxy_api_keys?.name;
                    const proxyId = record.proxy_key_id;

                    return (
                        <Space size={4} direction="vertical">
                            <div>
                                <Tag color="geekblue" style={{ marginRight: 6 }}>
                                    API
                                </Tag>
                                <span
                                    style={{ fontSize: token.fontSizeSM, color: token.colorText }}
                                >
                                    {apiName || (apiId ? `${apiId.slice(0, 8)}...` : 'N/A')}
                                </span>
                            </div>
                            <div>
                                <Tag color="purple" style={{ marginRight: 6 }}>
                                    Proxy
                                </Tag>
                                <span
                                    style={{ fontSize: token.fontSizeSM, color: token.colorText }}
                                >
                                    {proxyName || (proxyId ? `${proxyId.slice(0, 8)}...` : 'N/A')}
                                </span>
                            </div>
                        </Space>
                    );
                },
            },
            {
                title: 'Performance',
                key: 'performance',
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
                                        Attempts: <Tag color={attemptColor}>{totalAttempts}</Tag>
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
                key: 'token_usage',
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
                                <span>Completion: {formatTokenCount(usage.completionTokens)}</span>
                            </div>
                            {usage.model && (
                                <div
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorTextSecondary,
                                    }}
                                >
                                    Model: {String(usage.model)}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                title: 'User ID',
                dataIndex: 'user_id',
                key: 'user_id',
                render: (value: string | null) => (
                    <span style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                        {value ? `${value.slice(0, 8)}...` : 'N/A'}
                    </span>
                ),
                sorter: true,
            },
            {
                title: 'Created',
                dataIndex: 'created_at',
                key: 'created_at',
                sorter: true,
                render: (value: string | null) => <DateTimeDisplay dateString={value} />,
            },
            {
                title: 'Actions',
                key: 'actions',
                render: (_: unknown, record: RequestLog) => (
                    <Space size="small">
                        <Tooltip title="View Details">
                            <Button
                                type="text"
                                icon={<EyeOutlined />}
                                onClick={() => handleViewDetails(record)}
                            />
                        </Tooltip>
                    </Space>
                ),
            },
        ],
        [token, handleViewDetails],
    );

    return (
        <List
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: token.marginMD }}>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span>Request Logs</span>
                    {tableProps.pagination && (
                        <Badge
                            count={tableProps.pagination.total}
                            showZero
                            color={token.colorPrimary}
                        />
                    )}
                </div>
            }
            headerButtons={
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleExportData} type="default">
                        Export
                    </Button>
                </Space>
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
                loading={retryStatsLoading}
            >
                <div style={{ marginBottom: token.marginMD }}>
                    <Title level={4} style={{ margin: 0, color: token.colorText }}>
                        📊 Request Statistics
                    </Title>
                </div>
                {statisticsCards}
            </Card>

            {/* Advanced Filters */}
            <Card
                style={{
                    marginBottom: token.marginLG,
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                }}
                title={
                    <Space>
                        <FilterOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>Filters & Search</Text>
                    </Space>
                }
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetFilters}
                        size="small"
                        type="text"
                    >
                        Reset
                    </Button>
                }
            >
                <Form {...searchFormProps} layout="vertical">
                    <Row gutter={[token.marginMD, token.marginSM]}>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Request ID" name="request_id">
                                <Search
                                    placeholder="Search request ID..."
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
                            <Form.Item label="Stream Type" name="is_stream">
                                <Select placeholder="Select stream type" allowClear>
                                    <Select.Option value={true}>Streaming</Select.Option>
                                    <Select.Option value={false}>Non-streaming</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="User ID" name="user_id">
                                <Search
                                    placeholder="Search user ID..."
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Date Range" name="date_range">
                                <RangePicker
                                    style={{ width: '100%' }}
                                    showTime
                                    format="YYYY-MM-DD HH:mm:ss"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* Request Logs Table */}
            <Card
                style={{
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                }}
                title={
                    <Space>
                        <Text strong>📋 Request Logs</Text>
                        {tableProps.loading && <Spin size="small" />}
                    </Space>
                }
            >
                <Table<RequestLog>
                    {...tableProps}
                    rowKey="id"
                    columns={tableColumns}
                    style={{
                        borderRadius: token.borderRadiusLG,
                    }}
                    scroll={{ x: 1200 }}
                />
            </Card>
        </List>
    );
}
