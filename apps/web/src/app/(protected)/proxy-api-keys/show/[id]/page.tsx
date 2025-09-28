'use client';

import React, { useState } from 'react';
import { Descriptions, Tag, Card, Row, Col, Typography, Space, Spin, Empty } from 'antd';
import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import {
    InfoCircleOutlined,
    SafetyCertificateOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    CodeOutlined,
} from '@ant-design/icons';

import type { Tables } from '@gemini-proxy/database';
import { SensitiveKeyDisplay, UsageStatistics, DateTimeDisplay } from '@/components/common';
import { formatJsonDisplay } from '@/utils/table-helpers';

const { Title, Text } = Typography;

type ProxyApiKey = Tables<'proxy_api_keys'>;

export default function ProxyApiKeysShowPage() {
    const { query } = useShow<ProxyApiKey>();
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
        return <Empty description="Proxy API Key not found" />;
    }

    return (
        <Show title={<Title level={4}>{record.name}</Title>} breadcrumb={false}>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <InfoCircleOutlined /> Proxy API Key Details
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="ID">
                                <Text copyable>{record.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Name">{record.name}</Descriptions.Item>
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
                            <Descriptions.Item label="Proxy API Key">
                                <SensitiveKeyDisplay
                                    value={record.proxy_key_value}
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
