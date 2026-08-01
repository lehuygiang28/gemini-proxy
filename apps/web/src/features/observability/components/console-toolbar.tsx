'use client';

import React from 'react';
import { Button, Select, Space, Typography } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { ConnectionStatusBadge } from './connection-status-badge';

const { Title, Text } = Typography;

interface ConsoleToolbarProps {
    selectedDays: number;
    isLive: boolean;
    isRefreshing: boolean;
    onDaysChange: (days: number) => void;
    onRefresh: () => void;
    onToggleLive: () => void;
}

/**
 * Console page chrome: title, period, refresh, pause/live, connection badge.
 */
export function ConsoleToolbar({
    selectedDays,
    isLive,
    isRefreshing,
    onDaysChange,
    onRefresh,
    onToggleLive,
}: ConsoleToolbarProps) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 16,
                flexWrap: 'wrap',
            }}
        >
            <div>
                <Title level={3} style={{ margin: 0 }}>
                    Console
                </Title>
                <Text type="secondary">Ops overview, live request feed, and key health</Text>
            </div>
            <Space wrap>
                <ConnectionStatusBadge paused={!isLive} />
                <Select
                    value={selectedDays}
                    onChange={onDaysChange}
                    style={{ width: 140 }}
                    options={[
                        { label: 'Last 7 days', value: 7 },
                        { label: 'Last 30 days', value: 30 },
                        { label: 'Last 90 days', value: 90 },
                    ]}
                />
                <Button
                    icon={isLive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={onToggleLive}
                >
                    {isLive ? 'Pause' : 'Resume'}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing}>
                    Refresh
                </Button>
            </Space>
        </div>
    );
}
