'use client';

import { Create } from '@refinedev/antd';
import { useForm } from '@refinedev/antd';
import { Card, Form, Input, Alert, Typography, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, KeyOutlined } from '@ant-design/icons';
import type { TablesInsert } from '@gemini-proxy/database';

const { Title, Text } = Typography;
const { useToken } = theme;

type ProxyApiKeyInsert = TablesInsert<'proxy_api_keys'>;

export default function ProxyApiKeyCreatePage() {
    const { token } = useToken();

    const { formProps, saveButtonProps } = useForm<ProxyApiKeyInsert>({
        resource: 'proxy_api_keys',
        action: 'create',
    });
    const generateProxyKey = () => {
        // Generate a random proxy key (this is just for demo purposes)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        formProps.form?.setFieldsValue({ proxy_key_value: result });
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
                        Create New Proxy Key
                    </Title>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        Add a new proxy key to your account for client applications
                    </Text>
                </div>

                <Alert
                    message="Security Notice"
                    description="Proxy keys are used by client applications to authenticate with your proxy service. Keep them secure and rotate them regularly."
                    type="warning"
                    showIcon
                    style={{ marginBottom: token.marginLG }}
                />

                <Form {...formProps} layout="vertical">
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[
                            { required: true, message: 'Please enter a name for this proxy key' },
                            { min: 2, message: 'Name must be at least 2 characters' },
                            { max: 100, message: 'Name must be less than 100 characters' },
                        ]}
                        extra="Choose a descriptive name to identify this proxy key"
                    >
                        <Input placeholder="e.g., Mobile App Proxy Key" />
                    </Form.Item>

                    <Form.Item
                        label="Proxy Key Value"
                        name="proxy_key_value"
                        rules={[
                            { required: true, message: 'Please enter the proxy key value' },
                            { min: 10, message: 'Proxy key must be at least 10 characters' },
                        ]}
                        extra="Enter a secure proxy key or generate one automatically"
                    >
                        <Input.Password
                            placeholder="Enter your proxy key"
                            iconRender={(visible) =>
                                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                            }
                            addonAfter={
                                <KeyOutlined
                                    style={{ cursor: 'pointer', color: token.colorPrimary }}
                                    onClick={generateProxyKey}
                                    title="Generate random key"
                                />
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        label="Description"
                        name="description"
                        extra="Optional description for this proxy key"
                    >
                        <Input.TextArea
                            placeholder="Describe what this proxy key is used for..."
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
