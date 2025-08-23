# Gemini Proxy - Vercel

This package provides a Vercel Edge Function for deploying the Gemini Proxy. It's a serverless solution that leverages Vercel's global network for low-latency and scalable performance.

## Table of Contents

- [Gemini Proxy - Vercel](#gemini-proxy---vercel)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Deployment](#deployment)
  - [Usage](#usage)
    - [Basic Setup](#basic-setup)
    - [Custom Configuration](#custom-configuration)
      - [Advanced Customization](#advanced-customization)
      - [Custom Routes and Middleware](#custom-routes-and-middleware)
      - [Available Exports](#available-exports)
      - [Custom Route Paths and Folder Structure](#custom-route-paths-and-folder-structure)
    - [Configuration Options](#configuration-options)
      - [Required Environment Variables](#required-environment-variables)
      - [Environment Variable Priority](#environment-variable-priority)
    - [API Endpoints](#api-endpoints)
      - [Gemini API Format](#gemini-api-format)
      - [OpenAI-Compatible Format](#openai-compatible-format)
    - [Usage Examples](#usage-examples)
      - [Using with Google Generative AI SDK](#using-with-google-generative-ai-sdk)
      - [Using with Vercel AI SDK](#using-with-vercel-ai-sdk)
      - [Using with OpenAI-Compatible Clients](#using-with-openai-compatible-clients)
    - [Error Handling](#error-handling)
    - [Monitoring and Logging](#monitoring-and-logging)

## Features

- **Serverless Deployment:** Run the Gemini Proxy as a Vercel Edge Function.
- **Scalability:** Automatically scales with demand.
- **Integration with Vercel:** Seamlessly integrates with the Vercel ecosystem.

## Getting Started

### Prerequisites

- A Vercel account
- Vercel CLI installed and configured

## Configuration

The Vercel Edge Function is configured using environment variables. You'll need to set the following environment variables in your Vercel project:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
- `GOOGLE_GEMINI_API_BASE_URL`: The base URL for the Google Gemini API.
- `GOOGLE_OPENAI_API_BASE_URL`: The base URL for the Google OpenAI-compatible API.

## Deployment

This package is intended to be used within a Next.js application deployed on Vercel, such as the `apps/web` application in this monorepo. The Vercel Edge Function will be automatically deployed when you deploy the Next.js application.

## Usage

The `@lehuygiang28/gemini-proxy-vercel` package provides HTTP method handlers that can be exported from your Next.js API routes. You can use it in two ways: basic setup or custom configuration.

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

#### Advanced Customization

You can create your own Hono app with custom middleware and behavior:

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { honoCoreApp } from '@lehuygiang28/gemini-proxy-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create custom app with additional middleware
const customApp = new Hono()
    .basePath('/api/gproxy')
    .use('*', async (c, next) => {
        // Add custom middleware here
        console.log('Custom middleware executed');
        
        // Add custom headers
        c.header('X-Custom-Header', 'custom-value');
        
        // Add request timing
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        console.log(`Request took ${duration}ms`);
    })
    .use('*', async (c, next) => {
        // Rate limiting middleware
        const clientIp = c.req.header('x-forwarded-for') || 'unknown';
        console.log(`Request from IP: ${clientIp}`);
        await next();
    })
    .route('/*', honoCoreApp);

export const GET = handle(customApp);
export const POST = handle(customApp);
export const DELETE = handle(customApp);
export const PATCH = handle(customApp);
export const OPTIONS = handle(customApp);
export const HEAD = handle(customApp);
```

#### Custom Routes and Middleware

You can add custom routes alongside the proxy functionality:

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { honoCoreApp } from '@lehuygiang28/gemini-proxy-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customApp = new Hono()
    .basePath('/api/gproxy')
    .get('/health', (c) => {
        return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
    })
    .get('/stats', async (c) => {
        // Custom stats endpoint
        return c.json({
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        });
    })
    .use('*', async (c, next) => {
        // Authentication middleware
        const apiKey = c.req.header('Authorization');
        if (!apiKey) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        await next();
    })
    .route('/*', honoCoreApp);

export const GET = handle(customApp);
export const POST = handle(customApp);
export const DELETE = handle(customApp);
export const PATCH = handle(customApp);
export const OPTIONS = handle(customApp);
export const HEAD = handle(customApp);
```

#### Available Exports

The package exports the following components for customization:

- `honoCoreApp`: The core Gemini Proxy Hono app without base path configuration
- `honoVercelApp`: Pre-configured Hono app with `/api/gproxy` base path
- `GET`, `POST`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`: Pre-configured HTTP method handlers

#### Custom Route Paths and Folder Structure

If you want to change the route path from the default `/api/gproxy` to a custom path (e.g., `/api/custom-proxy`), you need to:

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

// Create custom app with custom base path
const customApp = new Hono()
    .basePath('/api/custom-proxy') // Changed from /api/gproxy
    .route('/*', honoCoreApp);

export const GET = handle(customApp);
export const POST = handle(customApp);
export const DELETE = handle(customApp);
export const PATCH = handle(customApp);
export const OPTIONS = handle(customApp);
export const HEAD = handle(customApp);
```

**Example: Change to `/api/ai-proxy`**

```typescript
// src/app/api/ai-proxy/[[...slug]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { honoCoreApp } from '@lehuygiang28/gemini-proxy-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customApp = new Hono()
    .basePath('/api/ai-proxy') // Custom base path
    .use('*', async (c, next) => {
        // Add custom middleware
        console.log(`Request to ${c.req.path}`);
        await next();
    })
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
  - For `/api/custom-proxy` → place file at `src/app/api/custom-proxy/[[...slug]]/route.ts`
  - For `/api/ai-proxy` → place file at `src/app/api/ai-proxy/[[...slug]]/route.ts`

- **Use `honoCoreApp` for Custom Paths**: The `honoVercelApp` is pre-configured with `/api/gproxy` base path, so use `honoCoreApp` for custom paths

- **Update Client Configuration**: Remember to update your client-side code to use the new endpoint URLs

**Updated Client Examples for Custom Paths:**

```typescript
// For /api/custom-proxy
const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-vercel-app.vercel.app/api/custom-proxy/gemini',
    },
});

// For /api/ai-proxy
const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-vercel-app.vercel.app/api/ai-proxy/openai/v1',
});
```

**Default vs Custom Setup:**

| Setup Type | File Location | Base Path | Use Case |
|------------|---------------|-----------|----------|
| **Basic Setup** | `src/app/api/gproxy/[[...slug]]/route.ts` | `/api/gproxy` (default) | Quick setup with default path |
| **Custom Path** | `src/app/api/custom-proxy/[[...slug]]/route.ts` | `/api/custom-proxy` (custom) | Custom route names |
| **Custom Path** | `src/app/api/ai-proxy/[[...slug]]/route.ts` | `/api/ai-proxy` (custom) | Custom route names |

### Configuration Options

The package automatically configures the base path to `/api/gproxy` and routes all requests to the core Gemini Proxy application. The following environment variables are required:

#### Required Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `GOOGLE_GEMINI_API_BASE_URL`: The base URL for the Google Gemini API
- `GOOGLE_OPENAI_API_BASE_URL`: The base URL for the Google OpenAI-compatible API

#### Environment Variable Priority

The package automatically handles environment variable fallbacks:

- If `SUPABASE_URL` is not set, it will use `NEXT_PUBLIC_SUPABASE_URL`
- This allows you to use the same environment variable for both client and server-side code

### API Endpoints

Once deployed, your proxy will be available at the following endpoints:

#### Gemini API Format

- `POST /api/gproxy/gemini/v1beta/models` - List available models
- `POST /api/gproxy/gemini/v1beta/models/{model}:generateContent` - Generate content
- `POST /api/gproxy/gemini/v1beta/models/{model}:streamGenerateContent` - Stream content

#### OpenAI-Compatible Format

- `POST /api/gproxy/openai/v1/chat/completions` - Chat completions
- `POST /api/gproxy/openai/v1/completions` - Text completions
- `GET /api/gproxy/openai/v1/models` - List models

### Usage Examples

#### Using with Google Generative AI SDK

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-vercel-app.vercel.app/api/gproxy/gemini',
    },
});

const model = genAi.getGenerativeModel({ model: 'gemini-2.0-flash' });
const result = await model.generateContent('Hello, world!');
```

#### Using with Vercel AI SDK

```typescript
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-vercel-app.vercel.app/api/gproxy/gemini/v1beta',
});

const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    system: 'You are a helpful assistant.',
    prompt: 'Explain quantum computing in simple terms.',
});
```

#### Using with OpenAI-Compatible Clients

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-vercel-app.vercel.app/api/gproxy/openai/v1',
});

const completion = await openai.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Error Handling

The package includes built-in error handling for common scenarios:

- Invalid API keys
- Missing environment variables
- Malformed requests
- Network errors

All errors are logged and returned with appropriate HTTP status codes.

### Monitoring and Logging

The package automatically logs all requests and responses. You can monitor your proxy usage through:

- Vercel Analytics
- Supabase logs (if configured)
- Application logs in Vercel dashboard
