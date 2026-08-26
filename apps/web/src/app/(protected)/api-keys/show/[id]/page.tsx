'use client';

import React, { useState } from 'react';
import { Descriptions, Tag, Card, Row, Col, Typography, Space, Spin, Empty, theme } from 'antd';
import { Show } from '@refinedev/antd';
import { useShow, useTranslation } from '@refinedev/core';
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
    const { translate } = useTranslation();
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
        return <Empty description={translate('api_keys.notFound')} />;
    }

    return (
        <Show title={<Title level={4}>{record.name}</Title>}>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <InfoCircleOutlined /> {translate('api_keys.fields.details')}
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={translate('api_keys.fields.id')}>
                                <Text copyable>{record.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.name')}>
                                {record.name}
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.provider')}>
                                <Tag color={getProviderColor(record.provider)}>
                                    {getProviderText(record.provider)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.status')}>
                                <Tag color={record.is_active ? 'success' : 'error'}>
                                    {record.is_active
                                        ? translate('common.active')
                                        : translate('common.inactive')}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <SafetyCertificateOutlined /> {translate('api_keys.show.security')}
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={translate('api_keys.fields.apiKey')}>
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
                                <BarChartOutlined /> {translate('api_keys.fields.usage')}
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
                                <ThunderboltOutlined /> {translate('api_keys.fields.tokens')}
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={translate('api_keys.tokens.totalTokens')}>
                                <Text strong style={{ color: token.colorInfo }}>
                                    {formatTokenCount(record.total_tokens)}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.tokens.promptTokens')}>
                                <Text>{formatTokenCount(record.prompt_tokens)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item
                                label={translate('api_keys.tokens.completionTokens')}
                            >
                                <Text>{formatTokenCount(record.completion_tokens)}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Space>
                                <ClockCircleOutlined /> {translate('api_keys.show.timestamps')}
                            </Space>
                        }
                        variant="borderless"
                    >
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={translate('api_keys.fields.lastUsed')}>
                                <DateTimeDisplay dateString={record.last_used_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.lastError')}>
                                <DateTimeDisplay dateString={record.last_error_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.created')}>
                                <DateTimeDisplay dateString={record.created_at} />
                            </Descriptions.Item>
                            <Descriptions.Item label={translate('api_keys.fields.updated')}>
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
                                    <CodeOutlined /> {translate('api_keys.fields.metadata')}
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
