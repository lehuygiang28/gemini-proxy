'use client';

import React from 'react';
import { Badge, Switch, Tooltip, Space } from 'antd';
import { useTranslation } from '@refinedev/core';
import { getStatusValue } from '@/utils/table-helpers';

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
    const { translate } = useTranslation();

    return (
        <Space align="center">
            <Badge
                status={getStatusValue(isActive)}
                text={translate(isActive ? 'common.active' : 'common.inactive')}
            />
            <Tooltip title={translate(isActive ? 'common.disable' : 'common.enable')}>
                <Switch checked={isActive} size="small" onChange={onToggle} loading={loading} />
            </Tooltip>
        </Space>
    );
};
