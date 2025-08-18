'use client';

import React from 'react';
import { Create, useForm } from '@refinedev/antd';
import { Form, Input, Switch, Select } from 'antd';
import type { TablesInsert } from '@gemini-proxy/database';

type ApiKeyInsert = TablesInsert<'api_keys'>;

export default function ApiKeysCreatePage() {
    const { formProps, saveButtonProps } = useForm<ApiKeyInsert>({});

    return (
        <Create saveButtonProps={saveButtonProps} title="Create API Key">
            <Form layout="vertical" {...formProps}>
                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Please enter name' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label="Provider" name="provider">
                    <Select allowClear options={[{ label: 'google', value: 'google' }]} />
                </Form.Item>
                <Form.Item
                    label="API Key Value"
                    name="api_key_value"
                    rules={[{ required: true, message: 'Please enter API key value' }]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item label="Active" name="is_active" valuePropName="checked" initialValue>
                    <Switch />
                </Form.Item>
                <Form.Item label="Metadata" name={['metadata']}>
                    <Input.TextArea rows={4} placeholder="JSON string" />
                </Form.Item>
            </Form>
        </Create>
    );
}
