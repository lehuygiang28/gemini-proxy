# Gemini Proxy Web

This is the web interface for Gemini Proxy, a powerful tool for managing and monitoring your Google Gemini API keys. Built with Next.js, Refine, and Ant Design, this application provides a comprehensive dashboard for API key management, request logging, and analytics.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Development](#development)
  - [Production](#production)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## Features

- **API Key Management:** Create, edit, and delete API keys.
- **Proxy API Keys:** Manage proxy keys for different applications.
- **Request Logging:** View detailed logs of all API requests.
- **Dashboard:** Monitor usage and analytics.
- **Authentication:** Secure login and registration using Supabase.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   ```

2. **Install dependencies from the root of the monorepo:**

   ```bash
   pnpm install
   ```

## Configuration

The application requires environment variables to be set up for different environments.

1. **Create environment files:**

   - For development, create a `.env.development` file in the `apps/web` directory by copying the example:
     ```bash
     cp apps/web/.env.example apps/web/.env.development
     ```
   - For production, create a `.env.production` file:
     ```bash
     cp apps/web/.env.example apps/web/.env.production
     ```

2. **Update the environment variables:**

   Open the `.env.development` and `.env.production` files and fill in the required values:

   - `NODE_ENV`: Set to `development` or `production`.
   - `PORT`: The port for the web server (e.g., `4040` for development, `4041` for production).
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
   - `NEXT_PUBLIC_ANON_SUPABASE_KEY`: Your Supabase anonymous (public) key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
   - `GOOGLE_GEMINI_API_BASE_URL`: The base URL for the Google Gemini API.
   - `GOOGLE_OPENAI_API_BASE_URL`: The base URL for the Google OpenAI-compatible API.

## Running the Application

### Development

To run the web server in development mode with hot-reloading:

```bash
pnpm dev
```

The server will start on the port specified in `PORT` (default: `4040`).

### Production

To run the web server in production mode:

```bash
pnpm start
```

The server will start on the port specified in `PORT` (default: `4041`).

## Building for Production

To build the application for production, run the following command from the root of the monorepo:

```bash
pnpm build
```

This will create a `.next` directory in `apps/web` with the production build.

## Deployment

You can deploy this Next.js application to any platform that supports Node.js, such as:

- **Vercel:** The recommended platform for deploying Next.js applications.
- **Netlify:** Another excellent option for deploying Next.js sites.
- **Docker:** A `Dockerfile` is included for containerizing the application.
- **Bare Metal/VPS:** Run the application using a process manager like PM2.

## Project Structure

- `src/app`: The main application directory, using the Next.js App Router.
- `src/components`: Reusable React components.
- `src/providers`: Application providers, such as the data provider and auth provider.
- `src/utils`: Utility functions and helpers.
- `public`: Static assets.
- `next.config.mjs`: Next.js configuration.
- `package.json`: Project dependencies and scripts.
