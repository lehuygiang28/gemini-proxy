'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { Form, Input, Switch, Select } from 'antd';
import type { TablesUpdate } from '@gemini-proxy/database';

type ApiKeyUpdate = TablesUpdate<'api_keys'>;

export default function ApiKeysEditPage() {
    const { formProps, saveButtonProps, queryResult } = useForm<ApiKeyUpdate>({});

    return (
        <Edit saveButtonProps={saveButtonProps} title="Edit API Key">
            <Form layout="vertical" {...formProps} initialValues={queryResult?.data?.data}>
                <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Provider" name="provider">
                    <Select
                        allowClear
                        options={[
                            { label: 'google', value: 'google' },
                            { label: 'openai', value: 'openai' },
                            { label: 'anthropic', value: 'anthropic' },
                        ]}
                    />
                </Form.Item>
                <Form.Item label="API Key Value" name="api_key_value">
                    <Input.Password />
                </Form.Item>
                <Form.Item label="Active" name="is_active" valuePropName="checked">
                    <Switch />
                </Form.Item>
                <Form.Item label="Metadata" name={['metadata']}>
                    <Input.TextArea rows={4} placeholder="JSON string" />
                </Form.Item>
            </Form>
        </Edit>
    );
}
