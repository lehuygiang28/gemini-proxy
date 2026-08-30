'use client';

import { useCallback } from 'react';
import { useNotification } from '@refinedev/core';
import { copyToClipboard } from '@/utils/table-helpers';

export type CopyNotificationMessages = {
    successMessage: string;
    successDescription?: string;
    errorMessage: string;
    errorDescription?: string;
};

/**
 * Copies text and shows Refine notifications on success/failure.
 */
export function useCopyWithNotification() {
    const notification = useNotification();

    return useCallback(
        async (text: string, messages: CopyNotificationMessages): Promise<boolean> => {
            if (await copyToClipboard(text)) {
                notification.open({
                    type: 'success',
                    message: messages.successMessage,
                    description: messages.successDescription,
                });
                return true;
            }
            notification.open({
                type: 'error',
                message: messages.errorMessage,
                description: messages.errorDescription,
            });
            return false;
        },
        [notification],
    );
}
