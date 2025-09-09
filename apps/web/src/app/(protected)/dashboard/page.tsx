'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Progress, Button, Space, theme } from 'antd';
import {
    ReloadOutlined,
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useDashboardStatistics } from '@/hooks/use-dashboard-statistics';

const { useToken } = theme;

export default function DashboardPage() {
    const { token } = useToken();

    // Use RPC-based statistics hook
    const { statistics, isLoading, mutate } = useDashboardStatistics();

    const handleRefresh = () => {
        mutate();
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
                            value={statistics?.total_api_keys || 0}
                            valueStyle={{ color: token.colorPrimary }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Proxy Keys"
                            value={statistics?.total_proxy_keys || 0}
                            valueStyle={{ color: token.colorInfo }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Requests"
                            value={statistics?.total_requests || 0}
                            valueStyle={{ color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Success Rate"
                            value={statistics?.success_rate || 0}
                            suffix="%"
                            valueStyle={{ color: token.colorSuccess }}
                        />
                        <Progress
                            percent={statistics?.success_rate || 0}
                            size="small"
                            showInfo={false}
                            strokeColor={
                                (statistics?.success_rate || 0) > 90
                                    ? token.colorSuccess
                                    : (statistics?.success_rate || 0) > 70
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
                            value={(statistics?.total_tokens || 0).toLocaleString()}
                            valueStyle={{ color: token.colorInfo }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Avg Response Time"
                            value={statistics?.avg_response_time_ms || 0}
                            suffix="ms"
                            valueStyle={{ color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Active Keys"
                            value={statistics?.active_keys || 0}
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
