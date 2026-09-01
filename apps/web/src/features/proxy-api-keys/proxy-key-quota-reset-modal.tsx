'use client';

import React from 'react';
import { Checkbox, Form, Space, Spin, Typography } from 'antd';
import {
    useCustom,
    useCustomMutation,
    useInvalidate,
    useTranslation,
    type BaseRecord,
    type HttpError,
} from '@refinedev/core';
import { selectedQuotaWindowTypes, type ProxyQuotaWindowType } from '@gemini-proxy/core';
import { ConfirmAlertModal } from '@/components/common';
import { formatTokenCount } from '@/utils/table-helpers';

const PROXY_API_KEYS_RESOURCE = 'proxy_api_keys';

type QuotaWindowSnapshot = {
    window_start?: string | null;
    exists?: boolean;
    request_count?: number;
    token_count?: number;
    reserved_tokens?: number;
    reserved_cost_usd?: number;
    settled_cost_usd?: number;
};

type CurrentProxyKeyQuota = {
    minute: QuotaWindowSnapshot;
    day: QuotaWindowSnapshot;
    month: QuotaWindowSnapshot;
};

type ResetQuotaResult = {
    reset: string[];
    skipped: string[];
};

type QuotaResetVariables = {
    p_proxy_key_id: string;
    p_window_types: ProxyQuotaWindowType[];
};

type QuotaFormValues = {
    minute: boolean;
    day: boolean;
    month: boolean;
};

type ProxyKeyQuotaResetModalProps = {
    open: boolean;
    proxyKeyId: string | null;
    onClose: () => void;
};

function formatUsd(value: number): string {
    return value.toFixed(6);
}

function windowUsageLabel(
    snapshot: QuotaWindowSnapshot | undefined,
    translate: (key: string, params?: Record<string, string>) => string,
): string {
    const requests = snapshot?.request_count ?? 0;
    const tokens = snapshot?.token_count ?? 0;
    const usd = Number(snapshot?.reserved_cost_usd ?? 0) + Number(snapshot?.settled_cost_usd ?? 0);
    return translate('proxy_api_keys.quotaReset.usage', {
        requests: String(requests),
        tokens: formatTokenCount(tokens, translate('common.na')),
        usd: formatUsd(usd),
    });
}

export function ProxyKeyQuotaResetModal({
    open,
    proxyKeyId,
    onClose,
}: ProxyKeyQuotaResetModalProps): React.ReactElement {
    const { translate } = useTranslation();
    const invalidate = useInvalidate();
    const [form] = Form.useForm<QuotaFormValues>();
    const minuteChecked = Form.useWatch('minute', form);
    const dayChecked = Form.useWatch('day', form);
    const monthChecked = Form.useWatch('month', form);
    const selectedWindows = selectedQuotaWindowTypes({
        minute: minuteChecked ?? true,
        day: dayChecked ?? true,
        month: monthChecked ?? true,
    });

    const { result, query } = useCustom<CurrentProxyKeyQuota>({
        url: 'rpc/current_proxy_key_quota',
        method: 'post',
        config: {
            payload: { p_proxy_key_id: proxyKeyId ?? '' },
        },
        meta: {
            operation: 'rpc',
            function: 'current_proxy_key_quota',
        },
        queryOptions: {
            enabled: open && Boolean(proxyKeyId),
        },
    });

    const { mutate, mutation } = useCustomMutation<
        ResetQuotaResult & BaseRecord,
        HttpError,
        QuotaResetVariables
    >();

    const quota = result?.data;
    // useCustom seeds result.data as {} before the query resolves.
    const usageLoading = query.isLoading;

    const handleConfirm = (): void => {
        if (!proxyKeyId || selectedWindows.length === 0) {
            return;
        }
        mutate(
            {
                url: 'rpc/reset_proxy_key_quota',
                method: 'post',
                values: {
                    p_proxy_key_id: proxyKeyId,
                    p_window_types: selectedWindows,
                },
                meta: {
                    operation: 'rpc',
                    function: 'reset_proxy_key_quota',
                },
                successNotification: (data) => {
                    const payload = data?.data;
                    const reset = payload?.reset?.join(', ') || '—';
                    const skipped = payload?.skipped ?? [];
                    return {
                        type: 'success',
                        message: translate('proxy_api_keys.quotaReset.success'),
                        description:
                            skipped.length > 0
                                ? translate('proxy_api_keys.quotaReset.successSkipped', {
                                      reset,
                                      skipped: skipped.join(', '),
                                  })
                                : translate('proxy_api_keys.quotaReset.successDesc', { reset }),
                    };
                },
                errorNotification: (error) => ({
                    type: 'error',
                    message: translate('proxy_api_keys.quotaReset.failed'),
                    description: error.message || translate('proxy_api_keys.quotaReset.failedDesc'),
                }),
            },
            {
                onSuccess: async () => {
                    await invalidate({
                        resource: PROXY_API_KEYS_RESOURCE,
                        invalidates: ['list', 'detail'],
                    });
                    onClose();
                },
            },
        );
    };

    return (
        <ConfirmAlertModal
            open={open}
            title={translate('proxy_api_keys.quotaReset.title')}
            description={translate('proxy_api_keys.quotaReset.description')}
            okText={translate('proxy_api_keys.quotaReset.confirm')}
            cancelText={translate('buttons.cancel')}
            onConfirm={handleConfirm}
            onCancel={onClose}
            confirmLoading={mutation.isPending}
            okButtonProps={{ disabled: selectedWindows.length === 0 }}
        >
            <Form<QuotaFormValues>
                form={form}
                initialValues={{ minute: true, day: true, month: true }}
                style={{ marginTop: 16 }}
            >
                <Space direction="vertical" size="small">
                    {(['minute', 'day', 'month'] as const).map((windowType) => (
                        <Form.Item
                            key={windowType}
                            name={windowType}
                            valuePropName="checked"
                            noStyle
                        >
                            <Checkbox>
                                <Space direction="vertical" size={0}>
                                    <Typography.Text>
                                        {translate(`proxy_api_keys.quotaReset.${windowType}`)}
                                    </Typography.Text>
                                    <Typography.Text type="secondary">
                                        {usageLoading ? (
                                            <Space size={8}>
                                                <Spin size="small" />
                                                {translate(
                                                    'proxy_api_keys.quotaReset.usageLoading',
                                                )}
                                            </Space>
                                        ) : (
                                            windowUsageLabel(quota?.[windowType], translate)
                                        )}
                                    </Typography.Text>
                                </Space>
                            </Checkbox>
                        </Form.Item>
                    ))}
                </Space>
            </Form>
        </ConfirmAlertModal>
    );
}
