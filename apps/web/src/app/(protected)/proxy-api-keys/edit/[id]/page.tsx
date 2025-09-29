'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { Form, Input, Switch, Card, Row, Col, Divider, Typography, Alert, Spin } from 'antd';
import { InfoCircleOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { TablesUpdate } from '@gemini-proxy/database';

const { Title, Paragraph } = Typography;

type ProxyApiKeyUpdate = TablesUpdate<'proxy_api_keys'>;

export default function ProxyApiKeysEditPage() {
    const { formProps, saveButtonProps, query } = useForm<ProxyApiKeyUpdate>({
        resource: 'proxy_api_keys',
        action: 'edit',
        redirect: 'list',
    });

    const proxyApiKeyData = query?.data?.data;

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
        <Edit saveButtonProps={saveButtonProps} title={<Title level={4}>Edit Proxy API Key</Title>}>
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>Editing {proxyApiKeyData?.name}</Title>
                        <Paragraph type="secondary">
                            Modify the details of your existing proxy API key.
                        </Paragraph>
                        <Alert
                            message="The proxy API key value cannot be changed for security reasons. If you need a new key, please create one."
                            type="info"
                            showIcon
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} layout="vertical">
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
                            <Form.Item label="Proxy API Key Value" name="proxy_key_value">
                                <Input readOnly disabled />
                            </Form.Item>
                            <Divider orientation="left">
                                <SettingOutlined /> Settings
                            </Divider>
                            <Form.Item label="Status" name="is_active" valuePropName="checked">
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Edit>
    );
}
