'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert } from 'antd';
import { useGo, useList, type LiveModeProps } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';
import {
    useDashboardStatistics,
    useRetryStatistics,
    useRequestLogsStatistics,
    useApiKeyStatistics,
    useProxyKeyStatistics,
    type DashboardStatistics,
    type RetryStatistics,
    type RequestLogsStatistics,
} from '@/hooks/useRpc';
import {
    ChartsRow,
    ConsoleToolbar,
    KeyHealthPanel,
    KpiStrip,
    LiveRequestFeed,
    buildConsoleKpiItems,
    type LiveFeedLog,
} from '@/features/observability';

const LIVE_FEED_SELECT =
    'id, request_id, api_format, is_stream, is_successful, performance_metrics, usage_metadata, created_at, api_key_id, proxy_key_id, api_keys(id,name,deleted_at), proxy_api_keys(id,name,deleted_at)';

const KEY_SELECT = 'id, name, is_active, success_count, failure_count, total_tokens';

type KeyHealthRow = Pick<
    Tables<'api_keys'>,
    'id' | 'name' | 'is_active' | 'success_count' | 'failure_count' | 'total_tokens'
>;

type LiveMode = NonNullable<LiveModeProps['liveMode']>;

export type ConsoleListsHandle = {
    refresh: () => void;
};

interface ConsoleListsProps {
    liveMode: LiveMode;
    onResourceLiveEvent: () => void;
    onRowClick: (log: LiveFeedLog) => void;
    onOpenApiKey: (id: string) => void;
    onOpenProxyKey: (id: string) => void;
}

/**
 * Resource lists + realtime subscriptions.
 * Remount via `key={liveMode}` so subscribe/unsubscribe tracks Live toggle
 * (Refine useResourceSubscription only rebinds on `enabled`, not liveMode).
 */
const ConsoleLists = forwardRef<ConsoleListsHandle, ConsoleListsProps>(
    function ConsoleLists(
        { liveMode, onResourceLiveEvent, onRowClick, onOpenApiKey, onOpenProxyKey },
        ref,
    ) {
        const liveFeedQuery = useList<LiveFeedLog>({
            resource: 'request_logs',
            pagination: { currentPage: 1, pageSize: 50 },
            sorters: [{ field: 'created_at', order: 'desc' }],
            meta: { select: LIVE_FEED_SELECT },
            liveMode,
            onLiveEvent: onResourceLiveEvent,
        });

        const apiKeysListQuery = useList<KeyHealthRow>({
            resource: 'api_keys',
            pagination: { currentPage: 1, pageSize: 50 },
            filters: [{ field: 'deleted_at', operator: 'null', value: true }],
            sorters: [{ field: 'failure_count', order: 'desc' }],
            meta: { select: KEY_SELECT },
            liveMode,
            onLiveEvent: onResourceLiveEvent,
        });

        const proxyKeysListQuery = useList<KeyHealthRow>({
            resource: 'proxy_api_keys',
            pagination: { currentPage: 1, pageSize: 50 },
            filters: [{ field: 'deleted_at', operator: 'null', value: true }],
            sorters: [{ field: 'failure_count', order: 'desc' }],
            meta: { select: KEY_SELECT },
            liveMode,
            onLiveEvent: onResourceLiveEvent,
        });

        useImperativeHandle(
            ref,
            () => ({
                refresh: () => {
                    void liveFeedQuery.query.refetch();
                    void apiKeysListQuery.query.refetch();
                    void proxyKeysListQuery.query.refetch();
                },
            }),
            [liveFeedQuery.query, apiKeysListQuery.query, proxyKeysListQuery.query],
        );

        return (
            <div className="gp-console-main">
                <LiveRequestFeed
                    logs={liveFeedQuery.result?.data ?? []}
                    loading={liveFeedQuery.query.isLoading}
                    onRowClick={onRowClick}
                />
                <KeyHealthPanel
                    apiKeys={apiKeysListQuery.result?.data ?? []}
                    proxyKeys={proxyKeysListQuery.result?.data ?? []}
                    loading={
                        apiKeysListQuery.query.isLoading || proxyKeysListQuery.query.isLoading
                    }
                    onOpenApiKey={onOpenApiKey}
                    onOpenProxyKey={onOpenProxyKey}
                />
            </div>
        );
    },
);

/**
 * Ops Console — Refine liveMode auto for tables; onLiveEvent for RPC KPIs/charts.
 */
export default function ConsolePage() {
    const go = useGo();
    const listsRef = useRef<ConsoleListsHandle>(null);
    const [selectedDays, setSelectedDays] = useState(7);
    const [isLive, setIsLive] = useState(true);
    const liveMode: LiveMode = isLive ? 'auto' : 'off';

    const dashboardQuery = useDashboardStatistics({ p_days_back: selectedDays });
    const retryQuery = useRetryStatistics({ p_days_back: selectedDays });
    const requestLogsQuery = useRequestLogsStatistics({ p_days_back: selectedDays });
    const apiKeyStatsQuery = useApiKeyStatistics();
    const proxyKeyStatsQuery = useProxyKeyStatistics();

    const {
        query: { isLoading: dashboardLoading, isError: dashboardError, refetch: refetchDashboard },
        result: dashboardResult,
    } = dashboardQuery;

    const {
        query: { isLoading: retryLoading, isError: retryError, refetch: refetchRetry },
        result: retryResult,
    } = retryQuery;

    const {
        query: {
            isLoading: requestLogsLoading,
            isError: requestLogsError,
            refetch: refetchRequestLogsStats,
        },
        result: requestLogsResult,
    } = requestLogsQuery;

    const {
        query: { isLoading: apiKeyLoading, isError: apiKeyError, refetch: refetchApiKeyStats },
    } = apiKeyStatsQuery;

    const {
        query: {
            isLoading: proxyKeyLoading,
            isError: proxyKeyError,
            refetch: refetchProxyKeyStats,
        },
    } = proxyKeyStatsQuery;

    const refetchRpcStats = useCallback(() => {
        void refetchDashboard();
        void refetchRetry();
        void refetchRequestLogsStats();
        void refetchApiKeyStats();
        void refetchProxyKeyStats();
    }, [
        refetchDashboard,
        refetchRetry,
        refetchRequestLogsStats,
        refetchApiKeyStats,
        refetchProxyKeyStats,
    ]);

    const handleRefresh = useCallback(() => {
        refetchRpcStats();
        listsRef.current?.refresh();
    }, [refetchRpcStats]);

    const handleRowClick = useCallback(
        (log: LiveFeedLog) => {
            go({
                to: {
                    resource: 'request_logs',
                    action: 'show',
                    id: log.id,
                },
            });
        },
        [go],
    );

    const handleOpenApiKey = useCallback(
        (id: string) => {
            go({
                to: {
                    resource: 'api_keys',
                    action: 'show',
                    id,
                },
            });
        },
        [go],
    );

    const handleOpenProxyKey = useCallback(
        (id: string) => {
            go({
                to: {
                    resource: 'proxy_api_keys',
                    action: 'show',
                    id,
                },
            });
        },
        [go],
    );

    const dashboardStats = dashboardResult?.data as DashboardStatistics | undefined;
    const retryStats = retryResult?.data as RetryStatistics | undefined;
    const requestLogsStats = requestLogsResult?.data as RequestLogsStatistics | undefined;
    const isStatsLoading =
        dashboardLoading || retryLoading || requestLogsLoading || apiKeyLoading || proxyKeyLoading;

    const kpiItems = useMemo(
        () =>
            buildConsoleKpiItems({
                totalRequests: dashboardStats?.total_requests,
                successRate: dashboardStats?.success_rate,
                avgResponseMs: dashboardStats?.avg_response_time_ms,
                totalTokens: dashboardStats?.total_tokens,
                activeKeys: dashboardStats?.active_keys,
                retryRate: retryStats?.retry_rate,
            }),
        [dashboardStats, retryStats],
    );

    return (
        <div>
            <ConsoleToolbar
                selectedDays={selectedDays}
                isLive={isLive}
                isRefreshing={isStatsLoading}
                onDaysChange={setSelectedDays}
                onRefresh={handleRefresh}
                onToggleLive={() => setIsLive((value) => !value)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(dashboardError ||
                    retryError ||
                    requestLogsError ||
                    apiKeyError ||
                    proxyKeyError) && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Some statistics failed to load"
                        description="Live feed may still work. Use Refresh to retry failed RPCs."
                    />
                )}

                <KpiStrip items={kpiItems} loading={dashboardLoading || retryLoading} />

                <ChartsRow
                    requestsByHour={requestLogsStats?.requests_by_hour}
                    requestsByFormat={requestLogsStats?.requests_by_format}
                    loading={requestLogsLoading}
                />

                <ConsoleLists
                    key={liveMode}
                    ref={listsRef}
                    liveMode={liveMode}
                    onResourceLiveEvent={refetchRpcStats}
                    onRowClick={handleRowClick}
                    onOpenApiKey={handleOpenApiKey}
                    onOpenProxyKey={handleOpenProxyKey}
                />
            </div>
        </div>
    );
}
