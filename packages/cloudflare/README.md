# Gemini Proxy - Cloudflare Worker

This package contains a Cloudflare Worker for deploying the Gemini Proxy to the Cloudflare edge network. It's a lightweight, highly scalable way to run the proxy, leveraging Cloudflare's global infrastructure.

## Table of Contents

- [Gemini Proxy - Cloudflare Worker](#gemini-proxy---cloudflare-worker)
 	- [Table of Contents](#table-of-contents)
 	- [Features](#features)
 	- [Architecture Overview](#architecture-overview)
  		- [Recommended Setup](#recommended-setup)
 	- [Getting Started](#getting-started)
  		- [Prerequisites](#prerequisites)
  		- [Installation](#installation)
 	- [Configuration](#configuration)
  		- [Environment Variables and Secrets](#environment-variables-and-secrets)
  		- [Cloudflare AI Gateway Integration](#cloudflare-ai-gateway-integration)
 	- [Regional Deployment Considerations](#regional-deployment-considerations)
  		- [Asia-Pacific Deployment Strategy](#asia-pacific-deployment-strategy)
   			- [Cloudflare Routing Issues](#cloudflare-routing-issues)
   			- [Recommended Approach for Asia-Based Users](#recommended-approach-for-asia-based-users)
  		- [Performance Optimization](#performance-optimization)
 	- [Running Locally](#running-locally)
  		- [Testing Your Setup](#testing-your-setup)
 	- [Deployment](#deployment)
  		- [Basic Deployment](#basic-deployment)
  		- [Advanced Deployment Options](#advanced-deployment-options)
  		- [Post-Deployment Verification](#post-deployment-verification)
 	- [Troubleshooting](#troubleshooting)
  		- [Common Issues](#common-issues)
  		- [Debugging](#debugging)
  		- [Getting Help](#getting-help)
 	- [Project Structure](#project-structure)
  		- [Key Files](#key-files)

## Features

- **Edge Deployment:** Run the Gemini Proxy on Cloudflare's global network for low latency
- **Scalability:** Automatically scales to handle high traffic volumes
- **API Key Rotation:** Intelligent distribution across multiple Gemini API keys
- **Load Balancing:** Optimal request distribution for performance
- **Integration with Cloudflare AI Gateway:** Enhanced logging, analytics, and cost management
- **Global Edge Network:** Low-latency access from anywhere in the world

## Architecture Overview

```md
Your Application → Cloudflare Worker (Gemini Proxy) → Google Gemini API
                                    ↓
                        Cloudflare AI Gateway (Optional)
                                    ↓
                        Enhanced Logging & Analytics
```

### Recommended Setup

For optimal performance and observability, we recommend using Cloudflare AI Gateway in front of the Gemini Proxy:

```md
Your Application → Gemini Proxy → Cloudflare AI Gateway → Google Gemini API
```

This setup provides:

- **100,000 logs** in the free tier plan
- **Advanced analytics** and cost calculation
- **Performance monitoring** and insights
- **API key rotation** and load balancing via Gemini Proxy

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and configured

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

3. **Navigate to the Cloudflare package:**

   ```bash
   cd packages/cloudflare
   ```

## Configuration

The Cloudflare Worker is configured using the `wrangler.jsonc` file.

### Environment Variables and Secrets

Sensitive data, such as API keys, should be stored as secrets.

1. **Set Supabase secrets:**

   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Set Gemini API key secret:**

   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

   The value should be a JSON array of your Google Gemini API keys:

   ```json
   ["key1", "key2", "key3"]
   ```

### Cloudflare AI Gateway Integration

For enhanced observability and cost management, integrate with Cloudflare AI Gateway:

1. **Create an AI Gateway in Cloudflare Dashboard:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **AI Gateway**
   - Create a new gateway
   - Add Google AI Studio as a provider

2. **Configure the gateway in your worker:**

   Update your `wrangler.jsonc` file:

   ```json
   {
     "vars": {
       "GOOGLE_GEMINI_API_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio/",
       "GOOGLE_OPENAI_API_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio/v1beta/openai/"
     }
   }
   ```

3. **Benefits of AI Gateway Integration:**
   - **100,000 logs** in free tier
   - **Real-time analytics** and cost tracking
   - **Performance monitoring** and insights
   - **Rate limiting** and caching capabilities

## Regional Deployment Considerations

### Asia-Pacific Deployment Strategy

If you're deploying from Asia, consider these regional factors:

#### Cloudflare Routing Issues

- **Hong Kong (HKG) CDN:** Some ISPs in Asia route requests to Cloudflare's Hong Kong CDN, which may have restrictions on accessing Google Gemini services
- **Alternative Regions:** Consider deploying to regions with better Gemini API support:
  - Singapore (SIN)
  - Tokyo (NRT)
  - Sydney (SYD)

> **📋 Reference:** Check the [official Gemini API available regions](https://ai.google.dev/gemini-api/docs/available-regions) for the most up-to-date list of supported countries and territories.

#### Recommended Approach for Asia-Based Users

1. **Test Your Route:**

   ```bash
   # Check which Cloudflare edge location your requests are routed to
   curl https://www.cloudflare.com/cdn-cgi/trace
   ```

   **Understanding the output:**
   - Look for the `colo=` field in the response
   - If `colo=HKG` (Hong Kong), your requests will be routed through Hong Kong CDN, which may be blocked by Google
   - If `colo=SIN`, `colo=NRT`, `colo=SYD`, or other supported regions, your worker will work well
   - Example output: `fl=354f218 h=www.cloudflare.com ip=98.82.130.157 ts=1755622267.835 visit_scheme=https uag=got colo=IAD sliver=none http=http/1.1 loc=US tls=TLSv1.3 sni=plaintext warp=off gateway=off rbi=off kex=X25519`

2. **Alternative Platforms:** If Cloudflare routing causes issues, consider:
   - Vercel Edge Functions (often better routing for Asia)
   - Regional cloud providers (AWS, GCP, Azure)
   - Local hosting providers with good international connectivity

3. **Hybrid Setup:** Use Cloudflare AI Gateway for logging/analytics while deploying the proxy service to alternative platforms

### Performance Optimization

- **Latency Testing:** Test latency from your target regions before deployment
- **CDN Selection:** Choose CDN providers with optimal routing for your target audience
- **Fallback Strategy:** Implement multiple deployment options for high availability

## Running Locally

To develop and test the worker locally:

```bash
pnpm dev
```

This will start a local server that simulates the Cloudflare environment.

### Testing Your Setup

1. **Test basic functionality:**

   ```bash
   curl -X POST http://localhost:8787/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-proxy-api-key" \
     -d '{
       "model": "gemini-pro",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

2. **Test with Cloudflare AI Gateway:**

   ```bash
   curl -X POST https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio/v1beta/openai/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-gateway-token" \
     -d '{
       "model": "gemini-pro",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

## Deployment

### Basic Deployment

To deploy the worker to your Cloudflare account:

```bash
pnpm deploy
```

### Advanced Deployment Options

1. **Deploy to specific regions:**

   ```bash
   # Deploy to specific regions (if available)
   npx wrangler deploy --compatibility-date 2024-01-01
   ```

2. **Custom domain setup:**

   ```bash
   # Add custom domain to your worker
   npx wrangler domain add your-domain.com
   ```

3. **Environment-specific deployments:**

   ```bash
   # Deploy to staging environment
   npx wrangler deploy --env staging

   # Deploy to production environment
   npx wrangler deploy --env production
   ```

### Post-Deployment Verification

1. **Check worker status:**

   ```bash
   npx wrangler tail
   ```

2. **Monitor performance:**
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages**
   - Select your worker
   - View analytics and logs

3. **Test API endpoints:**

   ```bash
   # Test your deployed worker
   curl -X POST https://your-worker.your-subdomain.workers.dev/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-proxy-api-key" \
     -d '{
       "model": "gemini-pro",
       "messages": [{"role": "user", "content": "Test message"}]
     }'
   ```

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure your worker is configured to handle CORS requests
   - Check that your application is making requests from allowed origins

2. **API Key Issues:**
   - Verify that your Gemini API keys are valid and have sufficient quota
   - Check that the API keys are properly formatted in the secret

3. **Regional Access Issues:**
   - Test from different regions to identify routing problems
   - Consider using alternative deployment platforms for Asia-based users

4. **Performance Issues:**
   - Monitor worker execution time in Cloudflare Dashboard
   - Consider implementing caching strategies
   - Use Cloudflare AI Gateway for better performance monitoring

### Debugging

1. **Enable detailed logging:**

   ```bash
   npx wrangler tail --format pretty
   ```

2. **Check worker logs:**
   - Visit Cloudflare Dashboard
   - Navigate to **Workers & Pages**
   - Select your worker
   - View **Logs** tab

3. **Test locally with real data:**

   ```bash
   # Run with production environment variables
   npx wrangler dev --env production
   ```

### Getting Help

- **Cloudflare Workers Documentation:** [https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)
- **Cloudflare AI Gateway Documentation:** [https://developers.cloudflare.com/ai-gateway/](https://developers.cloudflare.com/ai-gateway/)
- **Gemini API Documentation:** [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- **GitHub Issues:** [https://github.com/lehuygiang28/gemini-proxy/issues](https://github.com/lehuygiang28/gemini-proxy/issues)

## Project Structure

```
packages/cloudflare/
├── src/
│   └── index.ts          # Main worker entry point
├── wrangler.jsonc        # Worker configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Key Files

- `src/index.ts`: The entry point for the Cloudflare Worker
- `wrangler.jsonc`: Configuration file for the worker deployment
- `package.json`: Project dependencies and build scripts
- `tsconfig.json`: TypeScript compiler configuration
