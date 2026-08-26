'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { useTranslation } from '@refinedev/core';
import { Form, Input, Switch, Card, Row, Col, Divider, Typography, Alert, Spin } from 'antd';
import { InfoCircleOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { TablesUpdate } from '@gemini-proxy/database';

const { Title, Paragraph } = Typography;

type ProxyApiKeyUpdate = TablesUpdate<'proxy_api_keys'>;

export default function ProxyApiKeysEditPage() {
    const { translate } = useTranslation();
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
        <Edit
            saveButtonProps={saveButtonProps}
            title={<Title level={4}>{translate('proxy_api_keys.titles.edit')}</Title>}
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>
                            {translate('proxy_api_keys.edit.editing', {
                                name: proxyApiKeyData?.name ?? '',
                            })}
                        </Title>
                        <Paragraph type="secondary">
                            {translate('proxy_api_keys.edit.subtitle')}
                        </Paragraph>
                        <Alert
                            message={translate('proxy_api_keys.edit.keyImmutable')}
                            type="info"
                            showIcon
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card variant="borderless">
                        <Form {...formProps} layout="vertical">
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
                                    placeholder={translate('proxy_api_keys.placeholders.nameExample')}
                                />
                            </Form.Item>
                            <Divider orientation="left">
                                <KeyOutlined /> {translate('proxy_api_keys.fields.proxyKey')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.proxyKeyValue')}
                                name="proxy_key_value"
                            >
                                <Input readOnly disabled />
                            </Form.Item>
                            <Divider orientation="left">
                                <SettingOutlined /> {translate('proxy_api_keys.edit.settings')}
                            </Divider>
                            <Form.Item
                                label={translate('proxy_api_keys.fields.status')}
                                name="is_active"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren={translate('common.active')}
                                    unCheckedChildren={translate('common.inactive')}
                                />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Edit>
    );
}
