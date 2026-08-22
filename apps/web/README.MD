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
- [Vercel Deployment](#vercel-deployment)
- [Cloudflare Deployment](#cloudflare-deployment-opennext)
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
- ✅ **Production Ready:** Built with Next.js 15 for enterprise-grade performance.
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

<a id="vercel-deployment"></a>

## 🚀 Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flehuygiang28%2Fgemini-proxy&project-name=gemini-proxy&repository-name=gemini-proxy&build-command=pnpm%20build%20-F%20web&output-directory=apps/web/.next&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_ANON_SUPABASE_KEY,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6&external-id=https://github.com/lehuygiang28/gemini-proxy)

The Vercel button installs the [Supabase integration](https://vercel.com/integrations/supabase), creates a Supabase project, and runs migrations in [`supabase/migrations/`](../../supabase/migrations/).

1. **Connect to Vercel:** Import your forked repository to Vercel.
2. **Build & Development Settings:**
    - **Build Command:** `pnpm build -F web`
    - **Output Directory:** `apps/web/.next`
    - **Install Command:** `pnpm install --frozen-lockfile`
    - **Root Directory:** Leave this empty (default).
3. **Environment Variables:** Add the required environment variables in the Vercel project settings.
4. **Deploy:** Vercel will automatically build and deploy your application.

<a id="cloudflare-deployment-opennext"></a>

## ☁️ Cloudflare Deployment (OpenNext)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lehuygiang28/gemini-proxy)

Deploys this full-stack app (dashboard + `/api/gproxy`) to [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). This is the **default** Cloudflare target (`gemini-proxy-web`). API-only is opt-in — see [`packages/cloudflare`](../../packages/cloudflare/README.md).

| Target                   | Wrangler config                                                                  | Worker name        | What it serves     |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------ | ------------------ |
| **Full-stack (default)** | [`wrangler.jsonc`](../../wrangler.jsonc) (repo root)                             | `gemini-proxy-web` | UI + `/api/gproxy` |
| API-only (optional)      | [`packages/cloudflare/wrangler.jsonc`](../../packages/cloudflare/wrangler.jsonc) | `gemini-proxy`     | `/api/gproxy` only |

**Supabase (required before login works):** Cloudflare does not auto-provision Supabase. Follow the [fast setup guide](../../docs/getting-started.md#fast-supabase-setup-for-cloudflare--local), then paste your keys into the Deploy form (from [`.dev.vars.example`](../../.dev.vars.example)).

### **CLI deploy**

From the repository root (requires [`wrangler login`](https://developers.cloudflare.com/workers/wrangler/commands/#login)):

```bash
cp .dev.vars.example .dev.vars
# Fill NEXT_PUBLIC_* and SUPABASE_* in .dev.vars (required for OpenNext build — constants.ts throws if missing)
# Also keep NEXT_PUBLIC_* in apps/web/.env.local for `pnpm dev`
pnpm run deploy:cloudflare
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_ANON_SUPABASE_KEY` must be set before any OpenNext build (`pnpm run build`, `pnpm run deploy:cloudflare`, or `pnpm cf:deploy`). Use repo-root `.dev.vars`, exported env vars, or `apps/web/.env.local`.

Preview the Worker locally (workerd, not `next dev`):

```bash
pnpm run preview:cloudflare
```

### **Secrets and variables**

Set **runtime** Worker variables/secrets in the dashboard or with Wrangler (from repo root):

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.jsonc
wrangler secret put SUPABASE_URL --config wrangler.jsonc
```

Also set these as **plain variables** (needed at runtime and, for `NEXT_PUBLIC_*`, at **build** time):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_ANON_SUPABASE_KEY`
- `SUPABASE_URL` (same value as `NEXT_PUBLIC_SUPABASE_URL`)

`pnpm run deploy:cloudflare` passes `--keep-vars` so dashboard-set variables are not wiped.

Local OpenNext preview reads Next.js `.env*` files. Copy [`.dev.vars.example`](../../.dev.vars.example) to `.dev.vars` at the repo root and set `NEXTJS_ENV=development` for Wrangler preview.

### **Git-connected CI/CD (Workers Builds)**

Connect the repo to a Worker named `gemini-proxy-web`:

1. Fork the repo on GitHub.
2. In the Cloudflare dashboard, create Worker `gemini-proxy-web` and connect the repository.
3. Accept the auto-detected commands (**Build:** `pnpm run build`, **Deploy:** `pnpm run deploy`). If Deploy still shows `npx wrangler deploy`, the default branch on GitHub is missing the `deploy` script — merge the OpenNext changes to `main` first.
4. Under **Build variables and secrets**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_ANON_SUPABASE_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. The Next.js build inlines `NEXT_PUBLIC_*`.
5. Under **Worker settings** (runtime), set the same variables/secrets again so the deployed Worker can read them.
6. Every push to your default branch will build and deploy `gemini-proxy-web`.

See [OpenNext environment variables](https://opennext.js.org/cloudflare/howtos/env-vars) for why build-time and runtime vars are both required.

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

- `pnpm dev`: Starts the Next.js development server (Node.js, HMR).
- `pnpm build`: Builds the application for production (Vercel / Node). From monorepo root, use `pnpm build -F web` or `pnpm run build:monorepo` for all packages.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Lints the codebase.
- `pnpm cf:build`: Builds the OpenNext Cloudflare Worker bundle.
- `pnpm cf:preview`: Builds and serves the app in the Workers (`workerd`) runtime.
- `pnpm cf:deploy`: Builds and deploys to Cloudflare Workers.

From the monorepo root, `pnpm run preview:cloudflare` / `pnpm run deploy:cloudflare` run the same OpenNext scripts.

## 📁 Project Structure

```text
apps/web/
├── src/
│   ├── app/                 # Next.js App Router
│   └── ...
├── public/                  # Static assets + _headers
├── open-next.config.ts      # OpenNext Cloudflare adapter
├── .dev.vars.example        # NEXTJS_ENV for local wrangler preview
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
└── README.MD                # This file

# Repo root: wrangler.jsonc + .dev.vars.example (OpenNext Worker gemini-proxy-web)
```

## 🐛 Troubleshooting

- **Port Conflict:** Change the `PORT` in your `.env.development` file if `4040` is in use.
- **Missing Environment Variables:** Ensure all `NEXT_PUBLIC_` and `SUPABASE_` variables are set.
- **Authentication Errors:** Double-check your Supabase URL and keys.
- **OpenNext preview vs `next dev`:** `pnpm dev` uses Node.js. Use `pnpm cf:preview` to catch Workers runtime issues before deploy.
- **Workers Builds missing `NEXT_PUBLIC_*`:** Add them under **Build variables and secrets**, not only runtime Worker settings.
- **Wrong Worker updated:** Full-stack `gemini-proxy-web` uses the root [`wrangler.jsonc`](../../wrangler.jsonc). API-only `gemini-proxy` uses [`packages/cloudflare/wrangler.jsonc`](../../packages/cloudflare/wrangler.jsonc).

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
