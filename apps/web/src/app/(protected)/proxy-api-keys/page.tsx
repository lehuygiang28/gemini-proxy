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

const { Search } = Input;
const { useToken } = theme;
const { Text } = Typography;

const PROXY_API_KEYS_RESOURCE = 'proxy_api_keys';

type ProxyApiKey = Tables<'proxy_api_keys'>;
interface IProxyApiKeySearch {
    name: string;
    is_active: boolean;
}

export default function ProxyApiKeysListPage() {
    const { token } = useToken();
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const { mutate: updateProxyApiKey } = useUpdate();
    const { mutate: deleteProxyApiKey } = useDelete();

    const { tableProps, searchFormProps } = useTable<ProxyApiKey>({
        syncWithLocation: true,
        resource: PROXY_API_KEYS_RESOURCE,
        pagination: {
            pageSize: 20,
        },
        sorters: {
            initial: [{ field: 'created_at', order: 'desc' }],
        },
        onSearch: (data) => {
            const values = data as IProxyApiKeySearch;
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
        (record: ProxyApiKey, checked: boolean) => {
            updateProxyApiKey({
                resource: PROXY_API_KEYS_RESOURCE,
                id: record.id,
                values: {
                    is_active: checked,
                },
                successNotification: {
                    type: 'success',
                    message: 'Status Updated',
                    description: `Proxy API key "${record.name}" ${checked ? 'enabled' : 'disabled'} successfully`,
                },
                errorNotification: {
                    type: 'error',
                    message: 'Update Failed',
                    description: 'Failed to update proxy API key status',
                },
            });
        },
        [updateProxyApiKey],
    );

    const handleDelete = useCallback(
        (record: ProxyApiKey) => {
            deleteProxyApiKey({
                resource: PROXY_API_KEYS_RESOURCE,
                id: record.id,
                successNotification: {
                    type: 'success',
                    message: 'Proxy API Key Deleted',
                    description: `Proxy API key "${record.name}" has been deleted successfully`,
                },
                errorNotification: {
                    type: 'error',
                    message: 'Delete Failed',
                    description: 'Failed to delete proxy API key',
                },
            });
        },
        [deleteProxyApiKey],
    );

    return (
        <List headerButtons={<CreateButton />} title="Proxy API Keys Management" breadcrumb={false}>
            <Card
                styles={{
                    cover: {
                        marginBottom: token.marginMD,
                    },
                    body: {
                        padding: token.paddingMD,
                    },
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
                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="name" label="Search by Name">
                                <Search
                                    placeholder="Search proxy API key names..."
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                    onSearch={() => searchFormProps.form?.submit()}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
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

            <Card>
                <Table
                    {...tableProps}
                    rowKey="id"
                    loading={tableProps.loading}
                    scroll={{ x: 1200 }}
                    size="middle"
                    columns={[
                        {
                            title: 'Proxy API Key Details',
                            dataIndex: 'name',
                            sorter: true,
                            width: 200,
                            fixed: 'left',
                            render: (value: string, record: ProxyApiKey) => (
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
                            title: 'Proxy API Key',
                            dataIndex: 'proxy_key_value',
                            width: 300,
                            render: (value: string, record: ProxyApiKey) => (
                                <SensitiveKeyDisplay
                                    value={value}
                                    isRevealed={revealedKeys.has(record.id)}
                                    onToggleVisibility={() => toggleKeyVisibility(record.id)}
                                />
                            ),
                        },
                        {
                            title: 'Status',
                            dataIndex: 'is_active',
                            width: 120,
                            render: (value: boolean, record: ProxyApiKey) => (
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
                            render: (_: unknown, record: ProxyApiKey) => (
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
                            title: 'Last Error',
                            dataIndex: 'last_error_at',
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
                            render: (_: unknown, record: ProxyApiKey) => (
                                <Space size="small">
                                    <Tooltip title="Edit Proxy API Key">
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
                                    <Tooltip title="Delete Proxy API Key">
                                        <Popconfirm
                                            title="Delete Proxy API Key"
                                            description="Are you sure you want to delete this proxy API key? This action cannot be undone."
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
                                description="No proxy API keys found"
                            />
                        ),
                    }}
                />
            </Card>
        </List>
    );
}
