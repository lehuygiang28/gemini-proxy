'use client';

import React, { useMemo } from 'react';
import {
    Row,
    Col,
    Typography,
    Tag,
    Space,
    Button,
    Tooltip,
    theme,
    Timeline,
    Collapse,
    Badge,
} from 'antd';
import Link from 'next/link';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    BugOutlined,
    CopyOutlined,
    DownloadOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay, JsonTreeViewer } from '@/components/common';
import { useNotification, useMany } from '@refinedev/core';
import { RequestLog, RetryAttempt } from '../types/request-log.types';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCount,
} from '@/utils/table-helpers';
import { KeyIdentityCard, UserIdentityCard, formatKeyLabel } from '@/features/request-logs';

const { Text } = Typography;
const { useToken } = theme;

interface RequestLogDetailsProps {
    requestLog: RequestLog;
    isModal?: boolean;
}

/**
 * Proxy observability detail: overview → identity → metrics → payloads → retries.
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

    const requestData = (requestLog.request_data as Record<string, unknown>) || {};
    const responseData = (requestLog.response_data as Record<string, unknown>) || {};
    const errorDetails = (requestLog.error_details as Record<string, unknown>) || {};
    const performanceMetrics = extractPerformanceMetrics(requestLog.performance_metrics);
    const usageMetadata = extractUsageMetadata(requestLog.usage_metadata);
    const retryAttempts = (requestLog.retry_attempts as unknown as RetryAttempt[]) || [];
    const responsePanelData = requestLog.is_successful
        ? responseData
        : {
              ...errorDetails,
              ...(responseData.error_body !== undefined
                  ? { error_body: responseData.error_body }
                  : {}),
              ...(responseData.body !== undefined ? { body: responseData.body } : {}),
          };

    return (
        <div
            style={{
                height: isModal ? 'calc(90vh - 120px)' : 'auto',
                overflowY: isModal ? 'auto' : 'visible',
                overflowX: 'hidden',
                width: '100%',
            }}
            className={isModal ? 'gp-scrollable' : undefined}
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <OverviewStrip
                    requestLog={requestLog}
                    onCopy={handleCopyToClipboard}
                />

                <Row gutter={[12, 12]}>
                    <Col xs={24} lg={8}>
                        <UserIdentityCard
                            userId={requestLog.user_id}
                            onCopy={handleCopyToClipboard}
                        />
                    </Col>
                    <Col xs={24} lg={8}>
                        <KeyIdentityCard
                            kind="proxy"
                            keyId={requestLog.proxy_key_id}
                            joined={requestLog.proxy_api_keys}
                            onCopy={handleCopyToClipboard}
                        />
                    </Col>
                    <Col xs={24} lg={8}>
                        <KeyIdentityCard
                            kind="api"
                            keyId={requestLog.api_key_id}
                            joined={requestLog.api_keys}
                            onCopy={handleCopyToClipboard}
                        />
                    </Col>
                </Row>

                <MetricsStrip
                    durationMs={performanceMetrics.duration_ms ?? 0}
                    totalMs={performanceMetrics.total_response_time_ms ?? 0}
                    attempts={performanceMetrics.attempt_count ?? 1}
                    totalTokens={usageMetadata.total_tokens ?? 0}
                    promptTokens={usageMetadata.prompt_tokens ?? 0}
                    completionTokens={usageMetadata.completion_tokens ?? 0}
                    model={usageMetadata.model}
                    isSuccessful={requestLog.is_successful}
                />

                <Row gutter={[12, 12]}>
                    <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                        <PayloadPanel
                            title="Request"
                            data={requestData}
                            filename={`request-${requestLog.request_id}.json`}
                            onCopy={handleCopyToClipboard}
                            onDownload={handleDownloadJson}
                        />
                    </Col>
                    <Col xs={24} lg={12} style={{ minWidth: 0 }}>
                        <PayloadPanel
                            title="Response"
                            data={responsePanelData}
                            filename={
                                requestLog.is_successful
                                    ? `response-${requestLog.request_id}.json`
                                    : `error-${requestLog.request_id}.json`
                            }
                            isError={!requestLog.is_successful}
                            emptyLabel={
                                requestLog.is_successful ? 'No response data' : 'No error details'
                            }
                            onCopy={handleCopyToClipboard}
                            onDownload={handleDownloadJson}
                        />
                    </Col>
                </Row>

                <RetryTimeline retryAttempts={retryAttempts} />
            </Space>
        </div>
    );
};

function OverviewStrip({
    requestLog,
    onCopy,
}: {
    requestLog: RequestLog;
    onCopy: (text: string, label: string) => void;
}) {
    return (
        <div className="gp-panel" style={{ padding: '12px 16px' }}>
            <div className="gp-section-title">Overview</div>
            <Row gutter={[16, 12]} align="middle">
                <Col xs={12} sm={6}>
                    <Text style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>Status</Text>
                    <div>
                        <Tag
                            color={requestLog.is_successful ? 'success' : 'error'}
                            icon={
                                requestLog.is_successful ? (
                                    <CheckCircleOutlined />
                                ) : (
                                    <ExclamationCircleOutlined />
                                )
                            }
                            style={{ borderRadius: 2 }}
                        >
                            {requestLog.is_successful ? 'Success' : 'Failed'}
                        </Tag>
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <Text style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>Format</Text>
                    <div>
                        <Tag color="processing" style={{ borderRadius: 2 }}>
                            {requestLog.api_format?.toUpperCase()}
                        </Tag>
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <Text style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>Stream</Text>
                    <div style={{ color: 'var(--gp-text)' }}>
                        {requestLog.is_stream ? 'Streaming' : 'Non-streaming'}
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <Text style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>Created</Text>
                    <div>
                        <DateTimeDisplay dateString={requestLog.created_at} />
                    </div>
                </Col>
                <Col span={24}>
                    <Space size={4}>
                        <Text style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>
                            Request ID
                        </Text>
                        <Text className="gp-live-mono" style={{ fontSize: 12, color: 'var(--gp-text-muted)' }}>
                            {requestLog.request_id}
                        </Text>
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => onCopy(requestLog.request_id, 'Request ID')}
                            aria-label="Copy request ID"
                        />
                    </Space>
                </Col>
            </Row>
        </div>
    );
}

function MetricsStrip({
    durationMs,
    totalMs,
    attempts,
    totalTokens,
    promptTokens,
    completionTokens,
    model,
    isSuccessful,
}: {
    durationMs: number;
    totalMs: number;
    attempts: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    model?: string;
    isSuccessful: boolean;
}) {
    return (
        <div>
            <div className="gp-section-title" style={{ marginBottom: 8 }}>
                Performance & usage
            </div>
            <div className="gp-kpi-strip">
                <div className="gp-kpi-cell">
                    <div className="gp-kpi-label">API duration</div>
                    <div className="gp-kpi-value" style={{ fontSize: 18 }}>
                        {formatDuration(durationMs)}
                    </div>
                </div>
                <div className="gp-kpi-cell">
                    <div className="gp-kpi-label">Total time</div>
                    <div
                        className="gp-kpi-value"
                        style={{
                            fontSize: 18,
                            color: isSuccessful ? 'var(--gp-success)' : 'var(--gp-text)',
                        }}
                    >
                        {formatDuration(totalMs)}
                    </div>
                </div>
                <div className="gp-kpi-cell">
                    <div className="gp-kpi-label">Attempts</div>
                    <div
                        className="gp-kpi-value"
                        style={{
                            fontSize: 18,
                            color: attempts > 1 ? 'var(--gp-warn)' : 'var(--gp-text)',
                        }}
                    >
                        {attempts}
                    </div>
                </div>
                <div className="gp-kpi-cell">
                    <div className="gp-kpi-label">Total tokens</div>
                    <div className="gp-kpi-value" style={{ fontSize: 18, color: 'var(--gp-accent)' }}>
                        {formatTokenCount(totalTokens)}
                    </div>
                </div>
                <div className="gp-kpi-cell">
                    <div className="gp-kpi-label">Prompt / completion</div>
                    <div className="gp-kpi-value" style={{ fontSize: 16 }}>
                        {formatTokenCount(promptTokens)} / {formatTokenCount(completionTokens)}
                    </div>
                </div>
                {model ? (
                    <div className="gp-kpi-cell">
                        <div className="gp-kpi-label">Model</div>
                        <Tag color="blue" style={{ borderRadius: 2, marginTop: 4 }}>
                            {model}
                        </Tag>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function extractPayloadBody(data: Record<string, unknown>): {
    body: unknown;
    truncated: boolean;
    hasBody: boolean;
} {
    if (data.body !== undefined && data.body !== null) {
        return {
            body: data.body,
            truncated: Boolean(data.body_truncated),
            hasBody: true,
        };
    }
    if (data.error_body !== undefined && data.error_body !== null) {
        return { body: data.error_body, truncated: false, hasBody: true };
    }
    if (data.provider_raw_body !== undefined && data.provider_raw_body !== null) {
        return { body: data.provider_raw_body, truncated: false, hasBody: true };
    }
    return { body: null, truncated: false, hasBody: false };
}

const PAYLOAD_BODY_KEYS = new Set([
    'body',
    'body_truncated',
    'body_chars',
    'error_body',
    'provider_raw_body',
]);

function splitPayloadMeta(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => !PAYLOAD_BODY_KEYS.has(key)),
    );
}

function payloadSizeHint(value: unknown): number {
    try {
        return JSON.stringify(value)?.length ?? 0;
    } catch {
        return 0;
    }
}

function PayloadPanel({
    title,
    data,
    filename,
    isError = false,
    emptyLabel = 'No data',
    onCopy,
    onDownload,
}: {
    title: string;
    data: Record<string, unknown>;
    filename: string;
    isError?: boolean;
    emptyLabel?: string;
    onCopy: (text: string, label: string) => void;
    onDownload: (data: unknown, filename: string) => void;
}) {
    const hasData = data && Object.keys(data).length > 0;
    const { body, truncated, hasBody } = extractPayloadBody(data);
    const headersMeta = splitPayloadMeta(data);
    const expandBody = hasBody && payloadSizeHint(body) < 2048;
    const fullJson = hasData ? JSON.stringify(data, null, 2) : '';

    return (
        <div className="gp-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div
                style={{
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--gp-border)',
                }}
            >
                <Space>
                    <span style={{ fontWeight: 500 }}>{title}</span>
                    {isError ? (
                        <Tag color="error" style={{ borderRadius: 2 }}>
                            Error
                        </Tag>
                    ) : null}
                    {hasBody ? (
                        <Tag color="processing" style={{ borderRadius: 2 }}>
                            Body captured{truncated ? ' · truncated' : ''}
                        </Tag>
                    ) : (
                        <Tag style={{ borderRadius: 2 }}>Headers only</Tag>
                    )}
                </Space>
                {hasData ? (
                    <Space>
                        <Tooltip title={`Copy ${title}`}>
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => onCopy(fullJson, title)}
                            />
                        </Tooltip>
                        <Tooltip title={`Download ${title}`}>
                            <Button
                                type="text"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => onDownload(data, filename)}
                            />
                        </Tooltip>
                    </Space>
                ) : null}
            </div>
            {!hasData ? (
                <Text type="secondary" style={{ padding: 12, display: 'block' }}>
                    {emptyLabel}
                </Text>
            ) : (
                <Collapse
                    ghost
                    defaultActiveKey={expandBody ? ['body', 'headers'] : ['headers']}
                    items={[
                        {
                            key: 'body',
                            label: 'Body',
                            children: hasBody ? (
                                <div
                                    style={{
                                        padding: '0 8px 8px',
                                        borderLeft: isError
                                            ? '3px solid var(--gp-error)'
                                            : undefined,
                                    }}
                                >
                                    <JsonTreeViewer
                                        value={body}
                                        collapsed={expandBody ? 2 : 1}
                                        maxHeight={320}
                                    />
                                </div>
                            ) : (
                                <Text
                                    type="secondary"
                                    style={{ padding: '0 12px 12px', display: 'block', fontSize: 12 }}
                                >
                                    Body not stored.{' '}
                                    <Link href="/settings">Enable in Settings → Observability</Link>
                                    .
                                </Text>
                            ),
                        },
                        {
                            key: 'headers',
                            label: 'Headers & meta',
                            children: (
                                <div style={{ padding: '0 8px 8px' }}>
                                    <JsonTreeViewer
                                        value={headersMeta}
                                        collapsed={1}
                                        maxHeight={220}
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            )}
        </div>
    );
}

function RetryTimeline({ retryAttempts }: { retryAttempts: RetryAttempt[] }) {
    const { token } = useToken();
    const apiKeyIds = useMemo(
        () =>
            [
                ...new Set(
                    retryAttempts
                        .map((attempt) => attempt.api_key_id)
                        .filter((id): id is string => Boolean(id)),
                ),
            ],
        [retryAttempts],
    );

    const {
        result: apiKeysData,
        query: { isLoading: apiKeysLoading },
    } = useMany<Tables<'api_keys'>>({
        resource: 'api_keys',
        ids: apiKeyIds,
        queryOptions: { enabled: apiKeyIds.length > 0 },
    });

    const apiKeyMap = useMemo(() => {
        const map = new Map<string, string>();
        apiKeysData?.data?.forEach((apiKey) => {
            map.set(apiKey.id, apiKey.name);
        });
        return map;
    }, [apiKeysData?.data]);

    if (!retryAttempts || retryAttempts.length === 0) {
        return null;
    }

    const totalDuration = retryAttempts.reduce(
        (sum, attempt) => sum + (attempt.duration_ms || 0),
        0,
    );

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
                <Space>
                    <BugOutlined style={{ color: 'var(--gp-accent)' }} />
                    <span className="gp-section-title" style={{ margin: 0 }}>
                        Retry timeline
                    </span>
                    <Badge count={retryAttempts.length} color={token.colorWarning} />
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {retryAttempts.length} retries · {totalDuration}ms
                </Text>
            </Space>
            <div
                style={{
                    marginBottom: 12,
                    padding: 8,
                    background: 'var(--gp-bg-sunken)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--gp-text-secondary)',
                }}
            >
                <InfoCircleOutlined style={{ marginRight: 6 }} />
                All entries below are failed attempts. Final outcome is the request status above.
            </div>
            {apiKeysLoading ? (
                <Text type="secondary">Loading API key names…</Text>
            ) : (
                <Timeline
                    items={retryAttempts.map((attempt, index) => {
                        const joinedName = attempt.api_key_id
                            ? apiKeyMap.get(attempt.api_key_id)
                            : undefined;
                        const displayName = formatKeyLabel({
                            joined: joinedName
                                ? { name: joinedName, deleted_at: null }
                                : null,
                            embeddedName: attempt.api_key_name,
                            id: attempt.api_key_id,
                        });

                        return {
                            color: token.colorError,
                            children: (
                                <div className="gp-panel-sunken" style={{ padding: 10 }}>
                                    <Space wrap>
                                        <Text strong>
                                            Attempt #{attempt.attempt_number || index + 1}
                                        </Text>
                                        <Tag color="blue" style={{ borderRadius: 2 }}>
                                            {displayName}
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {attempt.duration_ms}ms
                                        </Text>
                                        {attempt.error?.type ? (
                                            <Tag color="error" style={{ borderRadius: 2 }}>
                                                {attempt.error.type}
                                            </Tag>
                                        ) : null}
                                    </Space>
                                    {attempt.error?.message ? (
                                        <div
                                            style={{
                                                marginTop: 6,
                                                fontSize: 12,
                                                color: 'var(--gp-text-secondary)',
                                            }}
                                        >
                                            {attempt.error.message}
                                        </div>
                                    ) : null}
                                </div>
                            ),
                        };
                    })}
                />
            )}
        </div>
    );
}
