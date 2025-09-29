'use client';

import { type CustomParams, type DataProvider } from '@refinedev/core';
import { dataProvider as dataProviderSupabase } from '@refinedev/supabase';
import { supabaseBrowserClient } from '@utils/supabase/client';
import type { RpcFunctionName } from '@/types/rpc.types';
import { handleRpcResponse, validateRpcParams } from '@/types/rpc.types';

// Enhanced custom data provider with RPC support following Refine v5 patterns
const supabaseDP = dataProviderSupabase(supabaseBrowserClient);

export const dataProvider: DataProvider = {
    ...supabaseDP,
    custom: async ({ url, method, payload, meta }: CustomParams) => {
        // Handle RPC function calls using meta parameter for function name
        if (meta?.operation === 'rpc' && meta?.function) {
            const functionName = meta.function as RpcFunctionName;

            try {
                // Validate parameters before making the call
                if (!validateRpcParams(payload, functionName)) {
                    throw new Error(`Invalid parameters for RPC function ${functionName}`);
                }

                // Call the PostgreSQL RPC function using payload as parameters
                const { data, error } = await supabaseBrowserClient.rpc(functionName, payload);

                if (error) {
                    console.error(`RPC function ${functionName} error:`, error);
                    throw new Error(`RPC function ${functionName} failed: ${error.message}`);
                }

                // Validate and handle the response
                const validatedData = handleRpcResponse(data, functionName);

                return {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: validatedData as any,
                };
            } catch (error) {
                console.error(`RPC function ${functionName} execution error:`, error);
                throw new Error(
                    `Failed to execute RPC function ${functionName}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`,
                );
            }
        }

        // Handle other custom operations
        if (meta?.operation === 'custom') {
            console.log('Custom operation:', { url, method, payload, meta });
            throw new Error('Custom operation not implemented');
        }

        // Fallback to default behavior
        throw new Error(`Unsupported custom operation: ${url}`);
    },
};
