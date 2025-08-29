# Gemini Proxy - Cloudflare Worker

This package contains a Cloudflare Worker for deploying the Gemini Proxy to the Cloudflare edge network. It's a lightweight, highly scalable way to run the proxy, leveraging Cloudflare's global infrastructure.

## Table of Contents

- [Gemini Proxy - Cloudflare Worker](#gemini-proxy---cloudflare-worker)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Environment Variables and Secrets](#environment-variables-and-secrets)
    - [Cloudflare AI Gateway Integration](#cloudflare-ai-gateway-integration)
  - [Deployment](#deployment)
    - [Basic Deployment](#basic-deployment)
    - [Advanced Deployment Options](#advanced-deployment-options)
    - [Post-Deployment Verification](#post-deployment-verification)
  - [Usage](#usage)
    - [Endpoint URLs](#endpoint-urls)
    - [Platform-Specific Examples](#platform-specific-examples)
  - [Development](#development)
    - [Local Development](#local-development)
    - [Testing](#testing)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging](#debugging)
  - [Project Structure](#project-structure)
  - [References](#references)

## Features

- **Edge Deployment:** Run the Gemini Proxy on Cloudflare's global network for low latency
- **Scalability:** Automatically scales to handle high traffic volumes
- **API Key Rotation:** Intelligent distribution across multiple Gemini API keys
- **Load Balancing:** Optimal request distribution for performance
- **Integration with Cloudflare AI Gateway:** Enhanced logging, analytics, and cost management
- **Global Edge Network:** Low-latency access from anywhere in the world

## Quick Start

1. **Install Wrangler CLI:**

   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**

   ```bash
   wrangler login
   ```

3. **Deploy the worker:**

   ```bash
   cd packages/cloudflare
   pnpm deploy
   ```

4. **Set environment variables:**

   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

## Installation

1. **Clone and setup the monorepo:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   pnpm install
   pnpm build
   ```

2. **Install Wrangler CLI:**

   ```bash
   npm install -g wrangler
   ```

3. **Navigate to the Cloudflare package:**

   ```bash
   cd packages/cloudflare
   ```

## Configuration

### Environment Variables and Secrets

Sensitive data, such as API keys, should be stored as secrets.

1. **Set Supabase secrets:**

   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Set Gemini API key secret:**

   ```bash
   wrangler secret put GEMINI_API_KEY
   ```

   The value should be a JSON array of your Google Gemini API keys:

   ```json
   ["key1", "key2", "key3"]
   ```

### Cloudflare AI Gateway Integration

For enhanced observability and cost management, integrate with Cloudflare AI Gateway:

1. **Create an AI Gateway in Cloudflare Dashboard:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **AI Gateway**
   - Create a new gateway
   - Add Google AI Studio as a provider

2. **Configure the gateway in your worker:**

   Update your `wrangler.jsonc` file:

   ```json
   {
     "vars": {
       "GOOGLE_GEMINI_API_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio/",
       "GOOGLE_OPENAI_API_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio/v1beta/openai/"
     }
   }
   ```

3. **Benefits of AI Gateway Integration:**
   - **100,000 logs** in free tier
   - **Real-time analytics** and cost tracking
   - **Performance monitoring** and insights
   - **Rate limiting** and caching capabilities

## Deployment

### Basic Deployment

To deploy the worker to your Cloudflare account:

```bash
pnpm deploy
```

### Advanced Deployment Options

1. **Deploy to specific regions:**

   ```bash
   # Deploy to specific regions (if available)
   wrangler deploy --compatibility-date 2024-01-01
   ```

2. **Custom domain setup:**

   ```bash
   # Add custom domain to your worker
   wrangler domain add your-domain.com
   ```

3. **Environment-specific deployments:**

   ```bash
   # Deploy to staging environment
   wrangler deploy --env staging

   # Deploy to production environment
   wrangler deploy --env production
   ```

### Post-Deployment Verification

1. **Check worker status:**

   ```bash
   wrangler tail
   ```

2. **Monitor performance:**
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages**
   - Select your worker
   - View analytics and logs

3. **Test API endpoints:**

   ```bash
   # Test your deployed worker
   curl -X POST https://your-worker.your-subdomain.workers.dev/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-proxy-api-key" \
     -d '{
       "model": "gemini-pro",
       "messages": [{"role": "user", "content": "Test message"}]
     }'
   ```

## Usage

### Endpoint URLs

Your Cloudflare Worker will be available at:

```
https://your-worker.your-subdomain.workers.dev/
```

**Available endpoints:**

- **Health Check:** `GET /health`
- **Gemini API:** All Gemini API endpoints under `/`
- **OpenAI-Compatible:** All OpenAI-compatible endpoints under `/openai/v1`

### Platform-Specific Examples

For detailed API endpoints and usage examples, see the [root README](../../README.md#api-endpoints) and [Usage Examples](../../README.md#usage-examples).

**Cloudflare-specific client configuration:**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-worker.your-subdomain.workers.dev',
    },
});
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-worker.your-subdomain.workers.dev/openai/v1',
});
```

## Development

### Local Development

To develop and test the worker locally:

```bash
# Start development server
pnpm dev

# Test health endpoint
curl http://localhost:8787/health

# Test proxy endpoint
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-proxy-api-key" \
  -d '{
    "model": "gemini-pro",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Testing

```bash
# Test configuration
pnpm test:config

# Test build
pnpm test:build

# Test deployment (dry run)
wrangler deploy --dry-run
```

## Troubleshooting

### Common Issues

1. **Worker Deployment Fails:**
   - Verify your Wrangler CLI is logged in: `wrangler whoami`
   - Check your account ID and zone ID in `wrangler.jsonc`
   - Ensure you have sufficient permissions in your Cloudflare account

2. **Environment Variables Not Set:**
   - Use `wrangler secret list` to check current secrets
   - Set missing secrets: `wrangler secret put SECRET_NAME`

3. **Regional Access Issues:**
   - Test from different regions to identify routing problems
   - Consider using alternative deployment platforms for Asia-based users

4. **Performance Issues:**
   - Monitor worker execution time in Cloudflare Dashboard
   - Consider implementing caching strategies
   - Use Cloudflare AI Gateway for better performance monitoring

### Debugging

1. **Check worker logs:**

   ```bash
   wrangler tail --format pretty
   ```

2. **Test worker locally:**

   ```bash
   pnpm dev
   # Test with real environment variables
   ```

3. **Verify configuration:**

   ```bash
   # Check worker configuration
   wrangler config

   # Check environment variables
   wrangler secret list
   ```

## Project Structure

```
packages/cloudflare/
├── src/
│   └── index.ts          # Main worker entry point
├── wrangler.jsonc        # Worker configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
└── README.md            # This file
```

### Key Files

- `src/index.ts`: The entry point for the Cloudflare Worker
- `wrangler.jsonc`: Configuration file for the worker deployment
- `package.json`: Project dependencies and build scripts
- `tsup.config.ts`: Build configuration for the function

## References

- **Cloudflare Documentation:**
  - [Workers](https://developers.cloudflare.com/workers/)
  - [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
  - [AI Gateway](https://developers.cloudflare.com/ai-gateway/)
  - [Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)

- **Gemini API Documentation:**
  - [Official Gemini API](https://ai.google.dev/gemini-api/docs)
  - [OpenAI-Compatible API](https://ai.google.dev/gemini-api/docs/openai)

- **Related Packages:**
  - [Core Package](../core/README.md) - Core business logic
  - [CLI Package](../cli/README.md) - Command-line management tools
  - [Database Package](../database/README.md) - Database schema and types

- **Common Information:**
  - [Environment Variables](../../README.md#environment-variables) - All required and optional variables
  - [API Endpoints](../../README.md#api-endpoints) - Complete API reference
  - [Usage Examples](../../README.md#usage-examples) - Code examples for all clients
  - [Regional Deployment Considerations](../../README.md#regional-deployment-considerations) - Asia-Pacific deployment strategy
