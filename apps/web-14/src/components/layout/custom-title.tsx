'use client';

import React from 'react';
import { Typography, theme } from 'antd';

const { Title, Text } = Typography;
const { useToken } = theme;

interface TitleProps {
    collapsed: boolean;
}

export const CustomTitle: React.FC<TitleProps> = ({ collapsed }) => {
    const { token } = useToken();

    const titleStyles: React.CSSProperties = {
        margin: 0,
        color: token.colorText,
        fontWeight: 700,
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading4,
        display: 'flex',
        alignItems: 'center',
        gap: token.marginSM,
    };

    const iconStyles: React.CSSProperties = {
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading3,
        color: token.colorPrimary,
    };

    return (
        <Title level={5} style={titleStyles}>
            <span style={iconStyles}>🔑</span>
            {!collapsed && (
                <Text strong style={{ fontSize: 20, color: token.colorText }}>
                    Gemini Proxy
                </Text>
            )}
        </Title>
    );
};
