'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Progress, theme, Typography, Spin, Alert } from 'antd';
import {
    ClockCircleOutlined,
    BugOutlined,
    ThunderboltOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import {
    useDashboardStatistics,
    useRetryStatistics,
    useApiKeyStatistics,
    useProxyKeyStatistics,
    useRequestLogsStatistics,
} from '@/hooks/useRpc';

const { useToken } = theme;
const { Title } = Typography;

interface StatisticsDashboardProps {
    showRetryStats?: boolean;
    showApiKeyStats?: boolean;
    showProxyKeyStats?: boolean;
    showRequestLogsStats?: boolean;
    daysBack?: number;
}

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
    showRetryStats = true,
    showApiKeyStats = false,
    showProxyKeyStats = false,
    showRequestLogsStats = false,
    daysBack = 30,
}) => {
    const { token } = useToken();

    // Fetch all statistics in parallel
    const {
        query: { isLoading: dashboardLoading, isError: dashboardError },
        result: dashboardResult,
    } = useDashboardStatistics();
    const dashboardStats = dashboardResult?.data;

    const {
        query: { isLoading: retryLoading, isError: retryError },
        result: retryResult,
    } = useRetryStatistics({ p_days_back: daysBack });
    const retryStats = retryResult?.data;

    const {
        query: { isLoading: apiKeyLoading, isError: apiKeyError },
        result: apiKeyResult,
    } = useApiKeyStatistics();
    const apiKeyStats = apiKeyResult?.data;

    const {
        query: { isLoading: proxyKeyLoading, isError: proxyKeyError },
        result: proxyKeyResult,
    } = useProxyKeyStatistics();
    const proxyKeyStats = proxyKeyResult?.data;

    const {
        query: { isLoading: requestLogsLoading, isError: requestLogsError },
        result: requestLogsResult,
    } = useRequestLogsStatistics({ p_days_back: daysBack });
    const requestLogsStats = requestLogsResult?.data;

    const isLoading =
        dashboardLoading || retryLoading || apiKeyLoading || proxyKeyLoading || requestLogsLoading;
    const hasError =
        dashboardError || retryError || apiKeyError || proxyKeyError || requestLogsError;

    if (hasError) {
        return (
            <Alert
                message="Statistics Error"
                description="Failed to load statistics. Please try again later."
                type="error"
                showIcon
            />
        );
    }

    return (
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
            loading={isLoading}
        >
            <div style={{ marginBottom: token.marginMD }}>
                <Title level={4} style={{ margin: 0, color: token.colorText }}>
                    <BarChartOutlined style={{ marginRight: token.marginXS }} />
                    📊 System Statistics
                </Title>
            </div>

            <Spin spinning={isLoading}>
                <Row gutter={[token.marginLG, token.marginMD]}>
                    {/* Dashboard Statistics */}
                    {dashboardStats && (
                        <>
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
                                        title="🔑 API Keys"
                                        value={dashboardStats.total_api_keys}
                                        valueStyle={{
                                            color: token.colorPrimary,
                                            fontSize: token.fontSizeXL,
                                        }}
                                        prefix={
                                            <ClockCircleOutlined
                                                style={{ color: token.colorPrimary }}
                                            />
                                        }
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
                                        title="🔐 Proxy Keys"
                                        value={dashboardStats.total_proxy_keys}
                                        valueStyle={{
                                            color: token.colorInfo,
                                            fontSize: token.fontSizeXL,
                                        }}
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
                                        title="📈 Total Requests"
                                        value={dashboardStats.total_requests}
                                        valueStyle={{
                                            color: token.colorText,
                                            fontSize: token.fontSizeXL,
                                        }}
                                        prefix={
                                            <ClockCircleOutlined
                                                style={{ color: token.colorText }}
                                            />
                                        }
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
                                        title="✅ Success Rate"
                                        value={dashboardStats.success_rate}
                                        suffix="%"
                                        valueStyle={{
                                            color: token.colorSuccess,
                                            fontSize: token.fontSizeXL,
                                        }}
                                    />
                                    <Progress
                                        percent={dashboardStats.success_rate}
                                        size="small"
                                        showInfo={false}
                                        strokeColor={
                                            dashboardStats.success_rate > 90
                                                ? token.colorSuccess
                                                : dashboardStats.success_rate > 70
                                                  ? token.colorWarning
                                                  : token.colorError
                                        }
                                        style={{ marginTop: token.marginXS }}
                                    />
                                </Card>
                            </Col>
                        </>
                    )}

                    {/* Retry Statistics */}
                    {showRetryStats && retryStats && (
                        <>
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
                                        value={retryStats.requests_with_retries}
                                        valueStyle={{
                                            color: token.colorWarning,
                                            fontSize: token.fontSizeXL,
                                        }}
                                        prefix={
                                            <BugOutlined style={{ color: token.colorWarning }} />
                                        }
                                    />
                                    <Progress
                                        percent={
                                            retryStats.total_requests
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
                                        value={retryStats.total_retry_attempts}
                                        valueStyle={{
                                            color: token.colorError,
                                            fontSize: token.fontSizeXL,
                                        }}
                                        prefix={
                                            <ThunderboltOutlined
                                                style={{ color: token.colorError }}
                                            />
                                        }
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
                                        value={retryStats.retry_rate}
                                        suffix="%"
                                        valueStyle={{
                                            color: token.colorInfo,
                                            fontSize: token.fontSizeXL,
                                        }}
                                    />
                                    <Progress
                                        percent={retryStats.retry_rate}
                                        size="small"
                                        showInfo={false}
                                        strokeColor={
                                            retryStats.retry_rate > 20
                                                ? token.colorError
                                                : retryStats.retry_rate > 10
                                                  ? token.colorWarning
                                                  : token.colorSuccess
                                        }
                                        style={{ marginTop: token.marginXS }}
                                    />
                                </Card>
                            </Col>
                        </>
                    )}

                    {/* API Key Statistics */}
                    {showApiKeyStats && apiKeyStats && (
                        <>
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
                                        title="🔑 Active API Keys"
                                        value={apiKeyStats.active_keys}
                                        valueStyle={{
                                            color: token.colorSuccess,
                                            fontSize: token.fontSizeXL,
                                        }}
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
                                        title="📊 API Key Success Rate"
                                        value={apiKeyStats.success_rate}
                                        suffix="%"
                                        valueStyle={{
                                            color: token.colorInfo,
                                            fontSize: token.fontSizeXL,
                                        }}
                                    />
                                </Card>
                            </Col>
                        </>
                    )}

                    {/* Proxy Key Statistics */}
                    {showProxyKeyStats && proxyKeyStats && (
                        <>
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
                                        title="🔐 Active Proxy Keys"
                                        value={proxyKeyStats.active_keys}
                                        valueStyle={{
                                            color: token.colorSuccess,
                                            fontSize: token.fontSizeXL,
                                        }}
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
                                        title="🎯 Total Tokens"
                                        value={proxyKeyStats.total_tokens}
                                        valueStyle={{
                                            color: token.colorInfo,
                                            fontSize: token.fontSizeXL,
                                        }}
                                    />
                                </Card>
                            </Col>
                        </>
                    )}

                    {/* Request Logs Statistics */}
                    {showRequestLogsStats && requestLogsStats && (
                        <>
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
                                        title="📈 Request Logs"
                                        value={requestLogsStats.total_requests}
                                        valueStyle={{
                                            color: token.colorText,
                                            fontSize: token.fontSizeXL,
                                        }}
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
                                        title="⚡ Avg Response Time"
                                        value={requestLogsStats.avg_response_time_ms}
                                        suffix="ms"
                                        valueStyle={{
                                            color: token.colorInfo,
                                            fontSize: token.fontSizeXL,
                                        }}
                                    />
                                </Card>
                            </Col>
                        </>
                    )}
                </Row>
            </Spin>
        </Card>
    );
};
