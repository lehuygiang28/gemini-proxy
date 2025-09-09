'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, theme, Tooltip, message, Collapse } from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;
const { useToken } = theme;

interface JsonDisplayProps {
    data: unknown;
    title?: string;
    collapsible?: boolean;
    showActions?: boolean;
    maxHeight?: string;
    type?: 'request' | 'response' | 'error';
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({
    data,
    title = 'JSON Data',
    collapsible = true,
    showActions = true,
    maxHeight = '400px',
    type = 'request',
}) => {
    const { token } = useToken();
    const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

    const formatJsonData = (data: unknown): string => {
        try {
            return JSON.stringify(data, null, 2);
        } catch (error) {
            return String(data);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(formatJsonData(data));
            message.success('JSON copied to clipboard');
        } catch (error) {
            message.error('Failed to copy to clipboard');
        }
    };

    const downloadJson = () => {
        try {
            const jsonString = formatJsonData(data);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            message.success('JSON downloaded successfully');
        } catch (error) {
            message.error('Failed to download JSON');
        }
    };

    const getTypeConfig = () => {
        switch (type) {
            case 'request':
                return {
                    icon: <EyeOutlined />,
                    color: token.colorPrimary,
                    bgColor: token.colorPrimaryBg,
                };
            case 'response':
                return {
                    icon: <EyeOutlined />,
                    color: token.colorSuccess,
                    bgColor: token.colorSuccessBg,
                };
            case 'error':
                return {
                    icon: <EyeOutlined />,
                    color: token.colorError,
                    bgColor: token.colorErrorBg,
                };
        }
    };

    const typeConfig = getTypeConfig();
    const hasData = data && Object.keys(data || {}).length > 0;

    const jsonContent = (
        <Card
            size="small"
            style={{
                background: token.colorBgElevated,
                border: `2px solid ${typeConfig.color}`,
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
            }}
            bodyStyle={{
                padding: token.paddingMD,
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: token.fontSizeSM,
                lineHeight: 1.6,
                maxHeight,
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
                    {formatJsonData(data)}
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
                    {formatJsonData(data)}
                </Text>
            )}
        </Card>
    );

    const actionsBar = showActions && (
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
                    <Button icon={<CopyOutlined />} size="small" onClick={copyToClipboard}>
                        Copy
                    </Button>
                </Tooltip>
                <Tooltip title="Download as JSON file">
                    <Button icon={<DownloadOutlined />} size="small" onClick={downloadJson}>
                        Download
                    </Button>
                </Tooltip>
            </Space>
        </div>
    );

    const infoBar = (
        <div
            style={{
                marginTop: token.marginSM,
                padding: token.paddingXS,
                background: token.colorFillQuaternary,
                borderRadius: token.borderRadius,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                📊 {formatJsonData(data).length} characters • {Object.keys(data || {}).length}{' '}
                properties
            </Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {viewMode === 'formatted' ? '📝 Formatted view' : '📄 Raw view'}
            </Text>
        </div>
    );

    if (!hasData) {
        return (
            <Card
                size="small"
                style={{
                    background: token.colorFillTertiary,
                    border: `1px dashed ${token.colorBorder}`,
                    borderRadius: token.borderRadiusLG,
                }}
                bodyStyle={{
                    padding: token.paddingLG,
                    textAlign: 'center',
                }}
            >
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    No {title.toLowerCase()} available
                </Text>
            </Card>
        );
    }

    if (collapsible) {
        return (
            <div>
                <Collapse
                    size="small"
                    items={[
                        {
                            key: '1',
                            label: (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: token.marginSM,
                                    }}
                                >
                                    {typeConfig.icon}
                                    <span style={{ fontWeight: 500 }}>{title}</span>
                                </div>
                            ),
                            children: (
                                <div>
                                    {jsonContent}
                                    {actionsBar}
                                    {infoBar}
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: token.marginMD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: token.marginSM }}>
                    {typeConfig.icon}
                    <span style={{ fontWeight: 600, fontSize: token.fontSizeLG }}>{title}</span>
                </div>
            </div>
            {jsonContent}
            {actionsBar}
            {infoBar}
        </div>
    );
};
