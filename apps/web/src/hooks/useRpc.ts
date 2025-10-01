'use client';

import { useCustom } from '@refinedev/core';
import { useGetIdentity } from '@refinedev/core';
import type { BaseRecord } from '@refinedev/core';
import type { RpcFunctionName, RpcFunctionParams } from '@/types/rpc.types';
import type {
    DashboardStatistics,
    RetryStatistics,
    ApiKeyStatistics,
    ProxyKeyStatistics,
    RequestLogsStatistics,
} from '@gemini-proxy/database';

// Type that extends BaseRecord for useCustom compatibility
type RpcFunctionReturn = BaseRecord;

// Generic RPC hook factory for any function
const createRpcHook = <T extends RpcFunctionName>(functionName: T) => {
    return (params?: RpcFunctionParams[T]) => {
        const { data: user } = useGetIdentity();

        // Merge user ID with provided parameters
        const finalParams = {
            p_user_id: user?.id,
            ...params,
        } as RpcFunctionParams[T];

        return useCustom<RpcFunctionReturn>({
            url: `rpc/${functionName}`,
            method: 'post',
            config: {
                payload: finalParams,
            },
            meta: {
                operation: 'rpc',
                function: functionName,
            },
            queryOptions: {
                enabled: !!user?.id,
            },
        });
    };
};

// Generic RPC hook factory with default parameters
const createRpcHookWithDefaults = <T extends RpcFunctionName>(
    functionName: T,
    defaultParams?: Partial<RpcFunctionParams[T]>,
) => {
    return (customParams?: Partial<RpcFunctionParams[T]>) => {
        const { data: user } = useGetIdentity();

        // Merge default parameters, user ID, and custom parameters
        const finalParams = {
            p_user_id: user?.id,
            ...defaultParams,
            ...customParams,
        } as RpcFunctionParams[T];

        return useCustom<RpcFunctionReturn>({
            url: `rpc/${functionName}`,
            method: 'post',
            config: {
                payload: finalParams,
            },
            meta: {
                operation: 'rpc',
                function: functionName,
            },
            queryOptions: {
                enabled: !!user?.id,
            },
        });
    };
};

// Statistics RPC Hooks
export const useDashboardStatistics = createRpcHook('get_dashboard_statistics');
export const useApiKeyStatistics = createRpcHook('get_api_key_statistics');
export const useProxyKeyStatistics = createRpcHook('get_proxy_key_statistics');

// Statistics RPC Hooks with Parameters
export const useRetryStatistics = createRpcHookWithDefaults('get_retry_statistics', {
    p_days_back: 30,
});
export const useRequestLogsStatistics = createRpcHookWithDefaults('get_request_logs_statistics', {
    p_days_back: 7,
});

// Re-export types from database package for convenience
export type {
    DashboardStatistics,
    RetryStatistics,
    ApiKeyStatistics,
    ProxyKeyStatistics,
    RequestLogsStatistics,
};

// Export the factory functions for advanced usage
export { createRpcHook, createRpcHookWithDefaults };
