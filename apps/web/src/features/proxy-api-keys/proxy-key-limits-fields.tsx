'use client';

import React from 'react';
import { ControlOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { Col, DatePicker, Divider, Form, InputNumber, Row, Select, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { hasValidModelPatterns } from './has-valid-model-patterns';

const INTEGER_LIMIT_FIELDS = [
    'rpm_limit',
    'tpm_limit',
    'rpd_limit',
    'max_concurrent',
    'max_output_tokens',
    'max_request_body_bytes',
] as const;

const BUDGET_LIMIT_FIELDS = ['daily_budget_usd', 'monthly_budget_usd'] as const;

export function ProxyKeyLimitsFields() {
    const { translate } = useTranslation();
    const unlimitedPlaceholder: string = translate('proxy_api_keys.placeholders.unlimited');
    const modelPatternRules = [
        {
            validator: (_rule: unknown, value: string[] | undefined): Promise<void> =>
                hasValidModelPatterns(value)
                    ? Promise.resolve()
                    : Promise.reject(
                          new Error(translate('proxy_api_keys.errors.invalidModelPattern')),
                      ),
        },
    ];
    return (
        <>
            <Divider orientation="left">
                <ControlOutlined /> {translate('proxy_api_keys.limits.title')}
            </Divider>
            <Typography.Paragraph type="secondary">
                {translate('proxy_api_keys.limits.unlimitedHint')}
            </Typography.Paragraph>
            <Row gutter={16}>
                {INTEGER_LIMIT_FIELDS.map((fieldName: (typeof INTEGER_LIMIT_FIELDS)[number]) => (
                    <Col xs={24} md={12} key={fieldName}>
                        <Form.Item
                            label={translate(`proxy_api_keys.fields.${fieldName}`)}
                            name={fieldName}
                        >
                            <InputNumber
                                min={1}
                                placeholder={unlimitedPlaceholder}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>
                ))}
                {BUDGET_LIMIT_FIELDS.map((fieldName: (typeof BUDGET_LIMIT_FIELDS)[number]) => (
                    <Col xs={24} md={12} key={fieldName}>
                        <Form.Item
                            label={translate(`proxy_api_keys.fields.${fieldName}`)}
                            name={fieldName}
                        >
                            <InputNumber
                                min={0}
                                step={0.000001}
                                placeholder={unlimitedPlaceholder}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>
                ))}
                <Col xs={24} md={12}>
                    <Form.Item
                        label={translate('proxy_api_keys.fields.allowed_models')}
                        name="allowed_models"
                        rules={modelPatternRules}
                    >
                        <Select
                            mode="tags"
                            placeholder={translate('proxy_api_keys.placeholders.modelPatterns')}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label={translate('proxy_api_keys.fields.denied_models')}
                        name="denied_models"
                        rules={modelPatternRules}
                    >
                        <Select
                            mode="tags"
                            placeholder={translate('proxy_api_keys.placeholders.modelPatterns')}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label={translate('proxy_api_keys.fields.expires_at')}
                        name="expires_at"
                        getValueProps={(value: string | null) => ({
                            value: value ? dayjs(value) : null,
                        })}
                        normalize={(value: Dayjs | null): string | null =>
                            value?.toISOString() ?? null
                        }
                    >
                        <DatePicker
                            showTime
                            placeholder={translate('proxy_api_keys.placeholders.expiresAt')}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </>
    );
}
