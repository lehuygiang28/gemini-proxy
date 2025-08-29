# Gemini Proxy - Appwrite Functions

This package provides an Appwrite Function for deploying the Gemini Proxy. It's a serverless solution that leverages Appwrite's cloud infrastructure for scalable and reliable proxy service deployment.

## Table of Contents

- [Gemini Proxy - Appwrite Functions](#gemini-proxy---appwrite-functions)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Appwrite Project Setup](#appwrite-project-setup)
    - [Function Configuration](#function-configuration)
  - [Deployment](#deployment)
    - [Quick Deployment](#quick-deployment)
    - [Manual Deployment](#manual-deployment)
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
    - [Key Files](#key-files)
  - [References](#references)

## Features

- **Serverless Deployment:** Run the Gemini Proxy as an Appwrite Function
- **Scalability:** Automatically scales with demand using Appwrite's infrastructure
- **API Key Rotation:** Intelligent distribution across multiple Gemini API keys
- **Load Balancing:** Optimal request distribution for performance
- **Request Logging:** Comprehensive logging of all requests and responses
- **Health Monitoring:** Built-in health check endpoint
- **Type Safety:** Full TypeScript support with strict type checking
- **Error Handling:** Robust error handling and recovery mechanisms

## Quick Start

1. **Install Appwrite CLI:**

   ```bash
   npm install -g appwrite-cli
   ```

2. **Login and initialize:**

   ```bash
   appwrite login
   appwrite init project
   ```

3. **Deploy the function:**

   ```bash
   cd packages/appwrite
   pnpm deploy
   ```

4. **Set environment variables:**

   ```bash
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key SUPABASE_URL --value "https://your-project.supabase.co"
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key SUPABASE_SERVICE_ROLE_KEY --value "your-service-role-key"
   ```

## Installation

1. **Clone and setup the monorepo:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   pnpm install
   pnpm build
   ```

2. **Install Appwrite CLI:**

   ```bash
   # Install globally (recommended)
   npm install -g appwrite-cli
   
   # Or install as a dependency
   npm install appwrite-cli
   
   # Verify installation
   appwrite -v
   ```

## Configuration

### Appwrite Project Setup

1. **Login to Appwrite:**

   ```bash
   appwrite login
   ```

2. **Initialize your project:**

   ```bash
   appwrite init project
   ```

3. **Pull existing functions (if any):**

   ```bash
   appwrite pull functions
   ```

### Function Configuration

The function is configured using the `appwrite.config.json` file:

```json
{
    "projectId": "your-project-id",
    "endpoint": "https://your-region.cloud.appwrite.io/v1",
    "projectName": "your-project-name",
    "functions": [
        {
            "$id": "gemini-proxy-appwrite",
            "execute": ["any"],
            "name": "gemini-proxy-appwrite",
            "enabled": true,
            "logging": true,
            "runtime": "node-22",
            "scopes": [],
            "events": [],
            "schedule": "",
            "timeout": 60,
            "commands": "pnpm install --prod",
            "specification": "s-0.5vcpu-512mb",
            "path": ".",
            "entrypoint": "dist/main.js"
        }
    ]
}
```

**Configuration Options:**

- `projectId`: Your Appwrite project ID (required)
- `endpoint`: Your Appwrite API endpoint (required)
- `projectName`: A label for your reference (optional)
- `runtime`: Node.js runtime version (recommended: `node-22`)
- `timeout`: Function timeout in seconds (default: 60)
- `specification`: Function resource specification (default: `s-0.5vcpu-512mb`)

## Deployment

### Quick Deployment

1. **Configure your project:**
   Edit `appwrite.config.json` with your actual project details.

2. **Deploy the function:**

   ```bash
   pnpm deploy
   ```

   **Note:** The `pnpm deploy` script runs `pnpm run build && npx appwrite-cli push functions`. You can also run `npx appwrite-cli push functions` directly without installing the CLI globally.

3. **Set environment variables:**

   ```bash
   # Set required environment variables
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key SUPABASE_URL --value "https://your-project.supabase.co"
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key SUPABASE_SERVICE_ROLE_KEY --value "your-service-role-key"
   
   # Set optional environment variables (if needed)
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key PROXY_MAX_RETRIES --value "5"
   appwrite functions create-variable --functionId gemini-proxy-appwrite --key PROXY_LOG_LEVEL --value "debug"
   ```

### Manual Deployment

If you prefer to deploy manually:

```bash
# Push the function to Appwrite
appwrite push functions

# Or if you want to push only this specific function
appwrite push functions --functionId gemini-proxy-appwrite
```

### Post-Deployment Verification

1. **Check function status:**

   ```bash
   appwrite functions get --functionId gemini-proxy-appwrite
   ```

2. **Test the health endpoint:**

   ```bash
   curl https://your-appwrite-endpoint/functions/v1/gemini-proxy-appwrite/health
   ```

3. **Monitor function logs:**

   ```bash
   appwrite functions list-executions --functionId gemini-proxy-appwrite
   ```

## Usage

### Endpoint URLs

Your Appwrite Function will be available at:

```
https://your-appwrite-endpoint/functions/v1/gemini-proxy-appwrite/
```

**Available endpoints:**

- **Health Check:** `GET /health`
- **Gemini API:** All Gemini API endpoints under `/`
- **OpenAI-Compatible:** All OpenAI-compatible endpoints under `/openai/v1`

### Platform-Specific Examples

For detailed API endpoints and usage examples, see the [root README](../../README.md#api-endpoints) and [Usage Examples](../../README.md#usage-examples).

**Appwrite-specific client configuration:**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-appwrite-endpoint/functions/v1/gemini-proxy-appwrite',
    },
});
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-appwrite-endpoint/functions/v1/gemini-proxy-appwrite/openai/v1',
});
```

## Development

### Local Development

To develop and test the function locally:

```bash
# Start development server
pnpm dev

# Test health endpoint
curl http://localhost:3000/health

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
# Test configuration
pnpm test:config

# Test build
pnpm test:build

# Test deployment (dry run)
pnpm test:deploy
```

## Troubleshooting

### Common Issues

1. **Function Deployment Fails:**
   - Verify your Appwrite CLI is logged in: `appwrite account get`
   - Check your project ID and endpoint in `appwrite.config.json`
   - Ensure you have sufficient permissions in your Appwrite project

2. **Environment Variables Not Set:**
   - Use `appwrite functions list-variables --functionId gemini-proxy-appwrite` to check
   - Set missing variables: `appwrite functions create-variable --functionId gemini-proxy-appwrite --key KEY --value VALUE`

3. **Function Timeout:**
   - Increase timeout in `appwrite.config.json`: `"timeout": 120`
   - Check function logs for performance issues
   - Consider optimizing request handling

4. **CORS Errors:**
   - Configure CORS settings in your Appwrite project
   - Ensure your application is making requests from allowed origins

### Debugging

1. **Check function logs:**

   ```bash
   appwrite functions list-executions --functionId gemini-proxy-appwrite
   ```

2. **Test function locally:**

   ```bash
   pnpm dev
   # Test with real environment variables
   ```

3. **Verify configuration:**

   ```bash
   # Check function configuration
   appwrite functions get --functionId gemini-proxy-appwrite
   
   # Check environment variables
   appwrite functions list-variables --functionId gemini-proxy-appwrite
   ```

## Project Structure

```
packages/appwrite/
├── src/
│   ├── main.ts          # Main function entry point
│   ├── types.ts         # TypeScript type definitions
│   └── utils.ts         # Utility functions
├── dist/                # Built function (generated)
├── appwrite.config.json # Appwrite configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── tsup.config.ts       # Build configuration
└── README.md           # This file
```

### Key Files

- `src/main.ts`: The entry point for the Appwrite Function
- `src/types.ts`: TypeScript interfaces for Appwrite context and environment
- `src/utils.ts`: Utility functions for request/response conversion
- `appwrite.config.json`: Configuration for Appwrite deployment
- `package.json`: Project dependencies and build scripts
- `tsup.config.ts`: Build configuration for the function

## References

- **Appwrite Documentation:**
  - [CLI Installation](https://appwrite.io/docs/tooling/command-line/installation)
  - [Functions CLI](https://appwrite.io/docs/tooling/command-line/functions)
  - [Functions Product](https://appwrite.io/docs/products/functions)
  - [Environment Variables](https://appwrite.io/docs/products/functions/environment-variables)
  - [CLI Commands Reference](https://appwrite.io/docs/tooling/command-line/commands)

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
