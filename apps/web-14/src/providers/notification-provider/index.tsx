'use client';

import { notification } from 'antd';
import { ColorModeContext } from '@contexts/color-mode';
import React, { useContext } from 'react';
import type { OpenNotificationParams } from '@refinedev/core';

export const useNotificationProvider = () => {
    const { mode } = useContext(ColorModeContext);

    // Configure notification with theme-aware styling
    const [api, contextHolder] = notification.useNotification({
        placement: 'topRight',
        duration: 4.5,
        maxCount: 3,
        rtl: false,
        stack: {
            threshold: 3,
        },
    });

    const open = React.useCallback(
        (params: OpenNotificationParams) => {
            const { message, description, type = 'info' } = params;

            // Map RefineDev notification types to Ant Design types
            let antdType: 'success' | 'error' | 'info' | 'warning' = 'info';
            if (type === 'success' || type === 'error' || type === 'progress') {
                antdType = type === 'progress' ? 'info' : type;
            }

            const notificationMethod = api[antdType];
            if (notificationMethod) {
                notificationMethod({
                    message,
                    description,
                    style: {
                        borderRadius: 8,
                        boxShadow:
                            mode === 'dark'
                                ? '0 6px 16px 0 rgba(0, 0, 0, 0.3), 0 3px 6px -4px rgba(0, 0, 0, 0.2), 0 9px 28px 8px rgba(0, 0, 0, 0.2)'
                                : '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
                    },
                });
            }
        },
        [api, mode],
    );

    const success = React.useCallback(
        (message: string, description?: string) => {
            open({ message, description, type: 'success' });
        },
        [open],
    );

    const error = React.useCallback(
        (message: string, description?: string) => {
            open({ message, description, type: 'error' });
        },
        [open],
    );

    const warning = React.useCallback(
        (message: string, description?: string) => {
            open({ message, description, type: 'progress' }); // Map warning to progress for RefineDev
        },
        [open],
    );

    const info = React.useCallback(
        (message: string, description?: string) => {
            open({ message, description, type: 'progress' }); // Map info to progress for RefineDev
        },
        [open],
    );

    const close = React.useCallback(
        (key: string) => {
            api.destroy(key);
        },
        [api],
    );

    return {
        open,
        success,
        error,
        warning,
        info,
        close,
        contextHolder,
    };
};
