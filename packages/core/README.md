# Gemini Proxy - Core

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This internal package contains the core business logic for the **Gemini Proxy** service.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Overview</strong></summary>

- [Features](#-features)
- [Architecture](#️-architecture)

</details>

<details>
<summary><strong>⚙️ Technical Details</strong></summary>

- [Middlewares](#️-middlewares)
- [Services](#️-services)

</details>

<details>
<summary><strong>💻 Usage</strong></summary>

- [Installation](#-installation)
- [Usage Example](#-usage-example)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Back to Main README](#-back-to-main-readme)

</details>

## ✨ Features

- ✅ **Platform-Agnostic:** Runs in any environment that supports Hono.js.
- ✅ **Middleware-Based:** Processes requests through a flexible middleware chain.
- ✅ **Centralized Logic:** Contains all core functionality for proxying, validation, and logging.

## 🏗️ Architecture

The core of the application is a `Hono.js` app that processes requests through a series of middlewares.

## 🛡️ Middlewares

- **`requestIdMiddleware`:** Adds a unique ID to each request.
- **`httpLoggerMiddleware`:** Logs requests and responses.
- **`extractProxyDataMiddleware`:** Extracts relevant data from the request.
- **`proxyOptionsMiddleware`:** Handles proxy-specific options.
- **`validateProxyApiKeyMiddleware`:** Validates the proxy API key.

## 🛠️ Services

- **`ProxyService`:** Handles the proxying of requests.
- **`ApiKeyService`:** Manages API key validation and rotation.
- **`ConfigService`:** Provides access to configuration.
- **`SupabaseService`:** Interacts with the Supabase database.
- **`BatchLoggerService`:** Batches and sends logs.

## 📦 Installation

This is an internal package and is not intended for direct installation.

## 💻 Usage Example

```typescript
import { Hono } from 'hono';
import { coreApp } from '@gemini-proxy/core';

const app = new Hono();

app.route('/api/gproxy/*', coreApp);

export default app;
```

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
