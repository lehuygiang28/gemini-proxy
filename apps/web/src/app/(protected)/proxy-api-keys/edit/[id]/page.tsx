'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { Form, Input, Switch } from 'antd';
import type { TablesUpdate } from '@gemini-proxy/database';

type ProxyApiKeyUpdate = TablesUpdate<'proxy_api_keys'>;

export default function ProxyApiKeysEditPage() {
    const { formProps, saveButtonProps, queryResult } = useForm<ProxyApiKeyUpdate>({});

    return (
        <Edit saveButtonProps={saveButtonProps} title="Edit Proxy API Key">
            <Form layout="vertical" {...formProps} initialValues={queryResult?.data?.data}>
                <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Key ID" name="key_id" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Active" name="is_active" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Edit>
    );
}
