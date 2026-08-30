'use client';

import React from 'react';
import { Button, Tooltip, Space, Input, theme } from 'antd';
import { useNotification, useTranslation } from '@refinedev/core';
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
    const { translate } = useTranslation();
    const { token } = useToken();

    const actions = [
        <Tooltip
            key="toggle"
            title={translate(isRevealed ? 'common.hideKey' : 'common.revealKey')}
        >
            <Button
                type="text"
                size="small"
                icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={onToggleVisibility}
            />
        </Tooltip>,
    ];

    const copyHandler = async (): Promise<void> => {
        if (await copyToClipboard(value)) {
            notification.open({
                type: 'success',
                message: translate('common.copiedToClipboard'),
            });
        } else {
            notification.open({
                type: 'error',
                message: translate('common.copyFailedRetry'),
            });
        }
    };

    if (showCopyButton) {
        actions.push(
            <Tooltip key="copy" title={translate('common.copyToClipboard')}>
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
