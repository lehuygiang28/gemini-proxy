# Gemini Proxy - Cloudflare Worker

[![NPM Version](https://img.shields.io/npm/v/@lehuygiang28/gemini-proxy-cloudflare?style=flat-square)](https://www.npmjs.com/package/@lehuygiang28/gemini-proxy-cloudflare)
[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This package allows you to deploy **Gemini Proxy** as a [Cloudflare Worker](https://workers.cloudflare.com/), running on Cloudflare's global edge network for minimal latency.

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

### **3. Deploy the Worker**

```bash
cd packages/cloudflare
pnpm deploy
```

### **4. Set Secrets**

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## ⚙️ Environment Variables

Sensitive information should be stored as secrets using the Wrangler CLI.

### **Required Secrets**

| Secret                      | Description                  |
| --------------------------- | ---------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.   |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, refer to the [**root README**](../../README.md#️-environment-variables).

## 🚀 Deployment

The `pnpm deploy` script will build and deploy the worker to your Cloudflare account.

### 🔄 Git-connected CI/CD (Recommended)

You can fork this repository and connect it directly to Cloudflare for fast deployments and automatic CI/CD from Git.

1. Fork the repo on GitHub.
2. In Cloudflare dashboard, create a new Worker and connect your Git repository.
3. Use the following settings:

   - Build command: `pnpm build -F @lehuygiang28/gemini-proxy-cloudflare`
   - Deploy command: `cd packages/cloudflare && pnpm run deploy`
   - Path: `/` (root directory)

4. Configure secrets (see Environment Variables section) in your Worker Settings.
5. Every push to your default branch will trigger build and deploy automatically.

## 💻 API Integration

Your Cloudflare Worker will be available at the URL provided after deployment.

## 🛠️ Local Development

- `pnpm dev`: Starts the local development server.
- `pnpm test`: Runs tests.

## 📁 Project Structure

```md
packages/cloudflare/
├── src/
│   └── index.ts          # Main worker entry point
├── dist/                 # Compiled output
├── wrangler.jsonc        # Worker configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🐛 Troubleshooting

- **Deployment Fails:** Ensure your Wrangler CLI is logged in and `wrangler.jsonc` is correct.
- **Worker Errors:** Use `wrangler tail` to view live logs.
- **Missing Secrets:** Use `wrangler secret list` to verify your secrets.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
