import React from 'react';
import { Button, Select, Space, Typography } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
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
    const { translate } = useTranslation();
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
                    {translate('observability.title')}
                </Title>
                <Text type="secondary">{translate('observability.subtitle')}</Text>
            </div>
            <Space wrap>
                <ConnectionStatusBadge paused={!isLive} />
                <Select
                    value={selectedDays}
                    onChange={onDaysChange}
                    style={{ width: 140 }}
                    options={[
                        { label: translate('observability.last7'), value: 7 },
                        { label: translate('observability.last30'), value: 30 },
                        { label: translate('observability.last90'), value: 90 },
                    ]}
                />
                <Button
                    icon={isLive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={onToggleLive}
                >
                    {isLive ? translate('observability.pause') : translate('observability.resume')}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing}>
                    {translate('observability.refresh')}
                </Button>
            </Space>
        </div>
    );
}
