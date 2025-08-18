# Gemini Proxy Monorepo

This monorepo contains the applications and packages for the Gemini Proxy service, a powerful tool for managing and proxying requests to the Gemini API.

## 🚀 Tech Stack

- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Frontend**: Next.js 14 (Refine) + Ant Design
- **Backend**: Hono Framework
- **BaaS**: Supabase (PostgreSQL + Auth)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Ant Design
- **Code Formatting**: Prettier
- **Core Logic**: Platform-agnostic TypeScript package

## 📁 Project Structure

```md
gemini-proxy/
├── apps/                   # Main apps
│   ├── web/                # Next.js web application with Ant Design
│   └── api/                # Node.js Hono API server
├── packages/               # Shared packages
│   ├── core/               # Core business logic for Gemini Proxy
│   └── database/           # Database schema and migrations
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── turbo.json              # Turborepo configuration
└── README.md               # This file
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd gemini-proxy
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Set up environment variables**

    Create a `.env` file in `apps/api` and `apps/web` by copying the `.env.example` files and filling in the required values.

4. **Start development server**

    ```bash
    pnpm dev
    ```

## 📜 Available Scripts

### Root Level Scripts

- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications and packages
- `pnpm lint` - Run linting across all packages
- `pnpm test` - Run tests across all packages
- `pnpm clean` - Clean all build artifacts
- `pnpm format` - Format all code with Prettier
- `pnpm format:check` - Check code formatting

## ✨ Core Features

The `@gemini-proxy/core` package contains all the business logic for the Gemini Proxy service:

- **Platform Agnostic**: Works on Node.js, Cloudflare Workers, Netlify, Vercel, and Deno
- **Database Integration**: Uses Supabase with service role for all database operations
- **API Key Management**: Intelligent API key selection and rotation
- **Request Logging**: Comprehensive request tracking and analytics
- **Usage Parsing**: Extracts usage metadata from both Gemini and OpenAI-compatible responses
- **Streaming Support**: Handles streaming responses from both API formats
- **Retry Logic**: Automatic retry with different API keys on failures

See `packages/core/README.md` for detailed documentation.

## 🚀 Deployment

Each app can be deployed independently:

- **Web App**: Deploy to Vercel, Netlify, or any Next.js-compatible platform
- **API Server**: Deploy to any Node.js compatible environment or serverless platform with Hono support

## 📝 Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm format` to format code
4. Run `pnpm lint` to check for issues
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
