import type { ThemeConfig } from 'antd';

/** Signal Deck density + semantic tokens for Ant ConfigProvider. */
export const SIGNAL_DECK_PRIMARY = '#2bb8a8';
export const SIGNAL_DECK_SUCCESS = '#3ecf8e';
export const SIGNAL_DECK_WARNING = '#e3b341';
export const SIGNAL_DECK_ERROR = '#f07178';
export const SIGNAL_DECK_INFO = '#5ba3f5';

export type SignalDeckMode = 'dark' | 'light';

/**
 * Builds Ant Design theme tokens for the Signal Deck ops console look.
 */
export function buildSignalDeckTheme(
    mode: SignalDeckMode,
    selectedTheme: ThemeConfig,
    algorithms: ThemeConfig['algorithm'],
): ThemeConfig {
    const isLight = mode === 'light';
    return {
        algorithm: algorithms,
        token: {
            ...selectedTheme?.token,
            colorPrimary: isLight ? '#1a9e90' : SIGNAL_DECK_PRIMARY,
            colorSuccess: SIGNAL_DECK_SUCCESS,
            colorWarning: SIGNAL_DECK_WARNING,
            colorError: SIGNAL_DECK_ERROR,
            colorInfo: SIGNAL_DECK_INFO,
            colorBgBase: isLight ? '#f4f6f8' : '#0b0e11',
            borderRadius: 4,
            borderRadiusLG: 4,
            borderRadiusSM: 2,
            fontSize: 13,
            fontSizeLG: 16,
            fontSizeSM: 12,
            controlHeight: 32,
            controlHeightLG: 40,
            controlHeightSM: 28,
            padding: 12,
            paddingLG: 16,
            paddingSM: 8,
            margin: 12,
            marginLG: 16,
            marginSM: 8,
            boxShadow: 'none',
            boxShadowSecondary: 'none',
            boxShadowTertiary: 'none',
            fontFamily: 'var(--gp-font-sans)',
            fontFamilyCode: 'var(--gp-font-mono)',
        },
        components: {
            ...selectedTheme?.components,
            Layout: {
                ...selectedTheme?.components?.Layout,
                bodyBg: isLight ? '#f4f6f8' : '#0b0e11',
                headerBg: isLight ? '#ffffff' : '#12161c',
                siderBg: isLight ? '#ffffff' : '#12161c',
            },
            Card: {
                ...selectedTheme?.components?.Card,
                borderRadiusLG: 4,
                boxShadowTertiary: 'none',
            },
            Button: {
                ...selectedTheme?.components?.Button,
                borderRadius: 4,
                controlHeight: 32,
                controlHeightLG: 40,
                controlHeightSM: 28,
            },
            Input: {
                ...selectedTheme?.components?.Input,
                borderRadius: 4,
                controlHeight: 32,
                controlHeightLG: 40,
                controlHeightSM: 28,
            },
            Tag: {
                borderRadiusSM: 2,
            },
            Menu: {
                itemBorderRadius: 4,
            },
        },
    };
}
