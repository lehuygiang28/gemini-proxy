import React from 'react';
import { theme } from 'antd';
import { formatDate, formatTime } from '@/utils/table-helpers';

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
        return <span style={{ color: token.colorTextDisabled }}>Never</span>;
    }

    return (
        <div>
            <div style={{ color: token.colorText }}>{formatDate(dateString)}</div>
            {showTime && (
                <div
                    style={{
                        fontSize: token.fontSizeSM,
                        color: token.colorTextSecondary,
                    }}
                >
                    {formatTime(dateString)}
                </div>
            )}
        </div>
    );
};
