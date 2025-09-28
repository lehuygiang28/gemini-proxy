'use client';

import { CSSProperties } from 'react';
import Link from 'next/link';
import { Typography, theme } from 'antd';

const { Title, Text } = Typography;
const { useToken } = theme;

interface TitleProps {
    collapsed: boolean;
}

/**
 * Logo and App Name here
 * @param param0
 * @returns
 */
export function CustomTitle({ collapsed }: TitleProps) {
    const { token } = useToken();

    const titleStyles: CSSProperties = {
        margin: 0,
        color: token.colorText,
        fontWeight: 700,
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading4,
        display: 'flex',
        alignItems: 'center',
        gap: token.marginSM,
    };

    const iconStyles: CSSProperties = {
        fontSize: collapsed ? token.fontSizeLG : token.fontSizeHeading3,
        color: token.colorPrimary,
    };

    return (
        <Link href={'/'}>
            <Title level={5} style={titleStyles}>
                <span style={iconStyles}>🔑</span>
                {!collapsed && (
                    <Text strong style={{ fontSize: 20, color: token.colorText }}>
                        Gemini Proxy
                    </Text>
                )}
            </Title>
        </Link>
    );
}
