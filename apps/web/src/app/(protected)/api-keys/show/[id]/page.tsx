'use client';

import React, { useState } from 'react';
import { Descriptions, Tag, Card, Row, Col, Typography, Space, Spin, Empty, theme } from 'antd';
import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import {
    InfoCircleOutlined,
    SafetyCertificateOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    CodeOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

import type { Tables } from '@gemini-proxy/database';
import { SensitiveKeyDisplay, UsageStatistics, DateTimeDisplay } from '@/components/common';
import { getProviderColor, getProviderText, formatTokenCount } from '@/utils/table-helpers';
import { formatJsonDisplay } from '@/utils/table-helpers';

const { Title, Text } = Typography;
const { useToken } = theme;

type ApiKey = Tables<'api_keys'>;

export default function ApiKeysShowPage() {
    const { token } = useToken();
    const { query } = useShow<ApiKey>();
    const { data, isLoading } = query;
    const record = data?.data;
    const [isRevealed, setIsRevealed] = useState(false);

    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (!record) {
        return <Empty description="API Key not found" />;
    }

    return (
        <Show title={<Title level={4}>{record.name}</Title>}>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <InfoCircleOutlined /> API Key Details
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="ID">
                                <Text copyable>{record.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Name">{record.name}</Descriptions.Item>
                            <Descriptions.Item label="Provider">
                                <Tag color={getProviderColor(record.provider)}>
                                    {getProviderText(record.provider)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={record.is_active ? 'success' : 'error'}>
                                    {record.is_active ? 'Active' : 'Inactive'}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <SafetyCertificateOutlined /> Security
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="API Key">
                                <SensitiveKeyDisplay
                                    value={record.api_key_value}
                                    isRevealed={isRevealed}
                                    onToggleVisibility={() => setIsRevealed(!isRevealed)}
                                />
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <BarChartOutlined /> Usage Statistics
                            </Space>
                        }
                        variant="borderless"
                    >
                        <UsageStatistics
                            successCount={record.success_count}
                            failureCount={record.failure_count}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <ThunderboltOutlined /> Token Usage
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="Total Tokens">
                                <Text strong style={{ color: token.colorInfo }}>
                                    {formatTokenCount(record.total_tokens)}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Prompt Tokens">
                                <Text>{formatTokenCount(record.prompt_tokens)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Completion Tokens">
                                <Text>{formatTokenCount(record.completion_tokens)}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <ClockCircleOutlined /> Timestamps
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="Last Used">
                                <DateTimeDisplay dateString={record.last_used_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label="Last Error">
                                <DateTimeDisplay dateString={record.last_error_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label="Created">
                                <DateTimeDisplay dateString={record.created_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label="Last Updated">
                                <DateTimeDisplay dateString={record.updated_at} />
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                {record.metadata && (
                    <Col xs={24}>
                        <Card
                            title={
                                <Space>
                                    <CodeOutlined /> Metadata
                                </Space>
                            }
                            variant="borderless"
                        >
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {formatJsonDisplay(record.metadata)}
                            </pre>
                        </Card>
                    </Col>
                )}
            </Row>
        </Show>
    );
}
