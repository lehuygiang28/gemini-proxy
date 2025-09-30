'use client';

import type { Database } from '@gemini-proxy/database';

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

    // Validate based on function name
    switch (functionName) {
        case 'get_dashboard_statistics':
        case 'get_api_key_statistics':
        case 'get_proxy_key_statistics':
        case 'get_retry_statistics':
        case 'get_request_logs_statistics':
            return (
                'p_user_id' in paramObj &&
                'p_days_back' in paramObj &&
                (paramObj.p_user_id === undefined || typeof paramObj.p_user_id === 'string') &&
                (paramObj.p_days_back === undefined || typeof paramObj.p_days_back === 'number')
            );
        case 'cleanup_old_request_logs':
            return (
                'p_days_to_keep' in paramObj &&
                (paramObj.p_days_to_keep === undefined ||
                    typeof paramObj.p_days_to_keep === 'number')
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
