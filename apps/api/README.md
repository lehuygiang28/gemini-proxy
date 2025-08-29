# Gemini Proxy - Standalone API Server

This is a standalone Node.js API server for Gemini Proxy, built with Hono.js. It provides a lightweight, customizable proxy to Google's Gemini API that can be deployed anywhere.

## 🎯 Why Choose This Option?

- ✅ **Lightweight:** Minimal resource usage
- ✅ **Customizable:** Full control over deployment
- ✅ **Scalable:** Can be deployed anywhere
- ✅ **Docker Ready:** Easy containerization
- ✅ **Hono.js:** Fast, modern web framework

## 📋 Table of Contents

<details>
<summary><strong>🚀 Quick Start</strong></summary>

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#️-configuration)

</details>

<details>
<summary><strong>🌐 Deployment</strong></summary>

- [Docker Deployment](#docker-deployment)
- [Platform Deployment](#platform-deployment)
- [Environment Setup](#environment-setup)

</details>

<details>
<summary><strong>💻 Usage</strong></summary>

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
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values
```

### **3. Start Development Server**

```bash
cd apps/api
pnpm dev
```

### **4. Test the API**

```bash
curl http://localhost:9090/health
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

3. **Navigate to the API app:**

   ```bash
   cd apps/api
   ```

## ⚙️ Configuration

### **Environment Variables**

Create environment files for different environments:

```bash
# Development
cp apps/api/.env.example apps/api/.env

# Production
cp apps/api/.env.example apps/api/.env.production
```

### **Required Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### **Optional Variables**

For all optional environment variables, see the [root README](../../README.md#environment-variables).

## 🌐 Deployment

### **Docker Deployment**

#### **1. Build the Docker Image**

```bash
# From the apps/api directory
docker build -t gemini-proxy-api .
```

#### **2. Run the Container**

```bash
docker run -p 9091:9091 \
  -e NODE_ENV=production \
  -e API_PORT=9091 \
  -e SUPABASE_URL=your-supabase-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  gemini-proxy-api
```

#### **3. Docker Compose (Recommended)**

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  gemini-proxy-api:
    build: .
    ports:
      - "9091:9091"
    environment:
      - NODE_ENV=production
      - API_PORT=9091
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

### **Platform Deployment**

#### **Railway**

- Connect your GitHub repository
- Set root directory to `apps/api`
- Configure environment variables
- Deploy automatically

#### **Render**

- Deploy as a web service
- Set build command: `cd apps/api && pnpm install && pnpm build`
- Set start command: `cd apps/api && pnpm start`

#### **Heroku**

```bash
# Create Heroku app
heroku create your-gemini-proxy-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your-supabase-url
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Deploy
git push heroku main
```

#### **DigitalOcean App Platform**

- Connect your GitHub repository
- Set root directory to `apps/api`
- Configure environment variables
- Deploy automatically

#### **AWS ECS**

- Create ECS cluster and service
- Use the provided Dockerfile
- Configure environment variables
- Set up load balancer

### **Environment Setup**

#### **Development**

```bash
# Start development server
pnpm dev

# The API will be available at:
# http://localhost:9090
```

#### **Production**

```bash
# Build the application
pnpm build

# Start production server
pnpm start

# The API will be available at:
# http://localhost:9091
```

## 💻 Usage

### **API Integration**

The standalone API server provides the same endpoints as other deployments:

- **Health Check:** `GET /health`
- **Gemini API:** All Gemini API endpoints under `/`
- **OpenAI-Compatible:** All OpenAI-compatible endpoints under `/openai/v1`

For detailed API endpoints and usage examples, see the [root README](../../README.md#api-endpoints) and [Usage Examples](../../README.md#usage-examples).

### **Client Configuration Examples**

#### **Google Generative AI SDK**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'http://localhost:9090',
    },
});
```

#### **OpenAI-Compatible Clients**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'your_proxy_api_key',
    baseURL: 'http://localhost:9090/openai/v1',
});
```

#### **Production Configuration**

```typescript
import { GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'your_proxy_api_key',
    httpOptions: {
        baseUrl: 'https://your-api-domain.com',
    },
});
```

## 🛠️ Development

### **Local Development**

```bash
# Start development server
pnpm dev

# Test health endpoint
curl http://localhost:9090/health

# Test proxy endpoint
curl -X POST http://localhost:9090/v1beta/models/gemini-2.0-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-proxy-api-key" \
  -d '{
    "contents": [{"parts": [{"text": "Hello, world!"}]}]
  }'
```

### **Development Scripts**

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Run linting
pnpm lint
```

### **File Structure**

```md
apps/api/
├── src/
│   └── index.ts          # Main server entry point
├── dist/                 # Built application (generated)
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
├── Dockerfile           # Docker configuration
└── README.md           # This file
```

## 🔧 Project Structure

### **Key Files**

- `src/index.ts` - The entry point for the API server
- `.env.example` - Template for environment variables
- `package.json` - Project dependencies and build scripts
- `tsup.config.ts` - Build configuration for the application
- `Dockerfile` - Docker configuration for containerization

### **API Routes**

- `/health` - Health check endpoint
- `/*` - All Gemini API endpoints
- `/openai/v1/*` - OpenAI-compatible endpoints

## 🐛 Troubleshooting

### **Common Issues**

1. **Port Already in Use:**

   ```bash
   # Change the API_PORT environment variable
   # Or kill the process using the port
   lsof -ti:9090 | xargs kill -9
   ```

2. **Environment Variables Not Set:**
   - Check that all required environment variables are set
   - Verify the `.env` file is in the correct location

3. **Database Connection Issues:**
   - Verify your Supabase URL and service role key
   - Check your network connection to Supabase

4. **API Key Issues:**
   - Ensure your Gemini API keys are valid and have sufficient quota
   - Check that the API keys are properly formatted in the environment variable

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
   node -e "console.log(process.env.SUPABASE_URL)"
   ```

4. **Docker debugging:**

   ```bash
   # Check container logs
   docker logs <container-id>
   
   # Enter container shell
   docker exec -it <container-id> /bin/sh
   ```

## 📚 References

### **Hono.js Documentation**

- [Getting Started](https://hono.dev/getting-started/nodejs)
- [API Reference](https://hono.dev/api/index)
- [Middleware](https://hono.dev/middleware/index)

### **Docker Documentation**

- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Hub](https://hub.docker.com/)

### **Platform Documentation**

- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Heroku Docs](https://devcenter.heroku.com/)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)

### **Related Documentation**

- [Root README](../../README.md) - Complete project overview
- [Environment Variables](../../README.md#environment-variables) - All environment variables
- [API Endpoints](../../README.md#api-endpoints) - Complete API reference
- [Usage Examples](../../README.md#usage-examples) - Code examples for all clients

---

**⚡ Perfect for API-only deployments and custom integrations!**
