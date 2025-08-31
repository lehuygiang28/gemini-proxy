'use client';

import React from 'react';
import { useShow } from '@refinedev/core';
import { Show } from '@refinedev/antd';
import { Typography, Card, Row, Col, Tag, Descriptions, theme } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { Tables } from '@gemini-proxy/database';
import { JsonDisplay, DateTimeDisplay } from '@/components/common';
import {
    getRequestType,
    getRequestTypeColor,
    formatDuration,
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatTokenCount,
} from '@/utils/table-helpers';

const { Text } = Typography;
const { useToken } = theme;

type RequestLog = Tables<'request_logs'>;

export default function RequestLogShowPage({ params }: { params: { id: string } }) {
    const { token } = useToken();
    const router = useRouter();
    const { queryResult } = useShow<RequestLog>({
        resource: 'request_logs',
        id: params.id,
    });

    const { data, isLoading } = queryResult;
    const record = data?.data;

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!record) {
        return <div>Request log not found</div>;
    }

    const performanceMetrics = extractPerformanceMetrics(record.performance_metrics);
    const usageMetadata = extractUsageMetadata(record.usage_metadata);

    const getStatusColor = (isSuccessful: boolean) => {
        return isSuccessful ? 'green' : 'red';
    };

    const getStatusText = (isSuccessful: boolean) => {
        return isSuccessful ? 'Success' : 'Failed';
    };

    return (
        <Show
            headerButtons={[
                <ArrowLeftOutlined
                    key="back"
                    onClick={() => router.back()}
                    style={{ fontSize: token.fontSizeLG }}
                />,
            ]}
            title="Request Log Details"
        >
            <div style={{ background: token.colorBgContainer, padding: token.paddingLG }}>
                {/* Basic Information */}
                <Card title="Basic Information" style={{ marginBottom: token.marginLG }}>
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} md={12}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Request ID">
                                    <Text code>{record.request_id}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Log ID">
                                    <Text code>{record.id}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="User ID">
                                    <Text code>{record.user_id}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Proxy Key ID">
                                    <Text code>{record.proxy_key_id}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="API Key ID">
                                    <Text code>{record.api_key_id}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>
                        <Col xs={24} md={12}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="API Format">
                                    <Tag color={getRequestTypeColor(record.api_format)}>
                                        {getRequestType(record.api_format)}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Status">
                                    <Tag color={getStatusColor(record.is_successful)}>
                                        {getStatusText(record.is_successful)}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Stream">
                                    <Tag color={record.is_stream ? 'blue' : 'default'}>
                                        {record.is_stream ? 'Yes' : 'No'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Created">
                                    <DateTimeDisplay dateString={record.created_at} />
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>
                    </Row>
                </Card>

                {/* Performance Metrics */}
                <Card title="Performance Metrics" style={{ marginBottom: token.marginLG }}>
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} md={8}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Duration">
                                    <Text strong>
                                        {formatDuration(performanceMetrics.duration)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Attempt Count">
                                    <Text strong>{performanceMetrics.attemptCount}</Text>
                                </Descriptions.Item>
                                {performanceMetrics.responseTime && (
                                    <Descriptions.Item label="Response Time">
                                        <Text strong>{performanceMetrics.responseTime}ms</Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Col>
                        <Col xs={24} md={16}>
                            <JsonDisplay
                                data={record.performance_metrics}
                                title="Raw Performance Metrics"
                                collapsible={true}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* Usage Metadata */}
                <Card title="Usage Metadata" style={{ marginBottom: token.marginLG }}>
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} md={8}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Total Tokens">
                                    <Text strong>
                                        {formatTokenCount(usageMetadata.totalTokens)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Prompt Tokens">
                                    <Text strong>
                                        {formatTokenCount(usageMetadata.promptTokens)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Completion Tokens">
                                    <Text strong>
                                        {formatTokenCount(usageMetadata.completionTokens)}
                                    </Text>
                                </Descriptions.Item>
                                {usageMetadata.model && (
                                    <Descriptions.Item label="Model">
                                        <Text strong>{usageMetadata.model}</Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Col>
                        <Col xs={24} md={16}>
                            <JsonDisplay
                                data={record.usage_metadata}
                                title="Raw Usage Metadata"
                                collapsible={true}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* Request Data */}
                <Card title="Request Data" style={{ marginBottom: token.marginLG }}>
                    <JsonDisplay
                        data={record.request_data}
                        title="Request Details"
                        collapsible={false}
                    />
                </Card>

                {/* Response Data */}
                <Card title="Response Data" style={{ marginBottom: token.marginLG }}>
                    <JsonDisplay
                        data={record.response_data}
                        title="Response Details"
                        collapsible={false}
                    />
                </Card>

                {/* Error Details */}
                {record.error_details && (
                    <Card title="Error Details" style={{ marginBottom: token.marginLG }}>
                        <JsonDisplay
                            data={record.error_details}
                            title="Error Information"
                            collapsible={false}
                        />
                    </Card>
                )}

                {/* Retry Attempts */}
                {record.retry_attempts &&
                    Array.isArray(record.retry_attempts) &&
                    record.retry_attempts.length > 0 && (
                        <Card title="Retry Attempts" style={{ marginBottom: token.marginLG }}>
                            <JsonDisplay
                                data={record.retry_attempts}
                                title="Retry Information"
                                collapsible={false}
                            />
                        </Card>
                    )}
            </div>
        </Show>
    );
}
