# Gemini Proxy Monorepo

A modern monorepo setup using pnpm workspaces and Turborepo for managing multiple applications and packages.

## 🚀 Tech Stack

- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Frontend**: Next.js 14 + Ant Design
- **Backend**: Hono Framework
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Ant Design
- **Code Formatting**: Prettier
- **Database**: Supabase (PostgreSQL)
- **Core Logic**: Platform-agnostic TypeScript package

## 📁 Project Structure

```md
gemini-proxy/
├── apps/
│   ├── web/                 # Next.js web application with Ant Design
│   │   ├── src/
│   │   │   ├── app/         # Next.js 13+ app directory
│   │   │   ├── components/  # App-specific components
│   │   │   └── lib/         # App-specific utilities
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── api/                 # Hono API server
│       ├── src/
│       │   └── index.ts     # Main server entry point
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── packages/                # Shared packages
│   ├── core/               # Core business logic for Gemini Proxy
│   │   ├── src/            # Source code
│   │   ├── package.json    # Package configuration
│   │   ├── tsconfig.json   # TypeScript configuration
│   │   └── README.md       # Core package documentation
│   └── database/           # Database schema and migrations
│       └── schema.sql      # Supabase database schema
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── turbo.json              # Turborepo configuration
├── tsconfig.json           # Root TypeScript configuration
├── .prettierrc            # Prettier configuration
├── .gitignore             # Git ignore rules
└── README.md              # This file
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

3. **Start development server**

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

### App-Specific Scripts

Navigate to any app or package directory to run app-specific scripts:

```bash
cd apps/web
pnpm dev    # Start Next.js development server
pnpm build  # Build the Next.js app
```

## 🔧 Development

### Adding a New App

1. Create a new directory in `apps/`
2. Initialize with your preferred framework
3. Add the app to the workspace in `pnpm-workspace.yaml`
4. Update `turbo.json` if needed

### Adding a New Package

1. Create a new directory in `packages/`
2. Set up the package with its own `package.json`
3. Add the package to the workspace in `pnpm-workspace.yaml`
4. Export components/functions from the package

### Workspace Dependencies

Use `workspace:*` in package.json to reference other packages in the monorepo:

```json
{
    "dependencies": {
        "@gemini-proxy/core": "workspace:*"
    }
}
```

### Core Package

The `@gemini-proxy/core` package contains all the business logic for the Gemini Proxy service:

- **Platform Agnostic**: Works on Node.js, Cloudflare Workers, Netlify, Vercel, and Deno
- **Database Integration**: Uses Supabase with service role for all database operations
- **API Key Management**: Intelligent API key selection and rotation
- **Request Logging**: Comprehensive request tracking and analytics
- **Usage Parsing**: Extracts usage metadata from both Gemini and OpenAI-compatible responses
- **Streaming Support**: Handles streaming responses from both API formats
- **Retry Logic**: Automatic retry with different API keys on failures

See `packages/core/README.md` for detailed documentation.

## 🏗️ Build Pipeline

Turborepo handles the build pipeline with the following tasks:

- **build**: Builds packages and apps with proper dependency ordering
- **dev**: Runs development servers (not cached, persistent)
- **lint**: Runs linting across all packages
- **test**: Runs tests with build dependencies
- **clean**: Cleans build artifacts

## 📦 Package Management

This monorepo uses pnpm workspaces for efficient package management:

- Shared dependencies are hoisted to the root
- Workspace packages can reference each other
- Efficient installation and updates
- Lockfile ensures reproducible builds

## 🎨 Code Style

- **TypeScript**: Strict mode enabled
- **Prettier**: Consistent code formatting
- **ESLint**: Code quality and consistency
- **Tailwind CSS**: Utility-first styling
- **Ant Design**: Component library for UI

## 🚀 Deployment

Each app can be deployed independently:

- **Web App**: Deploy to Vercel, Netlify, or any Next.js-compatible platform
- **Packages**: Publish to npm registry if needed

## 📝 Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm format` to format code
4. Run `pnpm lint` to check for issues
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
