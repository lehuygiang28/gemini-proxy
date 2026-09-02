'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { List, useTable } from '@refinedev/antd';
import { useGo, useTranslation, type HttpError, type LiveModeProps } from '@refinedev/core';
import type { RequestLogsVolume, RequestLogsVolumeRange } from '@gemini-proxy/database';
import {
    Table,
    Space,
    Badge,
    Typography,
    Button,
    Input,
    Popover,
    Empty,
    Form,
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
import { useSearchParams } from 'next/navigation';
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
    buildRequestLogDeepLinkInitialFilters,
    buildRequestLogDeepLinkInitialValues,
    buildRequestLogSearchFilters,
    countActiveLogFilters,
    mapFiltersToSearchFormValues,
    type RequestLogSearch,
} from '@/features/request-logs/request-log-table-filter-utils';

const { useToken } = theme;
const { Text } = Typography;
const { Search } = Input;

/**
 * Request logs — OpenRouter-style metrics table with Refine onSearch filters.
 */
export default function RequestLogsListPage() {
    const { token } = useToken();
    const go = useGo();
    const searchParams = useSearchParams();
    const { translate, getLocale } = useTranslation();
    const [isLive, setIsLive] = useState(true);
    const [chartRange, setChartRange] = useState<RequestLogsVolumeRange>('7d');
    const liveMode: NonNullable<LiveModeProps['liveMode']> = isLive ? 'auto' : 'off';

    const dateLocaleFormat = getLocale() === 'vi' ? 'DD/MM/YYYY HH:mm:ss' : 'YYYY-MM-DD HH:mm:ss';

    const deepLinkInitialFilters = useMemo(
        () => buildRequestLogDeepLinkInitialFilters(searchParams),
        [searchParams],
    );
    const deepLinkInitialValues = useMemo(
        () => buildRequestLogDeepLinkInitialValues(searchParams),
        [searchParams],
    );

    const { tableProps, searchFormProps, filters, tableQuery, setFilters } = useTable<
        ListRequestLog,
        HttpError,
        RequestLogSearch
    >({
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
        filters:
            deepLinkInitialFilters.length > 0 ? { initial: deepLinkInitialFilters } : undefined,
        onSearch: (values) => buildRequestLogSearchFilters(values),
    });

    const formInitialValues = useMemo(
        () => ({
            ...mapFiltersToSearchFormValues(filters),
            ...deepLinkInitialValues,
        }),
        [deepLinkInitialValues, filters],
    );

    const volumeQuery = useRequestLogsVolume({ p_range: chartRange });
    const volumeData = volumeQuery.query.data?.data as RequestLogsVolume | undefined;
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
        searchFormProps,
        onViewDetails: handleViewDetails,
        formatRemovedKeyLabel,
        dateLocaleFormat,
    });

    const handleClearFilters = useCallback(() => {
        searchFormProps.form?.resetFields();
        setFilters([], 'replace');
    }, [searchFormProps.form, setFilters]);

    const handleRefreshAll = useCallback(() => {
        void tableQuery.refetch();
        void volumeQuery.query.refetch();
    }, [tableQuery, volumeQuery.query]);

    const submitSearch = useCallback(() => {
        void searchFormProps.form?.submit();
    }, [searchFormProps.form]);

    const toolbarFilters = (
        <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
            <Popover
                trigger="click"
                title={translate('request_logs.filters.advanced')}
                content={
                    <Space direction="vertical" style={{ width: 280 }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {translate('request_logs.fields.requestId')}
                            </Text>
                            <Form.Item name="request_id" noStyle style={{ marginTop: 4 }}>
                                <Search
                                    allowClear
                                    placeholder={translate(
                                        'request_logs.placeholders.searchRequestId',
                                    )}
                                    onSearch={submitSearch}
                                />
                            </Form.Item>
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
                <Badge count={activeFilterCount} style={{ backgroundColor: 'var(--gp-accent)' }} />
            ) : null}
        </Space>
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

            <Form {...searchFormProps} initialValues={formInitialValues}>
                {toolbarFilters}

                <div className="gp-panel gp-logs-table-panel" style={{ padding: 0 }}>
                    <Table<ListRequestLog>
                        {...tableProps}
                        rowKey="id"
                        size="small"
                        columns={tableColumns}
                        scroll={{ x: 1600 }}
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
            </Form>
        </List>
    );
}
