import React from 'react';
import { Typography, Space, theme } from 'antd';
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

    if (!dateString) {
        return <Text type="secondary">Never</Text>;
    }

    return (
        <Space direction="vertical" size={0}>
            <Text>{formatDate(dateString)}</Text>
            {showTime && (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {formatTime(dateString)}
                </Text>
            )}
        </Space>
    );
};
