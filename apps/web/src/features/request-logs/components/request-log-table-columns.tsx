'use client';

import React, { useMemo } from 'react';
import type { CrudFilter } from '@refinedev/core';
import type { ColumnType } from 'antd/es/table';
import type { FormProps } from 'antd';
import { Button, DatePicker, Form, Input, Select, Space, Tag, Tooltip, theme } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { FilterDropdownProps } from 'antd/es/table/interface';
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
    hasActiveFilter,
    type RequestLogSearch,
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
    searchFormProps: FormProps<RequestLogSearch>;
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

function submitSearchForm(searchFormProps: FormProps<RequestLogSearch>) {
    void searchFormProps.form?.submit();
}

function resetSearchFields(
    searchFormProps: FormProps<RequestLogSearch>,
    fields: Array<keyof RequestLogSearch>,
) {
    const form = searchFormProps.form;
    if (!form) {
        return;
    }
    for (const field of fields) {
        form.setFieldValue(field, undefined);
    }
}

function ModelFilterDropdown({
    searchFormProps,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                resetSearchFields(searchFormProps, ['model']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Form.Item name="model" noStyle>
                <Input
                    allowClear
                    placeholder={translate('request_logs.placeholders.searchModel')}
                    onPressEnter={() => {
                        confirm({ closeDropdown: true });
                        submitSearchForm(searchFormProps);
                    }}
                />
            </Form.Item>
        </FilterDropdownShell>
    );
}

function DateFilterDropdown({
    searchFormProps,
    confirm,
    clearFilters,
    translate,
    dateLocaleFormat,
}: FilterDropdownProps & {
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
    dateLocaleFormat: string;
}) {
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                resetSearchFields(searchFormProps, ['date_range']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Form.Item name="date_range" noStyle>
                <RangePicker showTime style={{ width: '100%' }} format={dateLocaleFormat} />
            </Form.Item>
        </FilterDropdownShell>
    );
}

function KeyFilterDropdown({
    searchFormProps,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                resetSearchFields(searchFormProps, ['proxy_key_id', 'api_key_id']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
                        {translate('request_logs.identity.proxyKey')}
                    </div>
                    <Form.Item name="proxy_key_id" noStyle>
                        <KeyCombobox
                            resource="proxy_api_keys"
                            placeholder={translate('request_logs.placeholders.searchProxyKey')}
                        />
                    </Form.Item>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--gp-text-muted)', marginBottom: 4 }}>
                        {translate('request_logs.identity.apiKey')}
                    </div>
                    <Form.Item name="api_key_id" noStyle>
                        <KeyCombobox
                            resource="api_keys"
                            placeholder={translate('request_logs.placeholders.searchApiKey')}
                        />
                    </Form.Item>
                </div>
            </Space>
        </FilterDropdownShell>
    );
}

function StatusFilterDropdown({
    searchFormProps,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                resetSearchFields(searchFormProps, ['is_successful']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Form.Item name="is_successful" noStyle>
                <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder={translate('request_logs.placeholders.selectStatus')}
                    options={[
                        { value: true, label: translate('request_logs.status.success') },
                        { value: false, label: translate('request_logs.status.failed') },
                    ]}
                />
            </Form.Item>
        </FilterDropdownShell>
    );
}

/**
 * OpenRouter-style request log columns; column filters bind to Refine searchFormProps.
 */
export function useRequestLogTableColumns({
    translate,
    filters,
    searchFormProps,
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
                        searchFormProps={searchFormProps}
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
                        searchFormProps={searchFormProps}
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
                        searchFormProps={searchFormProps}
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
                        searchFormProps={searchFormProps}
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
            searchFormProps,
            token.colorError,
            token.colorPrimary,
            translate,
        ],
    );
}
