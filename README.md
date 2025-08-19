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
├── apps/
│   ├── web/                # Next.js web application with Ant Design
│   └── api/                # Node.js Hono API server
├── packages/
│   ├── core/               # Core business logic for Gemini Proxy
│   ├── database/           # Database schema and migrations
│   ├── cloudflare/         # Cloudflare Worker adapter
│   └── vercel/             # Vercel Edge Function adapter
├── examples/
│   ├── openai.example.ts
│   ├── google-genai.example.ts
│   └── ai-sdk.example.ts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## ✨ Packages

- `@gemini-proxy/core`: Platform-agnostic core package with all business logic.
- `@gemini-proxy/database`: Supabase schema, types, and migration scripts.
- `@gemini-proxy/cloudflare`: Adapter for Cloudflare Workers.
- `@gemini-proxy/vercel`: Adapter for Vercel Edge Functions.

## 🚀 Deployments

- **Web App**: Deployed on Vercel.
- **API Server**: Can be deployed on any Node.js environment.
- **Edge Functions**: Adapters for Cloudflare and Vercel are available.

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- [Supabase Account](https://supabase.com/): A Supabase project is required for the database and authentication.

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/lehuygiang28/gemini-proxy
    cd gemini-proxy
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Set up Supabase**

    1. Go to [supabase.com](https://supabase.com/) and create a new project.
    2. In your project settings, find your **Project URL**, **anon key**, and **service_role key**.

4. **Set up environment variables**

    Create a `.env` file in each `apps/*` and `packages/*` directory by copying the `.env.example` files. Fill in the Supabase credentials from the previous step.

5. **Run database migrations**

    ```bash
    pnpm --filter @gemini-proxy/database db:push
    ```

6. **Start development server**

    ```bash
    pnpm dev
    ```

## 📚 Examples

The `examples` directory contains usage examples for different libraries:

- **OpenAI**: `openai.example.ts`
- **Google Generative AI**: `google-genai.example.ts`
- **AI SDK**: `ai-sdk.example.ts`

To run an example:

```bash
pnpm tsx examples/openai.example.ts
```

## 📜 Available Scripts

- `pnpm dev`: Start all applications in development mode.
- `pnpm build`: Build all applications and packages.
- `pnpm lint`: Run linting across all packages.
- `pnpm test`: Run tests across all packages.
- `pnpm clean`: Clean all build artifacts.
- `pnpm format`: Format all code with Prettier.
- `pnpm format:check`: Check code formatting.

## 📝 Contributing

1. Create a feature branch.
2. Make your changes.
3. Run `pnpm format` and `pnpm lint`.
4. Submit a pull request.

## 📄 License

MIT License
