# Gemini Proxy API

This is the standalone API server for Gemini Proxy, built with Hono.js. It provides a proxy to Google's Gemini API and OpenAI-compatible endpoints, with features like API key management, request logging, and more.

## Table of Contents

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

   - For development, create a `.env` file in the `apps/api` directory by copying the example:
     ```bash
     cp apps/api/.env.example apps/api/.env
     ```
   - For production, create a `.env.production` file:
     ```bash
     cp apps/api/.env.example apps/api/.env.production
     ```

2. **Update the environment variables:**

   Open the `.env` and `.env.production` files and fill in the required values:

   - `NODE_ENV`: Set to `development` or `production`.
   - `API_PORT`: The port for the API server (e.g., `9090` for development, `9091` for production).
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
   - `GOOGLE_GEMINI_API_BASE_URL`: The base URL for the Google Gemini API.
   - `GOOGLE_OPENAI_API_BASE_URL`: The base URL for the Google OpenAI-compatible API.
   - `GEMINI_API_KEY`: A JSON array of your Google Gemini API keys.

## Running the Application

### Development

To run the API server in development mode with hot-reloading:

```bash
pnpm dev
```

The server will start on the port specified in `API_PORT` (default: `9090`).

### Production

To run the API server in production mode:

```bash
pnpm start
```

The server will start on the port specified in `API_PORT` (default: `9091`).

## Building for Production

To build the application for production, run the following command from the root of the monorepo:

```bash
pnpm build
```

This will create a `dist` directory in `apps/api` with the compiled JavaScript files.

## Deployment

You can deploy this Hono.js application to any platform that supports Node.js, such as:

- **Vercel:** Configure the build command and start command in your Vercel project settings.
- **Netlify:** Similar to Vercel, configure the build and start commands.
- **Docker:** A `Dockerfile` can be created to containerize the application.
- **Bare Metal/VPS:** Run the application using a process manager like PM2.

## Project Structure

- `src/index.ts`: The main entry point of the application.
- `package.json`: Project dependencies and scripts.
- `.env.example`: Example environment variables.
- `tsup.config.ts`: Configuration for `tsup`, the bundler used to build the application.
