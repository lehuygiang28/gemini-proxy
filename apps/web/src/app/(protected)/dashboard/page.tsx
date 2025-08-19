'use client';

import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import {
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import React, { useMemo } from 'react';
import { useList } from '@refinedev/core';
import { theme } from 'antd';

const { Title } = Typography;
const { useToken } = theme;

export default function DashboardPage() {
    const { token } = useToken();

    // Memoize the date to prevent infinite re-renders
    const twentyFourHoursAgo = useMemo(() => {
        return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }, []);

    // Fetch API keys data
    const { data: apiKeysData, isLoading: apiKeysLoading } = useList({
        resource: 'api_keys',
        pagination: { pageSize: 1000 },
        filters: [{ field: 'is_active', operator: 'eq', value: true }],
        queryOptions: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
    });

    // Fetch proxy API keys data
    const { data: proxyKeysData, isLoading: proxyKeysLoading } = useList({
        resource: 'proxy_api_keys',
        pagination: { pageSize: 1000 },
        filters: [{ field: 'is_active', operator: 'eq', value: true }],
        queryOptions: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
    });

    // Fetch request logs data (last 24 hours)
    const { data: requestLogsData, isLoading: requestLogsLoading } = useList({
        resource: 'request_logs',
        pagination: { pageSize: 1000 },
        filters: [
            {
                field: 'created_at',
                operator: 'gte',
                value: twentyFourHoursAgo,
            },
        ],
        queryOptions: {
            staleTime: 2 * 60 * 1000, // 2 minutes for logs
            cacheTime: 5 * 60 * 1000, // 5 minutes
        },
    });

    // Memoize calculations to prevent unnecessary re-renders
    const statistics = useMemo(() => {
        const activeApiKeys = apiKeysData?.total || 0;
        const activeProxyKeys = proxyKeysData?.total || 0;
        const totalRequests24h = requestLogsData?.total || 0;

        // Calculate success rate
        const successfulRequests =
            requestLogsData?.data?.filter((log) => log.is_successful)?.length || 0;
        const successRate =
            totalRequests24h > 0 ? Math.round((successfulRequests / totalRequests24h) * 100) : 0;

        return {
            activeApiKeys,
            activeProxyKeys,
            totalRequests24h,
            successRate,
        };
    }, [apiKeysData?.total, proxyKeysData?.total, requestLogsData?.total, requestLogsData?.data]);

    const isLoading = apiKeysLoading || proxyKeysLoading || requestLogsLoading;

    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    background: token.colorBgContainer,
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ background: token.colorBgContainer, padding: token.paddingLG }}>
            <Title level={2} style={{ marginBottom: 24, color: token.colorText }}>
                Dashboard
            </Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                    <Card
                        style={{
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowTertiary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Statistic
                            title="Active API Keys"
                            value={statistics.activeApiKeys}
                            prefix={<KeyOutlined style={{ color: token.colorPrimary }} />}
                            valueStyle={{ color: token.colorSuccess }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card
                        style={{
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowTertiary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Statistic
                            title="Proxy API Keys"
                            value={statistics.activeProxyKeys}
                            prefix={
                                <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
                            }
                            valueStyle={{ color: token.colorInfo }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card
                        style={{
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowTertiary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Statistic
                            title="Total Requests (24h)"
                            value={statistics.totalRequests24h}
                            prefix={<FileTextOutlined style={{ color: token.colorWarning }} />}
                            valueStyle={{ color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card
                        style={{
                            borderRadius: token.borderRadiusLG,
                            boxShadow: token.boxShadowTertiary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Statistic
                            title="Success Rate"
                            value={statistics.successRate}
                            suffix="%"
                            prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
                            valueStyle={{ color: token.colorSuccess }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
