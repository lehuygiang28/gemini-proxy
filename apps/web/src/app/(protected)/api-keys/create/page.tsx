'use client';

import React, { useState, useCallback } from 'react';
import { Create, useForm } from '@refinedev/antd';
import {
    useCreateMany,
    useGo,
    useNotification,
    useGetIdentity,
    useList,
    useTranslation,
    useUpdate,
} from '@refinedev/core';
import {
    Card,
    Form,
    Input,
    Alert,
    Typography,
    theme,
    Row,
    Col,
    Button,
    Steps,
    Tabs,
    Upload,
    Space,
    Table,
    Tag,
    Collapse,
    Divider,
} from 'antd';
import {
    UploadOutlined,
    PlusOutlined,
    DeleteOutlined,
    CheckOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import type { Tables, TablesInsert, User } from '@gemini-proxy/database';
import {
    isValidGoogleApiKey,
    parseApiKeyImport,
    planApiKeyImport,
    type ImportFormat,
    type ImportParseResult,
    type NormalizedImportKey,
} from '@gemini-proxy/core';

const { Title, Paragraph } = Typography;
const { useToken } = theme;
const { Dragger } = Upload;

type ApiKeyInsert = TablesInsert<'api_keys'>;
type ApiKeyRow = Tables<'api_keys'>;
type ParsedApiKey = {
    id: string;
    name: string;
    api_key_value: string;
    provider: 'googleaistudio';
    is_active: boolean;
    metadata?: NormalizedImportKey['metadata'];
    isValid: boolean;
    error?: string;
};

type ImportStep = 'import' | 'review' | 'save';

type ParseKeysResult = {
    keys: ParsedApiKey[];
    format?: ImportFormat;
    stats?: ImportParseResult['stats'];
    warnings?: string[];
    notified?: boolean;
};

export default function ApiKeyCreatePage() {
    const { token } = useToken();
    const go = useGo();
    const notification = useNotification();
    const { translate } = useTranslation();
    const { data: user, isPending: isUserLoading } = useGetIdentity<User>();

    // Multi-step state management
    const [currentStep, setCurrentStep] = useState<ImportStep>('import');
    const [activeTab, setActiveTab] = useState('manual');
    const [parsedKeys, setParsedKeys] = useState<ParsedApiKey[]>([]);
    const [importFormat, setImportFormat] = useState<ImportFormat | null>(null);
    const [importStats, setImportStats] = useState<ImportParseResult['stats'] | null>(null);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const { result: existingKeysResult } = useList<ApiKeyRow>({
        resource: 'api_keys',
        pagination: { mode: 'off' },
        filters: user?.id ? [{ field: 'user_id', operator: 'eq', value: user.id }] : [],
        queryOptions: {
            enabled: Boolean(user?.id),
        },
    });

    const { formProps, form } = useForm<ApiKeyInsert>({
        resource: 'api_keys',
        action: 'create',
        redirect: false,
    });

    const { mutateAsync: createManyKeys } = useCreateMany<ApiKeyInsert>();
    const { mutateAsync: updateApiKey } = useUpdate<ApiKeyRow>();

    const isValidApiKey = useCallback((key: string): boolean => {
        return isValidGoogleApiKey(key);
    }, []);

    // Generate unique ID for parsed keys
    const generateKeyId = useCallback((): string => {
        return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Parse and validate keys from different input methods
    const parseKeysFromInput = useCallback(
        (values: {
            keys?: { name: string; api_key_value: string }[];
            bulk_keys?: string;
            json_keys?: string;
        }): ParseKeysResult => {
            const parsedKeys: ParsedApiKey[] = [];

            if (activeTab === 'manual' && values.keys) {
                values.keys.forEach((key) => {
                    const isValid = isValidApiKey(key.api_key_value);
                    parsedKeys.push({
                        id: generateKeyId(),
                        name: key.name,
                        api_key_value: key.api_key_value,
                        provider: 'googleaistudio',
                        is_active: true,
                        isValid,
                        error: isValid
                            ? undefined
                            : translate('api_keys.create.errors.invalidFormat'),
                    });
                });
            } else if (activeTab === 'bulk' && values.bulk_keys) {
                const rawKeys = values.bulk_keys
                    .split(/[\n\r,;|\t]+/)
                    .map((key) => key.trim())
                    .filter((key) => key.length > 0);

                rawKeys.forEach((key, index) => {
                    const isValid = isValidApiKey(key);
                    parsedKeys.push({
                        id: generateKeyId(),
                        name: translate('api_keys.create.bulkImportedName', { index: index + 1 }),
                        api_key_value: key,
                        provider: 'googleaistudio',
                        is_active: true,
                        isValid,
                        error: isValid
                            ? undefined
                            : translate('api_keys.create.errors.invalidFormat'),
                    });
                });
            } else if (activeTab === 'json' && values.json_keys) {
                try {
                    const result = parseApiKeyImport(values.json_keys);
                    result.keys.forEach((item) => {
                        const isValid = isValidApiKey(item.api_key_value);
                        parsedKeys.push({
                            id: generateKeyId(),
                            name: item.name,
                            api_key_value: item.api_key_value,
                            provider: 'googleaistudio',
                            is_active: item.is_active,
                            metadata: item.metadata,
                            isValid,
                            error: isValid
                                ? undefined
                                : translate('api_keys.create.errors.invalidFormat'),
                        });
                    });
                    return {
                        keys: parsedKeys,
                        format: result.format,
                        stats: result.stats,
                        warnings: result.warnings,
                    };
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown import error';
                    const isUnsupportedFormat = message === 'Unsupported import file format';
                    const isEmptyImport = message === 'No keys found in import file';
                    notification.open({
                        type: 'error',
                        message: translate(
                            isUnsupportedFormat
                                ? 'api_keys.create.errors.unsupportedImportFormat'
                                : isEmptyImport
                                  ? 'api_keys.create.errors.noKeys'
                                  : 'api_keys.create.errors.invalidJson',
                        ),
                        description: translate(
                            isUnsupportedFormat
                                ? 'api_keys.create.errors.unsupportedImportFormatDesc'
                                : isEmptyImport
                                  ? 'api_keys.create.errors.noKeysDesc'
                                  : 'api_keys.create.errors.invalidJsonDesc',
                        ),
                    });
                    return { keys: [], notified: true };
                }
            }

            return { keys: parsedKeys };
        },
        [activeTab, isValidApiKey, generateKeyId, notification, translate],
    );

    // Handle import step - parse keys and move to review
    const handleImport = useCallback(() => {
        const values = form.getFieldsValue();
        const { keys, format, stats, warnings, notified } = parseKeysFromInput(values);

        if (keys.length === 0) {
            if (notified) {
                return;
            }
            if (format === '9router' && warnings && warnings.length > 0) {
                notification.open({
                    type: 'error',
                    message: translate('api_keys.create.errors.noKeys'),
                    description: warnings.join('\n'),
                });
                return;
            }
            notification.open({
                type: 'error',
                message: translate('api_keys.create.errors.noKeys'),
                description: translate('api_keys.create.errors.noKeysDesc'),
            });
            return;
        }

        setParsedKeys(keys);
        setImportFormat(format ?? null);
        setImportStats(stats ?? null);
        setImportWarnings(warnings ?? []);
        setCurrentStep('review');
    }, [form, parseKeysFromInput, notification, translate]);

    // Handle review step - update key details
    const handleKeyUpdate = useCallback((keyId: string, updates: Partial<ParsedApiKey>) => {
        setParsedKeys((prev) =>
            prev.map((key) => (key.id === keyId ? { ...key, ...updates } : key)),
        );
    }, []);

    // Handle remove key from review
    const handleKeyRemove = useCallback((keyId: string) => {
        setParsedKeys((prev) => prev.filter((key) => key.id !== keyId));
    }, []);

    // Handle final save
    const handleSave = useCallback(async () => {
        if (!user?.id) {
            notification.open({
                type: 'error',
                message: translate('api_keys.create.errors.authRequired'),
                description: translate('api_keys.create.errors.authRequiredDesc'),
            });
            return;
        }

        const validKeys = parsedKeys.filter((key) => key.isValid);

        if (validKeys.length === 0) {
            notification.open({
                type: 'error',
                message: translate('api_keys.create.errors.noValid'),
                description: translate('api_keys.create.errors.noValidDesc'),
            });
            return;
        }

        const incomingKeys: NormalizedImportKey[] = validKeys.map((key) => ({
            name: key.name,
            api_key_value: key.api_key_value,
            provider: key.provider,
            is_active: key.is_active,
            metadata: key.metadata ?? {
                source: 'legacy',
                imported_at: new Date().toISOString(),
            },
        }));

        const existingKeys = (existingKeysResult?.data ?? []).map((key) => ({
            id: key.id,
            name: key.name,
            api_key_value: key.api_key_value,
            metadata: key.metadata as Record<string, unknown> | null,
        }));

        const plan = planApiKeyImport(existingKeys, incomingKeys, {
            updateOnNameCollision: true,
            overwriteSecrets: true,
        });

        setIsSaving(true);
        try {
            if (plan.creates.length > 0) {
                await createManyKeys({
                    resource: 'api_keys',
                    values: plan.creates.map((key) => ({
                        name: key.name,
                        api_key_value: key.api_key_value,
                        provider: key.provider,
                        is_active: key.is_active,
                        metadata: key.metadata,
                        user_id: user.id,
                    })),
                });
            }

            for (const update of plan.updates) {
                await updateApiKey({
                    resource: 'api_keys',
                    id: update.id,
                    values: update.updates,
                });
            }

            const description =
                plan.created > 0 || plan.updated > 0
                    ? translate('api_keys.create.importUpsertSuccessDesc', {
                          created: plan.created,
                          updated: plan.updated,
                          skipped: plan.skipped,
                      })
                    : translate('api_keys.create.importSkippedDesc', {
                          skipped: plan.skipped,
                      });

            notification.open({
                type: 'success',
                message: translate('notifications.success'),
                description,
            });
            go({ to: '/api-keys', type: 'replace' });
        } catch (error) {
            notification.open({
                type: 'error',
                message: translate('api_keys.create.errorTitle'),
                description: translate('api_keys.create.errorDesc', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                }),
            });
        } finally {
            setIsSaving(false);
        }
    }, [
        parsedKeys,
        existingKeysResult?.data,
        createManyKeys,
        updateApiKey,
        notification,
        user?.id,
        go,
        translate,
    ]);

    // Handle JSON file upload
    const handleJsonUpload = useCallback(
        (file: File) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    form.setFieldsValue({ json_keys: content });
                    notification.open({
                        type: 'success',
                        message: translate('notifications.success'),
                        description: translate('api_keys.create.jsonLoaded'),
                    });
                } catch (error) {
                    notification.open({
                        type: 'error',
                        message: translate('api_keys.create.errorTitle'),
                        description: translate('api_keys.create.readFileFailed'),
                    });
                }
            };
            reader.readAsText(file);
            return false; // Prevent upload
        },
        [form, notification, translate],
    );

    // Render format help section
    const renderFormatHelp = () => (
        <Card variant="borderless" style={{ marginBottom: token.marginLG }}>
            <Collapse
                ghost
                items={[
                    {
                        key: '1',
                        label: (
                            <Space>
                                <InfoCircleOutlined />
                                <span>{translate('api_keys.create.help.title')}</span>
                            </Space>
                        ),
                        children: (
                            <div>
                                <Title level={5}>
                                    {translate('api_keys.create.help.bulkTitle')}
                                </Title>
                                <Paragraph>{translate('api_keys.create.help.bulkBody')}</Paragraph>
                                <ul>
                                    <li>
                                        {translate('api_keys.create.help.commas')}:{' '}
                                        <code>key1, key2, key3</code>
                                    </li>
                                    <li>
                                        {translate('api_keys.create.help.newLines')}:{' '}
                                        <code>
                                            key1{'\n'}key2{'\n'}key3
                                        </code>
                                    </li>
                                    <li>
                                        {translate('api_keys.create.help.semicolons')}:{' '}
                                        <code>key1; key2; key3</code>
                                    </li>
                                    <li>
                                        {translate('api_keys.create.help.pipes')}:{' '}
                                        <code>key1 | key2 | key3</code>
                                    </li>
                                    <li>
                                        {translate('api_keys.create.help.tabs')}:{' '}
                                        <code>key1 key2 key3</code>
                                    </li>
                                </ul>

                                <Divider />

                                <Title level={5}>
                                    {translate('api_keys.create.help.jsonTitle')}
                                </Title>
                                <Paragraph>{translate('api_keys.create.help.jsonBody')}</Paragraph>
                                <ul>
                                    <li>
                                        <code>name</code> / <code>title</code> / <code>label</code>{' '}
                                        — {translate('api_keys.create.help.forName')}
                                    </li>
                                    <li>
                                        <code>api_key_value</code> / <code>apiKey</code> /{' '}
                                        <code>key</code> / <code>value</code> —{' '}
                                        {translate('api_keys.create.help.forKey')}
                                    </li>
                                </ul>

                                <Title level={5}>
                                    {translate('api_keys.create.help.jsonExamples')}
                                </Title>

                                <Paragraph>
                                    <strong>{translate('api_keys.create.help.simpleArray')}</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`["AQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXX1", "AIzaXXXXXXXXXXXXXXXXXXXX2"]`}
                                </pre>

                                <Paragraph>
                                    <strong>{translate('api_keys.create.help.objectArray')}</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`[
  {"name": "Gproxy key 1", "key": "AQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXX1"},
  {"name": "Gproxy key 2", "key": "AIzaXXXXXXXXXXXXXXXXXXXX2"}
]`}
                                </pre>

                                <Paragraph>
                                    <strong>{translate('api_keys.create.help.altFields')}</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`[
  {"title": "My API Key 1", "api_key_value": "AQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXX1"},
  {"label": "My API Key 2", "value": "AIzaXXXXXXXXXXXXXXXXXXXX2"}
]`}
                                </pre>

                                <Alert
                                    message={translate('api_keys.create.help.validationTitle')}
                                    description={translate('api_keys.create.help.validationBody')}
                                    type="info"
                                    showIcon
                                    style={{ marginTop: token.marginLG }}
                                />
                            </div>
                        ),
                    },
                ]}
            />
        </Card>
    );

    // Render import step
    const renderImportStep = () => (
        <>
            {renderFormatHelp()}
            <Card variant="borderless">
                <Form {...formProps} layout="vertical">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            {
                                key: 'manual',
                                label: translate('api_keys.create.manual'),
                                children: (
                                    <Form.List name="keys">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Space
                                                        key={key}
                                                        style={{
                                                            display: 'flex',
                                                            marginBottom: 8,
                                                        }}
                                                        align="baseline"
                                                    >
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'name']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: translate(
                                                                        'api_keys.errors.missingName',
                                                                    ),
                                                                },
                                                            ]}
                                                        >
                                                            <Input
                                                                placeholder={translate(
                                                                    'api_keys.placeholders.keyName',
                                                                )}
                                                            />
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'api_key_value']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: translate(
                                                                        'api_keys.errors.missingApiKey',
                                                                    ),
                                                                },
                                                            ]}
                                                        >
                                                            <Input.Password
                                                                placeholder={translate(
                                                                    'api_keys.placeholders.apiKey',
                                                                )}
                                                            />
                                                        </Form.Item>
                                                        <DeleteOutlined
                                                            onClick={() => remove(name)}
                                                            style={{ color: token.colorError }}
                                                        />
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button
                                                        type="dashed"
                                                        onClick={() => add()}
                                                        block
                                                        icon={<PlusOutlined />}
                                                    >
                                                        {translate('api_keys.create.addKey')}
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                ),
                            },
                            {
                                key: 'bulk',
                                label: translate('api_keys.create.bulkPaste'),
                                children: (
                                    <Form.Item name="bulk_keys">
                                        <Input.TextArea
                                            rows={10}
                                            placeholder={translate(
                                                'api_keys.create.bulkPlaceholder',
                                            )}
                                        />
                                    </Form.Item>
                                ),
                            },
                            {
                                key: 'json',
                                label: translate('api_keys.create.importJson'),
                                children: (
                                    <>
                                        <Form.Item name="json_keys">
                                            <Input.TextArea
                                                rows={10}
                                                placeholder={translate(
                                                    'api_keys.create.jsonPlaceholder',
                                                )}
                                            />
                                        </Form.Item>
                                        <Dragger
                                            beforeUpload={handleJsonUpload}
                                            showUploadList={false}
                                        >
                                            <p className="ant-upload-drag-icon">
                                                <UploadOutlined />
                                            </p>
                                            <p className="ant-upload-text">
                                                {translate('api_keys.create.dragJson')}
                                            </p>
                                        </Dragger>
                                    </>
                                ),
                            },
                        ]}
                    />
                </Form>
                <Alert
                    message={translate('api_keys.create.securityTitle')}
                    description={translate('api_keys.create.securityBody')}
                    type="warning"
                    showIcon
                    style={{ marginTop: token.marginLG }}
                />
            </Card>
        </>
    );

    // Render review step
    const renderReviewStep = () => {
        const columns = [
            {
                title: translate('api_keys.fields.name'),
                dataIndex: 'name',
                key: 'name',
                render: (text: string, record: ParsedApiKey) => (
                    <Input
                        value={text}
                        onChange={(e) => handleKeyUpdate(record.id, { name: e.target.value })}
                        placeholder={translate('api_keys.placeholders.keyName')}
                    />
                ),
            },
            {
                title: translate('api_keys.fields.apiKey'),
                dataIndex: 'api_key_value',
                key: 'api_key_value',
                render: (text: string, record: ParsedApiKey) => (
                    <Input.Password
                        value={text}
                        onChange={(e) =>
                            handleKeyUpdate(record.id, {
                                api_key_value: e.target.value,
                                isValid: isValidApiKey(e.target.value),
                            })
                        }
                        placeholder={translate('api_keys.placeholders.apiKey')}
                    />
                ),
            },
            {
                title: translate('api_keys.fields.status'),
                dataIndex: 'isValid',
                key: 'isValid',
                render: (isValid: boolean) => (
                    <Tag
                        color={isValid ? 'green' : 'red'}
                        icon={isValid ? <CheckOutlined /> : <ExclamationCircleOutlined />}
                    >
                        {isValid
                            ? translate('api_keys.create.valid')
                            : translate('api_keys.create.invalid')}
                    </Tag>
                ),
            },
            {
                title: translate('table.actions'),
                key: 'actions',
                render: (_: unknown, record: ParsedApiKey) => (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleKeyRemove(record.id)}
                    />
                ),
            },
        ];

        return (
            <Card variant="borderless">
                <div style={{ marginBottom: token.marginLG }}>
                    <Title level={4}>{translate('api_keys.create.reviewTitle')}</Title>
                    <Paragraph type="secondary">
                        {translate('api_keys.create.reviewBody')}
                    </Paragraph>
                </div>
                {importFormat === '9router' && importStats && (
                    <Alert
                        message={translate('api_keys.create.nineRouterDetected')}
                        description={translate('api_keys.create.nineRouterSummary', {
                            total: importStats.total_connections ?? 0,
                            gemini: importStats.gemini_connections ?? 0,
                            imported: importStats.imported_keys ?? parsedKeys.length,
                            skippedUnsupported: importStats.skipped_unsupported ?? 0,
                            skippedMaskedInvalid:
                                (importStats.skipped_masked ?? 0) +
                                (importStats.skipped_invalid ?? 0),
                        })}
                        type="info"
                        showIcon
                        style={{ marginBottom: token.marginLG }}
                    />
                )}
                {importWarnings.length > 0 && (
                    <Alert
                        message={translate('api_keys.create.importWarningsTitle')}
                        description={
                            <ul style={{ margin: 0, paddingLeft: token.paddingLG }}>
                                {importWarnings.map((warning, index) => (
                                    <li key={`${index}-${warning}`}>{warning}</li>
                                ))}
                            </ul>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: token.marginLG }}
                    />
                )}
                <Table
                    dataSource={parsedKeys}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                />
                {parsedKeys.some((key) => !key.isValid) && (
                    <Alert
                        message={translate('api_keys.create.invalidDetected')}
                        description={translate('api_keys.create.invalidDetectedDesc')}
                        type="warning"
                        showIcon
                        style={{ marginTop: token.marginLG }}
                    />
                )}
            </Card>
        );
    };

    // Get current step number for progress
    const getCurrentStepNumber = () => {
        switch (currentStep) {
            case 'import':
                return 0;
            case 'review':
                return 1;
            case 'save':
                return 2;
            default:
                return 0;
        }
    };

    return (
        <Create
            footerButtons={
                currentStep === 'import' ? (
                    <Button
                        type="primary"
                        onClick={handleImport}
                        loading={isUserLoading}
                        disabled={!user?.id}
                    >
                        {translate('api_keys.create.importKeys')}
                    </Button>
                ) : currentStep === 'review' ? (
                    <Space>
                        <Button
                            onClick={() => {
                                setCurrentStep('import');
                                setImportFormat(null);
                                setImportStats(null);
                                setImportWarnings([]);
                            }}
                        >
                            {translate('api_keys.create.backToImport')}
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSave}
                            loading={isSaving || isUserLoading}
                            disabled={!user?.id || isSaving}
                        >
                            {translate('api_keys.create.saveKeys')}
                        </Button>
                    </Space>
                ) : null
            }
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>{translate('api_keys.create.importTitle')}</Title>
                        <Paragraph type="secondary">
                            {translate('api_keys.create.importSubtitle')}
                        </Paragraph>
                        <Steps direction="vertical" size="small" current={getCurrentStepNumber()}>
                            <Steps.Step
                                title={translate('api_keys.create.steps.import')}
                                description={translate('api_keys.create.steps.importDesc')}
                            />
                            <Steps.Step
                                title={translate('api_keys.create.steps.review')}
                                description={translate('api_keys.create.steps.reviewDesc')}
                            />
                            <Steps.Step
                                title={translate('api_keys.create.steps.save')}
                                description={translate('api_keys.create.steps.saveDesc')}
                            />
                        </Steps>
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    {currentStep === 'import' && renderImportStep()}
                    {currentStep === 'review' && renderReviewStep()}
                </Col>
            </Row>
        </Create>
    );
}
