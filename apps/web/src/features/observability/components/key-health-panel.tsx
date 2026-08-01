import React, { useMemo } from 'react';
import { Empty, Spin, Typography } from 'antd';
import type { Tables } from '@gemini-proxy/database';
import { calculateSuccessRate, formatTokenCount } from '@/utils/table-helpers';
import { KeyHealthBadge } from './key-health-badge';

const { Text } = Typography;

type ApiKeyRow = Pick<
    Tables<'api_keys'>,
    'id' | 'name' | 'is_active' | 'success_count' | 'failure_count' | 'total_tokens'
>;

type ProxyKeyRow = Pick<
    Tables<'proxy_api_keys'>,
    'id' | 'name' | 'is_active' | 'success_count' | 'failure_count' | 'total_tokens'
>;

interface KeyHealthPanelProps {
    apiKeys: ApiKeyRow[];
    proxyKeys: ProxyKeyRow[];
    loading?: boolean;
    onOpenApiKey?: (id: string) => void;
    onOpenProxyKey?: (id: string) => void;
}

type HealthItem = {
    id: string;
    name: string;
    kind: 'api' | 'proxy';
    isActive: boolean;
    successRate: number;
    failureCount: number;
    totalTokens: number;
};

/**
 * Worst / inactive keys for quick triage.
 */
export function KeyHealthPanel({
    apiKeys,
    proxyKeys,
    loading = false,
    onOpenApiKey,
    onOpenProxyKey,
}: KeyHealthPanelProps) {
    const items = useMemo(() => {
        const mapped: HealthItem[] = [
            ...apiKeys.map((key) => ({
                id: key.id,
                name: key.name,
                kind: 'api' as const,
                isActive: key.is_active,
                successRate: calculateSuccessRate(key.success_count, key.failure_count),
                failureCount: key.failure_count,
                totalTokens: key.total_tokens,
            })),
            ...proxyKeys.map((key) => ({
                id: key.id,
                name: key.name,
                kind: 'proxy' as const,
                isActive: key.is_active,
                successRate: calculateSuccessRate(key.success_count, key.failure_count),
                failureCount: key.failure_count,
                totalTokens: key.total_tokens,
            })),
        ];
        return mapped
            .sort((left, right) => {
                if (left.isActive !== right.isActive) {
                    return left.isActive ? 1 : -1;
                }
                if (left.failureCount !== right.failureCount) {
                    return right.failureCount - left.failureCount;
                }
                return left.successRate - right.successRate;
            })
            .slice(0, 8);
    }, [apiKeys, proxyKeys]);

    return (
        <div className="gp-panel" style={{ minHeight: 320 }}>
            <div style={{ padding: '12px 12px 0' }}>
                <div className="gp-section-title">Key health</div>
            </div>
            {loading && items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin />
                </div>
            ) : items.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No keys yet"
                    style={{ padding: 32 }}
                />
            ) : (
                items.map((item) => (
                    <div
                        key={`${item.kind}-${item.id}`}
                        className="gp-health-row"
                        onClick={() =>
                            item.kind === 'api'
                                ? onOpenApiKey?.(item.id)
                                : onOpenProxyKey?.(item.id)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                item.kind === 'api'
                                    ? onOpenApiKey?.(item.id)
                                    : onOpenProxyKey?.(item.id);
                            }
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {item.name}
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {item.kind === 'api' ? 'API key' : 'Proxy key'} ·{' '}
                                {formatTokenCount(item.totalTokens)} tokens · {item.failureCount}{' '}
                                fails
                            </Text>
                        </div>
                        <KeyHealthBadge
                            isActive={item.isActive}
                            successRate={item.successRate}
                            failureCount={item.failureCount}
                        />
                    </div>
                ))
            )}
        </div>
    );
}
