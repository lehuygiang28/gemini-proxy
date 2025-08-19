# Gemini Proxy - Vercel

This package provides a Vercel Edge Function for deploying the Gemini Proxy. It's a serverless solution that leverages Vercel's global network for low-latency and scalable performance.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Usage](#usage)

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
- `GEMINI_API_KEY`: A JSON array of your Google Gemini API keys.
- `GOOGLE_GEMINI_API_BASE_URL`: The base URL for the Google Gemini API.
- `GOOGLE_OPENAI_API_BASE_URL`: The base URL for the Google OpenAI-compatible API.

## Deployment

This package is intended to be used within a Next.js application deployed on Vercel, such as the `apps/web` application in this monorepo. The Vercel Edge Function will be automatically deployed when you deploy the Next.js application.

## Usage

The `vercelApp` is exported from this package and can be used in a Next.js API route:

```typescript
// src/app/api/gproxy/[[...slug]]/route.ts
import { vercelApp } from '@gemini-proxy/vercel';
import { handle } from 'hono/vercel';

export const runtime = 'edge';

export const GET = handle(vercelApp);
export const POST = handle(vercelApp);
// ... and so on for other HTTP methods
