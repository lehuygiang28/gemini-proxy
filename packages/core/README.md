# Gemini Proxy - Core

This package contains the core business logic for the Gemini Proxy service. It's designed to be platform-agnostic, allowing it to be used in various environments such as Node.js, Cloudflare Workers, and Vercel Edge Functions.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Middlewares](#middlewares)
- [Services](#services)
- [Installation](#installation)
- [Usage](#usage)

## Features

- **Platform-Agnostic:** Can be deployed to any environment that supports Hono.js.
- **Middleware-Based:** Uses a chain of middlewares to process requests.
- **Request Proxying:** Proxies requests to the Google Gemini API.
- **API Key Validation:** Validates proxy API keys against the Supabase database.
- **Request Logging:** Logs request and response data.

## Architecture

The core of the application is a Hono.js app that processes incoming requests through a series of middlewares. Each middleware has a specific responsibility, such as adding a request ID, logging the request, validating the API key, and finally, proxying the request.

## Middlewares

- **`requestIdMiddleware`:** Adds a unique request ID to each incoming request.
- **`httpLoggerMiddleware`:** Logs the request and response.
- **`extractProxyDataMiddleware`:** Extracts proxy data from the request.
- **`proxyOptionsMiddleware`:** Handles proxy options.
- **`validateProxyApiKeyMiddleware`:** Validates the proxy API key.

## Services

- **`ProxyService`:** Handles the actual proxying of the request to the Google Gemini API.
- **`ApiKeyService`:** Manages API key validation.
- **`ConfigService`:** Provides access to configuration and environment variables.
- **`SupabaseService`:** Interacts with the Supabase database.
- **`BatchLoggerService`:** Batches and sends logs.

## Installation

This is an internal package and is not meant to be installed directly. It's used as a dependency in the `api`, `cloudflare`, and `vercel` packages.

## Usage

The `coreApp` is exported from this package and can be used as a Hono.js app:

```typescript
import { Hono } from 'hono';
import { coreApp } from '@gemini-proxy/core';

const app = new Hono();
app.route('/api/gproxy/*', coreApp);

export default app;
