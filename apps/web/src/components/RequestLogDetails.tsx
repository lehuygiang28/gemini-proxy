'use client';

import React from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Tag,
    Space,
    Button,
    Tooltip,
    theme,
    Descriptions,
    Divider,
    Badge,
    Statistic,
    Progress,
    Alert,
    Timeline,
    Avatar,
    Collapse,
} from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    BugOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
    ApiOutlined,
    CopyOutlined,
    DownloadOutlined,
    UserOutlined,
    KeyOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    SafetyOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay } from '@/components/common';
import { useNotification, useMany } from '@refinedev/core';
import { RequestLog, RetryAttempt } from '../types/request-log.types';

const { Text } = Typography;
const { useToken } = theme;

interface RequestLogDetailsProps {
    requestLog: RequestLog;
    isModal?: boolean;
}

/**
 * Comprehensive Request Log Details Component
 * Production-ready component with Supabase PostgREST joins
 */
export const RequestLogDetails: React.FC<RequestLogDetailsProps> = ({
    requestLog,
    isModal = false,
}) => {
    const notification = useNotification();

    const handleCopyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        notification.open({
            type: 'success',
            message: 'Copied to Clipboard',
            description: `${label} has been copied to clipboard.`,
        });
    };

    const handleDownloadJson = (data: unknown, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        notification.open({
            type: 'success',
            message: 'Download Started',
            description: `${filename} has been downloaded.`,
        });
    };

    const requestData = requestLog.request_data as Record<string, unknown>;
    const responseData = requestLog.response_data as Record<string, unknown>;
    const errorDetails = requestLog.error_details as Record<string, unknown>;
    const performanceMetrics = requestLog.performance_metrics as Record<string, unknown>;
    const usageMetadata = requestLog.usage_metadata as Record<string, unknown>;
    const retryAttempts = (requestLog.retry_attempts as unknown as RetryAttempt[]) || [];

    return (
        <div
            style={{
                height: isModal ? 'calc(90vh - 120px)' : 'auto',
                overflowY: isModal ? 'auto' : 'visible',
                overflowX: 'hidden',
                padding: isModal ? '0' : '0',
                width: '100%',
            }}
            className={isModal ? 'gp-scrollable' : undefined}
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Status Overview */}
                <StatusOverview requestLog={requestLog} />

                {/* User & Keys Information */}
                <UserAndKeysInfo requestLog={requestLog} onCopy={handleCopyToClipboard} />

                {/* Performance & Usage Metrics */}
                <PerformanceMetrics
                    performanceMetrics={performanceMetrics}
                    usageMetadata={usageMetadata}
                    onCopy={handleCopyToClipboard}
                    onDownload={handleDownloadJson}
                />

                {/* Request & Response Details */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                        <RequestDetailsCard
                            requestLog={requestLog}
                            requestData={requestData}
                            onDownload={handleDownloadJson}
                            isModal={isModal}
                        />
                    </Col>
                    <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                        <ResponseDetailsCard
                            requestLog={requestLog}
                            responseData={responseData}
                            errorDetails={errorDetails}
                            onDownload={handleDownloadJson}
                            isModal={isModal}
                        />
                    </Col>
                </Row>

                {/* Retry Attempts Timeline */}
                <RetryAttemptsCard retryAttempts={retryAttempts} />
            </Space>
        </div>
    );
};

/**
 * Status Overview Component
 */
function StatusOverview({ requestLog }: { requestLog: RequestLog }) {
    const { token } = useToken();

    return (
        <Card
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
                background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
            }}
            title={
                <Space>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span>Request Overview</span>
                </Space>
            }
        >
            <Row gutter={[token.marginLG, token.marginMD]}>
                <Col xs={24} sm={6} style={{ minWidth: 0 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong style={{ color: token.colorText }}>
                            Status
                        </Text>
                        <Tag
                            color={requestLog.is_successful ? 'success' : 'error'}
                            icon={
                                requestLog.is_successful ? (
                                    <CheckCircleOutlined />
                                ) : (
                                    <ExclamationCircleOutlined />
                                )
                            }
                            style={{ fontSize: token.fontSizeSM }}
                        >
                            {requestLog.is_successful ? 'Success' : 'Failed'}
                        </Tag>
                    </Space>
                </Col>
                <Col xs={24} sm={6} style={{ minWidth: 0 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong style={{ color: token.colorText }}>
                            API Format
                        </Text>
                        <Tag color="processing" style={{ fontSize: token.fontSizeSM }}>
                            {requestLog.api_format?.toUpperCase()}
                        </Tag>
                    </Space>
                </Col>
                <Col xs={24} sm={6} style={{ minWidth: 0 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong style={{ color: token.colorText }}>
                            Stream Type
                        </Text>
                        <Tag
                            color={requestLog.is_stream ? 'success' : 'default'}
                            style={{ fontSize: token.fontSizeSM }}
                        >
                            {requestLog.is_stream ? 'Streaming' : 'Non-streaming'}
                        </Tag>
                    </Space>
                </Col>
                <Col xs={24} sm={6} style={{ minWidth: 0 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong style={{ color: token.colorText }}>
                            Created At
                        </Text>
                        <DateTimeDisplay dateString={requestLog.created_at} />
                    </Space>
                </Col>
            </Row>
        </Card>
    );
}

/**
 * User and Keys Information Component
 */
function UserAndKeysInfo({
    requestLog,
    onCopy,
}: {
    requestLog: RequestLog;
    onCopy: (text: string, label: string) => void;
}) {
    const { token } = useToken();

    return (
        <Row gutter={[16, 16]}>
            {/* User Information */}
            <Col xs={24} lg={8}>
                <Card
                    title={
                        <Space>
                            <UserOutlined style={{ color: token.colorPrimary }} />
                            <span>User Information</span>
                        </Space>
                    }
                    size="small"
                    style={{
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowTertiary,
                    }}
                >
                    {requestLog.user_id ? (
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="User ID">
                                <Space>
                                    <Avatar size="small" icon={<UserOutlined />} />
                                    <Text code style={{ fontSize: token.fontSizeSM }}>
                                        {requestLog.user_id.slice(0, 8)}...
                                    </Text>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => onCopy(requestLog.user_id!, 'User ID')}
                                    />
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color="success">Authenticated User</Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Alert
                            message="No User Data"
                            description="This request was not associated with a user account."
                            type="info"
                            showIcon
                        />
                    )}
                </Card>
            </Col>

            {/* API Key Information */}
            <Col xs={24} lg={8}>
                <Card
                    title={
                        <Space>
                            <KeyOutlined style={{ color: token.colorPrimary }} />
                            <span>API Key</span>
                        </Space>
                    }
                    size="small"
                    style={{
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowTertiary,
                    }}
                >
                    {requestLog.api_keys ? (
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Name">
                                <Text strong>{requestLog.api_keys.name}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Provider">
                                <Tag color="blue">{requestLog.api_keys.provider}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={requestLog.api_keys.is_active ? 'success' : 'error'}>
                                    {requestLog.api_keys.is_active ? 'Active' : 'Inactive'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Success Rate">
                                <Progress
                                    percent={Math.round(
                                        (requestLog.api_keys.success_count /
                                            (requestLog.api_keys.success_count +
                                                requestLog.api_keys.failure_count)) *
                                            100,
                                    )}
                                    size="small"
                                    showInfo={false}
                                />
                                <Text style={{ fontSize: token.fontSizeSM }}>
                                    {requestLog.api_keys.success_count} /{' '}
                                    {requestLog.api_keys.success_count +
                                        requestLog.api_keys.failure_count}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Tokens">
                                <Text strong style={{ color: token.colorInfo }}>
                                    {requestLog.api_keys.total_tokens.toLocaleString()}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Alert
                            message="No API Key"
                            description="This request was not associated with an API key."
                            type="warning"
                            showIcon
                        />
                    )}
                </Card>
            </Col>

            {/* Proxy Key Information */}
            <Col xs={24} lg={8}>
                <Card
                    title={
                        <Space>
                            <SafetyOutlined style={{ color: token.colorPrimary }} />
                            <span>Proxy Key</span>
                        </Space>
                    }
                    size="small"
                    style={{
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowTertiary,
                    }}
                >
                    {requestLog.proxy_api_keys ? (
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Name">
                                <Text strong>{requestLog.proxy_api_keys.name}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag
                                    color={
                                        requestLog.proxy_api_keys.is_active ? 'success' : 'error'
                                    }
                                >
                                    {requestLog.proxy_api_keys.is_active ? 'Active' : 'Inactive'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Success Rate">
                                <Progress
                                    percent={Math.round(
                                        (requestLog.proxy_api_keys.success_count /
                                            (requestLog.proxy_api_keys.success_count +
                                                requestLog.proxy_api_keys.failure_count)) *
                                            100,
                                    )}
                                    size="small"
                                    showInfo={false}
                                />
                                <Text style={{ fontSize: token.fontSizeSM }}>
                                    {requestLog.proxy_api_keys.success_count} /{' '}
                                    {requestLog.proxy_api_keys.success_count +
                                        requestLog.proxy_api_keys.failure_count}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Tokens">
                                <Text strong style={{ color: token.colorInfo }}>
                                    {requestLog.proxy_api_keys.total_tokens.toLocaleString()}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Alert
                            message="No Proxy Key"
                            description="This request was not associated with a proxy key."
                            type="warning"
                            showIcon
                        />
                    )}
                </Card>
            </Col>
        </Row>
    );
}

/**
 * Performance Metrics Component
 */
function PerformanceMetrics({
    performanceMetrics,
    usageMetadata,
    onCopy,
    onDownload,
}: {
    performanceMetrics: Record<string, unknown>;
    usageMetadata: Record<string, unknown>;
    onCopy: (text: string, label: string) => void;
    onDownload: (data: unknown, filename: string) => void;
}) {
    const { token } = useToken();

    const duration = performanceMetrics.duration_ms as number;
    const attemptCount = performanceMetrics.attempt_count as number;
    const totalResponseTime = performanceMetrics.total_response_time_ms as number;

    const totalTokens = usageMetadata.total_tokens as number;
    const promptTokens = usageMetadata.prompt_tokens as number;
    const completionTokens = usageMetadata.completion_tokens as number;
    const model = usageMetadata.model as string;

    return (
        <Card
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: token.colorPrimary }} />
                    <span>Performance & Usage Metrics</span>
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
        >
            <Row gutter={[16, 16]}>
                {/* Performance Metrics */}
                <Col xs={24} lg={12}>
                    <Card
                        title="Performance"
                        size="small"
                        extra={
                            <Space>
                                <Tooltip title="Copy Performance Data">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        size="small"
                                        onClick={() =>
                                            onCopy(
                                                JSON.stringify(performanceMetrics, null, 2),
                                                'Performance Metrics',
                                            )
                                        }
                                    />
                                </Tooltip>
                                <Tooltip title="Download Performance Data">
                                    <Button
                                        type="text"
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        onClick={() =>
                                            onDownload(
                                                performanceMetrics,
                                                'performance-metrics.json',
                                            )
                                        }
                                    />
                                </Tooltip>
                            </Space>
                        }
                    >
                        <Row gutter={[8, 8]}>
                            <Col span={12}>
                                <Statistic
                                    title="Duration"
                                    value={duration}
                                    suffix="ms"
                                    valueStyle={{ color: token.colorInfo }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Total Response Time"
                                    value={totalResponseTime}
                                    suffix="ms"
                                    valueStyle={{ color: token.colorSuccess }}
                                />
                            </Col>
                            <Col span={24}>
                                <Statistic
                                    title="Attempt Count"
                                    value={attemptCount}
                                    valueStyle={{
                                        color:
                                            attemptCount > 1
                                                ? token.colorWarning
                                                : token.colorSuccess,
                                    }}
                                />
                                {attemptCount > 1 && (
                                    <Progress
                                        percent={Math.min((attemptCount / 5) * 100, 100)}
                                        size="small"
                                        strokeColor={token.colorWarning}
                                        showInfo={false}
                                    />
                                )}
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Usage Metrics */}
                <Col xs={24} lg={12}>
                    <Card
                        title="Token Usage"
                        size="small"
                        extra={
                            <Space>
                                <Tooltip title="Copy Usage Data">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        size="small"
                                        onClick={() =>
                                            onCopy(
                                                JSON.stringify(usageMetadata, null, 2),
                                                'Usage Metadata',
                                            )
                                        }
                                    />
                                </Tooltip>
                                <Tooltip title="Download Usage Data">
                                    <Button
                                        type="text"
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        onClick={() =>
                                            onDownload(usageMetadata, 'usage-metadata.json')
                                        }
                                    />
                                </Tooltip>
                            </Space>
                        }
                    >
                        <Row gutter={[8, 8]}>
                            <Col span={24}>
                                <Statistic
                                    title="Total Tokens"
                                    value={totalTokens}
                                    valueStyle={{ color: token.colorPrimary }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Prompt Tokens"
                                    value={promptTokens}
                                    valueStyle={{ color: token.colorInfo }}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Completion Tokens"
                                    value={completionTokens}
                                    valueStyle={{ color: token.colorSuccess }}
                                />
                            </Col>
                            {model && (
                                <Col span={24}>
                                    <Text strong style={{ color: token.colorText }}>
                                        Model: <Tag color="blue">{model}</Tag>
                                    </Text>
                                </Col>
                            )}
                        </Row>
                    </Card>
                </Col>
            </Row>
        </Card>
    );
}

/**
 * Request Details Card Component
 */
function RequestDetailsCard({
    requestLog,
    requestData,
    onDownload,
    isModal,
}: {
    requestLog: RequestLog;
    requestData: Record<string, unknown>;
    onDownload: (data: unknown, filename: string) => void;
    isModal: boolean;
}) {
    const { token } = useToken();

    return (
        <Card
            title={
                <Space>
                    <ApiOutlined style={{ color: token.colorPrimary }} />
                    <span>Request Details</span>
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
            extra={
                <Space>
                    {requestData && (
                        <Tooltip title="Download Request Data">
                            <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() =>
                                    onDownload(requestData, `request-${requestLog.request_id}.json`)
                                }
                            />
                        </Tooltip>
                    )}
                </Space>
            }
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Request ID">
                        <Text code style={{ fontSize: token.fontSizeSM }}>
                            {requestLog.request_id}
                        </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="API Format">
                        <Tag color="processing">{requestLog.api_format}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Stream Type">
                        <Tag color={requestLog.is_stream ? 'success' : 'default'}>
                            {requestLog.is_stream ? 'Streaming' : 'Non-streaming'}
                        </Tag>
                    </Descriptions.Item>
                </Descriptions>

                {requestData && (
                    <div>
                        <Text strong style={{ color: token.colorText }}>
                            Request Data:
                        </Text>
                        <br />
                        <pre
                            style={{
                                background: token.colorFillQuaternary,
                                padding: isModal ? token.paddingXS : token.paddingSM,
                                borderRadius: token.borderRadius,
                                fontSize: isModal ? token.fontSizeSM : token.fontSize,
                                overflow: 'auto',
                                maxHeight: isModal ? '200px' : '300px',
                                border: `1px solid ${token.colorBorder}`,
                                color: token.colorText,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                            }}
                            className="gp-scrollable"
                        >
                            {JSON.stringify(requestData, null, 2)}
                        </pre>
                    </div>
                )}
            </Space>
        </Card>
    );
}

/**
 * Response Details Card Component
 */
function ResponseDetailsCard({
    requestLog,
    responseData,
    errorDetails,
    onDownload,
    isModal,
}: {
    requestLog: RequestLog;
    responseData: Record<string, unknown>;
    errorDetails: Record<string, unknown>;
    onDownload: (data: unknown, filename: string) => void;
    isModal: boolean;
}) {
    const { token } = useToken();

    return (
        <Card
            title={
                <Space>
                    <DatabaseOutlined style={{ color: token.colorPrimary }} />
                    <span>Response Details</span>
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
            extra={
                <Space>
                    {requestLog.is_successful && responseData && (
                        <Tooltip title="Download Response Data">
                            <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() =>
                                    onDownload(
                                        responseData,
                                        `response-${requestLog.request_id}.json`,
                                    )
                                }
                            />
                        </Tooltip>
                    )}
                    {!requestLog.is_successful && errorDetails && (
                        <Tooltip title="Download Error Details">
                            <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() =>
                                    onDownload(errorDetails, `error-${requestLog.request_id}.json`)
                                }
                            />
                        </Tooltip>
                    )}
                </Space>
            }
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {requestLog.is_successful ? (
                    <>
                        <div>
                            <Text strong style={{ color: token.colorText }}>
                                Response Data:
                            </Text>
                            <br />
                            {responseData ? (
                                <pre
                                    style={{
                                        background: token.colorFillQuaternary,
                                        padding: isModal ? token.paddingXS : token.paddingSM,
                                        borderRadius: token.borderRadius,
                                        fontSize: isModal ? token.fontSizeSM : token.fontSize,
                                        overflow: 'auto',
                                        maxHeight: isModal ? '300px' : '400px',
                                        border: `1px solid ${token.colorBorder}`,
                                        color: token.colorText,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                    className="gp-scrollable"
                                >
                                    {JSON.stringify(responseData, null, 2)}
                                </pre>
                            ) : (
                                <Text type="secondary">No response data</Text>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <Text strong style={{ color: token.colorText }}>
                                Error Details:
                            </Text>
                            <br />
                            {errorDetails ? (
                                <pre
                                    style={{
                                        background: token.colorErrorBg,
                                        padding: isModal ? token.paddingXS : token.paddingSM,
                                        borderRadius: token.borderRadius,
                                        fontSize: isModal ? token.fontSizeSM : token.fontSize,
                                        overflow: 'auto',
                                        maxHeight: isModal ? '200px' : '300px',
                                        border: `1px solid ${token.colorErrorBorder}`,
                                        color: token.colorError,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                    className="gp-scrollable"
                                >
                                    {JSON.stringify(errorDetails, null, 2)}
                                </pre>
                            ) : (
                                <Text type="secondary">No error details</Text>
                            )}
                        </div>
                    </>
                )}
            </Space>
        </Card>
    );
}

/**
 * Retry Attempts Card Component
 */
function RetryAttemptsCard({ retryAttempts }: { retryAttempts: RetryAttempt[] }) {
    const { token } = useToken();
    const notification = useNotification();

    // Extract unique API key IDs from retry attempts
    const apiKeyIds = [
        ...new Set(retryAttempts.map((attempt) => attempt.api_key_id).filter(Boolean)),
    ] as string[];

    // Fetch API key names for all retry attempts
    const {
        result: apiKeysData,
        query: { isLoading: apiKeysLoading },
    } = useMany<Tables<'api_keys'>>({
        resource: 'api_keys',
        ids: apiKeyIds,
        queryOptions: {
            enabled: apiKeyIds.length > 0,
        },
    });

    // Create a map of API key ID to name for quick lookup
    const apiKeyMap = new Map<string, string>();
    if (apiKeysData?.data) {
        apiKeysData.data.forEach((apiKey) => {
            apiKeyMap.set(apiKey.id, apiKey.name);
        });
    }

    if (!retryAttempts || retryAttempts.length === 0) {
        return (
            <Card
                title={
                    <Space>
                        <BugOutlined style={{ color: token.colorPrimary }} />
                        <span>Retry Attempts</span>
                    </Space>
                }
                size="small"
                style={{
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowTertiary,
                }}
            >
                <Alert
                    message="No Retry Attempts"
                    description="This request completed successfully on the first attempt."
                    type="success"
                    showIcon
                />
            </Card>
        );
    }

    // Calculate retry statistics
    // All retry attempts are failed attempts - the final success is determined by the request's is_successful field
    const failedAttempts = retryAttempts.length; // All retry attempts are failures
    const totalDuration = retryAttempts.reduce(
        (sum, attempt) => sum + ((attempt.duration_ms as number) || 0),
        0,
    );
    const uniqueApiKeys = [
        ...new Set(retryAttempts.map((attempt) => attempt.api_key_id).filter(Boolean)),
    ];

    return (
        <Card
            title={
                <Space>
                    <BugOutlined style={{ color: token.colorPrimary }} />
                    <span>Retry Attempts Timeline</span>
                    <Badge count={retryAttempts.length} color={token.colorWarning} />
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
            extra={
                <Space>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {failedAttempts} retry attempts
                    </Text>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        Total Duration: {totalDuration}ms
                    </Text>
                    {uniqueApiKeys.length > 1 && (
                        <Space direction="vertical" size="small">
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                {uniqueApiKeys.length} different API keys used:
                            </Text>
                            <Space wrap>
                                {uniqueApiKeys.map((apiKeyId, index) => (
                                    <Tag
                                        key={`${apiKeyId}-${index}`}
                                        color="blue"
                                        style={{ fontSize: token.fontSizeSM }}
                                    >
                                        {apiKeyMap.get(apiKeyId as string) ||
                                            `${(apiKeyId as string).slice(0, 8)}...`}
                                    </Tag>
                                ))}
                            </Space>
                        </Space>
                    )}
                </Space>
            }
        >
            {apiKeysLoading && (
                <div style={{ textAlign: 'center', padding: token.paddingMD }}>
                    <Text type="secondary">Loading API key information...</Text>
                </div>
            )}
            {/* Add a note about the final request status */}
            <div
                style={{
                    marginBottom: token.marginMD,
                    padding: token.paddingSM,
                    background: token.colorInfoBg,
                    borderRadius: token.borderRadius,
                }}
            >
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    <InfoCircleOutlined style={{ marginRight: token.marginXS }} />
                    All retry attempts shown below are failed attempts. The final request success is
                    determined by the overall request status.
                </Text>
            </div>
            <Timeline
                items={retryAttempts.map((attempt, index) => {
                    const error = attempt.error;
                    const timestamp = attempt.timestamp as string;
                    const duration = attempt.duration_ms as number;
                    const apiKeyId = attempt.api_key_id as string;

                    return {
                        color: token.colorError,
                        children: (
                            <Card
                                size="small"
                                style={{
                                    background: token.colorErrorBg,
                                    border: `1px solid ${token.colorErrorBorder}`,
                                }}
                            >
                                <Row gutter={[8, 8]}>
                                    <Col span={24}>
                                        <Space>
                                            <Text strong>
                                                Retry Attempt #
                                                {String(attempt.attempt_number || index + 1)}
                                            </Text>
                                            <Tag color="error">Failed</Tag>
                                            <Tag
                                                color="orange"
                                                style={{ fontSize: token.fontSizeSM }}
                                            >
                                                {new Date(timestamp).toLocaleString()}
                                            </Tag>
                                        </Space>
                                    </Col>
                                    <Col span={12}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: token.fontSizeSM }}
                                        >
                                            <ClockCircleOutlined /> Duration: {duration}ms
                                        </Text>
                                    </Col>
                                    <Col span={12}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: token.fontSizeSM }}
                                        >
                                            <BugOutlined /> Error: {String(error.type || 'Unknown')}
                                        </Text>
                                    </Col>
                                    {apiKeyId && (
                                        <Col span={24}>
                                            <Space>
                                                <KeyOutlined
                                                    style={{ color: token.colorPrimary }}
                                                />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: token.fontSizeSM }}
                                                >
                                                    API Key:{' '}
                                                    {apiKeyMap.get(apiKeyId) ||
                                                        `${apiKeyId.slice(0, 8)}...`}
                                                    {!apiKeyMap.get(apiKeyId) && apiKeysLoading && (
                                                        <Text
                                                            type="secondary"
                                                            style={{ fontSize: token.fontSizeSM }}
                                                        >
                                                            (loading...)
                                                        </Text>
                                                    )}
                                                </Text>
                                                {apiKeyMap.get(apiKeyId) && (
                                                    <Tag
                                                        color="blue"
                                                        style={{ fontSize: token.fontSizeSM }}
                                                    >
                                                        {apiKeyId.slice(0, 8)}...
                                                    </Tag>
                                                )}
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CopyOutlined />}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(apiKeyId);
                                                        notification.open({
                                                            type: 'success',
                                                            message: 'API Key ID Copied',
                                                            description:
                                                                'API Key ID has been copied to clipboard.',
                                                        });
                                                    }}
                                                />
                                            </Space>
                                        </Col>
                                    )}
                                    {error && (
                                        <Col span={24}>
                                            <Divider style={{ margin: '8px 0' }} />
                                            <Collapse
                                                size="small"
                                                items={[
                                                    {
                                                        key: 'error-summary',
                                                        label: (
                                                            <Space>
                                                                <Text
                                                                    strong
                                                                    style={{
                                                                        color: token.colorError,
                                                                    }}
                                                                >
                                                                    Error Summary
                                                                </Text>
                                                                <Tag
                                                                    color="error"
                                                                    style={{
                                                                        fontSize: token.fontSizeSM,
                                                                    }}
                                                                >
                                                                    {String(
                                                                        error.type ||
                                                                            'Unknown Error',
                                                                    )}
                                                                </Tag>
                                                                {error.status && (
                                                                    <Tag
                                                                        color="red"
                                                                        style={{
                                                                            fontSize:
                                                                                token.fontSizeSM,
                                                                        }}
                                                                    >
                                                                        Status:{' '}
                                                                        {String(error.status)}
                                                                    </Tag>
                                                                )}
                                                            </Space>
                                                        ),
                                                        children: (
                                                            <Space
                                                                direction="vertical"
                                                                size="small"
                                                                style={{ width: '100%' }}
                                                            >
                                                                {error.message && (
                                                                    <Text
                                                                        type="danger"
                                                                        style={{
                                                                            fontSize:
                                                                                token.fontSizeSM,
                                                                        }}
                                                                    >
                                                                        {String(error.message)}
                                                                    </Text>
                                                                )}
                                                            </Space>
                                                        ),
                                                    },
                                                    ...(attempt.provider_error
                                                        ? [
                                                              {
                                                                  key: 'provider-error',
                                                                  label: (
                                                                      <Space>
                                                                          <Text
                                                                              strong
                                                                              style={{
                                                                                  color: token.colorWarning,
                                                                              }}
                                                                          >
                                                                              Provider Error Details
                                                                          </Text>
                                                                          <Tag
                                                                              color="orange"
                                                                              style={{
                                                                                  fontSize:
                                                                                      token.fontSizeSM,
                                                                              }}
                                                                          >
                                                                              Status:{' '}
                                                                              {String(
                                                                                  attempt
                                                                                      .provider_error
                                                                                      ?.status ||
                                                                                      'N/A',
                                                                              )}
                                                                          </Tag>
                                                                      </Space>
                                                                  ),
                                                                  children: (
                                                                      <Space
                                                                          direction="vertical"
                                                                          size="small"
                                                                          style={{ width: '100%' }}
                                                                      >
                                                                          {attempt.provider_error
                                                                              ?.headers && (
                                                                              <div>
                                                                                  <Text
                                                                                      strong
                                                                                      style={{
                                                                                          fontSize:
                                                                                              token.fontSizeSM,
                                                                                      }}
                                                                                  >
                                                                                      Response
                                                                                      Headers:
                                                                                  </Text>
                                                                                  <pre
                                                                                      style={{
                                                                                          background:
                                                                                              token.colorFillQuaternary,
                                                                                          padding:
                                                                                              token.paddingXS,
                                                                                          borderRadius:
                                                                                              token.borderRadius,
                                                                                          fontSize:
                                                                                              token.fontSizeSM,
                                                                                          overflow:
                                                                                              'auto',
                                                                                          maxHeight:
                                                                                              '100px',
                                                                                          border: `1px solid ${token.colorBorder}`,
                                                                                          color: token.colorText,
                                                                                          whiteSpace:
                                                                                              'pre-wrap',
                                                                                          wordBreak:
                                                                                              'break-word',
                                                                                          overflowWrap:
                                                                                              'anywhere',
                                                                                          maxWidth:
                                                                                              '100%',
                                                                                          boxSizing:
                                                                                              'border-box',
                                                                                          marginTop:
                                                                                              token.marginXXS,
                                                                                      }}
                                                                                      className="gp-scrollable"
                                                                                  >
                                                                                      {JSON.stringify(
                                                                                          attempt
                                                                                              .provider_error
                                                                                              ?.headers,
                                                                                          null,
                                                                                          2,
                                                                                      )}
                                                                                  </pre>
                                                                              </div>
                                                                          )}
                                                                          {attempt.provider_error
                                                                              ?.raw_body && (
                                                                              <div>
                                                                                  <Text
                                                                                      strong
                                                                                      style={{
                                                                                          fontSize:
                                                                                              token.fontSizeSM,
                                                                                      }}
                                                                                  >
                                                                                      Raw Response
                                                                                      Body:
                                                                                  </Text>
                                                                                  <pre
                                                                                      style={{
                                                                                          background:
                                                                                              token.colorErrorBg,
                                                                                          padding:
                                                                                              token.paddingXS,
                                                                                          borderRadius:
                                                                                              token.borderRadius,
                                                                                          fontSize:
                                                                                              token.fontSizeSM,
                                                                                          overflow:
                                                                                              'auto',
                                                                                          maxHeight:
                                                                                              '120px',
                                                                                          border: `1px solid ${token.colorErrorBorder}`,
                                                                                          color: token.colorError,
                                                                                          whiteSpace:
                                                                                              'pre-wrap',
                                                                                          wordBreak:
                                                                                              'break-word',
                                                                                          overflowWrap:
                                                                                              'anywhere',
                                                                                          maxWidth:
                                                                                              '100%',
                                                                                          boxSizing:
                                                                                              'border-box',
                                                                                          marginTop:
                                                                                              token.marginXXS,
                                                                                      }}
                                                                                      className="gp-scrollable"
                                                                                  >
                                                                                      {String(
                                                                                          attempt
                                                                                              .provider_error
                                                                                              ?.raw_body,
                                                                                      )}
                                                                                  </pre>
                                                                              </div>
                                                                          )}
                                                                      </Space>
                                                                  ),
                                                              },
                                                          ]
                                                        : []),
                                                    {
                                                        key: 'complete-error',
                                                        label: (
                                                            <Space>
                                                                <Text
                                                                    strong
                                                                    style={{
                                                                        color: token.colorText,
                                                                    }}
                                                                >
                                                                    Complete Error Object
                                                                </Text>
                                                                <Tag
                                                                    color="default"
                                                                    style={{
                                                                        fontSize: token.fontSizeSM,
                                                                    }}
                                                                >
                                                                    JSON
                                                                </Tag>
                                                            </Space>
                                                        ),
                                                        children: (
                                                            <pre
                                                                style={{
                                                                    background:
                                                                        token.colorFillQuaternary,
                                                                    padding: token.paddingXS,
                                                                    borderRadius:
                                                                        token.borderRadius,
                                                                    fontSize: token.fontSizeSM,
                                                                    overflow: 'auto',
                                                                    maxHeight: '200px',
                                                                    border: `1px solid ${token.colorBorder}`,
                                                                    color: token.colorError,
                                                                    whiteSpace: 'pre-wrap',
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'anywhere',
                                                                    maxWidth: '100%',
                                                                    boxSizing: 'border-box',
                                                                }}
                                                                className="gp-scrollable"
                                                            >
                                                                {JSON.stringify(attempt, null, 2)}
                                                            </pre>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        </Col>
                                    )}
                                </Row>
                            </Card>
                        ),
                    };
                })}
            />
        </Card>
    );
}
