# @gemini-proxy/core

Core business logic for Gemini Proxy service - platform agnostic.

This package contains all the core functionality for the Gemini Proxy service that can be used across different platforms (Node.js, Cloudflare Workers, Netlify, Vercel, etc.).

## Features

- **Platform Agnostic**: Works on Node.js, Cloudflare Workers, Netlify, Vercel, and Deno
- **Database Integration**: Uses Supabase with service role for all database operations
- **API Key Management**: Intelligent API key selection and rotation
- **Request Logging**: Comprehensive request tracking and analytics
- **Usage Parsing**: Extracts usage metadata from both Gemini and OpenAI-compatible responses
- **Streaming Support**: Handles streaming responses from both API formats
- **Retry Logic**: Automatic retry with different API keys on failures
- **Error Handling**: Comprehensive error categorization and handling

## Installation

```bash
pnpm add @gemini-proxy/core
```

## Quick Start

### Basic Setup

```typescript
import { 
    defaultConfig, 
    detectPlatform, 
    LoggingService,
    ApiKeyManager,
    DatabaseConnection 
} from '@gemini-proxy/core';

// Initialize database connection
const dbConnection = DatabaseConnection.getInstance();
dbConnection.connect(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize services
const loggingService = new LoggingService();
const keyManager = new ApiKeyManager();

// Check platform
console.log(`Running on: ${detectPlatform()}`);
```

### Using with Hono (Node.js)

```typescript
import { Hono } from 'hono';
import { 
    defaultConfig,
    LoggingService,
    ApiKeyManager,
    DatabaseConnection 
} from '@gemini-proxy/core';

const app = new Hono();

// Initialize services
const dbConnection = DatabaseConnection.getInstance();
const loggingService = new LoggingService();
const keyManager = new ApiKeyManager();

// Connect to database
dbConnection.connect(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health check endpoint
app.get('/health', async (c) => {
    const keyStats = await keyManager.getKeyStats();
    const logs = await loggingService.getRecentLogs(5);
    
    return c.json({
        status: 'healthy',
        database: dbConnection.isReady(),
        apiKeys: {
            total: keyStats.totalKeys,
            active: keyStats.activeKeys
        },
        recentLogs: logs.length
    });
});
```

### Using with Cloudflare Workers

```typescript
import { 
    defaultConfig,
    LoggingService,
    ApiKeyManager,
    DatabaseConnection 
} from '@gemini-proxy/core';

export default {
    async fetch(request: Request, env: any): Promise<Response> {
        // Initialize services
        const dbConnection = DatabaseConnection.getInstance();
        const loggingService = new LoggingService();
        const keyManager = new ApiKeyManager();

        // Connect to database
        dbConnection.connect(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Your worker logic here
        return new Response('Hello from Cloudflare Workers!');
    }
};
```

## Configuration

The package uses environment variables for configuration:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

You can also use the default configuration:

```typescript
import { defaultConfig } from '@gemini-proxy/core';

const config = {
    ...defaultConfig,
    proxy: {
        ...defaultConfig.proxy,
        maxRetries: 5, // Override default
        timeoutMs: 60000 // Override default
    }
};
```

## Database Schema

The package expects the following Supabase tables:

### api_keys

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    key TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gemini',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### proxy_api_keys

```sql
CREATE TABLE proxy_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### request_logs

```sql
CREATE TABLE request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_key_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    request_id TEXT UNIQUE NOT NULL,
    api_format TEXT NOT NULL,
    request JSONB NOT NULL,
    response JSONB,
    retries JSONB NOT NULL DEFAULT '[]',
    success BOOLEAN NOT NULL,
    error JSONB,
    usage JSONB,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Reference

### Core Classes

#### DatabaseConnection

Singleton class for managing Supabase connection.

```typescript
const db = DatabaseConnection.getInstance();
db.connect(supabaseUrl, serviceRoleKey);
const isReady = db.isReady();
```

#### ApiKeyManager

Manages Gemini API keys with intelligent selection and rotation.

```typescript
const keyManager = new ApiKeyManager();

// Select best key
const { key, apiKey } = await keyManager.selectBestKey({ 
    provider: 'gemini',
    excludeKeys: ['key1', 'key2'],
    maxErrorRate: 0.1
});

// Add new key
await keyManager.addApiKey({
    name: 'my-key',
    key: 'your-gemini-api-key',
    provider: 'gemini'
});

// Get statistics
const stats = await keyManager.getKeyStats();
```

#### LoggingService

Comprehensive request logging and analytics.

```typescript
const loggingService = new LoggingService();

// Start request log
const requestId = await loggingService.startRequestLog({
    proxyKeyId: 'proxy-key-id',
    apiKeyId: 'api-key-id',
    apiFormat: 'gemini',
    request: proxyRequest
});

// Log response
await loggingService.logResponse({
    requestId,
    response,
    apiCallDurationMs: 1500,
    usage: usageMetadata
});

// Finalize log
await loggingService.finalizeRequestLog({
    requestId,
    success: true,
    totalDurationMs: 2000,
    usage: usageMetadata
});

// Get statistics
const stats = await loggingService.getStatistics();
```

### Parsers

#### UsageMetadataParser

Extracts usage metadata from different API formats.

```typescript
import { usageParser } from '@gemini-proxy/core';

// Parse OpenAI format
const usage = usageParser.parseOpenAIUsage({ responseBody });

// Parse Gemini format
const usage = usageParser.parseGeminiUsage({ responseBody });

// Auto-detect format
const usage = usageParser.parseUnifiedUsage({ responseBody });
```

#### StreamResponseParser

Parses streaming responses.

```typescript
import { streamParser } from '@gemini-proxy/core';

const result = streamParser.parseStream({ chunks });
console.log(result.usage); // Usage metadata
console.log(result.model); // Model name
console.log(result.finished); // Whether stream is complete
```

### Platform Detection

```typescript
import { detectPlatform, isServerless } from '@gemini-proxy/core';

const platform = detectPlatform(); // 'node' | 'cloudflare' | 'netlify' | 'vercel' | 'deno'
const serverless = isServerless(); // true/false
```

## Error Handling

The package provides custom error classes:

```typescript
import { ProxyError, KeySelectionError, RetryExhaustedError } from '@gemini-proxy/core';

try {
    // Your code here
} catch (error) {
    if (error instanceof ProxyError) {
        console.log(`Proxy error: ${error.message} (${error.type})`);
    } else if (error instanceof KeySelectionError) {
        console.log(`Key selection error: ${error.message}`);
    } else if (error instanceof RetryExhaustedError) {
        console.log(`Retry exhausted: ${error.message}`);
    }
}
```

## Building

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean
```

## Contributing

1. Make changes to the source files in `src/`
2. Run `pnpm build` to compile TypeScript
3. Test your changes
4. Submit a pull request

## License

MIT
