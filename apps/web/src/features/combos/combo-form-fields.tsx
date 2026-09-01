'use client';

import React from 'react';
import {
    Alert,
    Button,
    Form,
    Input,
    InputNumber,
    Segmented,
    Select,
    Space,
    Switch,
    Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { normalizeGeminiModelId } from '@gemini-proxy/core';
import { ModelPicker, SourceTag } from '@/features/models/model-picker';
import { fillComboPreset, type ComboPresetKind } from '@/features/models/fill-combo-preset';
import { useModelCatalog } from '@/features/models/use-model-catalog';

type ComboFormValues = {
    name: string;
    models: string[];
    strategy: string | null;
    stick_after_successes: number | null;
    is_active: boolean;
    override_strategy?: boolean;
};

export function ComboFormFields(props: { isCreate: boolean; globalStrategy: string }) {
    const { translate } = useTranslation();
    const form = Form.useFormInstance<ComboFormValues>();
    const models = Form.useWatch('models', form) ?? [];
    const overrideStrategy = Form.useWatch('override_strategy', form);
    const strategy = Form.useWatch('strategy', form);
    const name = Form.useWatch('name', form) ?? '';
    const { catalogIds, googleIds, builtinIds, entries } = useModelCatalog('concrete');
    const availableIds = [...new Set([...catalogIds, ...googleIds, ...builtinIds])];
    const colliding = availableIds.includes(normalizeGeminiModelId(name));

    const handleAddModel = (modelId: string | undefined) => {
        if (!modelId || models.includes(modelId)) {
            return;
        }
        form.setFieldValue('models', [...models, modelId]);
    };

    const handleMoveModel = (index: number, delta: number) => {
        const next = [...models];
        const target = index + delta;
        if (target < 0 || target >= next.length) {
            return;
        }
        const [row] = next.splice(index, 1);
        next.splice(target, 0, row!);
        form.setFieldValue('models', next);
    };

    const handleRemoveModel = (index: number) => {
        form.setFieldValue(
            'models',
            models.filter((_modelId, modelIndex) => modelIndex !== index),
        );
    };

    const handleFillPreset = (kind: ComboPresetKind) => {
        const preset = fillComboPreset(kind, availableIds);
        form.setFieldValue('models', preset.models);
        if (!form.getFieldValue('name')) {
            form.setFieldValue('name', preset.name);
        }
    };

    return (
        <>
            <Form.Item
                label={translate('combos.fields.name')}
                name="name"
                extra={translate('combos.fields.nameHelp')}
                rules={[{ required: true, message: translate('combos.errors.nameRequired') }]}
            >
                <Input
                    onBlur={(event) => {
                        form.setFieldValue('name', normalizeGeminiModelId(event.target.value));
                    }}
                />
            </Form.Item>
            {colliding ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={translate('combos.overrideWarning', {
                        name: normalizeGeminiModelId(name),
                    })}
                />
            ) : null}
            <Form.Item
                label={translate('combos.fields.models')}
                extra={translate('combos.models.help')}
                required
            >
                {props.isCreate ? (
                    <Space style={{ marginBottom: 8 }}>
                        <Button type="link" size="small" onClick={() => handleFillPreset('flash')}>
                            {translate('combos.presets.flash')}
                        </Button>
                        <Button type="link" size="small" onClick={() => handleFillPreset('pro')}>
                            {translate('combos.presets.pro')}
                        </Button>
                        <Button type="link" size="small" onClick={() => handleFillPreset('gemma')}>
                            {translate('combos.presets.gemma')}
                        </Button>
                    </Space>
                ) : null}
                <ModelPicker mode="concrete" disabledIds={models} onChange={handleAddModel} />
                <Form.Item
                    name="models"
                    rules={[
                        {
                            required: true,
                            type: 'array',
                            min: 1,
                            message: translate('combos.errors.modelsRequired'),
                        },
                    ]}
                    hidden
                >
                    <Select mode="multiple" />
                </Form.Item>
                {models.map((modelId, index) => {
                    const entry = entries.find((item) => item.id === modelId);
                    return (
                        <Space
                            key={`${modelId}-${index}`}
                            style={{ display: 'flex', marginTop: 8 }}
                        >
                            <Typography.Text>
                                {index + 1} {modelId}
                            </Typography.Text>
                            <SourceTag
                                source={entry?.source ?? 'google'}
                                overrides={entry?.overrides ?? false}
                            />
                            <Button
                                size="small"
                                icon={<ArrowUpOutlined />}
                                aria-label={translate('combos.models.moveUp')}
                                disabled={index === 0}
                                onClick={() => handleMoveModel(index, -1)}
                            />
                            <Button
                                size="small"
                                icon={<ArrowDownOutlined />}
                                aria-label={translate('combos.models.moveDown')}
                                disabled={index === models.length - 1}
                                onClick={() => handleMoveModel(index, 1)}
                            />
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label={translate('combos.models.remove')}
                                onClick={() => handleRemoveModel(index)}
                            />
                        </Space>
                    );
                })}
            </Form.Item>
            <Form.Item
                label={translate('combos.fields.overrideStrategy')}
                name="override_strategy"
                valuePropName="checked"
            >
                <Switch
                    onChange={(checked) => {
                        if (checked && !form.getFieldValue('strategy')) {
                            form.setFieldValue('strategy', props.globalStrategy);
                        }
                        if (!checked) {
                            form.setFieldValue('strategy', null);
                            form.setFieldValue('stick_after_successes', null);
                        }
                    }}
                />
            </Form.Item>
            {overrideStrategy ? (
                <>
                    <Form.Item
                        label={translate('combos.fields.strategy')}
                        name="strategy"
                        rules={[
                            {
                                required: true,
                                message: translate('combos.errors.strategyRequired'),
                            },
                        ]}
                    >
                        <Segmented
                            options={[
                                { label: translate('combos.strategy.fallback'), value: 'fallback' },
                                {
                                    label: translate('combos.strategy.sticky_until_error'),
                                    value: 'sticky_until_error',
                                },
                                { label: translate('combos.strategy.stick_n'), value: 'stick_n' },
                            ]}
                        />
                    </Form.Item>
                    {strategy === 'stick_n' ? (
                        <Form.Item
                            label={translate('combos.fields.stickAfter')}
                            name="stick_after_successes"
                            rules={[{ required: true, type: 'number', min: 1 }]}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                    ) : null}
                </>
            ) : (
                <Typography.Paragraph type="secondary">
                    {translate('combos.defaultStrategy', {
                        strategy: translate(`combos.strategy.${props.globalStrategy}`),
                    })}
                </Typography.Paragraph>
            )}
            <Form.Item
                label={translate('combos.fields.active')}
                name="is_active"
                valuePropName="checked"
            >
                <Switch />
            </Form.Item>
        </>
    );
}
