'use client';

import React from 'react';
import { List, useTable } from '@refinedev/antd';
import { useTranslation, type HttpError } from '@refinedev/core';
import { Alert, Button, Empty, Table, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { DateTimeDisplay } from '@/components/common';
import {
    RECONCILIATION_RESOURCE,
    unresolvedReconciliationFilters,
    useReconcileProxyRequest,
} from '@/features/reconciliation';

const { Text } = Typography;

type ReconciliationRow = Tables<'proxy_reconciliation_needed'>;

/**
 * Unresolved stale admit reservations. Retry re-runs finalize_proxy_request.
 */
export default function ReconciliationListPage() {
    const { translate } = useTranslation();
    const { reconcile, pendingRequestId } = useReconcileProxyRequest();

    const { tableProps } = useTable<ReconciliationRow, HttpError>({
        syncWithLocation: true,
        resource: RECONCILIATION_RESOURCE,
        liveMode: 'auto',
        meta: {
            idColumnName: 'request_id',
        },
        pagination: {
            pageSize: 20,
        },
        sorters: {
            initial: [{ field: 'created_at', order: 'desc' }],
        },
        filters: {
            permanent: unresolvedReconciliationFilters(),
        },
        queryOptions: {
            refetchInterval: 30_000,
        },
    });

    return (
        <List>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={translate('proxy_reconciliation_needed.heldTitle')}
                description={translate('proxy_reconciliation_needed.heldCopy')}
            />
            <Table
                {...tableProps}
                rowKey="request_id"
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={translate('proxy_reconciliation_needed.empty')}
                        />
                    ),
                }}
                columns={[
                    {
                        title: translate('proxy_reconciliation_needed.fields.requestId'),
                        dataIndex: 'request_id',
                        ellipsis: true,
                        render: (value: string) => <Text copyable>{value}</Text>,
                    },
                    {
                        title: translate('proxy_reconciliation_needed.fields.proxyKey'),
                        dataIndex: 'proxy_key_id',
                        ellipsis: true,
                    },
                    {
                        title: translate('proxy_reconciliation_needed.fields.lastError'),
                        dataIndex: 'last_error',
                        ellipsis: true,
                    },
                    {
                        title: translate('proxy_reconciliation_needed.fields.created'),
                        dataIndex: 'created_at',
                        width: 160,
                        render: (value: string) => <DateTimeDisplay dateString={value} />,
                    },
                    {
                        title: translate('table.actions'),
                        key: 'actions',
                        width: 140,
                        render: (_value, record) => (
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                loading={pendingRequestId === record.request_id}
                                onClick={() => void reconcile(record.request_id)}
                            >
                                {translate('proxy_reconciliation_needed.actions.retry')}
                            </Button>
                        ),
                    },
                ]}
            />
        </List>
    );
}
