'use client';

import React, { useContext } from 'react';
import { Space, Tooltip, Typography, theme } from 'antd';
import { useTranslation } from '@refinedev/core';
import { DateTimeFormatContext } from '@contexts/datetime-format';
import {
    formatRelativeTime,
    resolveDatetimePresentation,
} from '@/features/datetime/datetime-format';
import { useUserQuotaTimezone } from '@/features/datetime/use-user-quota-timezone';
import { formatDate, formatTime } from '@/utils/table-helpers';

const { Text } = Typography;
const { useToken } = theme;

interface DateTimeDisplayProps {
    dateString: string | null | undefined;
    showTime?: boolean;
}

function exactLabel(dateString: string, locale: string, showTime: boolean): string {
    const date = formatDate(dateString, locale);
    if (!showTime) {
        return date;
    }
    return `${date} ${formatTime(dateString, locale)}`.trim();
}

export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({
    dateString,
    showTime = true,
}) => {
    const { token } = useToken();
    const { translate, getLocale } = useTranslation();
    const locale = getLocale();
    const { mode } = useContext(DateTimeFormatContext);
    const quotaTimeZone = useUserQuotaTimezone();

    if (!dateString) {
        return <Text type="secondary">{translate('common.never')}</Text>;
    }

    const timeZone = quotaTimeZone && quotaTimeZone.length > 0 ? quotaTimeZone : 'Invalid/Zone';
    const presentation = resolveDatetimePresentation({
        iso: dateString,
        mode,
        timeZone,
    });
    const relativeLabel = formatRelativeTime(dateString, locale);

    if (presentation.kind === 'relative' && relativeLabel) {
        return (
            <Tooltip title={exactLabel(dateString, locale, showTime)}>
                <Text>{relativeLabel}</Text>
            </Tooltip>
        );
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
