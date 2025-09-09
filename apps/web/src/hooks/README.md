# Statistics Hooks with SWR + Supabase RPC

This directory contains production-grade React hooks that use SWR for data fetching with Supabase RPC functions. These hooks replace frontend calculations with optimized database-side computations.

## 🚀 **Key Features**

- **SWR Integration**: Automatic caching, revalidation, and error handling
- **Type Safety**: Full TypeScript support with generated database types
- **Production Ready**: Error retry, deduplication, and performance optimizations
- **User Isolation**: Proper cache isolation per user
- **Real-time Updates**: Automatic background refresh and focus revalidation

## 📊 **Available Hooks**

### `useDashboardStatistics()`

Comprehensive dashboard metrics including API keys, proxy keys, requests, and performance data.

```typescript
const { statistics, isLoading, error, mutate } = useDashboardStatistics();

// Access data
console.log(statistics?.total_api_keys);
console.log(statistics?.success_rate);
```

### `useRetryStatisticsRpc(daysBack?: number)`

Retry attempt analytics for request logs within specified time period.

```typescript
const { statistics, isLoading, error, mutate } = useRetryStatisticsRpc(30);

// Access retry data
console.log(statistics?.total_requests);
console.log(statistics?.retry_rate);
```

### `useApiKeyStatistics()`

API key usage statistics including success/failure rates.

```typescript
const { statistics, isLoading, error, mutate } = useApiKeyStatistics();

// Access API key metrics
console.log(statistics?.total_keys);
console.log(statistics?.success_rate);
```

### `useProxyKeyStatistics()`

Proxy key usage statistics including token usage and success rates.

```typescript
const { statistics, isLoading, error, mutate } = useProxyKeyStatistics();

// Access proxy key metrics
console.log(statistics?.total_tokens);
console.log(statistics?.active_keys);
```

### `useRequestLogsStatistics(daysBack?: number)`

Detailed request logs statistics with format breakdown and hourly distribution.

```typescript
const { statistics, isLoading, error, mutate } = useRequestLogsStatistics(7);

// Access request logs data
console.log(statistics?.requests_by_format);
console.log(statistics?.requests_by_hour);
```

## ⚙️ **Configuration**

### SWR Settings

Each hook is configured with production-grade settings:

- **Refresh Intervals**:
  - Dashboard: 5 minutes
  - Retry Statistics: 2 minutes  
  - API/Proxy Keys: 3 minutes
  - Request Logs: 1 minute
- **Error Retry**: 3 attempts with 5-second intervals
- **Deduplication**: 2-second window
- **Focus Revalidation**: Enabled
- **Previous Data**: Kept during revalidation

### Cache Keys

SWR keys include user ID for proper isolation:

- `dashboard-statistics-${userId}`
- `retry-statistics-${userId}-${daysBack}`
- `api-key-statistics-${userId}`
- etc.

## 🔧 **Usage Examples**

### Basic Usage

```typescript
import { useDashboardStatistics } from '@/hooks';

function Dashboard() {
    const { statistics, isLoading, error } = useDashboardStatistics();
    
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
        <div>
            <h2>Total API Keys: {statistics?.total_api_keys}</h2>
            <p>Success Rate: {statistics?.success_rate}%</p>
        </div>
    );
}
```

### Manual Refresh

```typescript
function Dashboard() {
    const { statistics, isLoading, mutate } = useDashboardStatistics();
    
    const handleRefresh = () => {
        mutate(); // Trigger manual refresh
    };
    
    return (
        <div>
            <button onClick={handleRefresh} disabled={isLoading}>
                Refresh Data
            </button>
            {/* ... rest of component */}
        </div>
    );
}
```

### Error Handling

```typescript
function Dashboard() {
    const { statistics, isLoading, error } = useDashboardStatistics();
    
    useEffect(() => {
        if (error) {
            // Handle error (e.g., show notification, log to service)
            console.error('Dashboard statistics error:', error);
        }
    }, [error]);
    
    // ... rest of component
}
```

## 🏗️ **Architecture**

### Data Flow

1. **Hook Initialization**: SWR key generated with user context
2. **Authentication**: User ID retrieved via `useGetIdentity()`
3. **RPC Call**: Supabase client calls database function
4. **Caching**: SWR caches result with configured TTL
5. **Revalidation**: Automatic background refresh based on interval

### Production Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Handled by Supabase client
- **Database Errors**: Wrapped in descriptive error messages
- **Type Safety**: Full TypeScript coverage prevents runtime errors

### Performance Optimizations

- **Request Deduplication**: Multiple components can use same hook without duplicate requests
- **Background Refresh**: Data stays fresh without user interaction
- **Previous Data**: UI doesn't flash during revalidation
- **Cache Isolation**: User-specific caching prevents data leaks

## 🔒 **Security**

- **Row Level Security**: Database functions respect RLS policies
- **User Isolation**: All queries filtered by authenticated user ID
- **Type Safety**: Prevents SQL injection through typed parameters
- **Authentication**: Requires valid user session for all operations

## 📈 **Monitoring**

### Performance Metrics

Monitor hook performance through SWR's built-in metrics:

```typescript
import { useSWRConfig } from 'swr';

function DebugPanel() {
    const { cache } = useSWRConfig();
    
    // Access cache statistics
    console.log('Cache size:', cache.size);
    console.log('Cache keys:', Array.from(cache.keys()));
}
```

### Error Tracking

Errors are automatically logged and can be extended with external services:

```typescript
// In swr-config.ts
onError: (error, key) => {
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
        errorTracking.captureException(error, { key });
    }
}
```

## 🚀 **Migration from Legacy Hooks**

### Before (Frontend Calculations)

```typescript
// OLD: Frontend calculation with large data fetch
const { data, isLoading } = useList({
    resource: 'request_logs',
    pagination: { pageSize: 1000 }, // ❌ Fetches large dataset
});

const statistics = useMemo(() => {
    // ❌ Heavy frontend processing
    const totalRequests = data?.data?.length || 0;
    const requestsWithRetries = data?.data?.filter(/* ... */).length;
    // ... more calculations
}, [data?.data]);
```

### After (Database RPC + SWR)

```typescript
// NEW: Database-side calculation with caching
const { statistics, isLoading } = useRetryStatisticsRpc(30);

// ✅ Pre-calculated results
// ✅ Automatic caching
// ✅ Background refresh
// ✅ Error handling
```

## 🛠️ **Development**

### Adding New Statistics Hooks

1. Create RPC function in database
2. Update database types
3. Add method to `SupabaseRpcClient`
4. Create hook with SWR integration
5. Export from hooks index

### Testing

```typescript
// Mock SWR for testing
import { SWRConfig } from 'swr';

function TestWrapper({ children }) {
    return (
        <SWRConfig value={{ provider: () => new Map() }}>
            {children}
        </SWRConfig>
    );
}
```

## 📚 **Dependencies**

- **SWR**: Data fetching and caching
- **Supabase**: Database client and RPC calls  
- **RefineDev**: Authentication and UI framework
- **TypeScript**: Type safety and developer experience

This implementation provides a robust, scalable foundation for statistics in the Gemini Proxy application with production-grade error handling, caching, and performance optimizations.
