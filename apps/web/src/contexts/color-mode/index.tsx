'use client';

import React, { type PropsWithChildren, createContext, useEffect, useState } from 'react';
import { ConfigProvider, App as AntdApp, theme, type ThemeConfig } from 'antd';
import { RefineThemes } from '@refinedev/antd';
import Cookies from 'js-cookie';
import { THEME_COOKIE_NAME } from '@constants';

export type ColorMode = 'dark' | 'light';

type ColorModeContextType = {
    mode: ColorMode;
    setColorMode: (mode: ColorMode) => void;
    toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>({} as ColorModeContextType);

type ColorModeContextProviderProps = {
    defaultMode?: ColorMode;
};

export const ColorModeContextProvider: React.FC<
    PropsWithChildren<ColorModeContextProviderProps>
> = ({ children, defaultMode }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setModeState] = useState(defaultMode || 'dark');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            const theme = Cookies.get(THEME_COOKIE_NAME) === 'light' ? 'light' : 'dark';
            setModeState(theme);
        }
    }, [isMounted]);

    const setColorMode = (newMode: ColorMode) => {
        setModeState(newMode);
        Cookies.set(THEME_COOKIE_NAME, newMode);
    };

    const toggleColorMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setColorMode(newMode);
    };

    const { darkAlgorithm, defaultAlgorithm } = theme;

    /**
     * Custom pre-define theme
     * @param selected Theme A selected theme from Refine pre-define
     * @returns ThemeConfig custom-ed
     */
    const themeConfig = (selectedTheme: ThemeConfig) => ({
        algorithm: mode === 'light' ? defaultAlgorithm : darkAlgorithm,
        token: {
            ...selectedTheme?.token,
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
        components: {
            ...selectedTheme?.components,
            Layout: {
                ...selectedTheme?.components?.Layout,
                bodyBg: mode === 'light' ? '#f5f5f5' : '#141414',
                headerBg: mode === 'light' ? '#ffffff' : '#1f1f1f',
                siderBg: mode === 'light' ? '#ffffff' : '#1f1f1f',
            },
            Card: {
                ...selectedTheme?.components?.Card,
                borderRadiusLG: 8,
                boxShadowTertiary:
                    mode === 'light'
                        ? '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                        : '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
            },
            Button: {
                ...selectedTheme?.components?.Button,
                borderRadius: 6,
                controlHeight: 40,
                controlHeightLG: 48,
                controlHeightSM: 32,
            },
            Input: {
                ...selectedTheme?.components?.Input,
                borderRadius: 6,
                controlHeight: 40,
                controlHeightLG: 48,
                controlHeightSM: 32,
            },
        },
    });

    return (
        <ColorModeContext.Provider
            value={{
                mode,
                setColorMode,
                toggleColorMode,
            }}
        >
            <ConfigProvider
                theme={themeConfig(RefineThemes.Blue)}
                warning={{
                    strict: false,
                }}
            >
                <AntdApp>{children}</AntdApp>
            </ConfigProvider>
        </ColorModeContext.Provider>
    );
};
