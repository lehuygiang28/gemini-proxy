'use client';

import React, { useMemo } from 'react';
import type { CrudFilter } from '@refinedev/core';
import type { ColumnType } from 'antd/es/table';
import type { FormProps } from 'antd';
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Tag,
    Tooltip,
    theme,
} from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { DateTimeDisplay } from '@/components/common';
import type { RequestLog } from '@/types/request-log.types';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCountWithUnit,
    formatUsd,
    getRequestType,
    getRequestTypeColor,
} from '@/utils/table-helpers';
import { formatStoredEstimatedSpeed } from '../estimate-speed';
import {
    REQUEST_LOG_CACHE_TOKENS_FIELD,
    REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    REQUEST_LOG_COST_FIELD,
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
    getDateRangeFromFilters,
    getModelSearchValue,
    getNumericRangeFromFilters,
    hasActiveFilter,
    hasModelFilter,
    type RequestLogSearch,
} from '../request-log-table-filter-utils';
import { comboLogModelLabels } from '../combo-log-model-labels';
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
    crudFilters,
    searchFormProps,
    confirm,
    clearFilters,
    translate,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
}) {
    const activeModel = getModelSearchValue(crudFilters);
    const modelFieldKey = String(activeModel ?? '');

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
            <Form.Item
                name="model"
                noStyle
                key={modelFieldKey}
                initialValue={typeof activeModel === 'string' ? activeModel : undefined}
            >
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
    crudFilters,
    searchFormProps,
    confirm,
    clearFilters,
    translate,
    dateLocaleFormat,
}: FilterDropdownProps & {
    crudFilters: CrudFilter[];
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
    dateLocaleFormat: string;
}) {
    const activeRange = getDateRangeFromFilters(crudFilters);
    const dateFieldKey = activeRange?.join('|') ?? 'empty';

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
            <Form.Item
                name="date_range"
                noStyle
                key={dateFieldKey}
                initialValue={
                    activeRange ? [dayjs(activeRange[0]), dayjs(activeRange[1])] : undefined
                }
            >
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

function FormatFilterDropdown({
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
                resetSearchFields(searchFormProps, ['api_format']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Form.Item name="api_format" noStyle>
                <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder={translate('request_logs.placeholders.selectFormat')}
                    options={[
                        { value: 'gemini', label: 'Gemini' },
                        { value: 'openai', label: 'OpenAI' },
                    ]}
                />
            </Form.Item>
        </FilterDropdownShell>
    );
}

function StreamFilterDropdown({
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
                resetSearchFields(searchFormProps, ['is_stream']);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Form.Item name="is_stream" noStyle>
                <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder={translate('request_logs.placeholders.selectStream')}
                    options={[
                        { value: true, label: translate('request_logs.stream.streaming') },
                        { value: false, label: translate('request_logs.stream.nonStreaming') },
                    ]}
                />
            </Form.Item>
        </FilterDropdownShell>
    );
}

function NumericFilterDropdown({
    searchFormProps,
    confirm,
    clearFilters,
    translate,
    searchField,
}: FilterDropdownProps & {
    searchFormProps: FormProps<RequestLogSearch>;
    translate: UseRequestLogTableColumnsOptions['translate'];
    searchField: keyof RequestLogSearch;
}) {
    return (
        <FilterDropdownShell
            resetLabel={translate('request_logs.filters.reset')}
            confirmLabel={translate('request_logs.filters.apply')}
            onReset={() => {
                clearFilters?.();
                resetSearchFields(searchFormProps, [searchField]);
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
            onConfirm={() => {
                confirm({ closeDropdown: true });
                submitSearchForm(searchFormProps);
            }}
        >
            <Space.Compact style={{ width: '100%' }}>
                <Form.Item name={[searchField, 0]} noStyle>
                    <InputNumber
                        controls={false}
                        style={{ width: '50%' }}
                        placeholder={translate('request_logs.placeholders.min')}
                    />
                </Form.Item>
                <Form.Item name={[searchField, 1]} noStyle>
                    <InputNumber
                        controls={false}
                        style={{ width: '50%' }}
                        placeholder={translate('request_logs.placeholders.max')}
                    />
                </Form.Item>
            </Space.Compact>
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
                        crudFilters={filters}
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
                        crudFilters={filters}
                        searchFormProps={searchFormProps}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: hasModelFilter(filters) ? token.colorPrimary : undefined,
                        }}
                    />
                ),
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    const labels = comboLogModelLabels(usage);
                    const retryCount = Array.isArray(record.retry_attempts)
                        ? record.retry_attempts.length
                        : 0;
                    return (
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--gp-text)', fontWeight: 500 }}>
                                {labels.primary}
                            </div>
                            {labels.requested ? (
                                <div
                                    style={{
                                        color: 'var(--gp-text-muted)',
                                        fontSize: 11,
                                        marginTop: 2,
                                    }}
                                >
                                    {labels.requested}
                                </div>
                            ) : null}
                            {retryCount > 0 ? (
                                <div
                                    style={{ color: token.colorError, fontSize: 11, marginTop: 2 }}
                                >
                                    {translate('request_logs.metrics.retries', {
                                        count: retryCount,
                                    })}
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
                title: translate('request_logs.fields.format'),
                dataIndex: 'api_format',
                key: 'api_format',
                width: 96,
                sorter: true,
                filterDropdown: (props) => (
                    <FormatFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: hasActiveFilter(filters, 'api_format')
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (value: string) => (
                    <Tag
                        color={getRequestTypeColor(value)}
                        style={{ margin: 0, borderRadius: 2, fontSize: 10 }}
                    >
                        {getRequestType(value)}
                    </Tag>
                ),
            },
            {
                title: translate('request_logs.fields.stream'),
                dataIndex: 'is_stream',
                key: 'is_stream',
                width: 108,
                sorter: true,
                filterDropdown: (props) => (
                    <StreamFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: hasActiveFilter(filters, 'is_stream')
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (value: boolean) => (
                    <Tag
                        color={value ? 'processing' : 'default'}
                        style={{ margin: 0, borderRadius: 2, fontSize: 10 }}
                    >
                        {value
                            ? translate('request_logs.stream.streaming')
                            : translate('request_logs.stream.nonStreaming')}
                    </Tag>
                ),
            },
            {
                title: translate('request_logs.fields.input'),
                dataIndex: REQUEST_LOG_PROMPT_TOKENS_FIELD,
                key: 'prompt_tokens',
                width: 104,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="prompt_tokens"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(
                                filters,
                                REQUEST_LOG_PROMPT_TOKENS_FIELD,
                            )
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
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
                dataIndex: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
                key: 'completion_tokens',
                width: 104,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="completion_tokens"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(
                                filters,
                                REQUEST_LOG_COMPLETION_TOKENS_FIELD,
                            )
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
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
                title: translate('request_logs.fields.cache'),
                dataIndex: REQUEST_LOG_CACHE_TOKENS_FIELD,
                key: 'cache_tokens',
                width: 104,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="cache_tokens"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(
                                filters,
                                REQUEST_LOG_CACHE_TOKENS_FIELD,
                            )
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <span className="gp-live-mono">
                            {formatTokenCountWithUnit(usage.cache_tokens, translate('common.na'))}
                        </span>
                    );
                },
            },
            {
                title: translate('request_logs.fields.cost'),
                dataIndex: REQUEST_LOG_COST_FIELD,
                key: 'estimated_cost_usd',
                width: 96,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="estimated_cost_usd"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(filters, REQUEST_LOG_COST_FIELD)
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
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
                title: (
                    <Tooltip title={translate('request_logs.metrics.estimatedSpeedTooltip')}>
                        {translate('request_logs.fields.speed')}
                    </Tooltip>
                ),
                dataIndex: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
                key: 'estimated_speed_tok_per_s',
                width: 108,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="estimated_speed_tok_per_s"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(
                                filters,
                                REQUEST_LOG_ESTIMATED_SPEED_FIELD,
                            )
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
                render: (_: unknown, record: ListRequestLog) => (
                    <span className="gp-live-mono" style={{ color: 'var(--gp-accent)' }}>
                        {formatStoredEstimatedSpeed(
                            record.estimated_speed_tok_per_s,
                            translate('common.na'),
                        )}
                    </span>
                ),
            },
            {
                title: translate('request_logs.fields.duration'),
                dataIndex: REQUEST_LOG_DURATION_MS_FIELD,
                key: 'total_response_time_ms',
                width: 112,
                align: 'right' as const,
                className: 'gp-logs-num-col',
                sorter: true,
                filterDropdown: (props) => (
                    <NumericFilterDropdown
                        {...props}
                        searchFormProps={searchFormProps}
                        translate={translate}
                        searchField="total_response_time_ms"
                    />
                ),
                filterIcon: () => (
                    <SearchOutlined
                        style={{
                            color: getNumericRangeFromFilters(
                                filters,
                                REQUEST_LOG_DURATION_MS_FIELD,
                            )
                                ? token.colorPrimary
                                : undefined,
                        }}
                    />
                ),
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
