# Gemini Proxy - Next.js Web App

This is the **recommended** deployment option for Gemini Proxy - a complete Next.js fullstack application that includes both the web dashboard and API proxy in a single deployment.

## 🎯 Why Choose This Option?

- ✅ **Fastest Setup:** Single deployment with all features
- ✅ **Complete Solution:** Web interface + API proxy in one
- ✅ **Production Ready:** Enterprise-grade features
- ✅ **User-Friendly:** Built-in dashboard for management
- ✅ **Next.js 15:** Latest App Router with full TypeScript support

## 📋 Table of Contents

<details>
<summary><strong>🚀 Quick Start</strong></summary>

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#️-configuration)

</details>

<details>
<summary><strong>🌐 Deployment</strong></summary>

- [Vercel Deployment](#vercel-deployment-recommended)
- [Other Platforms](#other-platforms)
- [Environment Setup](#environment-setup)

</details>

<details>
<summary><strong>💻 Usage</strong></summary>

- [Web Interface](#web-interface)
- [API Integration](#api-integration)
- [Development](#development)

</details>

<details>
<summary><strong>🔧 Technical</strong></summary>

- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [References](#-references)

</details>

## 🚀 Quick Start

### **1. Clone and Setup**

```bash
git clone https://github.com/lehuygiang28/gemini-proxy.git
cd gemini-proxy
pnpm install
```

### **2. Configure Environment**

```bash
cp apps/web/.env.example apps/web/.env.development
# Edit apps/web/.env.development with your values
```

### **3. Start Development Server**

```bash
cd apps/web
pnpm dev
```

### **4. Open the Application**

```sh
http://localhost:4040
```

## 📦 Installation

### **Prerequisites**

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Supabase account
- Google AI Studio account

### **Installation Steps**

1. **Clone the repository:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Navigate to the web app:**

   ```bash
   cd apps/web
   ```

## ⚙️ Configuration

### **Environment Variables**

Create environment files for different environments:

```bash
# Development
cp apps/web/.env.example apps/web/.env.development

# Production
cp apps/web/.env.example apps/web/.env.production
```

### **Required Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_ANON_SUPABASE_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### **Optional Variables**

For all optional environment variables, see the [root README](../../README.md#environment-variables).

## 🌐 Deployment

### **Vercel Deployment (Recommended)**

1. **Connect your repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Set the root directory to `apps/web`

2. **Configure environment variables:**
   - Add all required environment variables in Vercel dashboard
   - Set `NODE_ENV` to `production`

3. **Deploy:**
   - Vercel will automatically deploy on every push to main branch

### **Other Platforms**

#### **Netlify**

```bash
# Build command
cd apps/web && pnpm build

# Publish directory
apps/web/.next
```

#### **Railway**

- Connect your GitHub repository
- Set root directory to `apps/web`
- Configure environment variables

#### **Render**

- Deploy as a web service
- Set build command: `cd apps/web && pnpm install && pnpm build`
- Set start command: `cd apps/web && pnpm start`

### **Environment Setup**

#### **Development**

```bash
# Start development server
pnpm dev

# The app will be available at:
# http://localhost:4040
```

#### **Production**

```bash
# Build the application
pnpm build

# Start production server
pnpm start

# The app will be available at:
# http://localhost:4041
```

## 💻 Usage

### **Web Interface**

The web application provides a comprehensive interface for managing your Gemini Proxy:

#### **1. Authentication**

- Register a new account or login with existing credentials
- Secure authentication powered by Supabase

#### **2. API Key Management**

- Create new API keys with custom names and descriptions
- View usage statistics for each key
- Enable/disable keys as needed
- Delete unused keys

#### **3. Proxy Key Management**

- Create proxy keys for client applications
- Monitor proxy key usage and performance
- Manage access permissions

#### **4. Request Logs**

- View detailed logs of all API requests
- Filter logs by date, status, and other criteria
- Search through logs for specific information
- Export logs in various formats

#### **5. Analytics Dashboard**

- Monitor overall usage statistics
- View performance metrics
- Track cost and usage trends

### **API Integration**

The web application includes the Gemini Proxy API as Next.js API routes:

- **API Routes:** Available under `/api/gproxy/*`
- **Health Check:** `GET /api/gproxy/health`
- **Gemini API:** All Gemini API endpoints under `/api/gproxy/*`
- **OpenAI-Compatible:** All OpenAI-compatible endpoints under `/api/gproxy/openai/v1`

For detailed API endpoints and usage examples, see the [root README](../../README.md#api-endpoints) and [Usage Examples](../../README.md#usage-examples).

### **Client Configuration Examples**

#### **Google Generative AI SDK**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-vercel-app.vercel.app/api/gproxy',
    },
});
```

#### **OpenAI-Compatible Clients**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'https://your-vercel-app.vercel.app/api/gproxy/openai/v1',
});
```

## 🛠️ Development

### **Local Development**

```bash
# Start development server
pnpm dev

# Open the application
open http://localhost:4040

# Test API endpoints
curl http://localhost:4040/api/gproxy/health
```

### **Development Scripts**

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test
```

### **File Structure**

```md
apps/web/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── (protected)/  # Protected routes
│   │   ├── api/          # API routes
│   │   ├── login/        # Authentication pages
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── providers/        # Data providers
│   └── utils/           # Utility functions
├── public/              # Static assets
├── .next/               # Built application (generated)
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── next.config.mjs      # Next.js configuration
└── README.md           # This file
```

## 🔧 Project Structure

### **Key Files**

- `src/app/` - Next.js app directory with pages and API routes
- `src/components/` - Reusable React components
- `src/contexts/` - React contexts for state management
- `src/providers/` - Data providers for API integration
- `.env.example` - Template for environment variables
- `package.json` - Project dependencies and build scripts
- `next.config.mjs` - Next.js configuration

### **API Routes**

- `/api/gproxy/[[...slug]]` - Main proxy API route
- `/api/gproxy/health` - Health check endpoint

## 🐛 Troubleshooting

### **Common Issues**

1. **Port Already in Use:**

   ```bash
   # Change the PORT environment variable
   # Or kill the process using the port
   lsof -ti:4040 | xargs kill -9
   ```

2. **Environment Variables Not Set:**
   - Check that all required environment variables are set
   - Verify the `.env.development` file is in the correct location

3. **Database Connection Issues:**
   - Verify your Supabase URL and keys
   - Check your network connection to Supabase

4. **Authentication Issues:**
   - Ensure Supabase authentication is properly configured
   - Check that the anonymous key is set correctly

### **Debugging**

1. **Check application logs:**

   ```bash
   # Development logs
   pnpm dev
   
   # Production logs
   pnpm start
   ```

2. **Test database connection:**

   ```bash
   # Test Supabase connection
   curl -X GET "https://your-project.supabase.co/rest/v1/" \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key"
   ```

3. **Verify configuration:**

   ```bash
   # Check environment variables
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

## 📚 References

### **Next.js Documentation**

- [Getting Started](https://nextjs.org/docs/getting-started)
- [App Router](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

### **Refine Documentation**

- [Getting Started](https://refine.dev/docs/getting-started/overview/)
- [Data Provider](https://refine.dev/docs/core/providers/data-provider/)
- [Authentication](https://refine.dev/docs/core/providers/auth-provider/)

### **Supabase Documentation**

- [Getting Started](https://supabase.com/docs/guides/getting-started)
- [Authentication](https://supabase.com/docs/guides/auth)
- [Database](https://supabase.com/docs/guides/database)

### **Related Documentation**

- [Root README](../../README.md) - Complete project overview
- [Environment Variables](../../README.md#environment-variables) - All environment variables
- [API Endpoints](../../README.md#api-endpoints) - Complete API reference
- [Usage Examples](../../README.md#usage-examples) - Code examples for all clients

---

**🎯 This is the recommended deployment option for most users!**
