'use client';

import React, { useState, useCallback } from 'react';
import {
    List,
    CreateButton,
    EditButton,
    ShowButton,
    DeleteButton,
    useTable,
} from '@refinedev/antd';
import { useDelete, useUpdate } from '@refinedev/core';
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
import { ReloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import {
    SensitiveKeyDisplay,
    StatusToggle,
    UsageStatistics,
    DateTimeDisplay,
} from '@/components/common';
import { getProviderColor, getProviderText } from '@/utils/table-helpers';
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
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const { mutate: updateApiKey } = useUpdate({
        resource: API_KEYS_RESOURCE,
    });
    const { mutate: deleteApiKey } = useDelete();

    const { tableProps, searchFormProps } = useTable<ApiKey>({
        syncWithLocation: true,
        resource: API_KEYS_RESOURCE,
        pagination: {
            pageSize: 20,
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
                    message: 'Status Updated',
                    description: `API key "${record.name}" ${checked ? 'enabled' : 'disabled'} successfully`,
                },
                errorNotification: {
                    type: 'error',
                    message: 'Update Failed',
                    description: 'Failed to update API key status',
                },
            });
        },
        [updateApiKey],
    );

    const handleDelete = useCallback(
        (record: ApiKey) => {
            deleteApiKey({
                resource: API_KEYS_RESOURCE,
                id: record.id,
                mutationMode: 'optimistic',
                successNotification: {
                    type: 'success',
                    message: 'API Key Deleted',
                    description: `API key "${record.name}" has been deleted successfully`,
                },
                errorNotification: {
                    type: 'error',
                    message: 'Delete Failed',
                    description: 'Failed to delete API key',
                },
            });
        },
        [deleteApiKey],
    );

    return (
        <List headerButtons={<CreateButton />} title="API Keys Management" breadcrumb={false}>
            {/* Filters */}
            <Card
                styles={{
                    cover: { marginBottom: token.marginMD },
                    body: { padding: token.paddingMD },
                }}
                title={
                    <Space>
                        <FilterOutlined />
                        <Text strong>Filters & Search</Text>
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
                        Reset
                    </Button>
                }
            >
                <Form {...searchFormProps} layout="vertical">
                    <Row gutter={[token.marginMD, token.marginMD]}>
                        <Col xs={24} sm={12} md={10}>
                            <Form.Item name="name" label="Search by Name">
                                <Search
                                    placeholder="Search API key names..."
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                    onSearch={() => searchFormProps.form?.submit()}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={7}>
                            <Form.Item name="provider" label="Provider">
                                <Select
                                    placeholder="All Providers"
                                    allowClear
                                    options={PROVIDER_OPTIONS}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={7}>
                            <Form.Item name="is_active" label="Status">
                                <Select placeholder="All Status" allowClear>
                                    <Select.Option value={true}>Active</Select.Option>
                                    <Select.Option value={false}>Inactive</Select.Option>
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
                            title: 'API Key Details',
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
                                        ID: {record.id.slice(0, 8)}...
                                    </Text>
                                </Space>
                            ),
                        },
                        {
                            title: 'API Key',
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
                            title: 'Provider',
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
                            title: 'Status',
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
                            title: 'Usage Statistics',
                            width: 150,
                            render: (_: unknown, record: ApiKey) => (
                                <UsageStatistics
                                    successCount={record.success_count}
                                    failureCount={record.failure_count}
                                />
                            ),
                        },
                        {
                            title: 'Last Used',
                            dataIndex: 'last_used_at',
                            width: 140,
                            sorter: true,
                            render: (value: string | null) => (
                                <DateTimeDisplay dateString={value} />
                            ),
                        },
                        {
                            title: 'Created',
                            dataIndex: 'created_at',
                            width: 140,
                            sorter: true,
                            render: (value: string | null) => (
                                <DateTimeDisplay dateString={value} />
                            ),
                        },
                        {
                            title: 'Actions',
                            dataIndex: 'actions',
                            width: 120,
                            fixed: 'right',
                            render: (_: unknown, record: ApiKey) => (
                                <Space size="small">
                                    <Tooltip title="Edit API Key">
                                        <EditButton
                                            hideText
                                            recordItemId={record.id}
                                            size="small"
                                        />
                                    </Tooltip>
                                    <Tooltip title="View Details">
                                        <ShowButton
                                            hideText
                                            recordItemId={record.id}
                                            size="small"
                                        />
                                    </Tooltip>
                                    <Tooltip title="Delete API Key">
                                        <Popconfirm
                                            title="Delete API Key"
                                            description="Are you sure you want to delete this API key? This action cannot be undone."
                                            onConfirm={() => handleDelete(record)}
                                            okText="Yes, Delete"
                                            cancelText="Cancel"
                                            okType="danger"
                                        >
                                            <DeleteButton
                                                hideText
                                                recordItemId={record.id}
                                                size="small"
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
                                description="No API keys found"
                            />
                        ),
                    }}
                />
            </Card>
        </List>
    );
}
