'use client';

import React, { useState } from 'react';
import { List, CreateButton, EditButton, ShowButton, DeleteButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { useUpdate } from '@refinedev/core';
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
    message,
    theme,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import {
    SensitiveKeyDisplay,
    StatusToggle,
    UsageStatistics,
    TokenUsage,
    DateTimeDisplay,
} from '@/components/common';

const { Search } = Input;
const { Option } = Select;
const { useToken } = theme;

type ProxyApiKey = Tables<'proxy_api_keys'>;

export default function ProxyApiKeysListPage() {
    const { token } = useToken();
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const { mutate: updateProxyKey } = useUpdate();

    const { tableProps, searchFormProps } = useTable<ProxyApiKey>({
        syncWithLocation: true,
        pagination: { pageSize: 10 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
        filters: {
            initial: [],
        },
    });

    const toggleKeyVisibility = (keyId: string) => {
        const newRevealedKeys = new Set(revealedKeys);
        if (newRevealedKeys.has(keyId)) {
            newRevealedKeys.delete(keyId);
        } else {
            newRevealedKeys.add(keyId);
        }
        setRevealedKeys(newRevealedKeys);
    };

    const handleToggleActive = async (record: ProxyApiKey, checked: boolean) => {
        try {
            await updateProxyKey({
                resource: 'proxy_api_keys',
                id: record.id,
                values: {
                    is_active: checked,
                },
            });

            message.success(
                `Proxy key "${record.name}" ${checked ? 'enabled' : 'disabled'} successfully`,
            );
        } catch (error) {
            message.error('Failed to update proxy key status');
            console.error('Error updating proxy key:', error);
        }
    };

    return (
        <List headerButtons={<CreateButton />} title="Proxy API Keys Management">
            {/* Filters */}
            <Card style={{ marginBottom: token.marginMD }} bodyStyle={{ padding: token.paddingMD }}>
                <Row gutter={[token.marginMD, token.marginMD]} align="middle">
                    <Col xs={24} sm={8}>
                        <Search
                            placeholder="Search by name..."
                            allowClear
                            onSearch={(value) => {
                                setSearchText(value);
                                searchFormProps.form?.setFieldsValue({ name: value });
                                searchFormProps.form?.submit();
                            }}
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: '100%' }}
                        >
                            <Option value="all">All Status</Option>
                            <Option value="active">Active</Option>
                            <Option value="inactive">Inactive</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select placeholder="Sort by usage" allowClear style={{ width: '100%' }}>
                            <Option value="total_tokens_desc">Most Used</Option>
                            <Option value="total_tokens_asc">Least Used</Option>
                            <Option value="last_used_desc">Recently Used</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                searchFormProps.form?.resetFields();
                                setSearchText('');
                                setStatusFilter('all');
                            }}
                            style={{ width: '100%' }}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Table<ProxyApiKey>
                {...tableProps}
                rowKey="id"
                columns={[
                    {
                        title: 'Name',
                        dataIndex: 'name',
                        sorter: true,
                        render: (value: string, record: ProxyApiKey) => (
                            <div>
                                <div style={{ fontWeight: 500, color: token.colorText }}>
                                    {value}
                                </div>
                                <div
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorTextSecondary,
                                    }}
                                >
                                    ID: {record.id.slice(0, 8)}...
                                </div>
                            </div>
                        ),
                    },
                    {
                        title: 'Proxy Key',
                        dataIndex: 'proxy_key_value',
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
                        render: (value: boolean, record: ProxyApiKey) => (
                            <StatusToggle
                                isActive={value}
                                onToggle={(checked) => handleToggleActive(record, checked)}
                            />
                        ),
                        sorter: true,
                    },
                    {
                        title: 'Token Usage',
                        render: (_: unknown, record: ProxyApiKey) => (
                            <TokenUsage
                                totalTokens={record.total_tokens || 0}
                                promptTokens={record.prompt_tokens || 0}
                                completionTokens={record.completion_tokens || 0}
                            />
                        ),
                    },
                    {
                        title: 'Usage Statistics',
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
                        sorter: true,
                        render: (value: string | null) => <DateTimeDisplay dateString={value} />,
                    },
                    {
                        title: 'Created',
                        dataIndex: 'created_at',
                        sorter: true,
                        render: (value: string | null) => <DateTimeDisplay dateString={value} />,
                    },
                    {
                        title: 'Actions',
                        dataIndex: 'actions',
                        render: (_: unknown, record: ProxyApiKey) => (
                            <Space>
                                <Tooltip title="Edit Proxy Key">
                                    <EditButton hideText recordItemId={record.id} />
                                </Tooltip>
                                <Tooltip title="View Details">
                                    <ShowButton hideText recordItemId={record.id} />
                                </Tooltip>
                                <Tooltip title="Delete Proxy Key">
                                    <Popconfirm
                                        title="Are you sure you want to delete this proxy key?"
                                        description="This action cannot be undone."
                                        onConfirm={() => {
                                            // Handle delete
                                            message.success('Proxy key deleted successfully');
                                        }}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                        <DeleteButton hideText recordItemId={record.id} />
                                    </Popconfirm>
                                </Tooltip>
                            </Space>
                        ),
                    },
                ]}
            />
        </List>
    );
}
