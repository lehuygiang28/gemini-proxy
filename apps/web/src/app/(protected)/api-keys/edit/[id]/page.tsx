'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
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
import { PROVIDER_OPTIONS } from '@/constants/providers';

const { Title, Paragraph } = Typography;

type ApiKeyUpdate = TablesUpdate<'api_keys'>;

export default function ApiKeysEditPage() {
    const { formProps, saveButtonProps, query } = useForm<ApiKeyUpdate>({
        resource: 'api_keys',
        action: 'edit',
        redirect: 'list',
    });

    const apiKeyData = query?.data?.data;

    if (query?.isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Edit saveButtonProps={saveButtonProps} title={<Title level={4}>Edit API Key</Title>}>
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card bordered={false}>
                        <Title level={5}>Editing {apiKeyData?.name}</Title>
                        <Paragraph type="secondary">
                            Modify the details of your existing API key.
                        </Paragraph>
                        <Alert
                            message="The API key value cannot be changed for security reasons. If you need a new key, please create one."
                            type="info"
                            showIcon
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card bordered={false}>
                        <Form {...formProps} layout="vertical">
                            <Divider orientation="left">
                                <InfoCircleOutlined /> Basic Information
                            </Divider>
                            <Row gutter={12}>
                                <Col span={12}>
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
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Provider"
                                        name="provider"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please select a provider',
                                            },
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select provider"
                                            options={PROVIDER_OPTIONS}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Divider orientation="left">
                                <KeyOutlined /> API Key
                            </Divider>
                            <Form.Item label="API Key Value" name="api_key_value">
                                <Input readOnly disabled />
                            </Form.Item>
                            <Divider orientation="left">
                                <SettingOutlined /> Settings
                            </Divider>
                            <Form.Item
                                label="Status"
                                name="is_active"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren="Active"
                                    unCheckedChildren="Inactive"
                                />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Edit>
    );
}
