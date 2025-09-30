# Gemini Proxy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)
[![Issues](https://img.shields.io/github/issues/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/issues)

**Gemini Proxy** is a powerful, open-source toolkit for managing and proxying requests to Google's Gemini API. It provides a robust set of features for developers and organizations to monitor, control, and scale their usage of the Gemini API.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Getting Started</strong></summary>

- [Introduction](#-introduction)
- [Core Features](#-core-features)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)

</details>

<details>
<summary><strong>⚙️ Configuration & Usage</strong></summary>

- [Environment Variables](#️-environment-variables)
- [Usage Examples](#-usage-examples)

</details>

<details>
<summary><strong>🌐 Deployment</strong></summary>

- [Deployment Options](#-deployment-options)
- [Platform-Specific Guides](#️-platform-specific-guides)

</details>

<details>
<summary><strong>🔧 Technical Details</strong></summary>

- [Architecture](#️-architecture)
- [Project Structure](#-project-structure)
- [Development](#️-development)

</details>

<details>
<summary><strong>📚 Community & Links</strong></summary>

- [Contributing](#-contributing)
- [License](#-license)
- [Links](#-links)

</details>

## 🚀 Introduction

Gemini Proxy is a comprehensive solution that allows you to:

- **🔑 Manage API Keys:** Securely store and rotate multiple Google Gemini API keys.
- **⚡ Load Balance:** Distribute requests across multiple API keys for optimal performance.
- **📊 Monitor Usage:** Track API usage, costs, and performance metrics.
- **🛡️ Control Access:** Manage proxy keys and access permissions.
- **📝 Log Requests:** Detailed logging of all API requests and responses.
- **🌍 Deploy Anywhere:** Support for multiple deployment platforms.

## ✨ Core Features

### 🔑 **API Key Management**

- Secure storage of multiple Google Gemini API keys.
- Intelligent key rotation and load balancing.
- Usage tracking and analytics per key.
- Enable/disable keys without downtime.

### ⚡ **Performance & Scalability**

- Automatic request distribution across API keys.
- Built-in retry mechanisms with exponential backoff.
- Request caching and optimization.
- Support for streaming responses.

### 📊 **Monitoring & Analytics**

- Real-time request logging and analytics.
- Performance metrics and cost tracking.
- Error monitoring and alerting.
- Usage dashboards and reports.

### 🛡️ **Security & Access Control**

- Proxy API key management.
- Request authentication and authorization.
- Rate limiting and abuse prevention.
- Secure environment variable handling.

### 🌍 **Multi-Platform Support**

- **Next.js Fullstack App** (Recommended)
- **Standalone Node.js API Server**
- **Vercel Edge Functions**
- **Cloudflare Workers**
- **Appwrite Functions**

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher)
- **Git**
- A **Google AI Studio** account for Gemini API keys.
- A **Supabase** account for database and authentication.

## 🚀 Quick Start Guide

### **Recommended: Deploy the Web App (Fastest)**

The fastest way to get started is by deploying the Next.js web application:

```bash
# 1. Clone the repository
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.development with your values

# 4. Start development server
cd apps/web
pnpm dev
```

### **Alternative: Deploy to Vercel (Recommended for Production)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flehuygiang28%2Fgemini-proxy&project-name=gemini-proxy&repository-name=gemini-proxy&root-directory=apps/web&build-command=pnpm%20build%20-F%20web&output-directory=apps/web/.next&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY)

For manual setup, please refer to the [**apps/web/README.md**](./apps/web/README.md).

## ⚙️ Environment Variables

### **Required Environment Variables**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_GEMINI_API_BASE_URL` | Gemini API base URL. | `https://generativelanguage.googleapis.com/` |
| `GOOGLE_OPENAI_API_BASE_URL` | OpenAI-compatible API base URL. | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `PROXY_MAX_RETRIES` | Maximum retry attempts. | `-1` |
| `PROXY_LOGGING_ENABLED` | Enable request logging. | `true` |
| `PROXY_LOG_LEVEL` | Logging level. | `info` |
| `PROXY_LOADBALANCE_STRATEGY` | Proxy load balance strategy. (`round_robin` or `sticky_until_error`) | `round_robin` |

## 💻 Usage Examples

### **Using with Google Generative AI SDK**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-proxy-endpoint/api/gproxy/gemini',
    },
});
```

### **Using with OpenAI-Compatible Clients**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-proxy-endpoint/api/gproxy/openai',
});
```

### **Using with Vercel AI SDK**

```typescript
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'gproxy_test_12345',
    baseURL: 'https://your-proxy-endpoint/api/gproxy/gemini/v1beta',
});
```

## 🌐 Deployment Options

### **🎯 Recommended: Next.js Web App (Full-Stack with UI)**

- ✅ **Complete Solution:** Web interface + API proxy in one deployment.
- ✅ **User-Friendly Dashboard:** Built-in UI for managing API keys, proxy keys, and monitoring.
- ✅ **Fastest Setup:** Single deployment with all features.

### **⚡ Standalone API Server (API-Only)**

- ✅ **Lightweight:** Minimal resource usage, API-only service.
- ✅ **Customizable:** Full control over deployment.
- ✅ **Scalable:** Can be deployed anywhere.

### **🚀 Edge Functions (API-Only)**

- ✅ **Global CDN:** Deploy to edge locations worldwide.
- ✅ **Low Latency:** Fastest response times.
- ✅ **Auto-scaling:** Handles traffic spikes automatically.

## 🛠️ Platform-Specific Guides

- **🎯 [Next.js Web App](./apps/web/README.md):** Full-stack solution with a web dashboard.
- **⚡ [Standalone API Server](./apps/api/README.md):** Lightweight Node.js API server.
- **🚀 [Vercel Edge Functions](./packages/vercel/README.md):** Serverless edge functions on Vercel.
- **🌍 [Cloudflare Workers](./packages/cloudflare/README.md):** Edge computing on Cloudflare's network.
- **🔧 [Appwrite Functions](./packages/appwrite/README.md):** Serverless functions on Appwrite.
- **🛠️ [CLI Tools](./packages/cli/README.md):** Command-line tools for management.

## 🏗️ Architecture

```md
Your App --> Gemini Proxy --> Google Gemini API
                 |
                 v
              Supabase (Database)
```

## 📁 Project Structure

```md
gemini-proxy/
├── apps/
│   ├── web/      # Next.js web application (Recommended)
│   └── api/      # Standalone Node.js API server
├── packages/
│   ├── core/     # Core business logic
│   ├── cli/      # Command-line tools
│   └── ...       # Other packages
└── README.md
```

## 🛠️ Development

### **Local Development**

```bash
# 1. Clone the repository
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy

# 2. Install dependencies
pnpm install

# 3. Start development servers
pnpm dev
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **📖 Documentation:** [GitHub Wiki](https://github.com/lehuygiang28/gemini-proxy/wiki)
- **🐛 Report an Issue:** [GitHub Issues](https://github.com/lehuygiang28/gemini-proxy/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/lehuygiang28/gemini-proxy/discussions)

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
