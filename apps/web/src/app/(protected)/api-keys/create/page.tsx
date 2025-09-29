'use client';

import React, { useState, useCallback } from 'react';
import { Create, useForm } from '@refinedev/antd';
import { useCreateMany, useGo, useNotification, useGetIdentity } from '@refinedev/core';
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
import type { TablesInsert, User } from '@gemini-proxy/database';

const { Title, Paragraph } = Typography;
const { useToken } = theme;
const { Dragger } = Upload;

type ApiKeyInsert = TablesInsert<'api_keys'>;
type ParsedApiKey = {
    id: string;
    name: string;
    api_key_value: string;
    provider: 'googleaistudio';
    isValid: boolean;
    error?: string;
};

type ImportStep = 'import' | 'review' | 'save';

export default function ApiKeyCreatePage() {
    const { token } = useToken();
    const go = useGo();
    const notification = useNotification();
    const { data: user, isPending: isUserLoading } = useGetIdentity<User>();

    // Multi-step state management
    const [currentStep, setCurrentStep] = useState<ImportStep>('import');
    const [activeTab, setActiveTab] = useState('manual');
    const [parsedKeys, setParsedKeys] = useState<ParsedApiKey[]>([]);

    const { formProps } = useForm({
        resource: 'api_keys',
        action: 'create',
    });

    const { mutate } = useCreateMany<ApiKeyInsert>({
        resource: 'api_keys',
        mutationOptions: {
            onSuccess: () => {
                notification.open({
                    type: 'success',
                    message: 'Success',
                    description: 'API keys created successfully!',
                });
                go({ to: '/api-keys', type: 'replace' });
            },
            onError: (error) => {
                notification.open({
                    type: 'error',
                    message: 'Error',
                    description: `Error creating API keys: ${error.message}`,
                });
            },
        },
    });

    // Helper function to validate API key format (less strict)
    const isValidApiKey = useCallback((key: string): boolean => {
        return key && key.trim().length >= 10; // Just check it's not empty and not too short
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
        }): ParsedApiKey[] => {
            const parsedKeys: ParsedApiKey[] = [];

            if (activeTab === 'manual' && values.keys) {
                values.keys.forEach((key) => {
                    const isValid = isValidApiKey(key.api_key_value);
                    parsedKeys.push({
                        id: generateKeyId(),
                        name: key.name,
                        api_key_value: key.api_key_value,
                        provider: 'googleaistudio',
                        isValid,
                        error: isValid ? undefined : 'API key is too short or empty',
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
                        name: `Bulk Imported Key ${index + 1}`,
                        api_key_value: key,
                        provider: 'googleaistudio',
                        isValid,
                        error: isValid ? undefined : 'API key is too short or empty',
                    });
                });
            } else if (activeTab === 'json' && values.json_keys) {
                try {
                    const parsedJson = JSON.parse(values.json_keys);
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach((item, index) => {
                            let apiKey = '';
                            let name = `JSON Imported Key ${index + 1}`;

                            if (typeof item === 'string') {
                                apiKey = item;
                            } else if (typeof item === 'object' && item !== null) {
                                apiKey =
                                    item.api_key_value ||
                                    item.apiKey ||
                                    item.key ||
                                    item.value ||
                                    '';
                                name = item.name || item.title || item.label || name;
                            }

                            const isValid = isValidApiKey(apiKey);
                            parsedKeys.push({
                                id: generateKeyId(),
                                name,
                                api_key_value: apiKey,
                                provider: 'googleaistudio',
                                isValid,
                                error: isValid ? undefined : 'API key is too short or empty',
                            });
                        });
                    }
                } catch (error) {
                    notification.open({
                        type: 'error',
                        message: 'Invalid JSON Format',
                        description: 'Please provide a valid JSON array.',
                    });
                    return [];
                }
            }

            return parsedKeys;
        },
        [activeTab, isValidApiKey, generateKeyId, notification],
    );

    // Handle import step - parse keys and move to review
    const handleImport = useCallback(() => {
        const values = formProps.form?.getFieldsValue();
        const keys = parseKeysFromInput(values);

        if (keys.length === 0) {
            notification.open({
                type: 'error',
                message: 'No Keys Found',
                description: 'No valid API keys found in the input.',
            });
            return;
        }

        setParsedKeys(keys);
        setCurrentStep('review');
    }, [formProps.form, parseKeysFromInput, notification]);

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
    const handleSave = useCallback(() => {
        if (!user?.id) {
            notification.open({
                type: 'error',
                message: 'Authentication Required',
                description: 'Please log in to create API keys.',
            });
            return;
        }

        const validKeys = parsedKeys.filter((key) => key.isValid);

        if (validKeys.length === 0) {
            notification.open({
                type: 'error',
                message: 'No Valid Keys',
                description: 'No valid API keys to save.',
            });
            return;
        }

        const keysToCreate: ApiKeyInsert[] = validKeys.map((key) => ({
            name: key.name,
            api_key_value: key.api_key_value,
            provider: key.provider,
            user_id: user.id,
        }));

        mutate({
            resource: 'api_keys',
            values: keysToCreate,
        });
    }, [parsedKeys, mutate, notification, user?.id]);

    // Handle JSON file upload
    const handleJsonUpload = useCallback(
        (file: File) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    formProps.form?.setFieldsValue({ json_keys: content });
                    notification.open({
                        type: 'success',
                        message: 'Success',
                        description: 'JSON file loaded successfully!',
                    });
                } catch (error) {
                    notification.open({
                        type: 'error',
                        message: 'Error',
                        description: 'Failed to read file.',
                    });
                }
            };
            reader.readAsText(file);
            return false; // Prevent upload
        },
        [formProps.form, notification],
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
                                <span>Supported Import Formats</span>
                            </Space>
                        ),
                        children: (
                            <div>
                                <Title level={5}>Bulk Paste Format</Title>
                                <Paragraph>
                                    Paste multiple API keys separated by any of these characters:
                                </Paragraph>
                                <ul>
                                    <li>
                                        Commas: <code>key1, key2, key3</code>
                                    </li>
                                    <li>
                                        New lines:{' '}
                                        <code>
                                            key1{'\n'}key2{'\n'}key3
                                        </code>
                                    </li>
                                    <li>
                                        Semicolons: <code>key1; key2; key3</code>
                                    </li>
                                    <li>
                                        Pipes: <code>key1 | key2 | key3</code>
                                    </li>
                                    <li>
                                        Tabs: <code>key1 key2 key3</code>
                                    </li>
                                </ul>

                                <Divider />

                                <Title level={5}>JSON Format</Title>
                                <Paragraph>
                                    JSON array with strings or objects. Supported object fields:
                                </Paragraph>
                                <ul>
                                    <li>
                                        <code>name</code> or <code>title</code> or{' '}
                                        <code>label</code> - for the key name
                                    </li>
                                    <li>
                                        <code>api_key_value</code> or <code>apiKey</code> or{' '}
                                        <code>key</code> or <code>value</code> - for the API key
                                    </li>
                                </ul>

                                <Title level={5}>JSON Examples</Title>

                                <Paragraph>
                                    <strong>Simple string array:</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`["AIzaXXXXXXXXXXXXXXXXXXXX1", "AIzaXXXXXXXXXXXXXXXXXXXX2"]`}
                                </pre>

                                <Paragraph>
                                    <strong>Object array with name and key:</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`[
  {"name": "Gproxy key 1", "key": "AIzaXXXXXXXXXXXXXXXXXXXX1"},
  {"name": "Gproxy key 2", "key": "AIzaXXXXXXXXXXXXXXXXXXXX2"}
]`}
                                </pre>

                                <Paragraph>
                                    <strong>Object array with different field names:</strong>
                                </Paragraph>
                                <pre
                                    style={{
                                        background: token.colorFillAlter,
                                        padding: token.paddingSM,
                                        borderRadius: token.borderRadius,
                                    }}
                                >
                                    {`[
  {"title": "My API Key 1", "api_key_value": "AIzaXXXXXXXXXXXXXXXXXXXX1"},
  {"label": "My API Key 2", "value": "AIzaXXXXXXXXXXXXXXXXXXXX2"}
]`}
                                </pre>

                                <Alert
                                    message="Validation Rules"
                                    description="All API keys must be at least 10 characters long and not empty. Invalid keys will be highlighted in the review step."
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
                    <Tabs activeKey={activeTab} onChange={setActiveTab}>
                        <Tabs.TabPane tab="Manual Entry" key="manual">
                            <Form.List name="keys">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space
                                                key={key}
                                                style={{ display: 'flex', marginBottom: 8 }}
                                                align="baseline"
                                            >
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'name']}
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Missing name',
                                                        },
                                                    ]}
                                                >
                                                    <Input placeholder="Key Name" />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'api_key_value']}
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Missing API key',
                                                        },
                                                    ]}
                                                >
                                                    <Input.Password placeholder="API Key" />
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
                                                Add API Key
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Bulk Paste" key="bulk">
                            <Form.Item name="bulk_keys">
                                <Input.TextArea
                                    rows={10}
                                    placeholder={`Paste API keys here, separated by commas, spaces, new lines, semicolons, or pipes.

Examples:
AIzaXXXXXXXXXXXXXXXXXXXX1, AIzaXXXXXXXXXXXXXXXXXXXX2, AIzaXXXXXXXXXXXXXXXXXXXX3

Or:
AIzaXXXXXXXXXXXXXXXXXXXX1
AIzaXXXXXXXXXXXXXXXXXXXX2
AIzaXXXXXXXXXXXXXXXXXXXX3

Each key should be at least 10 characters long.`}
                                />
                            </Form.Item>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Import JSON" key="json">
                            <Form.Item name="json_keys">
                                <Input.TextArea
                                    rows={10}
                                    placeholder={`Paste a JSON array of API keys.

Examples:

Simple array:
["AIzaXXXXXXXXXXXXXXXXXXXX1", "AIzaXXXXXXXXXXXXXXXXXXXX2"]

Object array:
[
  {"name": "Gproxy key 1", "key": "AIzaXXXXXXXXXXXXXXXXXXXX1"},
  {"name": "Gproxy key 2", "key": "AIzaXXXXXXXXXXXXXXXXXXXX2"}
]

Supported fields: name/title/label, api_key_value/apiKey/key/value`}
                                />
                            </Form.Item>
                            <Dragger beforeUpload={handleJsonUpload} showUploadList={false}>
                                <p className="ant-upload-drag-icon">
                                    <UploadOutlined />
                                </p>
                                <p className="ant-upload-text">
                                    Click or drag a JSON file to this area to load
                                </p>
                            </Dragger>
                        </Tabs.TabPane>
                    </Tabs>
                </Form>
                <Alert
                    message="Security Notice"
                    description="API keys are sensitive. Ensure you are importing them from a trusted source."
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
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (text: string, record: ParsedApiKey) => (
                    <Input
                        value={text}
                        onChange={(e) => handleKeyUpdate(record.id, { name: e.target.value })}
                        placeholder="Key Name"
                    />
                ),
            },
            {
                title: 'API Key',
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
                        placeholder="API Key"
                    />
                ),
            },
            {
                title: 'Status',
                dataIndex: 'isValid',
                key: 'isValid',
                render: (isValid: boolean) => (
                    <Tag
                        color={isValid ? 'green' : 'red'}
                        icon={isValid ? <CheckOutlined /> : <ExclamationCircleOutlined />}
                    >
                        {isValid ? 'Valid' : 'Invalid'}
                    </Tag>
                ),
            },
            {
                title: 'Actions',
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
                    <Title level={4}>Review API Keys</Title>
                    <Paragraph type="secondary">
                        Review and edit your API keys before saving. Invalid keys will be
                        highlighted.
                    </Paragraph>
                </div>
                <Table
                    dataSource={parsedKeys}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                />
                {parsedKeys.some((key) => !key.isValid) && (
                    <Alert
                        message="Invalid Keys Detected"
                        description="Some keys have invalid formats and will be skipped during save."
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
                        Import Keys
                    </Button>
                ) : currentStep === 'review' ? (
                    <Space>
                        <Button onClick={() => setCurrentStep('import')}>Back to Import</Button>
                        <Button
                            type="primary"
                            onClick={handleSave}
                            loading={isUserLoading}
                            disabled={!user?.id}
                        >
                            Save API Keys
                        </Button>
                    </Space>
                ) : null
            }
        >
            <Row gutter={12}>
                <Col xs={24} lg={8}>
                    <Card variant="borderless">
                        <Title level={5}>Import Google AI Keys</Title>
                        <Paragraph type="secondary">
                            Follow the steps to import Google AI keys into your account.
                        </Paragraph>
                        <Steps direction="vertical" size="small" current={getCurrentStepNumber()}>
                            <Steps.Step
                                title="Import Keys"
                                description="Choose how you want to import your keys."
                            />
                            <Steps.Step
                                title="Review & Edit"
                                description="Review and edit your API keys before saving."
                            />
                            <Steps.Step title="Save" description="Save the keys to your account." />
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
