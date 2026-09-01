'use client';

import {
    useCustomMutation,
    useInvalidate,
    useTranslation,
    type BaseRecord,
    type HttpError,
} from '@refinedev/core';
import { RECONCILIATION_RESOURCE } from './unresolved-filters';

type ReconcileVariables = {
    p_request_id: string;
};

/**
 * Dashboard retry for stale admit reservations.
 * Goes through dataProvider.custom (useCustomMutation), not supabase-js in the page.
 */
export function useReconcileProxyRequest() {
    const { translate } = useTranslation();
    const invalidate = useInvalidate();
    const { mutateAsync, mutation } = useCustomMutation<
        BaseRecord,
        HttpError,
        ReconcileVariables
    >();

    const reconcile = (requestId: string) =>
        mutateAsync(
            {
                url: 'rpc/reconcile_proxy_request',
                method: 'post',
                values: { p_request_id: requestId },
                meta: {
                    operation: 'rpc',
                    function: 'reconcile_proxy_request',
                },
                successNotification: {
                    type: 'success',
                    message: translate('proxy_reconciliation_needed.retrySuccess'),
                    description: translate('proxy_reconciliation_needed.retrySuccessDesc'),
                },
                errorNotification: (error) => ({
                    type: 'error',
                    message: translate('proxy_reconciliation_needed.retryFailed'),
                    description:
                        error.message || translate('proxy_reconciliation_needed.retryFailedDesc'),
                }),
            },
            {
                onSuccess: async () => {
                    await invalidate({
                        resource: RECONCILIATION_RESOURCE,
                        invalidates: ['list'],
                    });
                },
            },
        );

    return {
        reconcile,
        pendingRequestId: mutation.isPending
            ? (mutation.variables?.values.p_request_id ?? null)
            : null,
    };
}
