# Gemini Proxy

**Gemini Proxy** is a powerful, open-source toolkit for managing and proxying requests to Google's Gemini API. It provides a robust set of features for developers and organizations to monitor, control, and scale their usage of the Gemini API.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Quick Start</strong></summary>

- [Introduction](#-introduction)
- [Core Features](#-core-features)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)

</details>

<details>
<summary><strong>⚙️ Configuration</strong></summary>

- [Environment Variables](#️-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Usage Examples](#-usage-examples)

</details>

<details>
<summary><strong>🌐 Platform Support</strong></summary>

- [Deployment Options](#-deployment-options)
- [Platform-Specific Guides](#️-platform-specific-guides)

</details>

<details>
<summary><strong>🔧 Technical Details</strong></summary>

- [Architecture](#️-architecture)
- [Project Structure](#-project-structure)
- [Development](#️-development)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Contributing](#-contributing)
- [License](#-license)

</details>

## 🚀 Introduction

Gemini Proxy is a comprehensive solution that allows you to:

- **🔑 Manage API Keys:** Securely store and rotate multiple Google Gemini API keys
- **⚡ Load Balance:** Distribute requests across multiple API keys for optimal performance
- **📊 Monitor Usage:** Track API usage, costs, and performance metrics
- **🛡️ Control Access:** Manage proxy keys and access permissions
- **📝 Log Requests:** Detailed logging of all API requests and responses
- **🌍 Deploy Anywhere:** Support for multiple deployment platforms

## ✨ Core Features

### 🔑 **API Key Management**

- Secure storage of multiple Google Gemini API keys
- Intelligent key rotation and load balancing
- Usage tracking and analytics per key
- Enable/disable keys without downtime

### ⚡ **Performance & Scalability**

- Automatic request distribution across API keys
- Built-in retry mechanisms with exponential backoff
- Request caching and optimization
- Support for streaming responses

### 📊 **Monitoring & Analytics**

- Real-time request logging and analytics
- Performance metrics and cost tracking
- Error monitoring and alerting
- Usage dashboards and reports

### 🛡️ **Security & Access Control**

- Proxy API key management
- Request authentication and authorization
- Rate limiting and abuse prevention
- Secure environment variable handling

### 🌍 **Multi-Platform Support**

- **Next.js Fullstack App** (Recommended)
- **Standalone Node.js API Server**
- **Vercel Edge Functions**
- **Cloudflare Workers**
- **Appwrite Functions**

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### **Required Software**

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **Git**

### **Required Accounts**

- **Google AI Studio** account for Gemini API keys
- **Supabase** account for database and authentication

### **Installation Commands**

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install pnpm
npm install -g pnpm

# Verify installations
node --version
pnpm --version
```

## 🚀 Quick Start Guide

### **Recommended: Deploy the Web App (Fastest)**

The fastest way to get started is deploying the Next.js web application:

```bash
# 1. Clone the repository
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.development with your values

# 4. Start development server
cd apps/web
pnpm dev

# 5. Open the application
# http://localhost:4040
```

### **Alternative: Deploy to Vercel (Recommended for Production)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flehuygiang28%2Fgemini-proxy&project-name=gemini-proxy&repository-name=gemini-proxy&root-directory=apps/web&build-command=pnpm%20build%20-F%20web&output-directory=apps/web/.next&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY)

**Manual Setup:**

1. **Fork or clone the repository**
2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - **Do NOT set root directory** (leave as default)
3. **Configure Build Settings:**
   - **Build Command:** `pnpm build -F web`
   - **Output Directory:** `apps/web/.next`
4. **Configure Environment Variables:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
5. **Deploy automatically on every push**

## ⚙️ Environment Variables

### **Required Environment Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### **Optional Environment Variables**

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GOOGLE_GEMINI_API_BASE_URL` | Gemini API base URL | `https://generativelanguage.googleapis.com/` | `https://generativelanguage.googleapis.com/` |
| `GOOGLE_OPENAI_API_BASE_URL` | OpenAI-compatible API base URL | `https://generativelanguage.googleapis.com/v1beta/openai/` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `PROXY_MAX_RETRIES` | Maximum retry attempts | `-1` | `5` |
| `PROXY_LOGGING_ENABLED` | Enable request logging | `true` | `false` |
| `PROXY_LOG_LEVEL` | Logging level | `info` | `debug` |

## 💻 Usage Examples

### **Using with Google Generative AI SDK**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-proxy-endpoint/api/gproxy/gemini',
    },
});

// Generate content
const result = await genAi.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Explain quantum computing in simple terms.',
});
console.log(result.text);

// Stream content
const stream = await genAi.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: 'Write a short story about a robot.',
});
for await (const chunk of stream) {
    console.log(chunk.text);
}
```

### **Using with OpenAI-Compatible Clients**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-proxy-endpoint/api/grpoxy/openai',
});

// Chat completions
const completion = await openai.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of France?' }
    ],
    max_tokens: 100,
    temperature: 0.7,
});
console.log(completion.choices[0].message.content);

// Text embeddings
const embedding = await openai.embeddings.create({
    model: 'text-embedding-004',
    input: 'This is a sample text for embedding.',
    encoding_format: 'float'
});
console.log(embedding.data[0].embedding);
```

### **Using with Vercel AI SDK**

```typescript
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'gproxy_test_12345',
    baseURL: 'https://your-proxy-endpoint/api/gproxy/gemini/v1beta',
});
const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    system: 'You are a friendly assistant!',
    prompt: 'Why is the sky blue?',
});
console.log(text);
```

### Health Check

```bash
# Check service health
curl https://your-proxy-endpoint/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🌐 Deployment Options

### **🎯 Recommended: Next.js Web App (Full-Stack with UI)**

**Best for:** Most users, fastest deployment, full-featured dashboard

- ✅ **Complete Solution:** Web interface + API proxy in one deployment
- ✅ **User-Friendly Dashboard:** Built-in UI for managing API keys, proxy keys, and monitoring
- ✅ **Fastest Setup:** Single deployment with all features
- ✅ **Production Ready:** Enterprise-grade features with visual management

**Deploy to:** Vercel, Netlify, Railway, or any Next.js-compatible platform

### **⚡ Standalone API Server (API-Only)**

**Best for:** API-only deployments, custom integrations, headless services

- ✅ **Lightweight:** Minimal resource usage, API-only service
- ✅ **Customizable:** Full control over deployment
- ✅ **Scalable:** Can be deployed anywhere
- ❌ **No UI:** Requires CLI or external tools for management

**Deploy to:** Docker, Railway, Render, Heroku, or any Node.js platform

### **🚀 Edge Functions (API-Only)**

**Best for:** Global performance, low latency, serverless API

- ✅ **Global CDN:** Deploy to edge locations worldwide
- ✅ **Low Latency:** Fastest response times
- ✅ **Auto-scaling:** Handles traffic spikes automatically
- ❌ **No UI:** API-only service, management via CLI or external tools

**Deploy to:** Vercel Edge Functions, Cloudflare Workers

## 🛠️ Platform-Specific Guides

Choose your preferred deployment platform:

### **🎯 [Next.js Web App](./apps/web/README.md) - Full-Stack with UI**

- Complete fullstack solution with web dashboard
- **Only option with built-in UI** for managing API keys, proxy keys, and monitoring
- Recommended for most users
- Deploy to Vercel, Netlify, or any Next.js platform

### **⚡ [Standalone API Server](./apps/api/README.md) - API-Only**

- Lightweight Node.js API server
- **No UI** - API-only service
- Deploy to Docker, Railway, Render, or any Node.js platform

### **🚀 [Vercel Edge Functions](./packages/vercel/README.md) - API-Only**

- Serverless edge functions
- **No UI** - API-only service
- Deploy to Vercel's global network

### **🌍 [Cloudflare Workers](./packages/cloudflare/README.md) - API-Only**

- Edge computing platform
- **No UI** - API-only service
- Deploy to Cloudflare's global network

### **🔧 [Appwrite Functions](./packages/appwrite/README.md) - API-Only**

- Serverless functions on Appwrite
- **No UI** - API-only service
- Deploy to Appwrite cloud

### **🛠️ [CLI Tools](./packages/cli/README.md)**

- Command-line management tools
- **Required for managing API-only deployments** (API keys, proxy keys, logs)
- Use with any API-only deployment option

## 🏗️ Architecture

```md
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your App      │    │  Gemini Proxy   │    │  Google Gemini  │
│                 │───▶│                 │───▶│      API        │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │    Supabase     │
                       │   (Database)    │
                       └─────────────────┘
```

### Core Components

- **🔑 API Key Service:** Manages and rotates Gemini API keys
- **⚡ Proxy Service:** Routes requests to appropriate API keys
- **📊 Logger Service:** Logs all requests and responses
- **🛡️ Auth Service:** Handles proxy key authentication
- **📈 Analytics Service:** Tracks usage and performance

## 📁 Project Structure

```md
gemini-proxy/
├── apps/                          # Applications
│   ├── web/                      # Next.js web application (Recommended)
│   └── api/                      # Standalone Node.js API server
├── packages/                      # Packages
│   ├── core/                     # Core business logic
│   ├── cli/                      # Command-line tools
│   ├── database/                 # Database schema and types
│   ├── vercel/                   # Vercel Edge Functions
│   ├── cloudflare/               # Cloudflare Workers
│   └── appwrite/                 # Appwrite Functions
├── examples/                      # Usage examples
└── README.md                     # This file
```

### **Key Directories**

- **`apps/web/`** - Next.js fullstack application with dashboard
- **`apps/api/`** - Standalone Hono.js API server
- **`packages/core/`** - Shared business logic and services
- **`packages/cli/`** - Command-line management tools
- **`examples/`** - Code examples for different SDKs

## 🛠️ Development

### **Local Development**

```bash
# Clone the repository
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy

# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

### **Development Scripts**

```bash
# Start all development servers
pnpm dev

# Build specific package
pnpm --filter @lehuygiang28/gemini-proxy-core build

# Run CLI commands
pnpm --filter @lehuygiang28/gemini-proxy-cli start --help

# Deploy specific package
pnpm --filter @lehuygiang28/gemini-proxy-vercel deploy
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **How to Contribute**

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests if applicable**
5. **Commit your changes:** `git commit -m 'Add amazing feature'`
6. **Push to the branch:** `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### **Development Setup**

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.development

# Start development servers
pnpm dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **📖 Documentation:** [GitHub Wiki](https://github.com/lehuygiang28/gemini-proxy/wiki)
- **🐛 Issues:** [GitHub Issues](https://github.com/lehuygiang28/gemini-proxy/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/lehuygiang28/gemini-proxy/discussions)
- **⭐ Star:** [GitHub Repository](https://github.com/lehuygiang28/gemini-proxy)

---

**Made with ❤️ by the Gemini Proxy Team**
