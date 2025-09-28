import React from 'react';
import { Badge, Switch, Tooltip, Space } from 'antd';
import { getStatusValue, getStatusText } from '@/utils/table-helpers';

interface StatusToggleProps {
    isActive: boolean;
    onToggle: (checked: boolean) => void;
    loading?: boolean;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
    isActive,
    onToggle,
    loading = false,
}) => {
    return (
        <Space align="center">
            <Badge status={getStatusValue(isActive)} text={getStatusText(isActive)} />
            <Tooltip title={isActive ? 'Click to disable' : 'Click to enable'}>
                <Switch checked={isActive} size="small" onChange={onToggle} loading={loading} />
            </Tooltip>
        </Space>
    );
};
