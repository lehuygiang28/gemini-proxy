import React, { useState } from 'react';
import { Button, Tooltip, Collapse, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons';
import { formatJsonDisplay, copyToClipboard, truncateText } from '@/utils/table-helpers';

const { useToken } = theme;
const { Panel } = Collapse;

interface JsonDisplayProps {
    data: any;
    title?: string;
    maxPreviewLength?: number;
    collapsible?: boolean;
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({
    data,
    title = 'JSON Data',
    maxPreviewLength = 100,
    collapsible = true,
}) => {
    const { token } = useToken();
    const [isExpanded, setIsExpanded] = useState(false);

    const formattedJson = formatJsonDisplay(data);
    const previewText = truncateText(formattedJson, maxPreviewLength);
    const isTruncated = formattedJson.length > maxPreviewLength;

    if (!data) {
        return <span style={{ color: token.colorTextDisabled }}>No data</span>;
    }

    const handleCopy = () => {
        copyToClipboard(formattedJson);
    };

    if (!collapsible || !isTruncated) {
        return (
            <div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: token.marginSM,
                        marginBottom: token.marginXS,
                    }}
                >
                    <span style={{ fontSize: token.fontSizeSM, fontWeight: 500 }}>{title}</span>
                    <Tooltip title="Copy JSON">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={handleCopy}
                        />
                    </Tooltip>
                </div>
                <pre
                    style={{
                        fontSize: token.fontSizeSM,
                        backgroundColor: token.colorBgTextHover,
                        padding: token.paddingSM,
                        borderRadius: token.borderRadius,
                        margin: 0,
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontFamily: 'monospace',
                        color: token.colorText,
                    }}
                >
                    {formattedJson}
                </pre>
            </div>
        );
    }

    return (
        <Collapse size="small" style={{ backgroundColor: 'transparent' }} expandIconPosition="end">
            <Panel
                header={
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: token.marginSM,
                        }}
                    >
                        <span style={{ fontSize: token.fontSizeSM, fontWeight: 500 }}>{title}</span>
                        <Tooltip title="Copy JSON">
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleCopy}
                            />
                        </Tooltip>
                    </div>
                }
                key="1"
            >
                <pre
                    style={{
                        fontSize: token.fontSizeSM,
                        backgroundColor: token.colorBgTextHover,
                        padding: token.paddingSM,
                        borderRadius: token.borderRadius,
                        margin: 0,
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontFamily: 'monospace',
                        color: token.colorText,
                    }}
                >
                    {formattedJson}
                </pre>
            </Panel>
        </Collapse>
    );
};
