'use client';

import React from 'react';
import { Card, Row, Col, Typography, Tag, Space, Button, Tooltip, Collapse, theme } from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    BugOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
    ApiOutlined,
    CopyOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay } from '@/components/common';
import { useNotification } from '@refinedev/core';

const { Text } = Typography;
const { Panel } = Collapse;
const { useToken } = theme;

type RequestLog = Tables<'request_logs'>;

interface RequestLogDetailsProps {
    requestLog: RequestLog;
    isModal?: boolean;
}

/**
 * Comprehensive Request Log Details Component
 * Reusable component for both modal and full page views
 */
export const RequestLogDetails: React.FC<RequestLogDetailsProps> = ({
    requestLog,
    isModal = false,
}) => {
    const { token } = useToken();
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
    const retryAttempts = requestLog.retry_attempts as Array<Record<string, unknown>>;

    return (
        <div
            style={{
                height: isModal ? 'calc(90vh - 120px)' : 'auto',
                overflow: isModal ? 'auto' : 'visible',
                padding: isModal ? '0' : '0',
            }}
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Status Overview */}
                <Card
                    style={{
                        borderRadius: token.borderRadiusLG,
                        boxShadow: token.boxShadowTertiary,
                        background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
                    }}
                >
                    <Row gutter={[token.marginLG, token.marginMD]}>
                        <Col xs={24} sm={6}>
                            <Space direction="vertical" size="small">
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
                                >
                                    {requestLog.is_successful ? 'Success' : 'Failed'}
                                </Tag>
                            </Space>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Space direction="vertical" size="small">
                                <Text strong style={{ color: token.colorText }}>
                                    API Format
                                </Text>
                                <Tag color="processing">{requestLog.api_format}</Tag>
                            </Space>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Space direction="vertical" size="small">
                                <Text strong style={{ color: token.colorText }}>
                                    Stream
                                </Text>
                                <Tag color={requestLog.is_stream ? 'success' : 'default'}>
                                    {requestLog.is_stream ? 'Yes' : 'No'}
                                </Tag>
                            </Space>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Space direction="vertical" size="small">
                                <Text strong style={{ color: token.colorText }}>
                                    Created At
                                </Text>
                                <DateTimeDisplay dateString={requestLog.created_at} />
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Request & Response Details */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <RequestDetailsCard
                            requestLog={requestLog}
                            requestData={requestData}
                            onDownload={handleDownloadJson}
                            isModal={isModal}
                        />
                    </Col>
                    <Col xs={24} lg={12}>
                        <ResponseDetailsCard
                            requestLog={requestLog}
                            responseData={responseData}
                            errorDetails={errorDetails}
                            onDownload={handleDownloadJson}
                            isModal={isModal}
                        />
                    </Col>
                </Row>

                {/* Performance & Usage Metrics */}
                <PerformanceMetricsCard
                    performanceMetrics={performanceMetrics}
                    usageMetadata={usageMetadata}
                    onCopy={handleCopyToClipboard}
                    onDownload={handleDownloadJson}
                    isModal={isModal}
                />

                {/* Retry Attempts Timeline */}
                <RetryAttemptsCard retryAttempts={retryAttempts} isModal={isModal} />
            </Space>
        </div>
    );
};

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
                    <span style={{ color: token.colorText }}>Request Details</span>
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
                <div>
                    <Text strong style={{ color: token.colorText }}>
                        Request ID:
                    </Text>
                    <br />
                    <Text code style={{ color: token.colorTextSecondary }}>
                        {requestLog.request_id}
                    </Text>
                </div>

                <div>
                    <Text strong style={{ color: token.colorText }}>
                        API Format:
                    </Text>
                    <br />
                    <Tag color="processing">{requestLog.api_format}</Tag>
                </div>

                <div>
                    <Text strong style={{ color: token.colorText }}>
                        Stream:
                    </Text>
                    <br />
                    <Tag color={requestLog.is_stream ? 'success' : 'default'}>
                        {requestLog.is_stream ? 'Yes' : 'No'}
                    </Tag>
                </div>

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
                                maxHeight: isModal ? '150px' : '250px',
                                border: `1px solid ${token.colorBorder}`,
                                color: token.colorText,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
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
                    <span style={{ color: token.colorText }}>Response Details</span>
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
                                        maxHeight: isModal ? '330px' : '430px',
                                        border: `1px solid ${token.colorBorder}`,
                                        color: token.colorText,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
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
                                        maxHeight: isModal ? '150px' : '250px',
                                        border: `1px solid ${token.colorErrorBorder}`,
                                        color: token.colorError,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
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
 * Performance Metrics Card Component
 */
function PerformanceMetricsCard({
    performanceMetrics,
    usageMetadata,
    onCopy,
    onDownload,
    isModal,
}: {
    performanceMetrics: Record<string, unknown>;
    usageMetadata: Record<string, unknown>;
    onCopy: (text: string, label: string) => void;
    onDownload: (data: unknown, filename: string) => void;
    isModal: boolean;
}) {
    const { token } = useToken();

    return (
        <Card
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: token.colorPrimary }} />
                    <span style={{ color: token.colorText }}>Performance & Usage Metrics</span>
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
        >
            <Collapse
                defaultActiveKey={isModal ? ['performance'] : ['performance', 'usage']}
                size={isModal ? 'small' : 'middle'}
            >
                <Panel header="Performance Metrics" key="performance">
                    {performanceMetrics ? (
                        <div>
                            <Space style={{ marginBottom: '8px' }}>
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
                            <pre
                                style={{
                                    background: token.colorFillQuaternary,
                                    padding: isModal ? token.paddingXS : token.paddingSM,
                                    borderRadius: token.borderRadius,
                                    fontSize: isModal ? token.fontSizeSM : token.fontSize,
                                    overflow: 'auto',
                                    maxHeight: isModal ? '120px' : '180px',
                                    border: `1px solid ${token.colorBorder}`,
                                    color: token.colorText,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {JSON.stringify(performanceMetrics, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <Text type="secondary">No performance data</Text>
                    )}
                </Panel>

                <Panel header="Usage Metadata" key="usage">
                    {usageMetadata ? (
                        <div>
                            <Space style={{ marginBottom: '8px' }}>
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
                            <pre
                                style={{
                                    background: token.colorFillQuaternary,
                                    padding: isModal ? token.paddingXS : token.paddingSM,
                                    borderRadius: token.borderRadius,
                                    fontSize: isModal ? token.fontSizeSM : token.fontSize,
                                    overflow: 'auto',
                                    maxHeight: isModal ? '120px' : '180px',
                                    border: `1px solid ${token.colorBorder}`,
                                    color: token.colorText,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {JSON.stringify(usageMetadata, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <Text type="secondary">No usage data</Text>
                    )}
                </Panel>
            </Collapse>
        </Card>
    );
}

/**
 * Retry Attempts Card Component
 */
function RetryAttemptsCard({
    retryAttempts,
    isModal,
}: {
    retryAttempts: Array<Record<string, unknown>>;
    isModal: boolean;
}) {
    const { token } = useToken();

    return (
        <Card
            title={
                <Space>
                    <BugOutlined style={{ color: token.colorPrimary }} />
                    <span style={{ color: token.colorText }}>Retry Attempts Timeline</span>
                </Space>
            }
            size="small"
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
            }}
        >
            {retryAttempts && retryAttempts.length > 0 ? (
                <div
                    style={{
                        maxHeight: isModal ? '200px' : '400px',
                        overflow: 'auto',
                        padding: token.paddingXXS,
                        background: token.colorFillQuaternary,
                        borderRadius: token.borderRadius,
                    }}
                >
                    <Space
                        direction="vertical"
                        size={isModal ? 'small' : 'middle'}
                        style={{ width: '100%' }}
                    >
                        {retryAttempts.map((attempt, index) => (
                            <div
                                key={index}
                                style={{
                                    border: `1px solid ${token.colorBorder}`,
                                    borderRadius: token.borderRadius,
                                    padding: isModal ? token.paddingXS : token.paddingSM,
                                    background:
                                        index === retryAttempts.length - 1
                                            ? token.colorSuccessBg
                                            : token.colorFillQuaternary,
                                }}
                            >
                                <Row gutter={[token.marginXS, token.marginXXS]}>
                                    <Col xs={24} sm={6}>
                                        <Text strong style={{ color: token.colorText }}>
                                            Attempt #{index + 1}
                                        </Text>
                                    </Col>
                                    <Col xs={24} sm={6}>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: isModal
                                                    ? token.fontSizeSM
                                                    : token.fontSize,
                                                color: token.colorTextSecondary,
                                            }}
                                        >
                                            {attempt.timestamp
                                                ? new Date(
                                                      attempt.timestamp as string,
                                                  ).toLocaleString()
                                                : 'Unknown time'}
                                        </Text>
                                    </Col>
                                    <Col xs={24} sm={6}>
                                        <Tag color={attempt.success ? 'success' : 'error'}>
                                            {attempt.success ? 'Success' : 'Failed'}
                                        </Tag>
                                    </Col>
                                    <Col xs={24} sm={6}>
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: isModal
                                                    ? token.fontSizeSM
                                                    : token.fontSize,
                                                color: token.colorTextSecondary,
                                            }}
                                        >
                                            Duration:{' '}
                                            {attempt.duration ? `${attempt.duration}ms` : 'Unknown'}
                                        </Text>
                                    </Col>
                                </Row>
                                {attempt.error && (
                                    <div
                                        style={{
                                            marginTop: isModal ? token.marginXXS : token.marginXS,
                                        }}
                                    >
                                        <Text
                                            strong
                                            style={{
                                                fontSize: isModal
                                                    ? token.fontSizeSM
                                                    : token.fontSize,
                                                color: token.colorText,
                                            }}
                                        >
                                            Error:
                                        </Text>
                                        <br />
                                        <Text
                                            type="danger"
                                            style={{
                                                fontSize: isModal
                                                    ? token.fontSizeSM
                                                    : token.fontSize,
                                                color: token.colorError,
                                            }}
                                        >
                                            {typeof attempt.error === 'string'
                                                ? attempt.error
                                                : JSON.stringify(attempt.error)}
                                        </Text>
                                    </div>
                                )}
                            </div>
                        ))}
                    </Space>
                </div>
            ) : (
                <Text type="secondary">No retry attempts</Text>
            )}
        </Card>
    );
}
