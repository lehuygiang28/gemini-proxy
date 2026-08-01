# Gemini Proxy - Standalone API Server

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

The **Gemini Proxy** Standalone API Server is a lightweight, high-performance Node.js application for proxying requests to Google's Gemini API.

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
- [Docker Deployment](#-docker-deployment)
- [Platform Deployment Guides](#️-platform-deployment-guides)

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

- ✅ **Lightweight & Fast:** Built on Hono.js for maximum performance.
- ✅ **Customizable:** Full control over your deployment environment.
- ✅ **Scalable:** Deployable on any Node.js compatible platform.
- ✅ **Docker Ready:** Includes a `Dockerfile` for easy containerization.
- ✅ **API-Only:** Perfect for headless services and custom integrations.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher)
- **Git**
- **Docker** (for containerized deployment)
- A **Supabase** account
- A **Google AI Studio** account for Gemini API keys

## 🚀 Quick Start

### **1. Clone and Install**

```bash
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy
pnpm install
```

### **2. Configure Environment**

```bash
cd apps/api
cp .env.example .env
```

Edit the `.env` file with your Supabase credentials.

### **3. Start the Development Server**

```bash
pnpm dev
```

The API server will be running at `http://localhost:9090`.

## ⚙️ Environment Variables

### **Required Variables**

| Variable                    | Description                     |
| --------------------------- | ------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.      |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, please refer to the [**root README**](../../README.md#️-environment-variables).

## 🐳 Docker Deployment

### **1. Build the Docker Image**

```bash
docker build -t gemini-proxy-api .
```

### **2. Run the Docker Container**

```bash
docker run -p 9091:9091 \
  -e NODE_ENV=production \
  -e API_PORT=9091 \
  -e SUPABASE_URL=<your-supabase-url> \
  -e SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
  gemini-proxy-api
```

## 🛠️ Platform Deployment Guides

This API server can be deployed to any platform that supports Node.js or Docker. For detailed guides, refer to the following resources:

- **[Railway](https://docs.railway.app/)**
- **[Render](https://render.com/docs)**
- **[Heroku](https://devcenter.heroku.com/)**
- **[DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)**
- **[AWS ECS](https://aws.amazon.com/ecs/getting-started/)**

## 💻 API Integration

For detailed usage examples, please see the [**Usage Examples**](../../README.md#-usage-examples) in the root README.

## 🛠️ Local Development

- `pnpm dev`: Starts the development server with hot-reloading.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.

## 📁 Project Structure

```md
apps/api/
├── src/
│ └── index.ts # Main server entry point
├── dist/ # Compiled output
├── .env.example # Environment variables template
├── package.json # Dependencies and scripts
└── README.md # This file
```

## 🐛 Troubleshooting

- **Port Conflict:** Change the `API_PORT` in your `.env` file if the default port is in use.
- **Missing Environment Variables:** Ensure that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
- **Database Connectivity:** Verify your Supabase credentials and network connection.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
