import React from 'react';
import { Button, Tooltip, Space, Input, theme } from 'antd';
import { useNotification } from '@refinedev/core';
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
    const notification = useNotification();
    const { token } = useToken();

    const actions = [
        <Tooltip key="toggle" title={isRevealed ? 'Hide Key' : 'Reveal Key'}>
            <Button
                type="text"
                size="small"
                icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={onToggleVisibility}
            />
        </Tooltip>,
    ];

    const copyHandler = () => {
        if (copyToClipboard(value)) {
            notification.open({
                type: 'success',
                message: 'Copied to clipboard',
            });
        } else {
            notification.open({
                type: 'error',
                message: 'Failed to copy, try again later',
            });
        }
    };

    if (showCopyButton) {
        actions.push(
            <Tooltip key="copy" title="Copy to clipboard">
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={copyHandler} />
            </Tooltip>,
        );
    }

    return (
        <Input
            value={maskSensitiveKey(value, isRevealed)}
            readOnly
            addonAfter={<Space size="small">{actions}</Space>}
            style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM }}
        />
    );
};
