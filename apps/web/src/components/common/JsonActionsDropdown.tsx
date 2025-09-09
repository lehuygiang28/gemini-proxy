'use client';

import React, { useState } from 'react';
import { Dropdown, Button, Space, theme, Modal, Typography, Card, Tooltip, message } from 'antd';
import {
    MoreOutlined,
    FileTextOutlined,
    CodeOutlined,
    BugOutlined,
    CopyOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Tables } from '@gemini-proxy/database';

const { Text } = Typography;
const { useToken } = theme;

type RequestLog = Tables<'request_logs'>;

interface JsonActionsDropdownProps {
    record: RequestLog;
}

export const JsonActionsDropdown: React.FC<JsonActionsDropdownProps> = ({ record }) => {
    const { token } = useToken();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{
        title: string;
        data: unknown;
        type: 'request' | 'response' | 'error';
    } | null>(null);
    const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

    const hasRequestData = record.request_data && Object.keys(record.request_data).length > 0;
    const hasResponseData = record.response_data && Object.keys(record.response_data).length > 0;
    const hasErrorData = record.error_details && Object.keys(record.error_details).length > 0;

    const formatJsonData = (data: unknown): string => {
        try {
            return JSON.stringify(data, null, 2);
        } catch (error) {
            return String(data);
        }
    };

    const copyToClipboard = async () => {
        if (!modalData) return;
        try {
            await navigator.clipboard.writeText(formatJsonData(modalData.data));
            message.success('JSON copied to clipboard');
        } catch (error) {
            message.error('Failed to copy to clipboard');
        }
    };

    const downloadJson = () => {
        if (!modalData) return;
        try {
            const jsonString = formatJsonData(modalData.data);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${modalData.title.toLowerCase().replace(/\s+/g, '_')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            message.success('JSON downloaded successfully');
        } catch (error) {
            message.error('Failed to download JSON');
        }
    };

    const getTypeConfig = (type: 'request' | 'response' | 'error') => {
        switch (type) {
            case 'request':
                return {
                    icon: <FileTextOutlined />,
                    color: token.colorPrimary,
                    bgColor: token.colorPrimaryBg,
                };
            case 'response':
                return {
                    icon: <CodeOutlined />,
                    color: token.colorSuccess,
                    bgColor: token.colorSuccessBg,
                };
            case 'error':
                return {
                    icon: <BugOutlined />,
                    color: token.colorError,
                    bgColor: token.colorErrorBg,
                };
        }
    };

    const handleMenuClick = ({ key }: { key: string }) => {
        let data: unknown;
        let title: string;
        let type: 'request' | 'response' | 'error';

        switch (key) {
            case 'request':
                data = record.request_data;
                title = 'Request Data';
                type = 'request';
                break;
            case 'response':
                data = record.response_data;
                title = 'Response Data';
                type = 'response';
                break;
            case 'error':
                data = record.error_details;
                title = 'Error Details';
                type = 'error';
                break;
            default:
                return;
        }

        setModalData({ title, data, type });
        setIsModalOpen(true);
    };

    const menuItems: MenuProps['items'] = [
        {
            key: 'request',
            label: (
                <Space>
                    <FileTextOutlined style={{ color: token.colorPrimary }} />
                    <span>Request Data</span>
                </Space>
            ),
            disabled: !hasRequestData,
        },
        {
            key: 'response',
            label: (
                <Space>
                    <CodeOutlined style={{ color: token.colorSuccess }} />
                    <span>Response Data</span>
                </Space>
            ),
            disabled: !hasResponseData,
        },
        {
            key: 'error',
            label: (
                <Space>
                    <BugOutlined style={{ color: token.colorError }} />
                    <span>Error Details</span>
                </Space>
            ),
            disabled: !hasErrorData,
        },
    ];

    const typeConfig = modalData ? getTypeConfig(modalData.type) : null;

    return (
        <>
            <Dropdown
                menu={{
                    items: menuItems,
                    onClick: handleMenuClick,
                }}
                trigger={['click']}
                placement="bottomRight"
            >
                <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    style={{
                        color: token.colorTextSecondary,
                        fontSize: token.fontSizeSM,
                        padding: '4px 8px',
                        borderRadius: token.borderRadius,
                        border: `1px solid ${token.colorBorder}`,
                    }}
                >
                    JSON Data
                </Button>
            </Dropdown>

            <Modal
                title={
                    modalData ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: token.marginSM }}>
                            {typeConfig?.icon}
                            <span style={{ fontWeight: 600 }}>{modalData.title}</span>
                        </div>
                    ) : null
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Space>
                            <Button
                                type={viewMode === 'formatted' ? 'primary' : 'default'}
                                size="small"
                                onClick={() => setViewMode('formatted')}
                            >
                                📝 Formatted
                            </Button>
                            <Button
                                type={viewMode === 'raw' ? 'primary' : 'default'}
                                size="small"
                                onClick={() => setViewMode('raw')}
                            >
                                📄 Raw
                            </Button>
                        </Space>
                        <Space>
                            <Tooltip title="Copy to clipboard">
                                <Button
                                    icon={<CopyOutlined />}
                                    size="small"
                                    onClick={copyToClipboard}
                                >
                                    Copy
                                </Button>
                            </Tooltip>
                            <Tooltip title="Download as JSON file">
                                <Button
                                    icon={<DownloadOutlined />}
                                    size="small"
                                    onClick={downloadJson}
                                >
                                    Download
                                </Button>
                            </Tooltip>
                            <Button type="primary" onClick={() => setIsModalOpen(false)}>
                                Close
                            </Button>
                        </Space>
                    </div>
                }
                width={800}
                style={{ top: 20 }}
                bodyStyle={{
                    maxHeight: '75vh',
                    overflow: 'auto',
                    padding: token.paddingMD,
                    background: token.colorBgContainer,
                }}
            >
                {modalData && (
                    <>
                        <Card
                            size="small"
                            style={{
                                background: token.colorBgElevated,
                                border: `2px solid ${typeConfig?.color}`,
                                borderRadius: token.borderRadiusLG,
                                boxShadow: token.boxShadowSecondary,
                            }}
                            bodyStyle={{
                                padding: token.paddingMD,
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                fontSize: token.fontSizeSM,
                                lineHeight: 1.6,
                                maxHeight: '60vh',
                                overflow: 'auto',
                            }}
                        >
                            {viewMode === 'formatted' ? (
                                <pre
                                    style={{
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: token.colorText,
                                    }}
                                >
                                    {formatJsonData(modalData.data)}
                                </pre>
                            ) : (
                                <Text
                                    code
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        color: token.colorText,
                                        background: 'transparent',
                                        border: 'none',
                                    }}
                                >
                                    {formatJsonData(modalData.data)}
                                </Text>
                            )}
                        </Card>

                        <div
                            style={{
                                marginTop: token.marginMD,
                                padding: token.paddingSM,
                                background: token.colorFillTertiary,
                                borderRadius: token.borderRadius,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                📊 {formatJsonData(modalData.data).length} characters •{' '}
                                {Object.keys(modalData.data || {}).length} properties
                            </Text>
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                {viewMode === 'formatted' ? '📝 Formatted view' : '📄 Raw view'}
                            </Text>
                        </div>
                    </>
                )}
            </Modal>
        </>
    );
};
