'use client';

import React, { type PropsWithChildren, createContext, useEffect, useState } from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import Cookies from 'js-cookie';
import { RefineThemes } from '@refinedev/antd';

type ColorModeContextType = {
    mode: string;
    setMode: (mode: string) => void;
    toggleMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>({} as ColorModeContextType);

type ColorModeContextProviderProps = {
    defaultMode?: string;
};

export const ColorModeContextProvider: React.FC<
    PropsWithChildren<ColorModeContextProviderProps>
> = ({ children, defaultMode }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setModeState] = useState(defaultMode || 'light');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            const theme = Cookies.get('theme') || 'light';
            setModeState(theme);
        }
    }, [isMounted]);

    const setMode = (newMode: string) => {
        setModeState(newMode);
        Cookies.set('theme', newMode);
    };

    const toggleMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
    };

    const { darkAlgorithm, defaultAlgorithm } = theme;

    // Enhanced theme configuration
    const themeConfig = {
        token: {
            colorPrimary: '#1890ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 6,
            borderRadiusLG: 8,
            borderRadiusSM: 4,
            fontSize: 14,
            fontSizeLG: 16,
            fontSizeSM: 12,
            padding: 16,
            paddingLG: 24,
            paddingSM: 12,
            margin: 16,
            marginLG: 24,
            marginSM: 12,
            boxShadow:
                '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
            boxShadowSecondary:
                '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
            boxShadowTertiary:
                '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        },
        algorithm: mode === 'light' ? defaultAlgorithm : darkAlgorithm,
        components: {
            Layout: {
                bodyBg: mode === 'light' ? '#f5f5f5' : '#141414',
                headerBg: mode === 'light' ? '#ffffff' : '#1f1f1f',
                siderBg: mode === 'light' ? '#ffffff' : '#1f1f1f',
            },
            Card: {
                borderRadiusLG: 8,
                boxShadowTertiary:
                    mode === 'light'
                        ? '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                        : '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
            },
            Button: {
                borderRadius: 6,
                controlHeight: 40,
                controlHeightLG: 48,
                controlHeightSM: 32,
            },
            Input: {
                borderRadius: 6,
                controlHeight: 40,
                controlHeightLG: 48,
                controlHeightSM: 32,
            },
        },
    };

    return (
        <ColorModeContext.Provider
            value={{
                setMode,
                mode,
                toggleMode,
            }}
        >
            <ConfigProvider
                theme={{
                    ...RefineThemes.Blue,
                    ...themeConfig,
                    algorithm: mode === 'light' ? defaultAlgorithm : darkAlgorithm,
                }}
            >
                <AntdApp>{children}</AntdApp>
            </ConfigProvider>
        </ColorModeContext.Provider>
    );
};
