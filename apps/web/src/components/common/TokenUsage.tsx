import React from 'react';
import { theme } from 'antd';
import { formatTokenCount } from '@/utils/table-helpers';

const { useToken } = theme;

interface TokenUsageProps {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
}

export const TokenUsage: React.FC<TokenUsageProps> = ({
    totalTokens,
    promptTokens,
    completionTokens,
}) => {
    const { token } = useToken();

    return (
        <div>
            <div
                style={{
                    fontSize: token.fontSizeSM,
                    marginBottom: token.marginXS,
                }}
            >
                <span style={{ color: token.colorInfo }}>
                    Total: {formatTokenCount(totalTokens)}
                </span>
            </div>
            <div
                style={{
                    fontSize: token.fontSizeSM,
                    color: token.colorTextSecondary,
                }}
            >
                <span>Prompt: {formatTokenCount(promptTokens)}</span>
                {' | '}
                <span>Completion: {formatTokenCount(completionTokens)}</span>
            </div>
        </div>
    );
};
