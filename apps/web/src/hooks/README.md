# Type-Safe RPC Hooks

This directory contains the consolidated, type-safe RPC hooks system for the Gemini Proxy application.

## Overview

The RPC hooks system provides:

- **Single Source of Truth**: All RPC hooks in one file (`useRpc.ts`)
- **Type Safety**: Full TypeScript support with IntelliSense
- **Runtime Validation**: Parameter and response validation
- **Clean Architecture**: No code duplication, maintainable structure
- **Production Ready**: Robust error handling and performance optimization

## File Structure

```
apps/web/src/hooks/
├── useRpc.ts                    # Main RPC hooks (consolidated)
└── README.md                    # This documentation

apps/web/src/types/
├── rpc.types.ts                 # Type definitions and validators
└── README.md                    # Type system documentation
```

## Usage

### Basic Statistics Hooks

```typescript
import { 
    useDashboardStatistics, 
    useApiKeyStatistics, 
    useProxyKeyStatistics 
} from '@/hooks/useRpc';

// Type-safe usage
const { data: dashboardStats } = useDashboardStatistics();
const { data: apiKeyStats } = useApiKeyStatistics();
const { data: proxyKeyStats } = useProxyKeyStatistics();
```

### Statistics Hooks with Parameters

```typescript
import { useRetryStatistics, useRequestLogsStatistics } from '@/hooks/useRpc';

// With default parameters
const { data: retryStats } = useRetryStatistics(); // p_days_back: 30
const { data: requestLogsStats } = useRequestLogsStatistics(); // p_days_back: 7

// With custom parameters
const { data: customRetryStats } = useRetryStatistics({ p_days_back: 14 });
const { data: customRequestLogsStats } = useRequestLogsStatistics({ p_days_back: 30 });
```

### Filter Options Hooks

```typescript
import { 
    useFilterOptionsModels, 
    useFilterOptionsAll 
} from '@/hooks/useRpc';

// Individual filter options
const { data: models } = useFilterOptionsModels();
const { data: errorTypes } = useFilterOptionsErrorTypes();

// All filter options in one call
const { data: allFilters } = useFilterOptionsAll();
```

### Error Handling

```typescript
const {
    query: { isLoading, isError },
    result: data
} = useDashboardStatistics();

if (isLoading) return <Loading />;
if (isError) return <Error />;

const stats = data?.data;
```

## Available Hooks

### Statistics Hooks

- `useDashboardStatistics()` - Overall dashboard statistics
- `useRetryStatistics(params?)` - Retry attempt statistics
- `useApiKeyStatistics()` - API key usage statistics
- `useProxyKeyStatistics()` - Proxy key usage statistics
- `useRequestLogsStatistics(params?)` - Request logs statistics

### Filter Options Hooks

- `useFilterOptionsModels()` - Available models
- `useFilterOptionsErrorTypes()` - Error types
- `useFilterOptionsStatusCodes()` - Status codes
- `useFilterOptionsApiFormats()` - API formats
- `useFilterOptionsUserIds()` - User IDs (admin)
- `useFilterOptionsProxyKeyIds()` - Proxy key IDs (admin)
- `useFilterOptionsApiKeyIds()` - API key IDs (admin)
- `useFilterOptionsAll()` - All filter options

## Type Safety

All hooks provide full type safety:

```typescript
// Return types are fully typed
const { data: stats } = useDashboardStatistics();
const dashboardStats: DashboardStatistics = stats; // Fully typed

// Parameters are type-safe
const { data: retryStats } = useRetryStatistics({ p_days_back: 30 }); // ✅
const { data: invalid } = useRetryStatistics({ p_days_back: "30" }); // ❌ TypeScript error
```

## Advanced Usage

### Custom RPC Hook Creation

```typescript
import { createRpcHook, createRpcHookWithDefaults } from '@/hooks/useRpc';

// Create a custom hook for any RPC function
const useCustomRpc = createRpcHook('get_dashboard_statistics');

// Create a custom hook with default parameters
const useCustomRpcWithDefaults = createRpcHookWithDefaults('get_retry_statistics', {
    p_days_back: 14
});
```

## Benefits

### 1. **Consolidated Architecture**

- Single file for all RPC hooks
- No code duplication
- Easy to maintain and extend

### 2. **Type Safety**

- Full TypeScript support
- IntelliSense autocomplete
- Compile-time error detection

### 3. **Runtime Safety**

- Parameter validation
- Response validation
- Comprehensive error handling

### 4. **Performance**

- Efficient RPC calls
- Proper caching
- Optimized data fetching

### 5. **Developer Experience**

- Clean, consistent API
- Easy to use and understand
- Comprehensive documentation

## Migration from Old System

If you were using the old separate files:

```typescript
// Old (deprecated)
import { useDashboardStatistics } from '@/hooks/useRpcStatistics';
import { useFilterOptionsModels } from '@/hooks/useRpcFilters';

// New (recommended)
import { useDashboardStatistics, useFilterOptionsModels } from '@/hooks/useRpc';
```

## Best Practices

### 1. **Use Type-Safe Hooks**

```typescript
// ✅ Good
const { data: stats } = useDashboardStatistics();

// ❌ Avoid direct RPC calls
const { data } = useCustom({ url: 'rpc/get_dashboard_statistics' });
```

### 2. **Handle Loading and Error States**

```typescript
const {
    query: { isLoading, isError },
    result: data
} = useDashboardStatistics();

if (isLoading) return <Loading />;
if (isError) return <Error />;
```

### 3. **Use Proper Parameter Types**

```typescript
// ✅ Good
const { data } = useRetryStatistics({ p_days_back: 30 });

// ❌ Avoid any types
const { data } = useRetryStatistics({ p_days_back: "30" as any });
```

## Future Enhancements

1. **Database Schema Integration**: Full integration with database types
2. **Code Generation**: Auto-generate hooks from database schema
3. **Caching**: Advanced caching strategies
4. **Optimization**: Query optimization and batching
5. **Monitoring**: Performance monitoring and analytics

## Conclusion

The consolidated RPC hooks system provides a clean, maintainable, and type-safe solution for PostgreSQL RPC function integration. It eliminates code duplication while providing excellent developer experience and production-ready reliability.
