'use client';

import React from 'react';
import { Create, useForm } from '@refinedev/antd';
import { useGetIdentity, useNotification, useTranslation } from '@refinedev/core';
import {
    Card,
    Form,
    Input,
    Alert,
    Typography,
    theme,
    Row,
    Col,
    Divider,
    Button,
    Switch,
    Steps,
    Space,
} from 'antd';
import { KeyOutlined, InfoCircleOutlined, SettingOutlined, CopyOutlined } from '@ant-design/icons';
import type { TablesInsert, User } from '@gemini-proxy/database';
import { isValidProxyApiKeyValue } from '@gemini-proxy/core';
import { generateProxyApiKeyValue } from '@/utils/generate-proxy-api-key';
import { useCopyWithNotification } from '@/hooks';
import { ProxyKeyLimitsFields } from '@/features/proxy-api-keys/proxy-key-limits-fields';
import { normalizeProxyKeyLimits } from '@/features/proxy-api-keys/normalize-proxy-key-limits';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

type ProxyApiKeyInsert = TablesInsert<'proxy_api_keys'>;

export default function ProxyApiKeyCreatePage() {
    const { token } = useToken();
    const notification = useNotification();
    const copyWithNotification = useCopyWithNotification();
    const { translate } = useTranslation();
    const { data: user, isPending: isUserLoading } = useGetIdentity<User>();

    const { formProps, saveButtonProps } = useForm<ProxyApiKeyInsert>({
        resource: 'proxy_api_keys',
        action: 'create',
        redirect: 'list',
    });

    // Handle form submission with user_id injection
    const handleFormFinish = (values: Record<string, unknown>) => {
        if (!user?.id) {
            notification.open({
                type: 'error',
                message: translate('proxy_api_keys.create.authRequired'),
                description: translate('proxy_api_keys.create.authRequiredDesc'),
            });
            return;
        }

        // Transform form data to include user_id
        const dataWithUserId = {
            ...normalizeProxyKeyLimits(values),
            user_id: user.id,
        } as ProxyApiKeyInsert;

        // Submit the form with the transformed data
        formProps.onFinish?.(dataWithUserId);
    };

    const generateProxyApiKey = () => {
        formProps.form?.setFieldsValue({ proxy_key_value: generateProxyApiKeyValue() });
    };

    const handleCopyKey = async (): Promise<void> => {
        const keyValue: unknown = formProps.form?.getFieldValue('proxy_key_value');
        if (typeof keyValue !== 'string' || keyValue.length === 0) {
            return;
        }
        await copyWithNotification(keyValue, {
            successMessage: translate('proxy_api_keys.create.copied'),
            successDescription: translate('proxy_api_keys.create.copiedDesc'),
            errorMessage: translate('proxy_api_keys.create.copyFailed'),
            errorDescription: translate('proxy_api_keys.create.copyFailedDesc'),
        });
    };

    return (
        <Create
            saveButtonProps={{
                ...saveButtonProps,
                loading: isUserLoading,
                disabled: !user?.id,
            }}
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>{translate('proxy_api_keys.titles.create')}</Title>
                        <Paragraph type="secondary">
                            {translate('proxy_api_keys.create.subtitle')}
                        </Paragraph>
                        <Steps direction="vertical" size="small" current={3}>
                            <Steps.Step
                                title={translate('proxy_api_keys.create.stepName')}
                                description={translate('proxy_api_keys.create.stepNameDesc')}
                            />
                            <Steps.Step
                                title={translate('proxy_api_keys.create.stepGenerate')}
                                description={translate('proxy_api_keys.create.stepGenerateDesc')}
                            />
                            <Steps.Step
                                title={translate('proxy_api_keys.create.stepStatus')}
                                description={translate('proxy_api_keys.create.stepStatusDesc')}
                            />
                        </Steps>
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} onFinish={handleFormFinish} layout="vertical">
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
                                <Input
                                    placeholder={translate(
                                        'proxy_api_keys.placeholders.enterOrGenerate',
                                    )}
                                />
                            </Form.Item>

                            <Space wrap>
                                <Button
                                    icon={<KeyOutlined />}
                                    onClick={generateProxyApiKey}
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
                            <Alert
                                message={translate('proxy_api_keys.create.copyWarning')}
                                type="info"
                                showIcon
                            />
                            <Divider orientation="left">
                                <SettingOutlined /> {translate('proxy_api_keys.edit.settings')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.status')}
                                name="is_active"
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <Switch
                                    checkedChildren={translate('common.active')}
                                    unCheckedChildren={translate('common.inactive')}
                                />
                            </Form.Item>
                            <ProxyKeyLimitsFields />
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Create>
    );
}
