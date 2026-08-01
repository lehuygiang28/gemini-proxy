'use client';

import React, { type PropsWithChildren, createContext, useEffect, useState } from 'react';
import { ConfigProvider, App as AntdApp, theme, type ThemeConfig } from 'antd';
import { RefineThemes } from '@refinedev/antd';
import Cookies from 'js-cookie';
import { THEME_COOKIE_NAME } from '@constants';
import { buildSignalDeckTheme } from '@constants/observability-theme';

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
            const themeCookie = Cookies.get(THEME_COOKIE_NAME) === 'light' ? 'light' : 'dark';
            setModeState(themeCookie);
        }
    }, [isMounted]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const setColorMode = (newMode: ColorMode) => {
        setModeState(newMode);
        Cookies.set(THEME_COOKIE_NAME, newMode);
    };

    const toggleColorMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setColorMode(newMode);
    };

    const { darkAlgorithm, defaultAlgorithm } = theme;

    const themeConfig = (selectedTheme: ThemeConfig): ThemeConfig =>
        buildSignalDeckTheme(
            mode,
            selectedTheme,
            mode === 'light' ? defaultAlgorithm : darkAlgorithm,
        );

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
