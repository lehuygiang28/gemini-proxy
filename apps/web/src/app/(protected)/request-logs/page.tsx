'use client';

import React, { useState } from 'react';
import { List, ShowButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { Table, Space, Tag, Button, Input, Select, Card, Row, Col, Tooltip, theme } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay, JsonDisplay } from '@/components/common';
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

export default function RequestLogsListPage() {
    const { token } = useToken();
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [formatFilter, setFormatFilter] = useState<string>('all');

    const { tableProps, searchFormProps } = useTable<RequestLog>({
        syncWithLocation: true,
        pagination: { pageSize: 20 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
    });

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
                    <Col xs={24} sm={4}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                searchFormProps.form?.resetFields();
                                setSearchText('');
                                setStatusFilter('all');
                                setFormatFilter('all');
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
                        render: (value: boolean, record: RequestLog) => (
                            <div>
                                <Tag color={getStatusColor(value)}>{getStatusText(value)}</Tag>
                                {Array.isArray(record.retry_attempts) &&
                                    record.retry_attempts.length > 0 && (
                                        <div
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                color: token.colorWarning,
                                            }}
                                        >
                                            Retries: {record.retry_attempts.length}
                                        </div>
                                    )}
                            </div>
                        ),
                        sorter: true,
                    },
                    {
                        title: 'Performance',
                        render: (_: unknown, record: RequestLog) => {
                            const metrics = extractPerformanceMetrics(record.performance_metrics);
                            return (
                                <div>
                                    <div style={{ fontSize: token.fontSizeSM }}>
                                        <span style={{ color: token.colorInfo }}>
                                            Duration: {formatDuration(metrics.duration)}
                                        </span>
                                    </div>
                                    {metrics.attemptCount > 1 && (
                                        <div
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                color: token.colorWarning,
                                            }}
                                        >
                                            Attempts: {metrics.attemptCount}
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
