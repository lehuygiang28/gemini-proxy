# Gemini Proxy - Cloudflare Worker

[![NPM Version](https://img.shields.io/npm/v/@lehuygiang28/gemini-proxy-cloudflare?style=flat-square)](https://www.npmjs.com/package/@lehuygiang28/gemini-proxy-cloudflare)
[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This package allows you to deploy **Gemini Proxy** as a [Cloudflare Worker](https://workers.cloudflare.com/), running on Cloudflare's global edge network for minimal latency.

This Worker is **API-only** (`/api/gproxy`). To deploy the **full-stack dashboard** (Next.js UI + the same proxy) on Cloudflare, see [apps/web — Cloudflare / OpenNext](../../apps/web/README.md#-cloudflare-deployment-opennext).

## 📋 Table of Contents

<details>
<summary><strong>🚀 Getting Started</strong></summary>

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)

</details>

<details>
<summary><strong>⚙️ Configuration & Deployment</strong></summary>

- [Environment Variables](#️-environment-variables)
- [Deployment](#-deployment)

</details>

<details>
<summary><strong>💻 Usage & Development</strong></summary>

- [API Integration](#-api-integration)
- [Local Development](#️-local-development)
- [Project Structure](#-project-structure)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Troubleshooting](#-troubleshooting)
- [Back to Main README](#-back-to-main-readme)

</details>

## ✨ Features

- ✅ **Edge Deployment:** Deploys the proxy to Cloudflare's global network.
- ✅ **Low Latency:** Provides fast response times for users worldwide.
- ✅ **Scalable:** Automatically handles high traffic volumes.
- ✅ **API-Only:** A lightweight, headless proxy service.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher)
- **Git**
- **Wrangler CLI**
- A **Cloudflare** account
- A **Supabase** account
- A **Google AI Studio** account

## 🚀 Quick Start

### **1. Install and Login to Wrangler CLI**

```bash
npm install -g wrangler
wrangler login
```

### **2. Clone and Install**

```bash
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy
pnpm install
```

### **3. Deploy the API-only Worker**

From the repository root:

```bash
pnpm run deploy:cloudflare:api
```

### **4. Set Secrets**

```bash
wrangler secret put SUPABASE_URL --config packages/cloudflare/wrangler.jsonc
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config packages/cloudflare/wrangler.jsonc
```

## ⚙️ Environment Variables

Sensitive information should be stored as secrets using the Wrangler CLI.

### **Required Secrets**

| Secret                      | Description                     |
| --------------------------- | ------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.      |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, refer to the [**root README**](../../README.md#️-environment-variables).

## 🚀 Deployment

`pnpm run deploy:cloudflare:api` (from the repo root) deploys this headless Worker. The **default** Cloudflare deploy (`pnpm run deploy:cloudflare`) is the full-stack OpenNext app — see [apps/web Cloudflare deployment](../../apps/web/README.md#-cloudflare-deployment-opennext).

### 🔄 Git-connected CI/CD (API-only)

Wrangler config for **this API-only Worker** is [`wrangler.jsonc`](./wrangler.jsonc) in this package. The default full-stack app uses the root [`wrangler.jsonc`](../../wrangler.jsonc) (`gemini-proxy-web`).

1. Fork the repo on GitHub.
2. In the Cloudflare dashboard, create a new Worker named `gemini-proxy` and connect your Git repository.
3. Use the following settings:
   - Root directory: `/` (repository root)
   - Build command: `pnpm run build:cloudflare:api`
   - Deploy command: `pnpm run deploy:cloudflare:api`

4. Configure secrets (see Environment Variables section) in your Worker Settings.
5. Every push to your default branch will trigger build and deploy automatically.

## 💻 API Integration

Your Cloudflare Worker will be available at the URL provided after deployment.

## 🛠️ Local Development

Copy `packages/cloudflare/.env.example` to `.dev.vars` at the repository root, then:

- `pnpm --filter @lehuygiang28/gemini-proxy-cloudflare dev`: Starts the local development server.
- `pnpm --filter @lehuygiang28/gemini-proxy-cloudflare test`: Runs tests.

## 📁 Project Structure

```text
gemini-proxy/
├── wrangler.jsonc              # Default: OpenNext full-stack (gemini-proxy-web)
└── packages/cloudflare/
    ├── wrangler.jsonc          # API-only Worker (gemini-proxy)
    ├── src/
    │   └── index.ts            # Worker entry
    ├── dist/                   # npm publish bundle (tsdown)
    ├── package.json
    └── README.md
```

## 🐛 Troubleshooting

- **Deployment Fails:** Ensure your Wrangler CLI is logged in and `packages/cloudflare/wrangler.jsonc` is correct.
- **Worker Errors:** Use `wrangler tail` to view live logs.
- **Missing Secrets:** Use `wrangler secret list` to verify your secrets.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
