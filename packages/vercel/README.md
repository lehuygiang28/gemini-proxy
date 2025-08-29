# Gemini Proxy - Vercel

This package provides a Vercel Edge Function for deploying the Gemini Proxy. It's a serverless solution that leverages Vercel's global network for low-latency and scalable performance.

## Table of Contents

- [Gemini Proxy - Vercel](#gemini-proxy---vercel)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Required Environment Variables](#required-environment-variables)
    - [Optional Environment Variables](#optional-environment-variables)
  - [Deployment](#deployment)
    - [Deployment Steps](#deployment-steps)
  - [Usage](#usage)
    - [Basic Setup](#basic-setup)
    - [Custom Configuration](#custom-configuration)
    - [Custom Route Paths](#custom-route-paths)
  - [Development](#development)
    - [Local Development](#local-development)
    - [Testing](#testing)
  - [Usage](#usage-1)
    - [Endpoint URLs](#endpoint-urls)
    - [Platform-Specific Examples](#platform-specific-examples)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging](#debugging)
  - [Project Structure](#project-structure)
    - [Key Files](#key-files)
  - [References](#references)

## Features

- **Serverless Deployment:** Run the Gemini Proxy as a Vercel Edge Function
- **Scalability:** Automatically scales with demand using Vercel's infrastructure
- **API Key Rotation:** Intelligent distribution across multiple Gemini API keys
- **Load Balancing:** Optimal request distribution for performance
- **Request Logging:** Comprehensive logging of all requests and responses
- **Type Safety:** Full TypeScript support with strict type checking
- **Error Handling:** Robust error handling and recovery mechanisms

## Quick Start

1. **Install the package:**

   ```bash
   npm install @lehuygiang28/gemini-proxy-vercel
   ```

2. **Create API route:**

   ```typescript
   // src/app/api/gproxy/[[...slug]]/route.ts
   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   
   export { GET, POST, DELETE, PATCH, OPTIONS, HEAD } from '@lehuygiang28/gemini-proxy-vercel';
   ```

3. **Set environment variables in Vercel:**

   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

4. **Deploy to Vercel:**

   ```bash
   vercel --prod
   ```

## Installation

1. **Clone and setup the monorepo:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   pnpm install
   pnpm build
   ```

2. **Install the package in your Next.js app:**

   ```bash
   npm install @lehuygiang28/gemini-proxy-vercel
   ```

## Configuration

The Vercel Edge Function is configured using environment variables. You'll need to set the following environment variables in your Vercel project:

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Environment Variables

For all optional environment variables, see the [root README](../../README.md#environment-variables).

## Deployment

This package is intended to be used within a Next.js application deployed on Vercel. The Vercel Edge Function will be automatically deployed when you deploy the Next.js application.

### Deployment Steps

1. **Set environment variables in Vercel:**

   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Deploy your Next.js application:**

   ```bash
   vercel --prod
   ```

3. **Verify deployment:**

   ```bash
   curl https://your-vercel-app.vercel.app/api/gproxy/health
   ```

## Usage

The `@lehuygiang28/gemini-proxy-vercel` package provides HTTP method handlers that can be exported from your Next.js API routes.

### Basic Setup

Create a Next.js API route file at `src/app/api/gproxy/[[...slug]]/route.ts`:

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { GET, POST, DELETE, PATCH, OPTIONS, HEAD } from '@lehuygiang28/gemini-proxy-vercel';
```

### Custom Configuration

For more control over your Hono app, you can import the core components and create your own custom setup:

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { honoCoreApp, honoVercelApp } from '@lehuygiang28/gemini-proxy-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Option 1: Use the pre-configured app
export const GET = handle(honoVercelApp);
export const POST = handle(honoVercelApp);
export const DELETE = handle(honoVercelApp);
export const PATCH = handle(honoVercelApp);
export const OPTIONS = handle(honoVercelApp);
export const HEAD = handle(honoVercelApp);
```

### Custom Route Paths

If you want to change the route path from the default `/api/gproxy` to a custom path:

1. **Change the file location** to match your desired route
2. **Update the basePath** in your Hono app configuration
3. **Use `honoCoreApp`** instead of `honoVercelApp`

**Example: Change to `/api/custom-proxy`**

```typescript
// src/app/api/custom-proxy/[[...slug]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { honoCoreApp } from '@lehuygiang28/gemini-proxy-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customApp = new Hono()
    .basePath('/api/custom-proxy')
    .route('/*', honoCoreApp);

export const GET = handle(customApp);
export const POST = handle(customApp);
export const DELETE = handle(customApp);
export const PATCH = handle(customApp);
export const OPTIONS = handle(customApp);
export const HEAD = handle(customApp);
```

**Important Notes:**

- **File Location Must Match Route**: The file path must match your desired API route
- **Use `honoCoreApp` for Custom Paths**: The `honoVercelApp` is pre-configured with `/api/gproxy` base path
- **Update Client Configuration**: Remember to update your client-side code to use the new endpoint URLs

## Development

### Local Development

To develop and test the function locally:

```bash
# Start development server
pnpm dev

# Test health endpoint
curl http://localhost:3000/api/gproxy/health

# Test proxy endpoint
curl -X POST http://localhost:3000/api/gproxy/v1beta/models/gemini-2.0-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-proxy-api-key" \
  -d '{
    "contents": [{"parts": [{"text": "Hello, world!"}]}]
  }'
```

### Testing

```bash
# Test build
pnpm build

# Test deployment (dry run)
vercel --dry-run
```

## Usage

### Endpoint URLs

Your Vercel Function will be available at:

```
https://your-vercel-app.vercel.app/api/gproxy/
```

**Available endpoints:**

- **Health Check:** `GET /health`
- **Gemini API:** All Gemini API endpoints under `/`
- **OpenAI-Compatible:** All OpenAI-compatible endpoints under `/openai/v1`

### Platform-Specific Examples

For detailed API endpoints and usage examples, see the [root README](../../README.md#api-endpoints) and [Usage Examples](../../README.md#usage-examples).

**Vercel-specific client configuration:**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-vercel-app.vercel.app/api/gproxy/gemini',
    },
});
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-vercel-app.vercel.app/api/gproxy/openai',
});
```

## Troubleshooting

### Common Issues

1. **Function Not Found:**
   - Ensure the API route file is in the correct location
   - Check that the file exports the correct HTTP methods
   - Verify the runtime and dynamic exports are set correctly

2. **Environment Variables Not Set:**
   - Use `vercel env ls` to check current environment variables
   - Set missing variables: `vercel env add VARIABLE_NAME`

3. **CORS Errors:**
   - Configure CORS settings in your Vercel project
   - Ensure your application is making requests from allowed origins

4. **Function Timeout:**
   - Vercel Edge Functions have a 30-second timeout limit
   - Consider optimizing request handling for long-running operations

### Debugging

1. **Check function logs:**

   ```bash
   vercel logs
   ```

2. **Test function locally:**

   ```bash
   vercel dev
   # Test with real environment variables
   ```

3. **Verify configuration:**

   ```bash
   # Check environment variables
   vercel env ls
   
   # Check deployment status
   vercel ls
   ```

## Project Structure

```
packages/vercel/
├── src/
│   ├── index.ts          # Main exports
│   └── route.ts          # Route handlers
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
└── README.md            # This file
```

### Key Files

- `src/index.ts`: Main exports for the package
- `src/route.ts`: Route handlers for Next.js API routes
- `package.json`: Project dependencies and build scripts
- `tsup.config.ts`: Build configuration for the package

## References

- **Vercel Documentation:**
  - [Edge Functions](https://vercel.com/docs/functions/edge-functions)
  - [Environment Variables](https://vercel.com/docs/projects/environment-variables)
  - [API Routes](https://nextjs.org/docs/api-routes/introduction)

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
