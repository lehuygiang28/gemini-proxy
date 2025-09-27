'use client';

import React, { useState } from 'react';
import { List, CreateButton, EditButton, ShowButton, DeleteButton } from '@refinedev/antd';
import { useTable } from '@refinedev/antd';
import { useUpdate } from '@refinedev/core';
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
    message,
    theme,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import {
    SensitiveKeyDisplay,
    StatusToggle,
    UsageStatistics,
    DateTimeDisplay,
} from '@/components/common';
import { getProviderColor, getProviderText } from '@/utils/table-helpers';

const { Search } = Input;
const { Option } = Select;
const { useToken } = theme;

type ApiKey = Tables<'api_keys'>;

export default function ApiKeysListPage() {
    const { token } = useToken();
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const { mutate: updateApiKey } = useUpdate();

    const { tableProps, searchFormProps } = useTable<ApiKey>({
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

    const handleToggleActive = async (record: ApiKey, checked: boolean) => {
        try {
            await updateApiKey({
                resource: 'api_keys',
                id: record.id,
                values: {
                    is_active: checked,
                },
            });

            message.success(
                `API key "${record.name}" ${checked ? 'enabled' : 'disabled'} successfully`,
            );
        } catch (error) {
            message.error('Failed to update API key status');
            console.error('Error updating API key:', error);
        }
    };

    return (
        <List headerButtons={<CreateButton />} title="API Keys Management">
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
                        <Select
                            placeholder="Filter by provider"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={(value) => {
                                searchFormProps.form?.setFieldsValue({ provider: value });
                                searchFormProps.form?.submit();
                            }}
                        >
                            <Option value="googleaistudio">Google AI Studio</Option>
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

            <Table<ApiKey>
                {...tableProps}
                rowKey="id"
                columns={[
                    {
                        title: 'Name',
                        dataIndex: 'name',
                        sorter: true,
                        render: (value: string, record: ApiKey) => (
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
                        title: 'API Key',
                        dataIndex: 'api_key_value',
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
                        render: (value: string) => (
                            <Tag color={getProviderColor(value)}>{getProviderText(value)}</Tag>
                        ),
                        sorter: true,
                        filters: [{ text: 'Google AI Studio', value: 'googleaistudio' }],
                    },
                    {
                        title: 'Status',
                        dataIndex: 'is_active',
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
                        render: (_: unknown, record: ApiKey) => (
                            <Space>
                                <Tooltip title="Edit API Key">
                                    <EditButton hideText recordItemId={record.id} />
                                </Tooltip>
                                <Tooltip title="View Details">
                                    <ShowButton hideText recordItemId={record.id} />
                                </Tooltip>
                                <Tooltip title="Delete API Key">
                                    <Popconfirm
                                        title="Are you sure you want to delete this API key?"
                                        description="This action cannot be undone."
                                        onConfirm={() => {
                                            // Handle delete
                                            message.success('API key deleted successfully');
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
