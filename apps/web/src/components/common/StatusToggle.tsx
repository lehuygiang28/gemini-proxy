import React from 'react';
import { Badge, Switch, Tooltip, theme } from 'antd';
import { getStatusColor, getStatusText } from '@/utils/table-helpers';

const { useToken } = theme;

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
    const { token } = useToken();

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: token.marginSM,
            }}
        >
            <Badge status={getStatusColor(isActive) as any} text={getStatusText(isActive)} />
            <Tooltip title={isActive ? 'Click to disable' : 'Click to enable'}>
                <Switch checked={isActive} size="small" onChange={onToggle} loading={loading} />
            </Tooltip>
        </div>
    );
};
