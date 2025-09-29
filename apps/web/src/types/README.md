# Type-Safe RPC System

This directory contains the type-safe RPC system for the Gemini Proxy application, providing full TypeScript support for PostgreSQL RPC functions.

## Overview

The type-safe RPC system extends from the database schema to provide:

- **Full Type Safety**: All parameters and return types are fully typed
- **Runtime Validation**: Parameters and responses are validated at runtime
- **Database Integration**: Types extend from actual database schema
- **IntelliSense Support**: Complete IDE support with autocomplete
- **Error Handling**: Comprehensive error handling and validation
- **Production Ready**: Robust, maintainable, and scalable architecture

## Architecture

### Core Components

1. **`rpc.types.ts`** - Core type definitions and validation functions
2. **`useRpc.ts`** - Type-safe React hooks (consolidated)
3. **Data Provider** - Enhanced with RPC support
4. **Examples** - Comprehensive usage examples

### Type System

```typescript
// RPC Function Names - Type-safe function names
export type RpcFunctionName = 
    | 'get_dashboard_statistics'
    | 'get_retry_statistics'
    | 'get_api_key_statistics'
    | 'get_proxy_key_statistics'
    | 'get_request_logs_statistics'
    | 'get_filter_options_models'
    | 'get_filter_options_error_types'
    | 'get_filter_options_status_codes'
    | 'get_filter_options_api_formats'
    | 'get_filter_options_user_ids'
    | 'get_filter_options_proxy_key_ids'
    | 'get_filter_options_api_key_ids'
    | 'get_filter_options_all';

// RPC Function Parameters - Type-safe parameter definitions
export interface RpcFunctionParams {
    get_dashboard_statistics: {
        p_user_id?: string;
    };
    get_retry_statistics: {
        p_user_id?: string;
        p_days_back?: number;
    };
    // ... other functions
}

// RPC Function Return Types - Type-safe return type definitions
export interface RpcFunctionReturns {
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
    // ... other return types
}
```

## Usage Examples

### Basic Usage

```typescript
import { useDashboardStatistics, useRetryStatistics } from '@/hooks/useRpc';

// Type-safe hook usage
const { data: dashboardStats } = useDashboardStatistics();
const { data: retryStats } = useRetryStatistics({ p_days_back: 30 });

// Full type safety
const stats: DashboardStatistics = dashboardStats; // Fully typed
const retryData: RetryStatistics = retryStats; // Fully typed
```

### Advanced Usage with Parameters

```typescript
import { useRequestLogsStatistics } from '@/hooks/useRpc';

// Type-safe parameter passing
const { data: requestLogsStats } = useRequestLogsStatistics({ 
    p_days_back: 7 
});

// Type-safe return types
const stats: RequestLogsStatistics = requestLogsStats;
console.log(stats.total_requests); // Fully typed with IntelliSense
```

### Filter Options Usage

```typescript
import { useFilterOptionsAll } from '@/hooks/useRpc';

// Type-safe filter options
const { data: filterOptions } = useFilterOptionsAll();
const models: string[] = filterOptions?.models || []; // Fully typed
const errorTypes: string[] = filterOptions?.error_types || []; // Fully typed
```

## Type Safety Features

### 1. Parameter Validation

All RPC function parameters are validated at runtime:

```typescript
// ✅ Valid - TypeScript will catch this at compile time
const { data } = useRetryStatistics({ p_days_back: 30 });

// ❌ Invalid - TypeScript error
const { data } = useRetryStatistics({ p_days_back: "30" }); // Error: string not assignable to number
```

### 2. Return Type Safety

All return types are fully typed and validated:

```typescript
const { data: dashboardStats } = useDashboardStatistics();

// ✅ Full IntelliSense support
dashboardStats.total_api_keys; // number
dashboardStats.success_rate; // number
dashboardStats.active_keys; // number

// ❌ TypeScript error for invalid properties
dashboardStats.invalid_property; // Error: Property does not exist
```

### 3. Runtime Validation

Parameters and responses are validated at runtime:

```typescript
// Parameters are validated before making the RPC call
if (!validateRpcParams(payload, functionName)) {
    throw new Error(`Invalid parameters for RPC function ${functionName}`);
}

// Responses are validated after receiving data
const validatedData = handleRpcResponse(data, functionName);
```

## Database Integration

The type system is designed to extend from the database schema:

```typescript
// Future: Extend from actual database types
import type { Database } from '@gemini-proxy/database';

// RPC functions can be typed based on actual database schema
type RpcFunctionParams = {
    get_dashboard_statistics: {
        p_user_id?: Database['public']['Tables']['api_keys']['Row']['user_id'];
    };
};
```

## Error Handling

Comprehensive error handling is built into the system:

```typescript
const {
    query: { isLoading, isError },
    result: data
} = useDashboardStatistics();

if (isError) {
    // Handle error state
    return <ErrorComponent />;
}

if (isLoading) {
    return <LoadingComponent />;
}

// Type-safe data access
const stats: DashboardStatistics = data?.data;
```

## Production Benefits

### 1. **Type Safety**

- Compile-time error detection
- IntelliSense support
- Refactoring safety

### 2. **Runtime Safety**

- Parameter validation
- Response validation
- Error handling

### 3. **Maintainability**

- Centralized type definitions
- Consistent API patterns
- Easy to extend

### 4. **Performance**

- Efficient RPC calls
- Proper caching
- Optimized data fetching

## Best Practices

### 1. Use Type-Safe Hooks

```typescript
// ✅ Good - Use type-safe hooks
const { data: stats } = useDashboardStatistics();

// ❌ Avoid - Direct RPC calls without types
const { data } = useCustom({ url: 'rpc/get_dashboard_statistics' });
```

### 2. Handle Loading and Error States

```typescript
const {
    query: { isLoading, isError },
    result: data
} = useDashboardStatistics();

if (isLoading) return <Loading />;
if (isError) return <Error />;

const stats = data?.data;
```

### 3. Use Proper Parameter Types

```typescript
// ✅ Good - Type-safe parameters
const { data } = useRetryStatistics({ p_days_back: 30 });

// ❌ Avoid - Any parameters
const { data } = useRetryStatistics({ p_days_back: "30" as any });
```

## Future Enhancements

1. **Database Schema Integration**: Full integration with database types
2. **Code Generation**: Auto-generate types from database schema
3. **Caching**: Advanced caching strategies
4. **Optimization**: Query optimization and batching
5. **Monitoring**: Performance monitoring and analytics

## Conclusion

The type-safe RPC system provides a robust, maintainable, and scalable solution for PostgreSQL RPC function integration in the Gemini Proxy application. It ensures type safety at both compile-time and runtime while providing excellent developer experience through IntelliSense and comprehensive error handling.
