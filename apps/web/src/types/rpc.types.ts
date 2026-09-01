'use client';

import type { Database } from '@gemini-proxy/database';
import { isValidProxyQuotaWindowTypes } from '@gemini-proxy/core';

// Extract RPC function names from database types
type DatabaseFunctions = Database['public']['Functions'];
export type RpcFunctionName = keyof DatabaseFunctions;

// Extract RPC function parameters from database types
export type RpcFunctionParams = {
    [K in RpcFunctionName]: DatabaseFunctions[K]['Args'];
};

// Extract RPC function return types from database types
export type RpcFunctionReturns = {
    [K in RpcFunctionName]: DatabaseFunctions[K]['Returns'];
};

// Utility types for better type safety
export type RpcFunctionParam<T extends RpcFunctionName> = RpcFunctionParams[T];
export type RpcFunctionReturn<T extends RpcFunctionName> = RpcFunctionReturns[T];

// Type-safe RPC function parameter validator
export const validateRpcParams = <T extends RpcFunctionName>(
    params: unknown,
    functionName: T,
): params is RpcFunctionParams[T] => {
    if (typeof params !== 'object' || params === null) {
        return false;
    }

    const paramObj = params as Record<string, unknown>;

    // Validate based on function name and their actual parameter requirements
    switch (functionName) {
        case 'get_api_key_statistics':
        case 'get_proxy_key_statistics':
            return paramObj.p_user_id === undefined || typeof paramObj.p_user_id === 'string';

        case 'get_dashboard_statistics':
        case 'get_retry_statistics':
        case 'get_request_logs_statistics':
            return (
                (paramObj.p_user_id === undefined || typeof paramObj.p_user_id === 'string') &&
                (paramObj.p_days_back === undefined || typeof paramObj.p_days_back === 'number')
            );

        case 'get_request_logs_volume':
            return (
                (paramObj.p_user_id === undefined || typeof paramObj.p_user_id === 'string') &&
                (paramObj.p_range === undefined || typeof paramObj.p_range === 'string')
            );

        case 'cleanup_old_request_logs':
            return (
                paramObj.p_days_to_keep === undefined || typeof paramObj.p_days_to_keep === 'number'
            );

        case 'reconcile_proxy_request':
            return typeof paramObj.p_request_id === 'string' && paramObj.p_request_id.length > 0;

        case 'reset_proxy_key_quota':
            return (
                typeof paramObj.p_proxy_key_id === 'string' &&
                paramObj.p_proxy_key_id.length > 0 &&
                isValidProxyQuotaWindowTypes(paramObj.p_window_types)
            );

        case 'current_proxy_key_quota':
            return (
                typeof paramObj.p_proxy_key_id === 'string' && paramObj.p_proxy_key_id.length > 0
            );

        default:
            return false;
    }
};

// Type-safe RPC function response validator
export const validateRpcResponse = <T extends RpcFunctionName>(
    response: unknown,
    functionName: T,
): response is RpcFunctionReturns[T] => {
    // Postgres VOID RPCs come back as null from supabase-js.
    if (functionName === 'reconcile_proxy_request') {
        return response === null || response === undefined;
    }

    if (typeof response !== 'object' || response === null) {
        return false;
    }

    // Add runtime validation based on function name
    switch (functionName) {
        case 'get_dashboard_statistics':
            return 'total_api_keys' in response && 'total_proxy_keys' in response;

        case 'get_retry_statistics':
            return 'total_requests' in response && 'retry_rate' in response;

        case 'get_api_key_statistics':
            return 'total_keys' in response && 'success_rate' in response;

        case 'get_proxy_key_statistics':
            return 'total_keys' in response && 'total_tokens' in response;

        case 'get_request_logs_statistics':
            return 'total_requests' in response && 'success_rate' in response;

        case 'get_request_logs_volume':
            return 'range' in response && 'buckets' in response;

        case 'cleanup_old_request_logs':
            return typeof response === 'number';

        case 'reset_proxy_key_quota':
            return (
                'reset' in response &&
                'skipped' in response &&
                Array.isArray((response as { reset: unknown }).reset) &&
                Array.isArray((response as { skipped: unknown }).skipped)
            );

        case 'current_proxy_key_quota':
            return 'minute' in response && 'day' in response && 'month' in response;

        default:
            return false;
    }
};

// Type-safe RPC response handler
export const handleRpcResponse = <T extends RpcFunctionName>(
    response: unknown,
    functionName: T,
): RpcFunctionReturns[T] => {
    if (!validateRpcResponse(response, functionName)) {
        throw new Error(`Invalid response format for RPC function ${functionName}`);
    }

    return response as RpcFunctionReturns[T];
};

// Type-safe RPC function call interface
export interface RpcCall<T extends RpcFunctionName> {
    function: T;
    params: RpcFunctionParams[T];
}

// Type-safe RPC response interface
export interface RpcResponse<T extends RpcFunctionName> {
    data: RpcFunctionReturns[T];
    error?: string;
}

// Type-safe RPC function call creator
export const createRpcCall = <T extends RpcFunctionName>(
    functionName: T,
    params: RpcFunctionParams[T],
): RpcCall<T> => ({
    function: functionName,
    params,
});

// Type-safe RPC function call helper
export const createTypeSafeRpcCall = <T extends RpcFunctionName>(
    functionName: T,
    params: RpcFunctionParams[T],
): RpcCall<T> => {
    if (!validateRpcParams(params, functionName)) {
        throw new Error(`Invalid parameters for RPC function ${functionName}`);
    }

    return createRpcCall(functionName, params);
};
