'use client';

import { ColorModeContext } from '@contexts/color-mode';
import type { RefineThemedLayoutV2HeaderProps } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Avatar, Layout as AntdLayout, Space, Switch, theme, Typography } from 'antd';
import React, { useContext } from 'react';

const { Text } = Typography;
const { useToken } = theme;

type IUser = {
    id: number;
    name: string;
    avatar: string;
};

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({ sticky = true }) => {
    const { token } = useToken();
    const { data: user } = useGetIdentity<IUser>();
    const { mode, toggleMode } = useContext(ColorModeContext);

    const headerStyles: React.CSSProperties = {
        backgroundColor: token.colorBgElevated,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0px 24px',
        height: '64px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
    };

    if (sticky) {
        headerStyles.position = 'sticky';
        headerStyles.top = 0;
        headerStyles.zIndex = 1;
    }

    return (
        <AntdLayout.Header style={headerStyles}>
            <Space>
                <Switch
                    checkedChildren="🌛"
                    unCheckedChildren="🔆"
                    onChange={toggleMode}
                    checked={mode === 'dark'}
                    style={{
                        backgroundColor:
                            mode === 'dark' ? token.colorPrimary : token.colorBgContainer,
                    }}
                />
                {(user?.name || user?.avatar) && (
                    <Space style={{ marginLeft: '8px' }} size="middle">
                        {user?.name && (
                            <Text strong style={{ color: token.colorText }}>
                                {user.name}
                            </Text>
                        )}
                        {user?.avatar && <Avatar src={user?.avatar} alt={user?.name} />}
                    </Space>
                )}
            </Space>
        </AntdLayout.Header>
    );
};
