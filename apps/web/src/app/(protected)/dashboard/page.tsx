'use client';

import React, { useMemo } from 'react';
import { useList } from '@refinedev/core';
import { Row, Col, Card, Statistic, Progress, Button, Space, theme } from 'antd';
import {
    ReloadOutlined,
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { extractPerformanceMetrics, extractUsageMetadata } from '@/utils/table-helpers';

const { useToken } = theme;

export default function DashboardPage() {
    const { token } = useToken();

    // Fetch API keys data
    const {
        data: apiKeysData,
        isLoading: apiKeysLoading,
        refetch: refetchApiKeys,
    } = useList({
        resource: 'api_keys',
        pagination: { pageSize: 1000 },
    });

    // Fetch proxy API keys data
    const {
        data: proxyKeysData,
        isLoading: proxyKeysLoading,
        refetch: refetchProxyKeys,
    } = useList({
        resource: 'proxy_api_keys',
        pagination: { pageSize: 1000 },
    });

    // Fetch request logs data (last 24 hours)
    const {
        data: requestLogsData,
        isLoading: requestLogsLoading,
        refetch: refetchLogs,
    } = useList({
        resource: 'request_logs',
        pagination: { pageSize: 1000 },
    });

    const statistics = useMemo(() => {
        // Calculate total tokens used
        const totalTokens =
            proxyKeysData?.data?.reduce((sum, key) => sum + (key.total_tokens || 0), 0) || 0;

        // Calculate average response time (if available in performance_metrics)
        const requestLogs = requestLogsData?.data || [];
        const avgResponseTime =
            requestLogs.length > 0
                ? requestLogs.reduce((sum, log) => {
                      const metrics = extractPerformanceMetrics(log.performance_metrics);
                      return sum + (metrics.duration || 0);
                  }, 0) / requestLogs.length
                : 0;

        // Calculate success rate
        const totalRequests = requestLogsData?.total || 0;
        const successfulRequests = requestLogs.filter((log) => log.is_successful).length;
        const successRate =
            totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0;

        return {
            totalApiKeys: apiKeysData?.total || 0,
            totalProxyKeys: proxyKeysData?.total || 0,
            totalRequests: totalRequests,
            totalTokens: totalTokens,
            avgResponseTime: Math.round(avgResponseTime || 0),
            successRate: successRate,
        };
    }, [
        apiKeysData?.total,
        proxyKeysData?.total,
        proxyKeysData?.data,
        requestLogsData?.total,
        requestLogsData?.data,
    ]);

    const isLoading = apiKeysLoading || proxyKeysLoading || requestLogsLoading;

    const handleRefresh = () => {
        refetchApiKeys();
        refetchProxyKeys();
        refetchLogs();
    };

    return (
        <div style={{ background: token.colorBgContainer, padding: token.paddingLG }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: token.marginLG,
                }}
            >
                <h1 style={{ margin: 0, color: token.colorText }}>Dashboard</h1>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
                    Refresh
                </Button>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[token.marginLG, token.marginLG]} style={{ marginBottom: token.marginLG }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total API Keys"
                            value={statistics.totalApiKeys}
                            valueStyle={{ color: token.colorPrimary }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Proxy Keys"
                            value={statistics.totalProxyKeys}
                            valueStyle={{ color: token.colorInfo }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Requests"
                            value={statistics.totalRequests}
                            valueStyle={{ color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Success Rate"
                            value={statistics.successRate}
                            suffix="%"
                            valueStyle={{ color: token.colorSuccess }}
                        />
                        <Progress
                            percent={statistics.successRate}
                            size="small"
                            showInfo={false}
                            strokeColor={
                                statistics.successRate > 90
                                    ? token.colorSuccess
                                    : statistics.successRate > 70
                                      ? token.colorWarning
                                      : token.colorError
                            }
                        />
                    </Card>
                </Col>
            </Row>

            {/* Additional Statistics */}
            <Row gutter={[token.marginLG, token.marginLG]} style={{ marginBottom: token.marginLG }}>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Total Tokens Used"
                            value={statistics.totalTokens.toLocaleString()}
                            valueStyle={{ color: token.colorInfo }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Avg Response Time"
                            value={statistics.avgResponseTime}
                            suffix="ms"
                            valueStyle={{ color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Active Keys"
                            value={statistics.totalApiKeys + statistics.totalProxyKeys}
                            valueStyle={{ color: token.colorSuccess }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Card title="Quick Actions" style={{ marginBottom: token.marginLG }}>
                <Row gutter={[token.marginMD, token.marginMD]}>
                    <Col xs={24} sm={8}>
                        <Link href="/api-keys/create">
                            <Button type="primary" icon={<KeyOutlined />} block size="large">
                                Create API Key
                            </Button>
                        </Link>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Link href="/proxy-api-keys/create">
                            <Button
                                type="primary"
                                icon={<SafetyCertificateOutlined />}
                                block
                                size="large"
                            >
                                Create Proxy Key
                            </Button>
                        </Link>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Link href="/request-logs">
                            <Button icon={<FileTextOutlined />} block size="large">
                                View Request Logs
                            </Button>
                        </Link>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}
