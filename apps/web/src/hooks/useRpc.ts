'use client';

import { useCustom } from '@refinedev/core';
import { useGetIdentity } from '@refinedev/core';
import type { BaseRecord } from '@refinedev/core';
import type { RpcFunctionName, RpcFunctionParams } from '@/types/rpc.types';

// Specific return types for better type safety (extending from database Json types)
export interface TypedRpcFunctionReturns {
    get_dashboard_statistics: {
        total_api_keys: number;
        total_proxy_keys: number;
        total_requests: number;
        successful_requests: number;
        total_tokens: number;
        avg_response_time_ms: number;
        success_rate: number;
        active_keys: number;
    };
    get_retry_statistics: {
        total_requests: number;
        requests_with_retries: number;
        total_retry_attempts: number;
        retry_rate: number;
        period_days: number;
    };
    get_api_key_statistics: {
        total_keys: number;
        active_keys: number;
        inactive_keys: number;
        total_success_count: number;
        total_failure_count: number;
        total_usage_count: number;
        success_rate: number;
    };
    get_proxy_key_statistics: {
        total_keys: number;
        active_keys: number;
        inactive_keys: number;
        total_success_count: number;
        total_failure_count: number;
        total_tokens: number;
        total_prompt_tokens: number;
        total_completion_tokens: number;
        success_rate: number;
    };
    get_request_logs_statistics: {
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        total_tokens: number;
        avg_response_time_ms: number;
        success_rate: number;
        requests_by_format: Record<string, number>;
        requests_by_hour: Record<string, number>;
        period_days: number;
    };
    get_filter_options_models: string[];
    get_filter_options_error_types: string[];
    get_filter_options_status_codes: number[];
    get_filter_options_api_formats: string[];
    get_filter_options_user_ids: string[];
    get_filter_options_proxy_key_ids: string[];
    get_filter_options_api_key_ids: string[];
    get_filter_options_all: {
        models: string[];
        error_types: string[];
        status_codes: number[];
        api_formats: string[];
    };
    cleanup_old_request_logs: number;
}

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

// Filter Options RPC Hooks
export const useFilterOptionsModels = createRpcHook('get_filter_options_models');
export const useFilterOptionsErrorTypes = createRpcHook('get_filter_options_error_types');
export const useFilterOptionsStatusCodes = createRpcHook('get_filter_options_status_codes');
export const useFilterOptionsApiFormats = createRpcHook('get_filter_options_api_formats');
export const useFilterOptionsUserIds = createRpcHook('get_filter_options_user_ids');
export const useFilterOptionsProxyKeyIds = createRpcHook('get_filter_options_proxy_key_ids');
export const useFilterOptionsApiKeyIds = createRpcHook('get_filter_options_api_key_ids');
export const useFilterOptionsAll = createRpcHook('get_filter_options_all');

// Utility RPC Hooks
export const useCleanupOldRequestLogs = createRpcHook('cleanup_old_request_logs');

// Type-safe return types for better IDE support (extending from database types)
export type DashboardStatistics = TypedRpcFunctionReturns['get_dashboard_statistics'];
export type RetryStatistics = TypedRpcFunctionReturns['get_retry_statistics'];
export type ApiKeyStatistics = TypedRpcFunctionReturns['get_api_key_statistics'];
export type ProxyKeyStatistics = TypedRpcFunctionReturns['get_proxy_key_statistics'];
export type RequestLogsStatistics = TypedRpcFunctionReturns['get_request_logs_statistics'];
export type FilterOptionsModels = TypedRpcFunctionReturns['get_filter_options_models'];
export type FilterOptionsErrorTypes = TypedRpcFunctionReturns['get_filter_options_error_types'];
export type FilterOptionsStatusCodes = TypedRpcFunctionReturns['get_filter_options_status_codes'];
export type FilterOptionsApiFormats = TypedRpcFunctionReturns['get_filter_options_api_formats'];
export type FilterOptionsUserIds = TypedRpcFunctionReturns['get_filter_options_user_ids'];
export type FilterOptionsProxyKeyIds = TypedRpcFunctionReturns['get_filter_options_proxy_key_ids'];
export type FilterOptionsApiKeyIds = TypedRpcFunctionReturns['get_filter_options_api_key_ids'];
export type FilterOptionsAll = TypedRpcFunctionReturns['get_filter_options_all'];
export type CleanupOldRequestLogs = TypedRpcFunctionReturns['cleanup_old_request_logs'];

// Export the factory functions for advanced usage
export { createRpcHook, createRpcHookWithDefaults };
