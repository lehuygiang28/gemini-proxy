'use client';

import React from 'react';
import { ThemedLayoutV2 } from '@refinedev/antd';
import { Layout, theme } from 'antd';
import { ColorModeContext } from '@contexts/color-mode';
import { Header } from '@components/header';
import { CustomTitle } from './custom-title';

const { useToken } = theme;

interface CustomThemedLayoutV2Props {
    children: React.ReactNode;
    initialSiderCollapsed?: boolean;
}

export const CustomThemedLayoutV2: React.FC<CustomThemedLayoutV2Props> = ({
    children,
    initialSiderCollapsed = false,
}) => {
    const { token } = useToken();
    const { mode } = React.useContext(ColorModeContext);

    const layoutStyles: React.CSSProperties = {
        minHeight: '100vh',
        background: token.colorBgContainer,
    };

    const contentStyles: React.CSSProperties = {
        background: token.colorBgContainer,
        padding: token.paddingLG,
    };

    return (
        <Layout style={layoutStyles}>
            <ThemedLayoutV2
                Header={Header}
                Title={CustomTitle}
                initialSiderCollapsed={initialSiderCollapsed}
            >
                <Layout.Content style={contentStyles}>{children}</Layout.Content>
            </ThemedLayoutV2>
        </Layout>
    );
};
