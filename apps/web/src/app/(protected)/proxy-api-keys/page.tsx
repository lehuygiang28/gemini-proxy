'use client';

import React, { useState, useCallback } from 'react';
import { List, CreateButton, EditButton, ShowButton, useTable } from '@refinedev/antd';
import { useGo, useUpdate } from '@refinedev/core';
import { buildSoftDeleteKeyValues } from '@/utils/soft-delete-key';
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
    Tabs,
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
import { ProxyQuickStart } from '@/features/proxy-quickstart';
import { formatTokenCount } from '@/utils/table-helpers';

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
    const go = useGo();
    const [activeTab, setActiveTab] = useState('keys');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const { mutate: updateProxyApiKey } = useUpdate();

    const { tableProps, searchFormProps } = useTable<ProxyApiKey>({
        syncWithLocation: true,
        resource: PROXY_API_KEYS_RESOURCE,
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
            updateProxyApiKey({
                resource: PROXY_API_KEYS_RESOURCE,
                id: record.id,
                values: buildSoftDeleteKeyValues('proxy', record.id),
                successNotification: {
                    type: 'success',
                    message: 'Proxy API Key Deleted',
                    description: `Proxy API key "${record.name}" removed. Request logs are kept.`,
                },
                errorNotification: {
                    type: 'error',
                    message: 'Delete Failed',
                    description: 'Failed to delete proxy API key',
                },
            });
        },
        [updateProxyApiKey],
    );

    return (
        <List
            headerButtons={activeTab === 'keys' ? <CreateButton /> : <></>}
            title="Proxy API Keys"
            breadcrumb={false}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    { key: 'keys', label: 'Keys' },
                    { key: 'quickstart', label: 'Quick start' },
                ]}
                style={{ marginBottom: 8 }}
            />

            {activeTab === 'quickstart' ? (
                <ProxyQuickStart />
            ) : (
                <>
                    <Card
                        styles={{
                            body: {
                                padding: token.paddingMD,
                            },
                        }}
                        title={
                            <Space>
                                <FilterOutlined />
                                <Text strong>Filters</Text>
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
                                            <Text
                                                type="secondary"
                                                style={{ fontSize: token.fontSizeSM }}
                                            >
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
                                            onToggleVisibility={() =>
                                                toggleKeyVisibility(record.id)
                                            }
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
                                            onToggle={(checked) =>
                                                handleToggleActive(record, checked)
                                            }
                                        />
                                    ),
                                    sorter: true,
                                },
                                {
                                    title: 'Health',
                                    key: 'health',
                                    width: 100,
                                    render: (_: unknown, record: ProxyApiKey) => (
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
                                    title: 'Usage Statistics',
                                    dataIndex: 'success_count',
                                    sorter: true,
                                    width: 150,
                                    render: (_: unknown, record: ProxyApiKey) => (
                                        <UsageStatistics
                                            successCount={record.success_count}
                                            failureCount={record.failure_count}
                                        />
                                    ),
                                },
                                {
                                    title: 'Token Usage',
                                    key: 'token_usage',
                                    dataIndex: 'total_tokens',
                                    sorter: true,
                                    width: 200,
                                    render: (_: unknown, record: ProxyApiKey) => {
                                        return (
                                            <div>
                                                <div style={{ fontSize: token.fontSizeSM }}>
                                                    <span style={{ color: token.colorInfo }}>
                                                        Total:{' '}
                                                        {formatTokenCount(record.total_tokens)}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: token.fontSizeSM,
                                                        color: token.colorTextSecondary,
                                                    }}
                                                >
                                                    <span>
                                                        Prompt:{' '}
                                                        {formatTokenCount(record.prompt_tokens)}
                                                    </span>
                                                    {' | '}
                                                    <span>
                                                        Completion:{' '}
                                                        {formatTokenCount(record.completion_tokens)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    },
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
                                    title: 'Actions',
                                    dataIndex: 'actions',
                                    width: 160,
                                    fixed: 'right',
                                    render: (_: unknown, record: ProxyApiKey) => (
                                        <Space size="small">
                                            <Tooltip title="View logs for this key">
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<FileTextOutlined />}
                                                    onClick={() =>
                                                        go({
                                                            to: `/request-logs?proxy_key_id=${record.id}`,
                                                        })
                                                    }
                                                />
                                            </Tooltip>
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
                                                    description="Key is deactivated and hidden. Request logs stay linked."
                                                    onConfirm={() => handleDelete(record)}
                                                    okText="Delete"
                                                    cancelText="Cancel"
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
                                        description="No proxy API keys found"
                                    />
                                ),
                            }}
                        />
                    </Card>
                </>
            )}
        </List>
    );
}
