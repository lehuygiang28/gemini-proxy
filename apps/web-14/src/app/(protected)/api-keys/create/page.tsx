'use client';

import React, { useState } from 'react';
import { Create, SaveButton } from '@refinedev/antd';
import { useForm } from '@refinedev/antd';
import { Card, Form, Input, Select, Alert, Typography, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, KeyOutlined } from '@ant-design/icons';
import type { TablesInsert } from '@gemini-proxy/database';

const { Title, Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

type ApiKeyInsert = TablesInsert<'api_keys'>;

export default function ApiKeyCreatePage() {
    const { token } = useToken();
    const [showApiKey, setShowApiKey] = useState(false);

    const { formProps, saveButtonProps } = useForm<ApiKeyInsert>({
        resource: 'api_keys',
        action: 'create',
    });

    const toggleApiKeyVisibility = () => {
        setShowApiKey(!showApiKey);
    };

    const generateApiKey = () => {
        // Generate a random API key (this is just for demo purposes)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        formProps.form?.setFieldsValue({ api_key_value: result });
    };

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Card
                style={{
                    maxWidth: 800,
                    margin: '0 auto',
                    background: token.colorBgContainer,
                }}
            >
                <div style={{ marginBottom: token.marginLG }}>
                    <Title level={3} style={{ margin: 0, color: token.colorText }}>
                        Create New API Key
                    </Title>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        Add a new API key to your account for external integrations
                    </Text>
                </div>

                <Alert
                    message="Security Notice"
                    description="API keys are sensitive credentials. Keep them secure and never share them publicly. You can regenerate keys at any time."
                    type="warning"
                    showIcon
                    style={{ marginBottom: token.marginLG }}
                />

                <Form {...formProps} layout="vertical">
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[
                            { required: true, message: 'Please enter a name for this API key' },
                            { min: 2, message: 'Name must be at least 2 characters' },
                            { max: 100, message: 'Name must be less than 100 characters' },
                        ]}
                        extra="Choose a descriptive name to identify this API key"
                    >
                        <Input placeholder="e.g., Production API Key" />
                    </Form.Item>

                    <Form.Item
                        label="Provider"
                        name="provider"
                        rules={[{ required: true, message: 'Please select a provider' }]}
                        extra="Select the AI service provider for this API key"
                    >
                        <Select placeholder="Select provider">
                            <Option value="googleaistudio">Google AI Studio</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="API Key Value"
                        name="api_key_value"
                        rules={[
                            { required: true, message: 'Please enter the API key value' },
                            { min: 10, message: 'API key must be at least 10 characters' },
                        ]}
                        extra="Enter your API key from the selected provider"
                    >
                        <Input.Password
                            placeholder="Enter your API key"
                            iconRender={(visible) =>
                                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                            }
                            addonAfter={
                                <KeyOutlined
                                    style={{ cursor: 'pointer', color: token.colorPrimary }}
                                    onClick={generateApiKey}
                                    title="Generate random key"
                                />
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        label="Description"
                        name="description"
                        extra="Optional description for this API key"
                    >
                        <Input.TextArea
                            placeholder="Describe what this API key is used for..."
                            rows={3}
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Card>
        </Create>
    );
}
