'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, useTable } from '@refinedev/antd';
import { useGo, useTranslation, type LiveModeProps } from '@refinedev/core';
import type { RequestLogsVolume, RequestLogsVolumeRange } from '@gemini-proxy/database';
import {
    Table,
    Space,
    Badge,
    Typography,
    Button,
    Select,
    Input,
    Popover,
    Empty,
    theme,
} from 'antd';
import {
    FilterOutlined,
    ReloadOutlined,
    DashboardOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    ClearOutlined,
} from '@ant-design/icons';
import { ConnectionStatusBadge } from '@/features/observability';
import { useRequestLogsVolume } from '@/hooks/useRpc';
import {
    resolveKeyLabel,
    LogsActivityChart,
    useRequestLogTableColumns,
    type ListRequestLog,
} from '@/features/request-logs';
import { REQUEST_LOG_LIST_SELECT } from '@/constants/request-log-select';
import {
    countActiveLogFilters,
    getFilterScalar,
    upsertContainsFilter,
    upsertEqFilter,
} from '@/features/request-logs/request-log-table-filter-utils';

const { useToken } = theme;
const { Text } = Typography;
const { Search } = Input;

/**
 * Request logs — OpenRouter-style metrics table with Ant Design column filters.
 */
export default function RequestLogsListPage() {
    const { token } = useToken();
    const go = useGo();
    const { translate, getLocale } = useTranslation();
    const [isLive, setIsLive] = useState(true);
    const [chartRange, setChartRange] = useState<RequestLogsVolumeRange>('7d');
    const [requestIdDraft, setRequestIdDraft] = useState('');
    const liveMode: NonNullable<LiveModeProps['liveMode']> = isLive ? 'auto' : 'off';

    const dateLocaleFormat =
        getLocale() === 'vi' ? 'DD/MM/YYYY HH:mm:ss' : 'YYYY-MM-DD HH:mm:ss';

    const { tableProps, filters, setFilters, tableQuery } = useTable<ListRequestLog>({
        syncWithLocation: true,
        resource: 'request_logs',
        liveMode,
        meta: {
            select: REQUEST_LOG_LIST_SELECT,
        },
        pagination: {
            pageSize: 20,
        },
        sorters: {
            initial: [{ field: 'created_at', order: 'desc' }],
        },
    });

    const volumeQuery = useRequestLogsVolume({ p_range: chartRange });
    const volumeData = volumeQuery.query.data?.data as RequestLogsVolume | undefined;

    useEffect(() => {
        setRequestIdDraft(String(getFilterScalar(filters, 'request_id') ?? ''));
    }, [filters]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const apiKeyId = params.get('api_key_id');
        const proxyKeyId = params.get('proxy_key_id');
        if (!apiKeyId && !proxyKeyId) {
            return;
        }
        let next = filters;
        if (proxyKeyId) {
            next = upsertEqFilter(next, 'proxy_key_id', proxyKeyId);
        }
        if (apiKeyId) {
            next = upsertEqFilter(next, 'api_key_id', apiKeyId);
        }
        setFilters(next, 'replace');
        // Deep-link key filters once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeFilterCount = countActiveLogFilters(filters);

    const handleViewDetails = useCallback(
        (record: ListRequestLog) => {
            go({
                to: {
                    resource: 'request_logs',
                    action: 'show',
                    id: record.id,
                },
            });
        },
        [go],
    );

    const formatRemovedKeyLabel = useCallback(
        (input: {
            joined?: { name: string; deleted_at: string | null } | null;
            id?: string | null;
        }) => {
            const resolved = resolveKeyLabel(input);
            if (resolved.isRemoved && resolved.label !== '—') {
                return translate('request_logs.identity.removedLabel', { name: resolved.label });
            }
            return resolved.label;
        },
        [translate],
    );

    const tableColumns = useRequestLogTableColumns({
        translate,
        filters,
        setFilters,
        onViewDetails: handleViewDetails,
        formatRemovedKeyLabel,
        dateLocaleFormat,
    });

    const handleClearFilters = useCallback(() => {
        setFilters([], 'replace');
        setRequestIdDraft('');
    }, [setFilters]);

    const handleRefreshAll = useCallback(() => {
        void tableQuery.refetch();
        void volumeQuery.query.refetch();
    }, [tableQuery, volumeQuery.query]);

    const toolbarFilters = useMemo(
        () => (
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                <Select
                    allowClear
                    placeholder={translate('request_logs.placeholders.selectFormat')}
                    style={{ minWidth: 120 }}
                    size="small"
                    value={getFilterScalar(filters, 'api_format') as string | undefined}
                    onChange={(value) => setFilters(upsertEqFilter(filters, 'api_format', value))}
                    options={[
                        { value: 'gemini', label: 'Gemini' },
                        { value: 'openai', label: 'OpenAI' },
                    ]}
                />
                <Select
                    allowClear
                    placeholder={translate('request_logs.placeholders.selectStream')}
                    style={{ minWidth: 130 }}
                    size="small"
                    value={getFilterScalar(filters, 'is_stream') as boolean | undefined}
                    onChange={(value) => setFilters(upsertEqFilter(filters, 'is_stream', value))}
                    options={[
                        {
                            value: true,
                            label: translate('request_logs.stream.streaming'),
                        },
                        {
                            value: false,
                            label: translate('request_logs.stream.nonStreaming'),
                        },
                    ]}
                />
                <Popover
                    trigger="click"
                    title={translate('request_logs.filters.advanced')}
                    content={
                        <Space direction="vertical" style={{ width: 280 }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {translate('request_logs.fields.requestId')}
                                </Text>
                                <Search
                                    allowClear
                                    placeholder={translate(
                                        'request_logs.placeholders.searchRequestId',
                                    )}
                                    value={requestIdDraft}
                                    onChange={(event) => setRequestIdDraft(event.target.value)}
                                    onSearch={(value) =>
                                        setFilters(
                                            upsertContainsFilter(filters, 'request_id', value),
                                        )
                                    }
                                    style={{ marginTop: 4 }}
                                />
                            </div>
                        </Space>
                    }
                >
                    <Button size="small" icon={<FilterOutlined />}>
                        {translate('request_logs.filters.advanced')}
                    </Button>
                </Popover>
                {activeFilterCount > 0 ? (
                    <Button
                        size="small"
                        type="text"
                        icon={<ClearOutlined />}
                        onClick={handleClearFilters}
                    >
                        {translate('request_logs.filters.clearAll', {
                            count: activeFilterCount,
                        })}
                    </Button>
                ) : null}
                {activeFilterCount > 0 ? (
                    <Badge
                        count={activeFilterCount}
                        style={{ backgroundColor: 'var(--gp-accent)' }}
                    />
                ) : null}
            </Space>
        ),
        [activeFilterCount, filters, handleClearFilters, requestIdDraft, setFilters, translate],
    );

    return (
        <List
            title={
                <Space>
                    <span>{translate('request_logs.titles.list')}</span>
                    {tableProps.pagination ? (
                        <Badge
                            count={tableProps.pagination.total}
                            showZero
                            color={token.colorPrimary}
                        />
                    ) : null}
                    <ConnectionStatusBadge paused={!isLive} />
                </Space>
            }
            headerButtons={
                <Space>
                    <Button icon={<DashboardOutlined />} onClick={() => go({ to: '/dashboard' })}>
                        {translate('dashboard.dashboard')}
                    </Button>
                    <Button
                        icon={isLive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={() => setIsLive((value) => !value)}
                    >
                        {isLive
                            ? translate('request_logs.live.pause')
                            : translate('request_logs.live.resume')}
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefreshAll}
                        loading={tableQuery.isFetching || volumeQuery.query.isFetching}
                    >
                        {translate('buttons.refresh')}
                    </Button>
                </Space>
            }
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                {isLive
                    ? translate('request_logs.live.onMessage')
                    : translate('request_logs.live.offMessage')}{' '}
                · {translate('request_logs.retentionShort')}
            </Text>

            <LogsActivityChart
                volume={volumeData ?? null}
                loading={volumeQuery.query.isLoading}
                range={chartRange}
                onRangeChange={setChartRange}
            />

            {toolbarFilters}

            <div className="gp-panel gp-logs-table-panel" style={{ padding: 0 }}>
                <Table<ListRequestLog>
                    {...tableProps}
                    rowKey="id"
                    size="small"
                    columns={tableColumns}
                    scroll={{ x: 1200 }}
                    sticky
                    showSorterTooltip={{ target: 'sorter-icon' }}
                    tableLayout="fixed"
                    onRow={(record) => ({
                        onClick: () => handleViewDetails(record),
                        style: { cursor: 'pointer' },
                    })}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={translate('request_logs.empty')}
                            />
                        ),
                        filterConfirm: translate('request_logs.filters.apply'),
                        filterReset: translate('request_logs.filters.reset'),
                    }}
                />
            </div>
        </List>
    );
}
