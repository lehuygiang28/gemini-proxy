# Gemini Proxy - Appwrite Functions

[![NPM Version](https://img.shields.io/npm/v/@lehuygiang28/gemini-proxy-appwrite?style=flat-square)](https://www.npmjs.com/package/@lehuygiang28/gemini-proxy-appwrite)
[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This package provides a serverless deployment option for **Gemini Proxy** using [Appwrite Functions](https://appwrite.io/docs/products/functions).

## 📋 Table of Contents

<details>
<summary><strong>🚀 Getting Started</strong></summary>

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)

</details>

<details>
<summary><strong>⚙️ Configuration & Deployment</strong></summary>

- [Appwrite Project Setup](#️-appwrite-project-setup)
- [Environment Variables](#-environment-variables)
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

- ✅ **Serverless:** Deploy Gemini Proxy without managing servers.
- ✅ **Scalable:** Automatically scales with your usage.
- ✅ **API-Only:** A lightweight, headless proxy service.
- ✅ **Easy Deployment:** Simple setup with the Appwrite CLI.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher)
- **Git**
- **Appwrite CLI**
- An **Appwrite** project
- A **Supabase** account
- A **Google AI Studio** account

## 🚀 Quick Start

### **1. Install and Login to Appwrite CLI**

```bash
npm install -g appwrite-cli
appwrite login
```

### **2. Clone and Install**

```bash
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy
pnpm install
```

### **3. Configure and Deploy**

```bash
cd packages/appwrite
# Edit appwrite.config.json with your project details
pnpm deploy
```

### **4. Set Environment Variables**

```bash
appwrite functions create-variable --functionId <your-function-id> --key SUPABASE_URL --value "your-supabase-url"
appwrite functions create-variable --functionId <your-function-id> --key SUPABASE_SERVICE_ROLE_KEY --value "your-service-role-key"
```

## ⚙️ Appwrite Project Setup

Configure your Appwrite project details in `appwrite.config.json`.

## 🌳 Environment Variables

### **Required Variables**

| Variable                    | Description                  |
| --------------------------- | ---------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.   |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, refer to the [**root README**](../../README.md#️-environment-variables).

## 🚀 Deployment

The `pnpm deploy` script will build and deploy the function to your Appwrite project.

### 🔄 Git-connected CI/CD (Recommended)

You can fork this repository and connect it to Appwrite for faster deployments and automatic CI/CD from Git.

1. Fork the repo on GitHub.
2. In the Appwrite Console, create a new Function and connect your Git repository.
3. Configure the function with the following settings:

   - Runtime: Nodejs 22
   - Entrypoint: `packages/appwrite/dist/main.js`
   - Root directory: `./` (root)
   - Build command: `npx pnpm@10 install && npx pnpm@10 build -F @lehuygiang28/gemini-proxy-appwrite`

4. Add required environment variables in Function Settings (see Environment Variables section).
5. Note: Appwrite does not auto-deploy on new commits. After pushing, manually create a deployment from the new commit in the Appwrite Console.

## 💻 API Integration

Your Appwrite function will be available at `https://<your-appwrite-endpoint>/functions/v1/<your-function-id>/`.

## 🛠️ Local Development

This package is intended for deployment to Appwrite and does not have a local development server.

## 📁 Project Structure

```md
packages/appwrite/
├── src/
│   └── main.ts           # Main function entry point
├── dist/                 # Compiled output
├── appwrite.config.json  # Appwrite configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🐛 Troubleshooting

- **Deployment Fails:** Ensure your Appwrite CLI is logged in and `appwrite.config.json` is correct.
- **Function Errors:** Check the function logs in your Appwrite console.
- **Missing Variables:** Verify that all required environment variables are set.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
