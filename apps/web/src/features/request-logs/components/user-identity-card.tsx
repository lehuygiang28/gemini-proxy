import React from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import { CopyOutlined, UserOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';

const { Text } = Typography;

type Identity = {
    id?: string;
    email?: string | null;
    name?: string | null;
};

export type UserIdentityCardProps = {
    userId: string | null;
    onCopy: (text: string, label: string) => void;
};

/**
 * Shows session email when the log belongs to the current user; ID is secondary.
 */
export function UserIdentityCard({ userId, onCopy }: UserIdentityCardProps) {
    const { data: identity } = useGetIdentity<Identity>();
    const isCurrentUser = Boolean(userId && identity?.id && userId === identity.id);
    const primaryLabel = isCurrentUser
        ? identity?.email || identity?.name || 'Authenticated user'
        : userId
          ? 'Authenticated user'
          : 'Anonymous';

    return (
        <div className="gp-panel" style={{ padding: 12, height: '100%' }}>
            <Space style={{ marginBottom: 8 }}>
                <UserOutlined style={{ color: 'var(--gp-accent)' }} />
                <span className="gp-section-title" style={{ margin: 0 }}>
                    User
                </span>
            </Space>

            {!userId ? (
                <>
                    <Text style={{ color: 'var(--gp-text-muted)' }}>Anonymous</Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gp-text-muted)' }}>
                        No user on this request.
                    </div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gp-text)' }}>
                        {primaryLabel}
                    </div>
                    <Space size={4} style={{ marginTop: 4 }}>
                        <Text className="gp-live-mono" style={{ fontSize: 12, color: 'var(--gp-text-muted)' }}>
                            {userId.slice(0, 8)}…{userId.slice(-4)}
                        </Text>
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => onCopy(userId, 'User ID')}
                            aria-label="Copy user ID"
                        />
                    </Space>
                    <div style={{ marginTop: 8 }}>
                        <Tag color="success" style={{ borderRadius: 2 }}>
                            Authenticated
                        </Tag>
                    </div>
                </>
            )}
        </div>
    );
}
