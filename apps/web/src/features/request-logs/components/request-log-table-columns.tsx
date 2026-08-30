'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import type { ColumnType } from 'antd/es/table';
import { Button, DatePicker, Input, Select, Space, Tag, Tooltip, theme } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import dayjs, { type Dayjs } from 'dayjs';
import { DateTimeDisplay } from '@/components/common';
import type { RequestLog } from '@/types/request-log.types';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatRoutingOverhead,
    formatSpeed,
    formatTokenCountWithUnit,
    formatUsd,
    getRequestType,
    getRequestTypeColor,
    shortModel,
} from '@/utils/table-helpers';
import {
    REQUEST_LOG_MODEL_FIELD,
    getDateRangeFromFilters,
    getFilterScalar,
    hasActiveFilter,
    upsertContainsFilter,
    upsertDateRangeFilters,
    upsertEqFilter,
} from '../request-log-table-filter-utils';
import { KeyCombobox } from './key-combobox';

const { RangePicker } = DatePicker;
const { useToken } = theme;

export type ListRequestLog = RequestLog & {
    api_keys?: { id: string; name: string; deleted_at: string | null } | null;
    proxy_api_keys?: { id: string; name: string; deleted_at: string | null } | null;
};

interface UseRequestLogTableColumnsOptions {
    translate: (key: string, options?: Record<string, unknown>) => string;
    filters: CrudFilter[];
    setFilters: (filters: CrudFilter[], behavior?: 'merge' | 'replace') => void;
    onViewDetails: (record: ListRequestLog) => void;
    formatRemovedKeyLabel: (input: {
        joined?: { name: string; deleted_at: string | null } | null;
        id?: string | null;
    }) => string;
    dateLocaleFormat: string;
}

function FilterDropdownShell({
    children,
    onReset,
    onConfirm,
    resetLabel,
    confirmLabel,
}: {
    children: React.ReactNode;
    onReset: () => void;
    onConfirm: () => void;
    resetLabel: string;
    confirmLabel: string;
}) {
    return (
        <div style={{ padding: 8, width: 260 }} onKeyDown={(event) => event.stopPropagation()}>
            {children}
            <Space style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" type="link" onClick={onReset}>
                    {resetLabel}
                </Button>
                <Button size="small" type="primary" onClick={onConfirm}>
                    {confirmLabel}
                </Button>
            </Space>
        </div>
    );
}

function ModelFilterDropdown({
    crudFilters,
    setFilters,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    setFilters: UseRequestLogTableColumnsOptions['setFilters'];
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    const [draft, setDraft] = useState(
        String(getFilterScalar(crudFilters, REQUEST_LOG_MODEL_FIELD) ?? ''),
    );
    useEffect(() => {
        setDraft(String(getFilterScalar(crudFilters, REQUEST_LOG_MODEL_FIELD) ?? ''));
    }, [crudFilters]);
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                setFilters(upsertContainsFilter(crudFilters, REQUEST_LOG_MODEL_FIELD, undefined));
                confirm({ closeDropdown: true });
            }}
            onConfirm={() => {
                setFilters(upsertContainsFilter(crudFilters, REQUEST_LOG_MODEL_FIELD, draft));
                confirm({ closeDropdown: true });
            }}
        >
            <Input
                allowClear
                placeholder={translate('request_logs.placeholders.searchModel')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onPressEnter={() => {
                    setFilters(upsertContainsFilter(crudFilters, REQUEST_LOG_MODEL_FIELD, draft));
                    confirm({ closeDropdown: true });
                }}
            />
        </FilterDropdownShell>
    );
}

function DateFilterDropdown({
    crudFilters,
    setFilters,
    confirm,
    clearFilters,
    translate,
    dateLocaleFormat,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    setFilters: UseRequestLogTableColumnsOptions['setFilters'];
    translate: UseRequestLogTableColumnsOptions['translate'];
    dateLocaleFormat: string;
}) {
    const existingRange = getDateRangeFromFilters(crudFilters);
    const [draft, setDraft] = useState<[Dayjs, Dayjs] | null>(
        existingRange ? [dayjs(existingRange[0]), dayjs(existingRange[1])] : null,
    );
    useEffect(() => {
        const range = getDateRangeFromFilters(crudFilters);
        setDraft(range ? [dayjs(range[0]), dayjs(range[1])] : null);
    }, [crudFilters]);
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                setFilters(upsertDateRangeFilters(crudFilters, null));
                confirm({ closeDropdown: true });
            }}
            onConfirm={() => {
                setFilters(
                    upsertDateRangeFilters(
                        crudFilters,
                        draft ? [draft[0].toISOString(), draft[1].toISOString()] : null,
                    ),
                );
                confirm({ closeDropdown: true });
            }}
        >
            <RangePicker
                showTime
                style={{ width: '100%' }}
                format={dateLocaleFormat}
                value={draft}
                onChange={(values) => {
                    if (!values?.[0] || !values[1]) {
                        setDraft(null);
                        return;
                    }
                    setDraft([values[0], values[1]]);
                }}
            />
        </FilterDropdownShell>
    );
}

function KeyFilterDropdown({
    crudFilters,
    setFilters,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    setFilters: UseRequestLogTableColumnsOptions['setFilters'];
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    const [proxyKeyId, setProxyKeyId] = useState(
        getFilterScalar(crudFilters, 'proxy_key_id') as string | undefined,
    );
    const [apiKeyId, setApiKeyId] = useState(
        getFilterScalar(crudFilters, 'api_key_id') as string | undefined,
    );
    useEffect(() => {
        setProxyKeyId(getFilterScalar(crudFilters, 'proxy_key_id') as string | undefined);
        setApiKeyId(getFilterScalar(crudFilters, 'api_key_id') as string | undefined);
    }, [crudFilters]);
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                let next = upsertEqFilter(crudFilters, 'proxy_key_id', undefined);
                next = upsertEqFilter(next, 'api_key_id', undefined);
                setFilters(next);
                confirm({ closeDropdown: true });
            }}
            onConfirm={() => {
                let next = upsertEqFilter(crudFilters, 'proxy_key_id', proxyKeyId);
                next = upsertEqFilter(next, 'api_key_id', apiKeyId);
                setFilters(next);
                confirm({ closeDropdown: true });
            }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
                        {translate('request_logs.identity.proxyKey')}
                    </div>
                    <KeyCombobox
                        resource="proxy_api_keys"
                        placeholder={translate('request_logs.placeholders.searchProxyKey')}
                        value={proxyKeyId}
                        onChange={setProxyKeyId}
                    />
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
                        {translate('request_logs.identity.apiKey')}
                    </div>
                    <KeyCombobox
                        resource="api_keys"
                        placeholder={translate('request_logs.placeholders.searchApiKey')}
                        value={apiKeyId}
                        onChange={setApiKeyId}
                    />
                </div>
            </Space>
        </FilterDropdownShell>
    );
}

function StatusFilterDropdown({
    crudFilters,
    setFilters,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    setFilters: UseRequestLogTableColumnsOptions['setFilters'];
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    const current = getFilterScalar(crudFilters, 'is_successful');
    const [draft, setDraft] = useState<boolean | undefined>(
        typeof current === 'boolean' ? current : undefined,
    );
    useEffect(() => {
        const value = getFilterScalar(crudFilters, 'is_successful');
        setDraft(typeof value === 'boolean' ? value : undefined);
    }, [crudFilters]);
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                setFilters(upsertEqFilter(crudFilters, 'is_successful', undefined));
                confirm({ closeDropdown: true });
            }}
            onConfirm={() => {
                setFilters(upsertEqFilter(crudFilters, 'is_successful', draft));
                confirm({ closeDropdown: true });
            }}
        >
            <Select
                allowClear
                style={{ width: '100%' }}
                placeholder={translate('request_logs.placeholders.selectStatus')}
                value={draft}
                onChange={setDraft}
                options={[
                    { value: true, label: translate('request_logs.status.success') },
                    { value: false, label: translate('request_logs.status.failed') },
                ]}
            />
        </FilterDropdownShell>
    );
}

/**
 * OpenRouter-style request log columns with Ant Design header filters.
 */
export function useRequestLogTableColumns({
    translate,
    filters,
    setFilters,
    onViewDetails,
    formatRemovedKeyLabel,
    dateLocaleFormat,
}: UseRequestLogTableColumnsOptions): ColumnType<ListRequestLog>[] {
    const { token } = useToken();

    return useMemo(
        () => [
            {
                title: translate('request_logs.fields.created'),
                dataIndex: 'created_at',
                key: 'created_at',
                width: 148,
                sorter: true,
                filterDropdown: (props) => (
                    <DateFilterDropdown
                        {...props}
                        crudFilters={filters}
                        setFilters={setFilters}
                        translate={translate}
                        dateLocaleFormat={dateLocaleFormat}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getDateRangeFromFilters(filters)
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (value: string | null) => <DateTimeDisplay dateString={value} />,
            },
            {
                title: translate('request_logs.fields.model'),
                key: 'model',
                width: 220,
                filterDropdown: (props) => (
                    <ModelFilterDropdown
                        {...props}
                        crudFilters={filters}
                        setFilters={setFilters}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: hasActiveFilter(filters, REQUEST_LOG_MODEL_FIELD)
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    const model = shortModel(usage.model);
                    const formatLabel = getRequestType(record.api_format);
                    const retryCount = Array.isArray(record.retry_attempts)
                        ? record.retry_attempts.length
                        : 0;
                    return (
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--gp-text)', fontWeight: 500 }}>
                                {model}
                            </div>
                            <Space size={4} wrap style={{ marginTop: 2 }}>
                                <Tag
                                    color={getRequestTypeColor(record.api_format)}
                                    style={{ margin: 0, borderRadius: 2, fontSize: 10 }}
                                >
                                    {formatLabel}
                                </Tag>
                                {record.is_stream ? (
                                    <Tag
                                        color="processing"
                                        style={{ margin: 0, borderRadius: 2, fontSize: 10 }}
                                    >
                                        {translate('request_logs.stream.streaming')}
                                    </Tag>
                                ) : null}
                            </Space>
                            {retryCount > 0 ? (
                                <div style={{ color: token.colorError, fontSize: 11, marginTop: 2 }}>
                                    {translate('request_logs.metrics.retries', { count: retryCount })}
                                </div>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                title: translate('request_logs.fields.status'),
                dataIndex: 'is_successful',
                key: 'is_successful',
                width: 96,
                sorter: true,
                filterDropdown: (props) => (
                    <StatusFilterDropdown
                        {...props}
                        crudFilters={filters}
                        setFilters={setFilters}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: hasActiveFilter(filters, 'is_successful')
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (value: boolean) => (
                    <Tag color={value ? 'success' : 'error'} style={{ borderRadius: 2 }}>
                        {value
                            ? translate('request_logs.status.success')
                            : translate('request_logs.status.failed')}
                    </Tag>
                ),
            },
            {
                title: translate('request_logs.fields.input'),
                key: 'input_tokens',
                width: 88,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <span className="gp-live-mono">
                            {formatTokenCountWithUnit(usage.prompt_tokens, translate('common.na'))}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.output'),
                key: 'output_tokens',
                width: 88,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <span className="gp-live-mono">
                            {formatTokenCountWithUnit(
                                usage.completion_tokens,
                                translate('common.na'),
                            )}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.cost'),
                key: 'cost',
                width: 80,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <span className="gp-live-mono">
                            {formatUsd(usage.estimated_cost_usd, translate('common.na'))}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.speed'),
                key: 'speed',
                width: 88,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    const performance = extractPerformanceMetrics(record.performance_metrics);
                    return (
                        <span className="gp-live-mono" style={{ color: 'var(--gp-accent)' }}>
                            {formatSpeed(
                                usage.completion_tokens,
                                performance.duration_ms,
                                translate('common.na'),
                            )}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.duration'),
                key: 'duration',
                width: 72,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const performance = extractPerformanceMetrics(record.performance_metrics);
                    return (
                        <span className="gp-live-mono">
                            {formatDuration(
                                performance.total_response_time_ms,
                                translate('common.na'),
                            )}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.overhead'),
                key: 'overhead',
                width: 72,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                render: (_: unknown, record: ListRequestLog) => {
                    const performance = extractPerformanceMetrics(record.performance_metrics);
                    return (
                        <Tooltip title={translate('request_logs.metrics.routingOverhead')}>
                            <span
                                className="gp-live-mono"
                                style={{ color: 'var(--gp-text-muted)' }}
                            >
                                {formatRoutingOverhead(
                                    performance.total_response_time_ms,
                                    performance.duration_ms,
                                    translate('common.na'),
                                )}
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                title: translate('request_logs.fields.key'),
                key: 'key',
                width: 140,
                ellipsis: true,
                filterDropdown: (props) => (
                    <KeyFilterDropdown
                        {...props}
                        crudFilters={filters}
                        setFilters={setFilters}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color:
                                hasActiveFilter(filters, 'proxy_key_id') ||
                                hasActiveFilter(filters, 'api_key_id')
                                    ? token.colorPrimary
                                    : undefined,
                        }}
                    />
                ),
                render: (_: unknown, record: ListRequestLog) => {
                    const proxy = formatRemovedKeyLabel({
                        joined: record.proxy_api_keys,
                        id: record.proxy_key_id,
                    });
                    const api = formatRemovedKeyLabel({
                        joined: record.api_keys,
                        id: record.api_key_id,
                    });
                    return (
                        <Tooltip title={`${proxy} · ${api}`}>
                            <span style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>
                                {proxy} · {api}
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                title: '',
                key: 'actions',
                width: 44,
                fixed: 'right' as const,
                render: (_: unknown, record: ListRequestLog) => (
                    <Tooltip title={translate('request_logs.actions.viewDetails')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={(event) => {
                                event.stopPropagation();
                                onViewDetails(record);
                            }}
                        />
                    </Tooltip>
                ),
            },
        ],
        [
            dateLocaleFormat,
            filters,
            formatRemovedKeyLabel,
            onViewDetails,
            setFilters,
            token.colorError,
            token.colorPrimary,
            translate,
        ],
    );
}
