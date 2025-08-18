# Core Package

This package contains the core proxy functionality for the Gemini Proxy service.

## Features

### Retry Mechanism

- **Fast automatic retries**: Failed requests are retried immediately without delays
- **Smart key selection**: API keys are fetched upfront and rotated on each retry attempt
- **Configurable retry settings**: Retry behavior can be configured via environment variables

### Logging System

- **Comprehensive logging**: All requests, responses, and errors are logged to the database
- **Batch processing**: Database operations are batched for optimal performance (100ms delay, max 50 ops)
- **Data sanitization**: Sensitive information (API keys, tokens, headers) is automatically redacted
- **Performance metrics**: Request duration and retry attempts are tracked
- **Error tracking**: Detailed error information is captured for debugging
- **Storage optimization**: Large data is truncated to prevent excessive storage usage
- **Non-blocking**: All logging operations are asynchronous and don't block request processing

### API Key Management

- **Health scoring**: API keys are scored based on error rate, usage patterns, and recency
- **Smart selection**: Keys are selected based on health score and user preferences
- **Usage tracking**: Key usage and performance are continuously monitored

## Configuration

### Environment Variables

#### Retry Configuration

- `PROXY_MAX_RETRIES`: Maximum number of retry attempts (default: 3)
- `PROXY_RETRY_DELAY_MS`: Delay between retries in milliseconds (default: 0 - no delay)
- `PROXY_BACKOFF_MULTIPLIER`: Backoff multiplier (default: 1 - no backoff)

#### Logging Configuration

- `PROXY_LOGGING_ENABLED`: Enable/disable logging (default: true)
- `PROXY_LOG_LEVEL`: Log level (debug, info, warn, error) (default: info)

#### Batch Processing

The system uses intelligent batching to optimize database performance:

- **Batch Delay**: 100ms delay to collect operations before executing
- **Batch Size**: Maximum 50 operations per batch
- **Parallel Execution**: Multiple batch types executed concurrently
- **Non-blocking**: Logging operations don't block request processing

#### Data Sanitization

The system automatically sanitizes sensitive data before logging:

- **API Keys**: Redacted as `[REDACTED_API_KEY]`
- **Tokens**: Redacted as `[REDACTED_TOKEN]`
- **Sensitive Headers**: Authorization, API keys, cookies, etc.
- **URL Parameters**: API keys, tokens, passwords in URLs
- **Data Truncation**: Large strings truncated to 1000 characters

## Error Handling

The system handles various types of errors:

- **Rate Limit Errors (429)**: Automatically retried with different keys immediately
- **Authentication Errors (401/403)**: Retried with different API keys immediately
- **Server Errors (5xx)**: Retried immediately with different keys
- **Network Errors**: Retried immediately with different keys
- **Client Errors (4xx)**: Not retried (except auth errors)

## Database Schema

The system uses the following tables:

- `api_keys`: Stores API keys and their metadata
- `proxy_api_keys`: Stores proxy authentication keys
- `request_logs`: Stores detailed request/response logs

## Usage

```typescript
import { ProxyService } from './services/proxy.service';

// The service automatically handles retries and logging
const response = await ProxyService.makeApiRequest({ c });
```
