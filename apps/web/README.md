# Gemini Proxy - Next.js Web App

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This is the **recommended** deployment option for **Gemini Proxy**. It's a full-stack Next.js application that provides a comprehensive web dashboard for managing API keys, monitoring usage, and viewing request logs.

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
- [Vercel Deployment](#-vercel-deployment-recommended)
- [Other Deployment Options](#️-other-deployment-options)

</details>

<details>
<summary><strong>💻 Usage & Development</strong></summary>

- [Web Interface](#-web-interface)
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

- ✅ **All-in-One Solution:** Combines a web dashboard and API proxy in a single deployment.
- ✅ **User-Friendly Dashboard:** Manage API keys, proxy keys, and monitor usage with ease.
- ✅ **Fastest Setup:** The quickest way to get started with Gemini Proxy.
- ✅ **Production Ready:** Built with Next.js 14 for enterprise-grade performance.
- ✅ **Authentication Included:** Secure user management powered by Supabase.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher)
- **Git**
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
cd apps/web
cp .env.example .env.development
```

Edit `.env.development` with your Supabase credentials.

### **3. Start the Development Server**

```bash
pnpm dev
```

The application will be available at `http://localhost:4040`.

## ⚙️ Environment Variables

### **Required Variables**

| Variable                        | Description                     |
| ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL.      |
| `NEXT_PUBLIC_ANON_SUPABASE_KEY` | Your Supabase anonymous key.    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Your Supabase service role key. |

### **Optional Variables**

For a complete list of optional environment variables, refer to the [**root README**](../../README.md#️-environment-variables).

## 🚀 Vercel Deployment (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flehuygiang28%2Fgemini-proxy&project-name=gemini-proxy&repository-name=gemini-proxy&root-directory=apps/web&build-command=pnpm%20build%20-F%20web&output-directory=apps/web/.next&env=NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_ANON_SUPABASE_KEY)

1. **Connect to Vercel:** Import your forked repository to Vercel.
2. **Build & Development Settings:**
   - **Build Command:** `pnpm build -F web`
   - **Output Directory:** `apps/web/.next`
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Root Directory:** Leave this empty (default).
3. **Environment Variables:** Add the required environment variables in the Vercel project settings.
4. **Deploy:** Vercel will automatically build and deploy your application.

## 🛠️ Other Deployment Options

This Next.js application can be deployed to any platform that supports Next.js, such as **[Netlify](https://www.netlify.com/)**, **[Railway](https://railway.app/)**, and **[Render](https://render.com/)**.

## 💻 Web Interface

- **Authentication:** Secure user registration and login.
- **API Key Management:** Add, view, and manage your Google Gemini API keys.
- **Proxy Key Management:** Create and control access with proxy keys.
- **Request Logs:** Detailed logging and filtering of all API requests.
- **Analytics:** Monitor usage and performance metrics.

## 🔌 API Integration

The web app includes the Gemini Proxy API, available at `/api/gproxy`.

## 🛠️ Local Development

- `pnpm dev`: Starts the development server.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Lints the codebase.

## 📁 Project Structure

```md
apps/web/
├── src/
│   ├── app/        # Next.js App Router
│   └── ...
├── public/         # Static assets
├── .env.example    # Environment variables template
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

## 🐛 Troubleshooting

- **Port Conflict:** Change the `PORT` in your `.env.development` file if `4040` is in use.
- **Missing Environment Variables:** Ensure all `NEXT_PUBLIC_` and `SUPABASE_` variables are set.
- **Authentication Errors:** Double-check your Supabase URL and keys.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
