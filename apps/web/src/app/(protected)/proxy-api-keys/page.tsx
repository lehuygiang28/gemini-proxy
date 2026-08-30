'use client';

import React, { useState, useCallback } from 'react';
import { List, CreateButton, EditButton, ShowButton, useTable } from '@refinedev/antd';
import { useGo, useNotification, useUpdate, useTranslation } from '@refinedev/core';
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
    Modal,
    Alert,
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    FileTextOutlined,
    ReloadOutlined,
    SearchOutlined,
    FilterOutlined,
    SyncOutlined,
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
import { formatTokenCount, copyToClipboard } from '@/utils/table-helpers';
import { generateProxyApiKeyValue } from '@/utils/generate-proxy-api-key';

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
    const { translate } = useTranslation();
    const notification = useNotification();
    const [activeTab, setActiveTab] = useState('keys');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const { mutate: updateProxyApiKey } = useUpdate();
    const [rotatedSecret, setRotatedSecret] = useState<{ name: string; value: string } | null>(
        null,
    );

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
                    message: translate('proxy_api_keys.notifications.statusUpdated'),
                    description: translate(
                        checked
                            ? 'proxy_api_keys.notifications.enabled'
                            : 'proxy_api_keys.notifications.disabled',
                        { name: record.name },
                    ),
                },
                errorNotification: {
                    type: 'error',
                    message: translate('proxy_api_keys.notifications.updateFailed'),
                    description: translate('proxy_api_keys.notifications.updateFailedDesc'),
                },
            });
        },
        [updateProxyApiKey, translate],
    );

    const handleDelete = useCallback(
        (record: ProxyApiKey) => {
            updateProxyApiKey({
                resource: PROXY_API_KEYS_RESOURCE,
                id: record.id,
                values: buildSoftDeleteKeyValues('proxy', record.id),
                successNotification: {
                    type: 'success',
                    message: translate('proxy_api_keys.notifications.deleted'),
                    description: translate('proxy_api_keys.notifications.deletedDesc', {
                        name: record.name,
                    }),
                },
                errorNotification: {
                    type: 'error',
                    message: translate('proxy_api_keys.notifications.deleteFailed'),
                    description: translate('proxy_api_keys.notifications.deleteFailedDesc'),
                },
            });
        },
        [updateProxyApiKey, translate],
    );

    const handleRotate = useCallback(
        (record: ProxyApiKey) => {
            const nextValue = generateProxyApiKeyValue();
            updateProxyApiKey(
                {
                    resource: PROXY_API_KEYS_RESOURCE,
                    id: record.id,
                    values: { proxy_key_value: nextValue },
                    successNotification: {
                        type: 'success',
                        message: translate('proxy_api_keys.notifications.rotated'),
                        description: translate('proxy_api_keys.notifications.rotatedDesc', {
                            name: record.name,
                        }),
                    },
                    errorNotification: {
                        type: 'error',
                        message: translate('proxy_api_keys.notifications.rotateFailed'),
                        description: translate('proxy_api_keys.notifications.rotateFailedDesc'),
                    },
                },
                {
                    onSuccess: () => {
                        setRotatedSecret({ name: record.name, value: nextValue });
                    },
                },
            );
        },
        [updateProxyApiKey, translate],
    );

    const handleCopyRotatedKey = useCallback(() => {
        if (!rotatedSecret) return;
        if (copyToClipboard(rotatedSecret.value)) {
            notification.open({
                type: 'success',
                message: translate('proxy_api_keys.create.copied'),
            });
            return;
        }
        notification.open({
            type: 'error',
            message: translate('proxy_api_keys.create.copyFailed'),
        });
    }, [rotatedSecret, notification, translate]);

    return (
        <List
            headerButtons={activeTab === 'keys' ? <CreateButton /> : <></>}
            title={translate('proxy_api_keys.titles.list')}
            breadcrumb={false}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    { key: 'keys', label: translate('proxy_api_keys.tabs.keys') },
                    { key: 'quickstart', label: translate('proxy_api_keys.tabs.quickstart') },
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
                                <Text strong>{translate('proxy_api_keys.filters.title')}</Text>
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
                                {translate('proxy_api_keys.filters.reset')}
                            </Button>
                        }
                    >
                        <Form {...searchFormProps} layout="vertical">
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="name"
                                        label={translate('proxy_api_keys.filters.searchByName')}
                                    >
                                        <Search
                                            placeholder={translate(
                                                'proxy_api_keys.placeholders.searchName',
                                            )}
                                            allowClear
                                            enterButton={<SearchOutlined />}
                                            onSearch={() => searchFormProps.form?.submit()}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="is_active"
                                        label={translate('proxy_api_keys.fields.status')}
                                    >
                                        <Select
                                            placeholder={translate(
                                                'proxy_api_keys.placeholders.allStatus',
                                            )}
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

                    <Card>
                        <Table
                            {...tableProps}
                            rowKey="id"
                            loading={tableProps.loading}
                            scroll={{ x: 1200 }}
                            size="middle"
                            columns={[
                                {
                                    title: translate('proxy_api_keys.fields.details'),
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
                                                {translate('proxy_api_keys.fields.idShort', {
                                                    id: record.id.slice(0, 8),
                                                })}
                                            </Text>
                                        </Space>
                                    ),
                                },
                                {
                                    title: translate('proxy_api_keys.fields.proxyKey'),
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
                                    title: translate('proxy_api_keys.fields.status'),
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
                                    title: translate('proxy_api_keys.fields.health'),
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
                                    title: translate('proxy_api_keys.fields.usage'),
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
                                    title: translate('proxy_api_keys.fields.tokens'),
                                    key: 'token_usage',
                                    dataIndex: 'total_tokens',
                                    sorter: true,
                                    width: 200,
                                    render: (_: unknown, record: ProxyApiKey) => {
                                        return (
                                            <div>
                                                <div style={{ fontSize: token.fontSizeSM }}>
                                                    <span style={{ color: token.colorInfo }}>
                                                        {translate('proxy_api_keys.tokens.total', {
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
                                                        {translate('proxy_api_keys.tokens.prompt', {
                                                            count: formatTokenCount(
                                                                record.prompt_tokens,
                                                                translate('common.na'),
                                                            ),
                                                        })}
                                                    </span>
                                                    {' | '}
                                                    <span>
                                                        {translate(
                                                            'proxy_api_keys.tokens.completion',
                                                            {
                                                                count: formatTokenCount(
                                                                    record.completion_tokens,
                                                                    translate('common.na'),
                                                                ),
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    title: translate('proxy_api_keys.fields.lastUsed'),
                                    dataIndex: 'last_used_at',
                                    width: 140,
                                    sorter: true,
                                    render: (value: string | null) => (
                                        <DateTimeDisplay dateString={value} />
                                    ),
                                },
                                {
                                    title: translate('table.actions'),
                                    dataIndex: 'actions',
                                    width: 200,
                                    fixed: 'right',
                                    render: (_: unknown, record: ProxyApiKey) => (
                                        <Space size="small">
                                            <Tooltip
                                                title={translate('proxy_api_keys.actions.viewLogs')}
                                            >
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
                                            <Tooltip
                                                title={translate('proxy_api_keys.actions.rotate')}
                                            >
                                                <Popconfirm
                                                    title={translate('proxy_api_keys.rotate.title')}
                                                    description={translate(
                                                        'proxy_api_keys.rotate.description',
                                                    )}
                                                    onConfirm={() => handleRotate(record)}
                                                    okText={translate('buttons.save')}
                                                    cancelText={translate('buttons.cancel')}
                                                >
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<SyncOutlined />}
                                                    />
                                                </Popconfirm>
                                            </Tooltip>
                                            <Tooltip
                                                title={translate('proxy_api_keys.actions.edit')}
                                            >
                                                <EditButton
                                                    hideText
                                                    recordItemId={record.id}
                                                    size="small"
                                                />
                                            </Tooltip>
                                            <Tooltip
                                                title={translate(
                                                    'proxy_api_keys.actions.viewDetails',
                                                )}
                                            >
                                                <ShowButton
                                                    hideText
                                                    recordItemId={record.id}
                                                    size="small"
                                                />
                                            </Tooltip>
                                            <Tooltip
                                                title={translate('proxy_api_keys.actions.delete')}
                                            >
                                                <Popconfirm
                                                    title={translate('proxy_api_keys.delete.title')}
                                                    description={translate(
                                                        'proxy_api_keys.delete.description',
                                                    )}
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
                                        description={translate('proxy_api_keys.empty')}
                                    />
                                ),
                            }}
                        />
                    </Card>
                </>
            )}
            <Modal
                open={Boolean(rotatedSecret)}
                title={translate('proxy_api_keys.rotate.doneTitle')}
                onCancel={() => setRotatedSecret(null)}
                footer={[
                    <Button key="close" onClick={() => setRotatedSecret(null)}>
                        {translate('buttons.cancel')}
                    </Button>,
                    <Button
                        key="copy"
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={handleCopyRotatedKey}
                    >
                        {translate('proxy_api_keys.create.copyClipboard')}
                    </Button>,
                ]}
            >
                <Alert
                    message={translate('proxy_api_keys.rotate.doneBody')}
                    type="warning"
                    showIcon
                    style={{ marginBottom: token.marginMD }}
                />
                <Input.Password value={rotatedSecret?.value} readOnly />
            </Modal>
        </List>
    );
}
