import React from 'react';
import { Button, Tooltip, Space, theme } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons';
import { maskSensitiveKey, copyToClipboard } from '@/utils/table-helpers';

const { useToken } = theme;

interface SensitiveKeyDisplayProps {
    value: string;
    isRevealed: boolean;
    onToggleVisibility: () => void;
    showCopyButton?: boolean;
}

export const SensitiveKeyDisplay: React.FC<SensitiveKeyDisplayProps> = ({
    value,
    isRevealed,
    onToggleVisibility,
    showCopyButton = true,
}) => {
    const { token } = useToken();

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: token.marginSM,
            }}
        >
            <code
                style={{
                    fontFamily: 'monospace',
                    fontSize: token.fontSizeSM,
                    backgroundColor: token.colorBgTextHover,
                    padding: `${token.paddingXS} ${token.paddingSM}`,
                    borderRadius: token.borderRadius,
                    flex: 1,
                    color: token.colorText,
                }}
            >
                {maskSensitiveKey(value, isRevealed)}
            </code>
            <Space size="small">
                <Tooltip title={isRevealed ? 'Hide Key' : 'Reveal Key'}>
                    <Button
                        type="text"
                        size="small"
                        icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={onToggleVisibility}
                    />
                </Tooltip>
                {showCopyButton && (
                    <Tooltip title="Copy to clipboard">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(value)}
                        />
                    </Tooltip>
                )}
            </Space>
        </div>
    );
};
