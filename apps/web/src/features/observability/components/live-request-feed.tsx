import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Spin, Tag, Tooltip } from 'antd';
import type { Tables } from '@gemini-proxy/database';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCount,
    getRequestType,
} from '@/utils/table-helpers';

export type LiveFeedLog = Pick<
    Tables<'request_logs'>,
    | 'id'
    | 'request_id'
    | 'api_format'
    | 'is_stream'
    | 'is_successful'
    | 'performance_metrics'
    | 'usage_metadata'
    | 'created_at'
    | 'api_key_id'
    | 'proxy_key_id'
> & {
    api_keys?: { id: string; name: string; deleted_at: string | null } | null;
    proxy_api_keys?: { id: string; name: string; deleted_at: string | null } | null;
};

interface LiveRequestFeedProps {
    logs: LiveFeedLog[];
    loading?: boolean;
    onRowClick?: (log: LiveFeedLog) => void;
}

function formatClock(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function shortModel(model: string | null): string {
    if (!model) {
        return '—';
    }
    // Drop common vendor prefixes for scan density
    return model.replace(/^models\//, '');
}

function keyLabel(
    joined: { name: string; deleted_at: string | null } | null | undefined,
    fallbackId: string | null,
): string {
    if (joined?.name) {
        return joined.deleted_at ? `${joined.name} (removed)` : joined.name;
    }
    if (fallbackId) {
        return `${fallbackId.slice(0, 8)}…`;
    }
    return '—';
}

/**
 * Presentational live feed — model + key names over opaque IDs.
 */
export function LiveRequestFeed({ logs, loading = false, onRowClick }: LiveRequestFeedProps) {
    const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
    const previousIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const nextIds = new Set(logs.map((log) => log.id));
        const newcomers = logs
            .filter((log) => previousIds.current.size > 0 && !previousIds.current.has(log.id))
            .map((log) => log.id);
        previousIds.current = nextIds;
        if (newcomers.length === 0) {
            return;
        }
        setHighlightedIds(new Set(newcomers));
        const timer = window.setTimeout(() => setHighlightedIds(new Set()), 1200);
        return () => window.clearTimeout(timer);
    }, [logs]);

    const rows = useMemo(() => logs, [logs]);

    return (
        <div className="gp-panel-sunken">
            <div style={{ padding: '12px 12px 0' }}>
                <div className="gp-section-title">Live request feed</div>
            </div>
            <div className="gp-live-feed gp-scrollable">
                <div className="gp-live-feed-header">
                    <span>Time</span>
                    <span>Status</span>
                    <span>Model</span>
                    <span>Key</span>
                    <span>Latency</span>
                    <span>Tokens</span>
                </div>
                {loading && rows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin />
                    </div>
                ) : rows.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Waiting for requests"
                        style={{ padding: 32 }}
                    />
                ) : (
                    rows.map((log) => {
                        const performance = extractPerformanceMetrics(log.performance_metrics);
                        const usage = extractUsageMetadata(log.usage_metadata);
                        const status = log.is_successful ? 'ok' : 'fail';
                        const formatLabel = getRequestType(log.api_format);
                        const formatLine = log.is_stream
                            ? `${formatLabel} · stream`
                            : formatLabel;
                        const proxyName = keyLabel(log.proxy_api_keys, log.proxy_key_id);
                        const apiName = keyLabel(log.api_keys, log.api_key_id);
                        const model = shortModel(usage.model);
                        const tokenPrimary =
                            usage.total_tokens > 0 ? formatTokenCount(usage.total_tokens) : '—';
                        const tokenSecondary =
                            usage.total_tokens > 0
                                ? `${formatTokenCount(usage.prompt_tokens)} / ${formatTokenCount(usage.completion_tokens)}`
                                : null;

                        return (
                            <div
                                key={log.id}
                                className="gp-live-row"
                                data-status={status}
                                data-highlight={highlightedIds.has(log.id) ? 'true' : 'false'}
                                onClick={() => onRowClick?.(log)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        onRowClick?.(log);
                                    }
                                }}
                            >
                                <Tooltip title={new Date(log.created_at).toISOString()}>
                                    <span className="gp-live-mono">
                                        {formatClock(log.created_at)}
                                    </span>
                                </Tooltip>
                                <Tag
                                    color={log.is_successful ? 'success' : 'error'}
                                    style={{ margin: 0, borderRadius: 2 }}
                                >
                                    {log.is_successful ? 'OK' : 'Fail'}
                                </Tag>
                                <Tooltip title={`Request ${log.request_id}`}>
                                    <span className="gp-live-cell">
                                        <span className="gp-live-primary">{model}</span>
                                        <span className="gp-live-secondary">{formatLine}</span>
                                    </span>
                                </Tooltip>
                                <Tooltip title={`Request ${log.request_id}`}>
                                    <span className="gp-live-cell">
                                        <span className="gp-live-primary">{proxyName}</span>
                                        <span className="gp-live-secondary">{apiName}</span>
                                    </span>
                                </Tooltip>
                                <span className="gp-live-mono">
                                    {performance.duration_ms > 0
                                        ? formatDuration(performance.duration_ms)
                                        : '—'}
                                </span>
                                <span className="gp-live-cell gp-live-mono">
                                    <span className="gp-live-primary">{tokenPrimary}</span>
                                    {tokenSecondary ? (
                                        <span className="gp-live-secondary">{tokenSecondary}</span>
                                    ) : null}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
