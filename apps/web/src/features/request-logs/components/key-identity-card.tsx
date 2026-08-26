import React from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import { CopyOutlined, KeyOutlined, SafetyOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { formatTokenCount } from '@/utils/table-helpers';
import { resolveKeyLabel } from '../resolve-key-label';

const { Text } = Typography;

type KeyJoin = {
    id: string;
    name: string;
    deleted_at: string | null;
    is_active?: boolean;
    provider?: string;
    success_count?: number | null;
    failure_count?: number | null;
    total_tokens?: number | null;
} | null | undefined;

export type KeyIdentityCardProps = {
    kind: 'api' | 'proxy';
    keyId: string | null;
    joined: KeyJoin;
    onCopy: (text: string, label: string) => void;
};

/**
 * Name-first key identity for log detail. Never replaces body with a warning Alert.
 */
export function KeyIdentityCard({ kind, keyId, joined, onCopy }: KeyIdentityCardProps) {
    const { translate } = useTranslation();
    const title =
        kind === 'api'
            ? translate('request_logs.identity.apiKey')
            : translate('request_logs.identity.proxyKey');
    const Icon = kind === 'api' ? KeyOutlined : SafetyOutlined;
    const resolved = resolveKeyLabel({
        joined: joined ? { name: joined.name, deleted_at: joined.deleted_at } : null,
        id: keyId,
    });

    return (
        <div className="gp-panel" style={{ padding: 12, height: '100%' }}>
            <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                <Space size={6}>
                    <Icon style={{ color: 'var(--gp-accent)' }} />
                    <span className="gp-section-title" style={{ margin: 0 }}>
                        {title}
                    </span>
                </Space>
                {resolved.isRemoved && keyId ? (
                    <Tag style={{ borderRadius: 2, margin: 0 }}>
                        {translate('request_logs.identity.removed')}
                    </Tag>
                ) : joined && !joined.deleted_at ? (
                    <Tag
                        color={joined.is_active ? 'success' : 'error'}
                        style={{ borderRadius: 2, margin: 0 }}
                    >
                        {translate(joined.is_active ? 'common.active' : 'common.inactive')}
                    </Tag>
                ) : null}
            </Space>

            {!keyId ? (
                <>
                    <Text style={{ color: 'var(--gp-text-muted)' }}>—</Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gp-text-muted)' }}>
                        {translate('request_logs.identity.notUsed')}
                    </div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gp-text)' }}>
                        {resolved.label}
                    </div>
                    <Space size={4} style={{ marginTop: 4 }}>
                        <Text
                            className="gp-live-mono"
                            style={{ fontSize: 12, color: 'var(--gp-text-muted)' }}
                        >
                            {keyId.slice(0, 8)}…{keyId.slice(-6)}
                        </Text>
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() =>
                                onCopy(keyId, translate('request_logs.identity.keyId', { title }))
                            }
                            aria-label={translate('request_logs.identity.copyKeyId', { title })}
                        />
                    </Space>
                    {resolved.isRemoved && joined ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gp-text-muted)' }}>
                            {translate('request_logs.identity.removedFromVault')}
                        </div>
                    ) : null}
                    {resolved.isRemoved && !joined ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gp-text-muted)' }}>
                            {translate('request_logs.identity.recordGone')}
                        </div>
                    ) : null}
                    {joined && !joined.deleted_at && kind === 'api' && joined.provider ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gp-text-secondary)' }}>
                            {translate('request_logs.identity.provider')}{' '}
                            <Tag color="blue" style={{ borderRadius: 2 }}>
                                {joined.provider}
                            </Tag>
                        </div>
                    ) : null}
                    {joined && !joined.deleted_at && joined.total_tokens != null ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gp-text-secondary)' }}>
                            {translate('request_logs.identity.lifetimeTokens', {
                                count: formatTokenCount(joined.total_tokens),
                            })}
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
