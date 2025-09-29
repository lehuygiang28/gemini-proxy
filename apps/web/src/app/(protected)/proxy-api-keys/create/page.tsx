'use client';

import React from 'react';
import { Create } from '@refinedev/antd';
import { useForm } from '@refinedev/antd';
import { useGetIdentity, useNotification } from '@refinedev/core';
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
} from 'antd';
import { KeyOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import type { TablesInsert, User } from '@gemini-proxy/database';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

type ProxyApiKeyInsert = TablesInsert<'proxy_api_keys'>;

export default function ProxyApiKeyCreatePage() {
    const { token } = useToken();
    const notification = useNotification();
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
                message: 'Authentication Required',
                description: 'Please log in to create proxy API keys.',
            });
            return;
        }

        // Transform form data to include user_id
        const dataWithUserId = {
            ...values,
            user_id: user.id,
        } as ProxyApiKeyInsert;

        // Submit the form with the transformed data
        formProps.onFinish?.(dataWithUserId);
    };

    const generateProxyApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'pk-';
        for (let i = 0; i < 48; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        formProps.form?.setFieldsValue({ proxy_key_value: result });
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
                        <Title level={5}>Create Proxy API Key</Title>
                        <Paragraph type="secondary">
                            Follow the steps to create a new proxy API key for your application.
                        </Paragraph>
                        <Steps direction="vertical" size="small" current={3}>
                            <Steps.Step
                                title="Name"
                                description="Give your key a descriptive name."
                            />
                            <Steps.Step
                                title="Generate Key"
                                description="Create a secure and unique proxy API key."
                            />
                            <Steps.Step
                                title="Set Status"
                                description="Decide if the key should be active immediately."
                            />
                        </Steps>
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} onFinish={handleFormFinish} layout="vertical">
                            <Divider orientation="left">
                                <InfoCircleOutlined /> Basic Information
                            </Divider>
                            <Form.Item
                                label="Name"
                                name="name"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please enter a name',
                                    },
                                ]}
                            >
                                <Input placeholder="e.g., My App Key" />
                            </Form.Item>
                            <Divider orientation="left">
                                <KeyOutlined /> Proxy API Key
                            </Divider>
                            <Form.Item
                                label="Proxy API Key Value"
                                name="proxy_key_value"
                                rules={[
                                    { required: true, message: 'Please generate a proxy API key' },
                                ]}
                            >
                                <Input readOnly placeholder="Click generate to create a key" />
                            </Form.Item>
                            <Button
                                icon={<KeyOutlined />}
                                onClick={generateProxyApiKey}
                                style={{ marginBottom: token.marginMD }}
                            >
                                Generate Secure Key
                            </Button>
                            <Alert
                                message="Please copy this key and store it securely. You will not be able to see it again."
                                type="info"
                                showIcon
                            />
                            <Divider orientation="left">
                                <SettingOutlined /> Settings
                            </Divider>
                            <Form.Item
                                label="Status"
                                name="is_active"
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Create>
    );
}
