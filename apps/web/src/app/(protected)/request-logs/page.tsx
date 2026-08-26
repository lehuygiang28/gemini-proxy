'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, useTable } from '@refinedev/antd';
import { useGo, useTranslation, type LiveModeProps } from '@refinedev/core';
import {
    Table,
    Space,
    Tag,
    Row,
    Col,
    Tooltip,
    theme,
    Typography,
    Button,
    Form,
    Select,
    DatePicker,
    Input,
    Badge,
    Alert,
    Empty,
} from 'antd';
import {
    FilterOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    DashboardOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    DownOutlined,
    UpOutlined,
    CopyOutlined,
} from '@ant-design/icons';
import { DateTimeDisplay } from '@/components/common';
import { ConnectionStatusBadge } from '@/features/observability';
import { KeyCombobox, resolveKeyLabel } from '@/features/request-logs';
import type { RequestLog } from '@/types/request-log.types';
import { REQUEST_LOG_LIST_SELECT } from '@/constants/request-log-select';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCount,
    getAttemptCountColor,
    getRequestTypeColor,
    getRequestType,
} from '@/utils/table-helpers';

const { useToken } = theme;
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

const FILTERS_OPEN_KEY = 'gp.logs.filtersOpen';

interface RequestLogSearch {
    request_id?: string;
    api_format?: string;
    is_successful?: boolean;
    is_stream?: boolean;
    api_key_id?: string;
    proxy_key_id?: string;
    date_range?: [string, string];
}

type ListRequestLog = RequestLog & {
    api_keys?: { id: string; name: string; deleted_at: string | null } | null;
    proxy_api_keys?: { id: string; name: string; deleted_at: string | null } | null;
};

function countActiveFilters(values: RequestLogSearch | undefined): number {
    if (!values) {
        return 0;
    }
    let count = 0;
    if (values.request_id) count += 1;
    if (values.api_format) count += 1;
    if (values.is_successful !== undefined && values.is_successful !== null) count += 1;
    if (values.is_stream !== undefined && values.is_stream !== null) count += 1;
    if (values.api_key_id) count += 1;
    if (values.proxy_key_id) count += 1;
    if (values.date_range && values.date_range.length === 2) count += 1;
    return count;
}

function getAttemptSeverityKey(attemptCount: number): string {
    if (attemptCount === 1) return 'request_logs.severity.success';
    if (attemptCount <= 2) return 'request_logs.severity.minor';
    if (attemptCount <= 4) return 'request_logs.severity.moderate';
    if (attemptCount <= 5) return 'request_logs.severity.high';
    if (attemptCount <= 10) return 'request_logs.severity.critical';
    if (attemptCount <= 20) return 'request_logs.severity.severe';
    return 'request_logs.severity.extreme';
}

/**
 * Request logs history with Refine liveMode auto updates.
 */
export default function RequestLogsListPage() {
    const { token } = useToken();
    const go = useGo();
    const { translate, getLocale } = useTranslation();
    const [isLive, setIsLive] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [formValues, setFormValues] = useState<RequestLogSearch>({});
    const liveMode: NonNullable<LiveModeProps['liveMode']> = isLive ? 'auto' : 'off';

    const { tableProps, searchFormProps, tableQuery } = useTable<ListRequestLog>({
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
        onSearch: (data) => {
            const values = data as RequestLogSearch;
            setFormValues(values);
            const searchFilters: Array<{
                field: string;
                operator: 'contains' | 'eq' | 'gte' | 'lte';
                value: unknown;
            }> = [];

            if (values.request_id) {
                searchFilters.push({
                    field: 'request_id',
                    operator: 'contains',
                    value: values.request_id,
                });
            }
            if (values.api_format) {
                searchFilters.push({
                    field: 'api_format',
                    operator: 'eq',
                    value: values.api_format,
                });
            }
            if (values.is_successful !== undefined && values.is_successful !== null) {
                searchFilters.push({
                    field: 'is_successful',
                    operator: 'eq',
                    value: values.is_successful,
                });
            }
            if (values.is_stream !== undefined && values.is_stream !== null) {
                searchFilters.push({
                    field: 'is_stream',
                    operator: 'eq',
                    value: values.is_stream,
                });
            }
            if (values.api_key_id) {
                searchFilters.push({
                    field: 'api_key_id',
                    operator: 'eq',
                    value: values.api_key_id,
                });
            }
            if (values.proxy_key_id) {
                searchFilters.push({
                    field: 'proxy_key_id',
                    operator: 'eq',
                    value: values.proxy_key_id,
                });
            }
            if (values.date_range && values.date_range.length === 2) {
                searchFilters.push({
                    field: 'created_at',
                    operator: 'gte',
                    value: values.date_range[0],
                });
                searchFilters.push({
                    field: 'created_at',
                    operator: 'lte',
                    value: values.date_range[1],
                });
            }
            return searchFilters;
        },
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const apiKeyId = params.get('api_key_id');
        const proxyKeyId = params.get('proxy_key_id');
        const storedOpen = window.localStorage.getItem(FILTERS_OPEN_KEY);
        const hasDeepLink = Boolean(apiKeyId || proxyKeyId);
        if (hasDeepLink) {
            setFiltersOpen(true);
            searchFormProps.form?.setFieldsValue({
                api_key_id: apiKeyId ?? undefined,
                proxy_key_id: proxyKeyId ?? undefined,
            });
            searchFormProps.form?.submit();
        } else if (storedOpen !== null) {
            setFiltersOpen(storedOpen === '1');
        } else {
            setFiltersOpen(false);
        }
        // Apply deep-link filters once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeFilterCount = countActiveFilters(
        (searchFormProps.form?.getFieldsValue?.() as RequestLogSearch) || formValues,
    );

    const toggleFilters = useCallback(() => {
        setFiltersOpen((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(FILTERS_OPEN_KEY, next ? '1' : '0');
            }
            return next;
        });
    }, []);

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

    const handleResetFilters = useCallback(() => {
        searchFormProps.form?.resetFields();
        setFormValues({});
        searchFormProps.form?.submit();
    }, [searchFormProps.form]);

    const handleCopyRequestId = useCallback((requestId: string) => {
        void navigator.clipboard.writeText(requestId);
    }, []);

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

    const tableColumns = useMemo(
        () => [
            {
                title: translate('request_logs.fields.keys'),
                key: 'keys',
                width: 200,
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
                        <Space size={2} direction="vertical">
                            <div>
                                <span
                                    className="gp-chip"
                                    style={{
                                        marginRight: 6,
                                        fontSize: 10,
                                        color: 'var(--gp-text-muted)',
                                    }}
                                >
                                    {translate('request_logs.fields.proxy')}
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--gp-text)' }}>
                                    {proxy}
                                </span>
                            </div>
                            <div>
                                <span
                                    style={{
                                        marginRight: 6,
                                        fontSize: 10,
                                        color: 'var(--gp-text-muted)',
                                    }}
                                >
                                    {translate('request_logs.fields.api')}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}>
                                    {api}
                                </span>
                            </div>
                        </Space>
                    );
                },
            },
            {
                title: translate('request_logs.fields.status'),
                dataIndex: 'is_successful',
                key: 'is_successful',
                width: 96,
                render: (value: boolean) => (
                    <Tag color={value ? 'success' : 'error'} style={{ borderRadius: 2 }}>
                        {value
                            ? translate('request_logs.status.success')
                            : translate('request_logs.status.failed')}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: translate('request_logs.fields.type'),
                dataIndex: 'api_format',
                key: 'api_format',
                width: 88,
                render: (value: string) => (
                    <Tag color={getRequestTypeColor(value)} style={{ borderRadius: 2 }}>
                        {getRequestType(value)}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: translate('request_logs.fields.stream'),
                dataIndex: 'is_stream',
                key: 'is_stream',
                width: 72,
                render: (value: boolean) => (
                    <Tag color={value ? 'processing' : 'default'} style={{ borderRadius: 2 }}>
                        {value
                            ? translate('request_logs.stream.yes')
                            : translate('request_logs.stream.no')}
                    </Tag>
                ),
                sorter: true,
            },
            {
                title: translate('request_logs.fields.performance'),
                key: 'performance',
                width: 140,
                render: (_: unknown, record: ListRequestLog) => {
                    const metrics = extractPerformanceMetrics(record.performance_metrics);
                    const retryCount = Array.isArray(record.retry_attempts)
                        ? record.retry_attempts.length
                        : 0;
                    return (
                        <div style={{ fontSize: token.fontSizeSM }}>
                            <div>
                                {translate('request_logs.metrics.api', {
                                    duration: formatDuration(
                                        metrics.duration_ms,
                                        translate('common.na'),
                                    ),
                                })}
                            </div>
                            <div>
                                {translate('request_logs.metrics.total', {
                                    duration: formatDuration(
                                        metrics.total_response_time_ms,
                                        translate('common.na'),
                                    ),
                                })}
                            </div>
                            <Tooltip
                                title={translate('request_logs.metrics.severity', {
                                    level: translate(getAttemptSeverityKey(metrics.attempt_count)),
                                })}
                            >
                                <span>
                                    {translate('request_logs.metrics.attempts')}{' '}
                                    <Tag
                                        color={getAttemptCountColor(metrics.attempt_count)}
                                        style={{ borderRadius: 2 }}
                                    >
                                        {metrics.attempt_count}
                                    </Tag>
                                </span>
                            </Tooltip>
                            {retryCount > 0 && (
                                <div style={{ color: token.colorError }}>
                                    {translate('request_logs.metrics.retries', {
                                        count: retryCount,
                                    })}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                title: translate('request_logs.fields.tokens'),
                key: 'token_usage',
                width: 80,
                render: (_: unknown, record: ListRequestLog) => {
                    const usage = extractUsageMetadata(record.usage_metadata);
                    return (
                        <div style={{ fontSize: token.fontSizeSM }}>
                            <div>
                                {formatTokenCount(usage.total_tokens, translate('common.na'))}
                            </div>
                            <div style={{ color: token.colorTextSecondary }}>
                                {formatTokenCount(usage.prompt_tokens, translate('common.na'))} /{' '}
                                {formatTokenCount(usage.completion_tokens, translate('common.na'))}
                            </div>
                        </div>
                    );
                },
            },
            {
                title: translate('request_logs.fields.created'),
                dataIndex: 'created_at',
                key: 'created_at',
                width: 150,
                sorter: true,
                render: (value: string | null) => <DateTimeDisplay dateString={value} />,
            },
            {
                title: translate('request_logs.fields.requestId'),
                dataIndex: 'request_id',
                key: 'request_id',
                width: 130,
                render: (value: string) => (
                    <Space size={2}>
                        <Tooltip title={value}>
                            <span
                                className="gp-live-mono"
                                style={{ fontSize: 12, color: 'var(--gp-text-secondary)' }}
                            >
                                {value.slice(0, 8)}…{value.slice(-4)}
                            </span>
                        </Tooltip>
                        <Tooltip title={translate('request_logs.actions.copyRequestId')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleCopyRequestId(value);
                                }}
                                aria-label={translate('request_logs.actions.copyRequestId')}
                            />
                        </Tooltip>
                    </Space>
                ),
            },
            {
                title: '',
                key: 'actions',
                width: 48,
                render: (_: unknown, record: ListRequestLog) => (
                    <Tooltip title={translate('request_logs.actions.viewDetails')}>
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(record)}
                        />
                    </Tooltip>
                ),
            },
        ],
        [token, handleViewDetails, handleCopyRequestId, translate, formatRemovedKeyLabel],
    );

    return (
        <List
            title={
                <Space>
                    <span>{translate('request_logs.titles.list')}</span>
                    {tableProps.pagination && (
                        <Badge
                            count={tableProps.pagination.total}
                            showZero
                            color={token.colorPrimary}
                        />
                    )}
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
                        onClick={() => void tableQuery.refetch()}
                        loading={tableQuery.isFetching}
                    >
                        {translate('buttons.refresh')}
                    </Button>
                </Space>
            }
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                    isLive
                        ? translate('request_logs.live.onMessage')
                        : translate('request_logs.live.offMessage')
                }
                description={translate('request_logs.retention')}
            />

            <div className="gp-panel" style={{ marginBottom: 12, padding: 16 }}>
                <Space
                    style={{
                        marginBottom: filtersOpen || activeFilterCount > 0 ? 12 : 0,
                        width: '100%',
                        justifyContent: 'space-between',
                    }}
                >
                    <Space>
                        <Button
                            type="text"
                            size="small"
                            icon={<FilterOutlined />}
                            onClick={toggleFilters}
                        >
                            {translate('request_logs.filters.title')}
                        </Button>
                        {activeFilterCount > 0 ? (
                            <Badge
                                count={activeFilterCount}
                                style={{ backgroundColor: 'var(--gp-accent)' }}
                            />
                        ) : null}
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleResetFilters}
                            size="small"
                            type="text"
                        >
                            {translate('request_logs.filters.reset')}
                        </Button>
                    </Space>
                    <Button
                        type="text"
                        size="small"
                        icon={filtersOpen ? <UpOutlined /> : <DownOutlined />}
                        onClick={toggleFilters}
                        aria-label={
                            filtersOpen
                                ? translate('request_logs.filters.collapse')
                                : translate('request_logs.filters.expand')
                        }
                    />
                </Space>

                {!filtersOpen && activeFilterCount > 0 ? (
                    <Space wrap size={[8, 8]} style={{ marginBottom: 0 }}>
                        {formValues.api_key_id ? (
                            <Tag
                                closable
                                onClose={() => {
                                    searchFormProps.form?.setFieldValue('api_key_id', undefined);
                                    searchFormProps.form?.submit();
                                }}
                                style={{ borderRadius: 2 }}
                            >
                                {translate('request_logs.filters.apiKeyActive')}
                            </Tag>
                        ) : null}
                        {formValues.proxy_key_id ? (
                            <Tag
                                closable
                                onClose={() => {
                                    searchFormProps.form?.setFieldValue('proxy_key_id', undefined);
                                    searchFormProps.form?.submit();
                                }}
                                style={{ borderRadius: 2 }}
                            >
                                {translate('request_logs.filters.proxyKeyActive')}
                            </Tag>
                        ) : null}
                        {formValues.is_successful !== undefined &&
                        formValues.is_successful !== null ? (
                            <Tag
                                closable
                                onClose={() => {
                                    searchFormProps.form?.setFieldValue('is_successful', undefined);
                                    searchFormProps.form?.submit();
                                }}
                                style={{ borderRadius: 2 }}
                            >
                                {translate('request_logs.filters.statusTag', {
                                    status: formValues.is_successful
                                        ? translate('request_logs.status.success')
                                        : translate('request_logs.status.failed'),
                                })}
                            </Tag>
                        ) : null}
                        {formValues.api_format ? (
                            <Tag
                                closable
                                onClose={() => {
                                    searchFormProps.form?.setFieldValue('api_format', undefined);
                                    searchFormProps.form?.submit();
                                }}
                                style={{ borderRadius: 2 }}
                            >
                                {translate('request_logs.filters.formatTag', {
                                    format: formValues.api_format,
                                })}
                            </Tag>
                        ) : null}
                        {formValues.request_id ? (
                            <Tag
                                closable
                                onClose={() => {
                                    searchFormProps.form?.setFieldValue('request_id', undefined);
                                    searchFormProps.form?.submit();
                                }}
                                style={{ borderRadius: 2 }}
                            >
                                {translate('request_logs.fields.requestId')}
                            </Tag>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {translate('request_logs.filters.clickToEdit')}
                        </Text>
                    </Space>
                ) : null}

                {filtersOpen ? (
                    <Form
                        {...searchFormProps}
                        layout="vertical"
                        onValuesChange={(_, all) => {
                            setFormValues(all as RequestLogSearch);
                            searchFormProps.form?.submit();
                        }}
                    >
                        <Row gutter={[12, 8]}>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.fields.requestId')}
                                    name="request_id"
                                >
                                    <Search
                                        placeholder={translate(
                                            'request_logs.placeholders.searchRequestId',
                                        )}
                                        allowClear
                                        enterButton={<SearchOutlined />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.fields.apiFormat')}
                                    name="api_format"
                                >
                                    <Select
                                        placeholder={translate(
                                            'request_logs.placeholders.selectFormat',
                                        )}
                                        allowClear
                                    >
                                        <Select.Option value="gemini">Gemini</Select.Option>
                                        <Select.Option value="openai">OpenAI</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.fields.status')}
                                    name="is_successful"
                                >
                                    <Select
                                        placeholder={translate(
                                            'request_logs.placeholders.selectStatus',
                                        )}
                                        allowClear
                                    >
                                        <Select.Option value={true}>
                                            {translate('request_logs.status.successful')}
                                        </Select.Option>
                                        <Select.Option value={false}>
                                            {translate('request_logs.status.failed')}
                                        </Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.fields.stream')}
                                    name="is_stream"
                                >
                                    <Select
                                        placeholder={translate(
                                            'request_logs.placeholders.selectStream',
                                        )}
                                        allowClear
                                    >
                                        <Select.Option value={true}>
                                            {translate('request_logs.stream.streaming')}
                                        </Select.Option>
                                        <Select.Option value={false}>
                                            {translate('request_logs.stream.nonStreaming')}
                                        </Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.identity.apiKey')}
                                    name="api_key_id"
                                >
                                    <KeyCombobox
                                        resource="api_keys"
                                        placeholder={translate(
                                            'request_logs.placeholders.searchApiKey',
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    label={translate('request_logs.identity.proxyKey')}
                                    name="proxy_key_id"
                                >
                                    <KeyCombobox
                                        resource="proxy_api_keys"
                                        placeholder={translate(
                                            'request_logs.placeholders.searchProxyKey',
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={12}>
                                <Form.Item
                                    label={translate('request_logs.fields.dateRange')}
                                    name="date_range"
                                >
                                    <RangePicker
                                        style={{ width: '100%' }}
                                        showTime
                                        format={
                                            getLocale() === 'vi'
                                                ? 'DD/MM/YYYY HH:mm:ss'
                                                : 'YYYY-MM-DD HH:mm:ss'
                                        }
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                ) : null}
            </div>

            <div className="gp-panel" style={{ padding: 0 }}>
                <Table<ListRequestLog>
                    {...tableProps}
                    rowKey="id"
                    columns={tableColumns}
                    scroll={{ x: 1100 }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={translate('request_logs.empty')}
                            />
                        ),
                    }}
                />
            </div>
        </List>
    );
}
