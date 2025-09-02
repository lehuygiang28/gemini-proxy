# Gemini Proxy - Vercel Edge Function

[![NPM Version](https://img.shields.io/npm/v/@lehuygiang28/gemini-proxy-vercel?style=flat-square)](https://www.npmjs.com/package/@lehuygiang28/gemini-proxy-vercel)
[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This package allows you to deploy **Gemini Proxy** as a [Vercel Edge Function](https://vercel.com/docs/functions/edge-functions).

## 📋 Table of Contents

<details>
<summary><strong>🚀 Getting Started</strong></summary>

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)

</details>

<details>
<summary><strong>⚙️ Configuration & Deployment</strong></summary>

- [Environment Variables](#️-environment-variables)
- [Deployment](#-deployment)

</details>

<details>
<summary><strong>💻 Usage & Development</strong></summary>

- [Basic Usage](#-basic-usage)
- [Local Development](#️-local-development)
- [Project Structure](#-project-structure)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Troubleshooting](#-troubleshooting)
- [Back to Main README](#-back-to-main-readme)

</details>

## ✨ Features

- ✅ **Serverless:** Deploy the proxy without managing servers.
- ✅ **Edge Network:** Low-latency responses for users worldwide.
- ✅ **Scalable:** Automatically scales with traffic.
- ✅ **Easy Integration:** Designed for use with Next.js API routes.

## 📦 Installation

```bash
pnpm install @lehuygiang28/gemini-proxy-vercel
```

## 🚀 Quick Start

### **1. Create an API Route**

#### Basic Setup

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { GET, POST, DELETE, PATCH, OPTIONS, HEAD } from '@lehuygiang28/gemini-proxy-vercel';
```

#### Custom Configuration

For more control over your Hono app, you can import the core components and create your own custom setup:

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

### **2. Set Environment Variables**

Add your Supabase credentials as environment variables in your Vercel project.

### **3. Deploy**

Deploy your Next.js application to Vercel.

## ⚙️ Environment Variables

### **Required Variables**

| Variable                    | Description                  |
| --------------------------- | ---------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.   |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, refer to the [**root README**](../../README.md#️-environment-variables).

## 🚀 Deployment

This package is designed for use within a Next.js application deployed on Vercel.

## 💻 Basic Usage

The package exports HTTP method handlers that you can re-export from your Next.js API routes.

## 🛠️ Local Development

Run your Next.js development server to test the function locally.

```bash
pnpm dev
```

## 📁 Project Structure

```md
packages/vercel/
├── src/
│   ├── index.ts          # Main package exports
│   └── route.ts          # Route handlers
├── dist/                 # Compiled output
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🐛 Troubleshooting

- **Function Not Found:** Ensure your API route file is correctly named and located.
- **Environment Variables:** Verify that your environment variables are set in Vercel.
- **CORS Errors:** Configure CORS in your Vercel project settings if needed.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
