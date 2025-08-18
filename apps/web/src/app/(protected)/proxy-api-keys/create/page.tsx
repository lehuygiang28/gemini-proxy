'use client';

import React from 'react';
import { Create, useForm } from '@refinedev/antd';
import { Form, Input, Switch } from 'antd';
import type { TablesInsert } from '@gemini-proxy/database';

type ProxyApiKeyInsert = TablesInsert<'proxy_api_keys'>;

export default function ProxyApiKeysCreatePage() {
    const { formProps, saveButtonProps } = useForm<ProxyApiKeyInsert>({});

    return (
        <Create saveButtonProps={saveButtonProps} title="Create Proxy API Key">
            <Form layout="vertical" {...formProps}>
                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Please enter name' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Key ID"
                    name="key_id"
                    rules={[{ required: true, message: 'Please enter key id' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label="Active" name="is_active" valuePropName="checked" initialValue>
                    <Switch />
                </Form.Item>
            </Form>
        </Create>
    );
}
