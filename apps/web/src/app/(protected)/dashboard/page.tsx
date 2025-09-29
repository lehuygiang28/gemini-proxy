'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Progress,
    Typography,
    Space,
    Button,
    DatePicker,
    Select,
    Spin,
    Alert,
    theme,
    Divider,
    Badge,
    Tooltip,
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
    DashboardOutlined,
    ApiOutlined,
    KeyOutlined,
    ThunderboltOutlined,
    BugOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    BarChartOutlined,
    LineChartOutlined,
} from '@ant-design/icons';
import {
    useDashboardStatistics,
    useRetryStatistics,
    useRequestLogsStatistics,
    useApiKeyStatistics,
    useProxyKeyStatistics,
} from '@/hooks/useRpc';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useToken } = theme;

/**
 * Dashboard Page
 * Comprehensive statistics dashboard with real-time data visualization
 */
export default function DashboardPage() {
    const { token } = useToken();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [selectedDays, setSelectedDays] = useState<number>(7);

    // Fetch dashboard statistics
    const {
        query: { isLoading: dashboardLoading, isError: dashboardError },
        result: dashboardResult,
    } = useDashboardStatistics();

    // Fetch retry statistics
    const {
        query: { isLoading: retryLoading, isError: retryError },
        result: retryResult,
    } = useRetryStatistics({ p_days_back: selectedDays });

    // Fetch request logs statistics
    const {
        query: { isLoading: requestLogsLoading, isError: requestLogsError },
        result: requestLogsResult,
    } = useRequestLogsStatistics({ p_days_back: selectedDays });

    // Fetch API key statistics
    const {
        query: { isLoading: apiKeyLoading, isError: apiKeyError },
        result: apiKeyResult,
    } = useApiKeyStatistics();

    // Fetch proxy key statistics
    const {
        query: { isLoading: proxyKeyLoading, isError: proxyKeyError },
        result: proxyKeyResult,
    } = useProxyKeyStatistics();

    const dashboardStats = dashboardResult?.data;
    const retryStats = retryResult?.data;
    const requestLogsStats = requestLogsResult?.data;
    const apiKeyStats = apiKeyResult?.data;
    const proxyKeyStats = proxyKeyResult?.data;

    const isLoading =
        dashboardLoading || retryLoading || requestLogsLoading || apiKeyLoading || proxyKeyLoading;
    const hasError =
        dashboardError || retryError || requestLogsError || apiKeyError || proxyKeyError;

    const handleRefresh = useCallback(() => {
        // Trigger refetch for all queries
        window.location.reload();
    }, []);

    const handleDateRangeChange = useCallback((dates: [Dayjs, Dayjs] | null) => {
        setDateRange(dates);
        if (dates) {
            const daysDiff = Math.ceil(dates[1].diff(dates[0], 'day'));
            setSelectedDays(daysDiff);
        }
    }, []);

    const handleDaysChange = useCallback((days: number) => {
        setSelectedDays(days);
        setDateRange(null);
    }, []);

    // Calculate success rate with fallback
    const successRate = useMemo(() => {
        if (dashboardStats?.success_rate !== undefined) {
            return Math.round(dashboardStats.success_rate);
        }
        if (dashboardStats?.total_requests && dashboardStats?.successful_requests) {
            return Math.round(
                (dashboardStats.successful_requests / dashboardStats.total_requests) * 100,
            );
        }
        return 0;
    }, [dashboardStats]);

    // Calculate retry rate with fallback
    const retryRate = useMemo(() => {
        if (retryStats?.retry_rate !== undefined) {
            return Math.round(retryStats.retry_rate);
        }
        if (retryStats?.total_requests && retryStats?.requests_with_retries) {
            return Math.round((retryStats.requests_with_retries / retryStats.total_requests) * 100);
        }
        return 0;
    }, [retryStats]);

    if (hasError) {
        return (
            <div style={{ padding: token.paddingLG }}>
                <Alert
                    message="Dashboard Error"
                    description="Failed to load dashboard statistics. Please try refreshing the page."
                    type="error"
                    showIcon
                    action={
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                            Refresh
                        </Button>
                    }
                />
                <div style={{ marginTop: token.marginMD }}>
                    <Text type="secondary">
                        Error details: {dashboardError ? 'Dashboard' : ''}{' '}
                        {retryError ? 'Retry' : ''} {requestLogsError ? 'Request Logs' : ''}{' '}
                        {apiKeyError ? 'API Keys' : ''} {proxyKeyError ? 'Proxy Keys' : ''}
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: token.paddingLG,
                background: token.colorFillQuaternary,
                minHeight: '100vh',
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: token.marginLG }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space align="center">
                            <DashboardOutlined
                                style={{ fontSize: token.fontSizeXL, color: token.colorPrimary }}
                            />
                            <Title level={2} style={{ margin: 0, color: token.colorText }}>
                                Dashboard
                            </Title>
                        </Space>
                        <Text type="secondary" style={{ color: token.colorTextSecondary }}>
                            Real-time statistics and analytics for your API proxy
                        </Text>
                    </Col>
                    <Col>
                        <Space>
                            <Select
                                value={selectedDays}
                                onChange={handleDaysChange}
                                style={{ width: 120 }}
                                options={[
                                    { label: 'Last 7 days', value: 7 },
                                    { label: 'Last 30 days', value: 30 },
                                    { label: 'Last 90 days', value: 90 },
                                ]}
                            />
                            <RangePicker
                                value={dateRange}
                                onChange={handleDateRangeChange}
                                style={{ width: 240 }}
                            />
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleRefresh}
                                loading={isLoading}
                            >
                                Refresh
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: token.paddingXL }}>
                    <Spin size="large" />
                    <div style={{ marginTop: token.marginMD }}>
                        <Text type="secondary">Loading dashboard statistics...</Text>
                    </div>
                </div>
            ) : (
                <>
                    {/* Overview Statistics */}
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                            >
                                <Statistic
                                    title={
                                        <Space>
                                            <ApiOutlined style={{ color: token.colorPrimary }} />
                                            <span style={{ color: token.colorText }}>
                                                Total Requests
                                            </span>
                                        </Space>
                                    }
                                    value={dashboardStats?.total_requests || 0}
                                    valueStyle={{ color: token.colorPrimary }}
                                    suffix={
                                        <Tooltip title="Total API requests processed">
                                            <Badge
                                                count="API"
                                                style={{ backgroundColor: token.colorPrimary }}
                                            />
                                        </Tooltip>
                                    }
                                />
                                <div style={{ marginTop: token.marginXS }}>
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                        {selectedDays} days period
                                    </Text>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                            >
                                <Statistic
                                    title={
                                        <Space>
                                            <CheckCircleOutlined
                                                style={{ color: token.colorSuccess }}
                                            />
                                            <span style={{ color: token.colorText }}>
                                                Success Rate
                                            </span>
                                        </Space>
                                    }
                                    value={successRate}
                                    valueStyle={{ color: token.colorSuccess }}
                                    suffix="%"
                                />
                                <div style={{ marginTop: token.marginXS }}>
                                    <Progress
                                        percent={successRate}
                                        size="small"
                                        strokeColor={token.colorSuccess}
                                        trailColor={token.colorFillQuaternary}
                                    />
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                            >
                                <Statistic
                                    title={
                                        <Space>
                                            <ThunderboltOutlined
                                                style={{ color: token.colorWarning }}
                                            />
                                            <span style={{ color: token.colorText }}>
                                                Avg Response Time
                                            </span>
                                        </Space>
                                    }
                                    value={dashboardStats?.avg_response_time_ms || 0}
                                    valueStyle={{ color: token.colorWarning }}
                                    suffix="ms"
                                />
                                <div style={{ marginTop: token.marginXS }}>
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                        Performance metric
                                    </Text>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                                }}
                            >
                                <Statistic
                                    title={
                                        <Space>
                                            <KeyOutlined style={{ color: token.colorInfo }} />
                                            <span style={{ color: token.colorText }}>
                                                Active Keys
                                            </span>
                                        </Space>
                                    }
                                    value={dashboardStats?.active_keys || 0}
                                    valueStyle={{ color: token.colorInfo }}
                                />
                                <div style={{ marginTop: token.marginXS }}>
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                        API & Proxy keys
                                    </Text>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Detailed Statistics */}
                    <Row
                        gutter={[token.marginLG, token.marginMD]}
                        style={{ marginTop: token.marginLG }}
                    >
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <Space>
                                        <BugOutlined style={{ color: token.colorPrimary }} />
                                        <span style={{ color: token.colorText }}>
                                            Retry Statistics
                                        </span>
                                    </Space>
                                }
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                }}
                                extra={
                                    <Tooltip title="Requests that required retry attempts">
                                        <Badge
                                            count="Retry"
                                            style={{ backgroundColor: token.colorWarning }}
                                        />
                                    </Tooltip>
                                }
                            >
                                <Row gutter={[token.marginMD, token.marginSM]}>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Requests"
                                            value={retryStats?.total_requests || 0}
                                            valueStyle={{ color: token.colorText }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="With Retries"
                                            value={retryStats?.requests_with_retries || 0}
                                            valueStyle={{ color: token.colorWarning }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Retry Rate"
                                            value={retryRate}
                                            valueStyle={{ color: token.colorError }}
                                            suffix="%"
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Attempts"
                                            value={retryStats?.total_retry_attempts || 0}
                                            valueStyle={{ color: token.colorTextSecondary }}
                                        />
                                    </Col>
                                </Row>
                                <Divider style={{ margin: token.marginSM }} />
                                <div style={{ textAlign: 'center' }}>
                                    <Progress
                                        type="circle"
                                        percent={retryRate}
                                        size={80}
                                        strokeColor={token.colorError}
                                        trailColor={token.colorFillQuaternary}
                                        format={(percent) => `${percent}%`}
                                    />
                                    <div style={{ marginTop: token.marginXS }}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: token.fontSizeSM }}
                                        >
                                            Retry Rate
                                        </Text>
                                    </div>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <Space>
                                        <BarChartOutlined style={{ color: token.colorPrimary }} />
                                        <span style={{ color: token.colorText }}>
                                            API Key Statistics
                                        </span>
                                    </Space>
                                }
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                }}
                                extra={
                                    <Tooltip title="API key performance metrics">
                                        <Badge
                                            count="Keys"
                                            style={{ backgroundColor: token.colorInfo }}
                                        />
                                    </Tooltip>
                                }
                            >
                                <Row gutter={[token.marginMD, token.marginSM]}>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Keys"
                                            value={apiKeyStats?.total_keys || 0}
                                            valueStyle={{ color: token.colorInfo }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Active Keys"
                                            value={apiKeyStats?.active_keys || 0}
                                            valueStyle={{ color: token.colorSuccess }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Success Count"
                                            value={apiKeyStats?.total_success_count || 0}
                                            valueStyle={{ color: token.colorSuccess }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Failure Count"
                                            value={apiKeyStats?.total_failure_count || 0}
                                            valueStyle={{ color: token.colorError }}
                                        />
                                    </Col>
                                </Row>
                                <Divider style={{ margin: token.marginSM }} />
                                <div style={{ textAlign: 'center' }}>
                                    <Progress
                                        type="circle"
                                        percent={Math.round(apiKeyStats?.success_rate) || 0}
                                        size={80}
                                        strokeColor={token.colorSuccess}
                                        trailColor={token.colorFillQuaternary}
                                        format={(percent) => `${percent}%`}
                                    />
                                    <div style={{ marginTop: token.marginXS }}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: token.fontSizeSM }}
                                        >
                                            Success Rate
                                        </Text>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Proxy Key Statistics */}
                    <Row
                        gutter={[token.marginLG, token.marginMD]}
                        style={{ marginTop: token.marginLG }}
                    >
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <Space>
                                        <KeyOutlined style={{ color: token.colorPrimary }} />
                                        <span style={{ color: token.colorText }}>
                                            Proxy Key Statistics
                                        </span>
                                    </Space>
                                }
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                }}
                                extra={
                                    <Tooltip title="Proxy key performance metrics">
                                        <Badge
                                            count="Proxy"
                                            style={{ backgroundColor: token.colorPrimary }}
                                        />
                                    </Tooltip>
                                }
                            >
                                <Row gutter={[token.marginMD, token.marginSM]}>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Keys"
                                            value={proxyKeyStats?.total_keys || 0}
                                            valueStyle={{ color: token.colorPrimary }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Active Keys"
                                            value={proxyKeyStats?.active_keys || 0}
                                            valueStyle={{ color: token.colorSuccess }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Tokens"
                                            value={proxyKeyStats?.total_tokens || 0}
                                            valueStyle={{ color: token.colorInfo }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Success Rate"
                                            value={Math.round(proxyKeyStats?.success_rate) || 0}
                                            valueStyle={{ color: token.colorSuccess }}
                                            suffix="%"
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <Space>
                                        <LineChartOutlined style={{ color: token.colorPrimary }} />
                                        <span style={{ color: token.colorText }}>
                                            Request Logs Statistics
                                        </span>
                                    </Space>
                                }
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    boxShadow: token.boxShadowTertiary,
                                }}
                                extra={
                                    <Tooltip title="Request logs performance metrics">
                                        <Badge
                                            count="Logs"
                                            style={{ backgroundColor: token.colorWarning }}
                                        />
                                    </Tooltip>
                                }
                            >
                                <Row gutter={[token.marginMD, token.marginSM]}>
                                    <Col span={12}>
                                        <Statistic
                                            title="Total Requests"
                                            value={requestLogsStats?.total_requests || 0}
                                            valueStyle={{ color: token.colorText }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Successful"
                                            value={requestLogsStats?.successful_requests || 0}
                                            valueStyle={{ color: token.colorSuccess }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Failed"
                                            value={requestLogsStats?.failed_requests || 0}
                                            valueStyle={{ color: token.colorError }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Avg Response Time"
                                            value={requestLogsStats?.avg_response_time_ms || 0}
                                            valueStyle={{ color: token.colorWarning }}
                                            suffix="ms"
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
}
