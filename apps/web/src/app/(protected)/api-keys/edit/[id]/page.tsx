'use client';

import React, { useState } from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { useTranslation } from '@refinedev/core';
import {
    Form,
    Input,
    Switch,
    Select,
    Card,
    Row,
    Col,
    Divider,
    Typography,
    Alert,
    Spin,
} from 'antd';
import { InfoCircleOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { TablesUpdate } from '@gemini-proxy/database';
import { isValidGoogleApiKey } from '@gemini-proxy/core';
import { PROVIDER_OPTIONS } from '@/constants/providers';
import { ConfirmAlertModal } from '@/components/common';

const { Title, Paragraph } = Typography;

type ApiKeyUpdate = TablesUpdate<'api_keys'>;

export default function ApiKeysEditPage() {
    const { translate } = useTranslation();
    const [pendingSubmitValues, setPendingSubmitValues] = useState<ApiKeyUpdate | null>(null);
    const { formProps, saveButtonProps, query } = useForm<ApiKeyUpdate>({
        resource: 'api_keys',
        action: 'edit',
        redirect: 'list',
    });

    const apiKeyData = query?.data?.data;

    function handleFinish(values: ApiKeyUpdate): void {
        const apiKeyValue: ApiKeyUpdate['api_key_value'] =
            typeof values.api_key_value === 'string'
                ? values.api_key_value.trim()
                : values.api_key_value;
        const submitValues: ApiKeyUpdate = {
            ...values,
            api_key_value: apiKeyValue,
        };
        const originalKeyValue: ApiKeyUpdate['api_key_value'] =
            typeof apiKeyData?.api_key_value === 'string'
                ? apiKeyData.api_key_value.trim()
                : apiKeyData?.api_key_value;
        const hasKeyChanged: boolean =
            typeof apiKeyValue === 'string' &&
            typeof originalKeyValue === 'string' &&
            apiKeyValue !== originalKeyValue;
        if (hasKeyChanged) {
            setPendingSubmitValues(submitValues);
            return;
        }
        formProps.onFinish?.(submitValues);
    }

    function handleConfirmRotate(): void {
        if (!pendingSubmitValues) {
            return;
        }
        formProps.onFinish?.(pendingSubmitValues);
        setPendingSubmitValues(null);
    }

    function handleCancelRotate(): void {
        setPendingSubmitValues(null);
    }

    if (query?.isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Edit
            saveButtonProps={saveButtonProps}
            title={<Title level={4}>{translate('api_keys.titles.edit')}</Title>}
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>
                            {translate('api_keys.edit.editing', { name: apiKeyData?.name ?? '' })}
                        </Title>
                        <Paragraph type="secondary">
                            {translate('api_keys.edit.subtitle')}
                        </Paragraph>
                        <Alert
                            message={translate('api_keys.edit.keyRotatable')}
                            type="info"
                            showIcon
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} layout="vertical" onFinish={handleFinish} autoComplete="off">
                            <Divider orientation="left">
                                <InfoCircleOutlined /> {translate('api_keys.edit.basicInfo')}
                            </Divider>
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item
                                        label={translate('api_keys.fields.name')}
                                        name="name"
                                        rules={[
                                            {
                                                required: true,
                                                message: translate('api_keys.errors.enterName'),
                                            },
                                        ]}
                                    >
                                        <Input
                                            placeholder={translate(
                                                'api_keys.placeholders.nameExample',
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label={translate('api_keys.fields.provider')}
                                        name="provider"
                                        rules={[
                                            {
                                                required: true,
                                                message: translate(
                                                    'api_keys.errors.selectProvider',
                                                ),
                                            },
                                        ]}
                                    >
                                        <Select
                                            placeholder={translate(
                                                'api_keys.placeholders.selectProvider',
                                            )}
                                            options={PROVIDER_OPTIONS}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Divider orientation="left">
                                <KeyOutlined /> {translate('api_keys.fields.apiKey')}
                            </Divider>
                            <Form.Item
                                label={translate('api_keys.fields.apiKeyValue')}
                                name="api_key_value"
                                extra={translate('api_keys.edit.rotateHint')}
                                rules={[
                                    {
                                        required: true,
                                        message: translate('api_keys.errors.missingApiKey'),
                                    },
                                    {
                                        validator: async (_rule, value: string) => {
                                            if (!isValidGoogleApiKey(value)) {
                                                return Promise.reject(
                                                    new Error(
                                                        translate('api_keys.errors.invalidApiKey'),
                                                    ),
                                                );
                                            }
                                        },
                                    },
                                ]}
                            >
                                <Input.Password
                                    autoComplete="new-password"
                                    placeholder={translate('api_keys.placeholders.apiKey')}
                                />
                            </Form.Item>
                            <Divider orientation="left">
                                <SettingOutlined /> {translate('api_keys.edit.settings')}
                            </Divider>
                            <Form.Item
                                label={translate('api_keys.fields.status')}
                                name="is_active"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren={translate('common.active')}
                                    unCheckedChildren={translate('common.inactive')}
                                />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
            <ConfirmAlertModal
                open={Boolean(pendingSubmitValues)}
                title={translate('api_keys.rotate.title')}
                description={translate('api_keys.rotate.description')}
                okText={translate('api_keys.rotate.confirm')}
                cancelText={translate('buttons.cancel')}
                onConfirm={handleConfirmRotate}
                onCancel={handleCancelRotate}
            />
        </Edit>
    );
}
