'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { useNotification, useTranslation } from '@refinedev/core';
import {
    Form,
    Input,
    Switch,
    Card,
    Row,
    Col,
    Divider,
    Typography,
    Alert,
    Spin,
    Button,
    Space,
    theme,
} from 'antd';
import { CopyOutlined, InfoCircleOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { TablesUpdate } from '@gemini-proxy/database';
import { isValidProxyApiKeyValue } from '@gemini-proxy/core';
import { generateProxyApiKeyValue } from '@/utils/generate-proxy-api-key';
import { copyToClipboard } from '@/utils/table-helpers';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

type ProxyApiKeyUpdate = TablesUpdate<'proxy_api_keys'>;

export default function ProxyApiKeysEditPage() {
    const { token } = useToken();
    const notification = useNotification();
    const { translate } = useTranslation();
    const { formProps, saveButtonProps, query } = useForm<ProxyApiKeyUpdate>({
        resource: 'proxy_api_keys',
        action: 'edit',
        redirect: 'list',
    });

    const proxyApiKeyData = query?.data?.data;

    const handleFinish = (values: ProxyApiKeyUpdate) => {
        const proxyKeyValue =
            typeof values.proxy_key_value === 'string'
                ? values.proxy_key_value.trim()
                : values.proxy_key_value;
        formProps.onFinish?.({
            ...values,
            proxy_key_value: proxyKeyValue,
        });
    };

    const handleGenerateKey = () => {
        formProps.form?.setFieldsValue({ proxy_key_value: generateProxyApiKeyValue() });
    };

    const handleCopyKey = () => {
        const keyValue = formProps.form?.getFieldValue('proxy_key_value');
        if (typeof keyValue !== 'string' || keyValue.length === 0) {
            return;
        }
        if (copyToClipboard(keyValue)) {
            notification.open({
                type: 'success',
                message: translate('proxy_api_keys.create.copied'),
                description: translate('proxy_api_keys.create.copiedDesc'),
            });
            return;
        }
        notification.open({
            type: 'error',
            message: translate('proxy_api_keys.create.copyFailed'),
            description: translate('proxy_api_keys.create.copyFailedDesc'),
        });
    };

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
            title={<Title level={4}>{translate('proxy_api_keys.titles.edit')}</Title>}
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>
                            {translate('proxy_api_keys.edit.editing', {
                                name: proxyApiKeyData?.name ?? '',
                            })}
                        </Title>
                        <Paragraph type="secondary">
                            {translate('proxy_api_keys.edit.subtitle')}
                        </Paragraph>
                        <Alert
                            message={translate('proxy_api_keys.edit.keyRotatable')}
                            type="warning"
                            showIcon
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} onFinish={handleFinish} layout="vertical" autoComplete="off">
                            <Divider orientation="left">
                                <InfoCircleOutlined /> {translate('proxy_api_keys.edit.basicInfo')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.name')}
                                name="name"
                                rules={[
                                    {
                                        required: true,
                                        message: translate('proxy_api_keys.errors.enterName'),
                                    },
                                ]}
                            >
                                <Input
                                    placeholder={translate(
                                        'proxy_api_keys.placeholders.nameExample',
                                    )}
                                />
                            </Form.Item>
                            <Divider orientation="left">
                                <KeyOutlined /> {translate('proxy_api_keys.fields.proxyKey')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.proxyKeyValue')}
                                name="proxy_key_value"
                                extra={translate('proxy_api_keys.edit.rotateHint')}
                                rules={[
                                    {
                                        required: true,
                                        message: translate('proxy_api_keys.errors.enterOrGenerate'),
                                    },
                                    {
                                        validator: async (_rule, value: string) => {
                                            if (!isValidProxyApiKeyValue(value)) {
                                                return Promise.reject(
                                                    new Error(
                                                        translate(
                                                            'proxy_api_keys.errors.invalidProxyKey',
                                                        ),
                                                    ),
                                                );
                                            }
                                        },
                                    },
                                ]}
                            >
                                <Input.Password
                                    autoComplete="new-password"
                                    placeholder={translate(
                                        'proxy_api_keys.placeholders.enterOrGenerate',
                                    )}
                                />
                            </Form.Item>
                            <Space wrap>
                                <Button
                                    icon={<KeyOutlined />}
                                    onClick={handleGenerateKey}
                                    style={{ marginBottom: token.marginMD }}
                                >
                                    {translate('proxy_api_keys.create.generateKey')}
                                </Button>
                                <Button
                                    icon={<CopyOutlined />}
                                    onClick={handleCopyKey}
                                    style={{ marginBottom: token.marginMD }}
                                >
                                    {translate('proxy_api_keys.create.copyClipboard')}
                                </Button>
                            </Space>
                            <Divider orientation="left">
                                <SettingOutlined /> {translate('proxy_api_keys.edit.settings')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.status')}
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
        </Edit>
    );
}
