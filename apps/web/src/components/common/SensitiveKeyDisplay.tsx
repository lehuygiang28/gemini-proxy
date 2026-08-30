'use client';

import React from 'react';
import { Button, Tooltip, Space, Input, theme } from 'antd';
import { useTranslation } from '@refinedev/core';
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons';
import { maskSensitiveKey } from '@/utils/table-helpers';
import { useCopyWithNotification } from '@/hooks';

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
    const copyWithNotification = useCopyWithNotification();
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
        await copyWithNotification(value, {
            successMessage: translate('common.copiedToClipboard'),
            errorMessage: translate('common.copyFailedRetry'),
        });
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
