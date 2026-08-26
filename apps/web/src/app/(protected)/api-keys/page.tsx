'use client';

import React, { useState, useCallback } from 'react';
import { List, CreateButton, EditButton, ShowButton, useTable } from '@refinedev/antd';
import { useGo, useUpdate, useTranslation } from '@refinedev/core';
import { buildSoftDeleteKeyValues } from '@/utils/soft-delete-key';
import {
    Table,
    Space,
    Tag,
    Button,
    Input,
    Select,
    Card,
    Row,
    Col,
    Tooltip,
    Popconfirm,
    theme,
    Form,
    Empty,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    FileTextOutlined,
    ReloadOutlined,
    SearchOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import {
    SensitiveKeyDisplay,
    StatusToggle,
    UsageStatistics,
    DateTimeDisplay,
} from '@/components/common';
import { KeyHealthBadge } from '@/features/observability';
import { getProviderColor, getProviderText, formatTokenCount } from '@/utils/table-helpers';
import { PROVIDER_OPTIONS } from '@/constants/providers';

const { Search } = Input;
const { useToken } = theme;
const { Text } = Typography;

const API_KEYS_RESOURCE = 'api_keys';

type ApiKey = Tables<'api_keys'>;

interface IApiKeySearch {
    name: string;
    provider: string;
    is_active: boolean;
}

export default function ApiKeysListPage() {
    const { token } = useToken();
    const go = useGo();
    const { translate } = useTranslation();
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const { mutate: updateApiKey } = useUpdate({
        resource: API_KEYS_RESOURCE,
    });

    const { tableProps, searchFormProps } = useTable<ApiKey>({
        syncWithLocation: true,
        resource: API_KEYS_RESOURCE,
        liveMode: 'auto',
        pagination: {
            pageSize: 20,
        },
        filters: {
            permanent: [{ field: 'deleted_at', operator: 'null', value: true }],
        },
        sorters: {
            initial: [{ field: 'created_at', order: 'desc' }],
        },
        onSearch: (data) => {
            const values = data as IApiKeySearch;
            const filters: Array<{
                field: string;
                operator: 'contains' | 'eq';
                value: unknown;
            }> = [];

            if (values.name) {
                filters.push({
                    field: 'name',
                    operator: 'contains',
                    value: values.name,
                });
            }

            if (values.provider) {
                filters.push({
                    field: 'provider',
                    operator: 'eq',
                    value: values.provider,
                });
            }

            if (values.is_active !== undefined) {
                filters.push({
                    field: 'is_active',
                    operator: 'eq',
                    value: values.is_active,
                });
            }

            return filters;
        },
    });

    const toggleKeyVisibility = useCallback((keyId: string) => {
        setRevealedKeys((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(keyId)) {
                newSet.delete(keyId);
            } else {
                newSet.add(keyId);
            }
            return newSet;
        });
    }, []);

    const handleToggleActive = useCallback(
        (record: ApiKey, checked: boolean) => {
            updateApiKey({
                resource: API_KEYS_RESOURCE,
                id: record.id,
                values: {
                    is_active: checked,
                },
                mutationMode: 'optimistic',
                successNotification: {
                    type: 'success',
                    message: translate('api_keys.notifications.statusUpdated'),
                    description: translate(
                        checked
                            ? 'api_keys.notifications.enabled'
                            : 'api_keys.notifications.disabled',
                        { name: record.name },
                    ),
                },
                errorNotification: {
                    type: 'error',
                    message: translate('api_keys.notifications.updateFailed'),
                    description: translate('api_keys.notifications.updateFailedDesc'),
                },
            });
        },
        [updateApiKey, translate],
    );

    const handleDelete = useCallback(
        (record: ApiKey) => {
            updateApiKey({
                resource: API_KEYS_RESOURCE,
                id: record.id,
                values: buildSoftDeleteKeyValues('api', record.id),
                successNotification: {
                    type: 'success',
                    message: translate('api_keys.notifications.deleted'),
                    description: translate('api_keys.notifications.deletedDesc', {
                        name: record.name,
                    }),
                },
                errorNotification: {
                    type: 'error',
                    message: translate('api_keys.notifications.deleteFailed'),
                    description: translate('api_keys.notifications.deleteFailedDesc'),
                },
            });
        },
        [updateApiKey, translate],
    );

    return (
        <List headerButtons={<CreateButton />} title={translate('api_keys.titles.list')} breadcrumb={false}>
            {/* Filters */}
            <Card
                styles={{
                    cover: { marginBottom: token.marginMD },
                    body: { padding: token.paddingMD },
                }}
                title={
                    <Space>
                        <FilterOutlined />
                        <Text strong>{translate('api_keys.filters.title')}</Text>
                    </Space>
                }
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            searchFormProps.form?.resetFields();
                            searchFormProps.form?.submit();
                        }}
                        size="small"
                    >
                        {translate('api_keys.filters.reset')}
                    </Button>
                }
            >
                <Form {...searchFormProps} layout="vertical">
                    <Row gutter={[token.marginMD, token.marginMD]}>
                        <Col xs={24} sm={12} md={10}>
                            <Form.Item name="name" label={translate('api_keys.filters.searchByName')}>
                                <Search
                                    placeholder={translate('api_keys.placeholders.searchName')}
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                    onSearch={() => searchFormProps.form?.submit()}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={7}>
                            <Form.Item name="provider" label={translate('api_keys.fields.provider')}>
                                <Select
                                    placeholder={translate('api_keys.placeholders.allProviders')}
                                    allowClear
                                    options={PROVIDER_OPTIONS}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={7}>
                            <Form.Item name="is_active" label={translate('api_keys.fields.status')}>
                                <Select
                                    placeholder={translate('api_keys.placeholders.allStatus')}
                                    allowClear
                                >
                                    <Select.Option value={true}>
                                        {translate('common.active')}
                                    </Select.Option>
                                    <Select.Option value={false}>
                                        {translate('common.inactive')}
                                    </Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    {...tableProps}
                    rowKey="id"
                    loading={tableProps.loading}
                    scroll={{ x: 1200 }}
                    size="middle"
                    columns={[
                        {
                            title: translate('api_keys.fields.details'),
                            dataIndex: 'name',
                            sorter: true,
                            width: 200,
                            fixed: 'left',
                            render: (value: string, record: ApiKey) => (
                                <Space direction="vertical" size={4}>
                                    <Text strong style={{ fontSize: token.fontSize }}>
                                        {value}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                        {translate('api_keys.fields.idShort', {
                                            id: record.id.slice(0, 8),
                                        })}
                                    </Text>
                                </Space>
                            ),
                        },
                        {
                            title: translate('api_keys.fields.apiKey'),
                            dataIndex: 'api_key_value',
                            width: 300,
                            render: (value: string, record: ApiKey) => (
                                <SensitiveKeyDisplay
                                    value={value}
                                    isRevealed={revealedKeys.has(record.id)}
                                    onToggleVisibility={() => toggleKeyVisibility(record.id)}
                                />
                            ),
                        },
                        {
                            title: translate('api_keys.fields.provider'),
                            dataIndex: 'provider',
                            width: 120,
                            render: (value: string) => (
                                <Tag color={getProviderColor(value)}>{getProviderText(value)}</Tag>
                            ),
                            sorter: true,
                            filters: PROVIDER_OPTIONS.map(({ label, value }) => ({
                                text: label,
                                value: value,
                            })),
                        },
                        {
                            title: translate('api_keys.fields.status'),
                            dataIndex: 'is_active',
                            width: 120,
                            render: (value: boolean, record: ApiKey) => (
                                <StatusToggle
                                    isActive={value}
                                    onToggle={(checked) => handleToggleActive(record, checked)}
                                />
                            ),
                            sorter: true,
                        },
                        {
                            title: translate('api_keys.fields.health'),
                            key: 'health',
                            width: 100,
                            render: (_: unknown, record: ApiKey) => (
                                <KeyHealthBadge
                                    isActive={record.is_active}
                                    successRate={
                                        record.success_count + record.failure_count > 0
                                            ? Math.round(
                                                  (record.success_count /
                                                      (record.success_count +
                                                          record.failure_count)) *
                                                      100,
                                              )
                                            : 100
                                    }
                                    failureCount={record.failure_count}
                                />
                            ),
                        },
                        {
                            title: translate('api_keys.fields.usage'),
                            dataIndex: 'success_count',
                            sorter: true,
                            width: 150,
                            render: (_: unknown, record: ApiKey) => (
                                <UsageStatistics
                                    successCount={record.success_count}
                                    failureCount={record.failure_count}
                                />
                            ),
                        },
                        {
                            title: translate('api_keys.fields.tokens'),
                            key: 'token_usage',
                            dataIndex: 'total_tokens',
                            sorter: true,
                            width: 200,
                            render: (_: unknown, record: ApiKey) => {
                                return (
                                    <div>
                                        <div style={{ fontSize: token.fontSizeSM }}>
                                            <span style={{ color: token.colorInfo }}>
                                                {translate('api_keys.tokens.total', {
                                                    count: formatTokenCount(
                                                        record.total_tokens,
                                                        translate('common.na'),
                                                    ),
                                                })}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                color: token.colorTextSecondary,
                                            }}
                                        >
                                            <span>
                                                {translate('api_keys.tokens.prompt', {
                                                    count: formatTokenCount(
                                                        record.prompt_tokens,
                                                        translate('common.na'),
                                                    ),
                                                })}
                                            </span>
                                            {' | '}
                                            <span>
                                                {translate('api_keys.tokens.completion', {
                                                    count: formatTokenCount(
                                                        record.completion_tokens,
                                                        translate('common.na'),
                                                    ),
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            },
                        },
                        {
                            title: translate('api_keys.fields.lastUsed'),
                            dataIndex: 'last_used_at',
                            width: 140,
                            sorter: true,
                            render: (value: string | null) => (
                                <DateTimeDisplay dateString={value} />
                            ),
                        },
                        {
                            title: translate('api_keys.fields.lastError'),
                            dataIndex: 'last_error_at',
                            width: 140,
                            sorter: true,
                            render: (value: string | null) => (
                                <DateTimeDisplay dateString={value} />
                            ),
                        },
                        {
                            title: translate('table.actions'),
                            dataIndex: 'actions',
                            width: 160,
                            fixed: 'right',
                            render: (_: unknown, record: ApiKey) => (
                                <Space size="small">
                                    <Tooltip title={translate('api_keys.actions.viewLogs')}>
                                        <Button
                                            size="small"
                                            type="text"
                                            icon={<FileTextOutlined />}
                                            onClick={() =>
                                                go({
                                                    to: `/request-logs?api_key_id=${record.id}`,
                                                })
                                            }
                                        />
                                    </Tooltip>
                                    <Tooltip title={translate('api_keys.actions.edit')}>
                                        <EditButton
                                            hideText
                                            recordItemId={record.id}
                                            size="small"
                                        />
                                    </Tooltip>
                                    <Tooltip title={translate('api_keys.actions.viewDetails')}>
                                        <ShowButton
                                            hideText
                                            recordItemId={record.id}
                                            size="small"
                                        />
                                    </Tooltip>
                                    <Tooltip title={translate('api_keys.actions.delete')}>
                                        <Popconfirm
                                            title={translate('api_keys.delete.title')}
                                            description={translate('api_keys.delete.description')}
                                            onConfirm={() => handleDelete(record)}
                                            okText={translate('buttons.delete')}
                                            cancelText={translate('buttons.cancel')}
                                            okType="danger"
                                        >
                                            <Button
                                                danger
                                                size="small"
                                                type="text"
                                                icon={<DeleteOutlined />}
                                            />
                                        </Popconfirm>
                                    </Tooltip>
                                </Space>
                            ),
                        },
                    ]}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={translate('api_keys.empty')}
                            />
                        ),
                    }}
                />
            </Card>
        </List>
    );
}
