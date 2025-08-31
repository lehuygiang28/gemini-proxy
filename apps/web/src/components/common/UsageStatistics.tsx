import React from 'react';
import { theme } from 'antd';
import { calculateSuccessRate } from '@/utils/table-helpers';

const { useToken } = theme;

interface UsageStatisticsProps {
    successCount: number;
    failureCount: number;
}

export const UsageStatistics: React.FC<UsageStatisticsProps> = ({ successCount, failureCount }) => {
    const { token } = useToken();
    const successRate = calculateSuccessRate(successCount, failureCount);

    return (
        <div>
            <div style={{ fontSize: token.fontSizeSM }}>
                <span style={{ color: token.colorSuccess }}>✓ {successCount}</span>
                {' | '}
                <span style={{ color: token.colorError }}>✗ {failureCount}</span>
            </div>
            <div
                style={{
                    fontSize: token.fontSizeSM,
                    color: token.colorTextSecondary,
                }}
            >
                Success Rate: {successRate}%
            </div>
        </div>
    );
};
