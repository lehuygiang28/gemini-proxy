'use client';

import React from 'react';
import { Typography, Space, theme } from 'antd';
import { useTranslation } from '@refinedev/core';
import { formatDate, formatTime } from '@/utils/table-helpers';

const { Text } = Typography;
const { useToken } = theme;

interface DateTimeDisplayProps {
    dateString: string | null | undefined;
    showTime?: boolean;
}

export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({
    dateString,
    showTime = true,
}) => {
    const { token } = useToken();
    const { translate, getLocale } = useTranslation();
    const locale = getLocale();

    if (!dateString) {
        return <Text type="secondary">{translate('common.never')}</Text>;
    }

    return (
        <Space direction="vertical" size={0}>
            <Text>{formatDate(dateString, locale)}</Text>
            {showTime && (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {formatTime(dateString, locale)}
                </Text>
            )}
        </Space>
    );
};
