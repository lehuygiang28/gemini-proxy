# Gemini Proxy

**Gemini Proxy** is a powerful, open-source toolkit for managing and proxying requests to Google's Gemini API. It provides a robust set of features for developers and organizations to monitor, control, and scale their usage of the Gemini API.

## Table of Contents

- [Gemini Proxy](#gemini-proxy)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Projects](#projects)
    - [Applications](#applications)
    - [Packages](#packages)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Usage Scenarios](#usage-scenarios)
  - [Deployment](#deployment)
  - [Cloudflare AI Gateway Integration](#cloudflare-ai-gateway-integration)
    - [Benefits of Cloudflare AI Gateway Integration](#benefits-of-cloudflare-ai-gateway-integration)
    - [Recommended Architecture](#recommended-architecture)
  - [Regional Deployment Considerations](#regional-deployment-considerations)
    - [Asia-Pacific Deployment Strategy](#asia-pacific-deployment-strategy)
      - [Cloudflare Deployment Considerations](#cloudflare-deployment-considerations)
      - [Recommended Approach for Asia-Based Users](#recommended-approach-for-asia-based-users)
    - [Performance Optimization](#performance-optimization)
  - [Future Plans](#future-plans)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **API Key Management:** Securely store and manage your Google Gemini API keys.
- **Proxy Service:** A robust proxy service that can be deployed to various platforms.
- **Request Logging:** Detailed logging of all requests and responses.
- **Analytics Dashboard:** A web-based interface to monitor usage and performance.
- **Platform Agnostic:** The core logic is platform-agnostic and can be deployed anywhere.
- **Multiple Deployment Options:** Deploy as a standalone Node.js server, a Cloudflare Worker, or a Vercel Edge Function.
- **API Key Rotation & Load Balancing:** Intelligent distribution of requests across multiple API keys for optimal performance and cost management.

## Architecture

The Gemini Proxy is a monorepo built with pnpm workspaces. It's composed of several applications and packages that work together to provide a complete solution.

- **`apps/web`:** A Next.js web application that provides the user interface for managing API keys and viewing analytics.
- **`apps/api`:** A standalone Node.js API server built with Hono.js.
- **`packages/core`:** The core business logic for the proxy service.
- **`packages/cloudflare`:** A Cloudflare Worker for deploying the proxy to the edge.
- **`packages/vercel`:** A Vercel Edge Function for serverless deployment.
- **`packages/database`:** The database schema and management scripts for Supabase.

## Projects

### Applications

- **`apps/api`:** [README](./apps/api/README.md) - A standalone Node.js API server.
- **`apps/web`:** [README](./apps/web/README.md) - The web interface for managing the proxy.

### Packages

- **`packages/cloudflare`:** [README](./packages/cloudflare/README.md) - A Cloudflare Worker for edge deployment.
- **`packages/core`:** [README](./packages/core/README.md) - The core business logic.
- **`packages/database`:** [README](./packages/database/README.md) - The database schema and scripts.
- **`packages/vercel`:** [README](./packages/vercel/README.md) - A Vercel Edge Function for serverless deployment.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm
- A [Supabase](https://supabase.com/) account

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/lehuygiang28/gemini-proxy.git
   cd gemini-proxy
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Each application and package has its own set of environment variables. Please refer to the individual `README.md` files for detailed instructions.

## Usage Scenarios

There are several ways to use Gemini Proxy, depending on your needs:

- **Local Management with Deployed Proxy:** This is the most common usage. Deploy the proxy service to your preferred platform (e.g., Cloudflare, Supabase) and run the `apps/web` application locally to manage your API keys and monitor usage.
- **All-in-One Fullstack Deployment:** Deploy the `apps/web` application to any platform that supports Next.js (e.g., Vercel, Netlify, or a standalone Node.js server). The Next.js application includes the proxy as an API route, so you don't need to deploy a separate proxy service.
- **High-Availability Deployment:** For maximum reliability, deploy the `apps/web` application and one or more proxy services to different platforms. This ensures that your service remains available even if one platform is down or blocked.

## Deployment

Gemini Proxy is designed to be deployed to a variety of platforms. You can choose the deployment option that best suits your needs:

- **Standalone Server:** Deploy the `apps/api` application to any Node.js hosting provider.
- **Vercel:** Deploy the `apps/web` application to Vercel, which will also deploy the `packages/vercel` Edge Function.
- **Cloudflare:** Deploy the `packages/cloudflare` Worker to the Cloudflare edge network.

Please refer to the `README.md` file in each project for detailed deployment instructions.

## Cloudflare AI Gateway Integration

For enhanced observability, logging, and cost calculation, we recommend integrating with **Cloudflare AI Gateway** ([https://developers.cloudflare.com/ai-gateway/](https://developers.cloudflare.com/ai-gateway/)). This approach provides several benefits:

### Benefits of Cloudflare AI Gateway Integration

- **Comprehensive Logging:** Access to 100,000 logs total in the free tier plan
- **Advanced Analytics:** Detailed request/response data analysis
- **Cost Calculation:** Built-in pricing and usage tracking
- **Performance Monitoring:** Real-time performance metrics and insights
- **Global Edge Network:** Low-latency access from anywhere in the world

### Recommended Architecture

```md
Your Application → Gemini Proxy → Cloudflare AI Gateway → Google Gemini API
```

This setup allows Gemini Proxy to focus on its core strengths:

- **API Key Rotation:** Intelligent distribution across multiple API keys
- **Load Balancing:** Optimal request distribution for performance
- **Custom Logic:** Application-specific request processing and validation

While Cloudflare AI Gateway handles:

- **Logging & Analytics:** Comprehensive request/response tracking
- **Cost Management:** Detailed usage and pricing analytics
- **Performance Optimization:** Global edge network optimization

## Regional Deployment Considerations

### Asia-Pacific Deployment Strategy

If you're deploying from Asia, consider the following regional factors:

#### Cloudflare Deployment Considerations

- **Hong Kong Routing Issues:** Some ISPs in Asia route requests to Cloudflare's Hong Kong (HKG) CDN, which may have restrictions on accessing Google Gemini services
- **Alternative Regions:** Consider deploying to regions that have better Gemini API support:
  - Singapore (SIN)
  - Tokyo (NRT)
  - Sydney (SYD)
  - Other regions with confirmed Gemini API access

> **📋 Reference:** Check the [official Gemini API available regions](https://ai.google.dev/gemini-api/docs/available-regions) for the most up-to-date list of supported countries and territories.

#### Recommended Approach for Asia-Based Users

1. **Test Your Route:** Verify which Cloudflare edge location your requests are routed to

   ```bash
   # Check which Cloudflare edge location your requests are routed to
   curl https://www.cloudflare.com/cdn-cgi/trace
   ```

   **Understanding the output:**
   - Look for the `colo=` field in the response
   - If `colo=HKG` (Hong Kong), your requests will be routed through Hong Kong CDN, which may be blocked by Google
   - If `colo=SIN`, `colo=NRT`, `colo=SYD`, or other supported regions, your worker will work well
   - Example output:

      ```text
         fl=583f188
         h=www.cloudflare.com
         ip=116.96.11.111
         ts=1755622101.253
         visit_scheme=https
         colo=HKG # This is the Cloudflare edge location
         sliver=none
         http=http/2
         loc=VN
         tls=TLSv1.3
         sni=plaintext
         warp=off
         gateway=off
         rbi=off
         kex=X25519MLKEM768
       ```

2. **Alternative Platforms:** If Cloudflare routing causes issues, consider:
   - Vercel Edge Functions (often better routing for Asia)
   - Regional cloud providers (AWS, GCP, Azure)
   - Local hosting providers with good international connectivity
3. **Hybrid Setup:** Use Cloudflare AI Gateway for logging/analytics while deploying the proxy service to alternative platforms

### Performance Optimization

- **Latency Testing:** Test latency from your target regions before deployment
- **CDN Selection:** Choose CDN providers with optimal routing for your target audience
- **Fallback Strategy:** Implement multiple deployment options for high availability

## Future Plans

We are planning to add support for more deployment platforms for the proxy service:

- Supabase Edge Functions
- Netlify Edge Functions
- Fastly Compute@Edge
- Azure Functions
- Google Cloud Run

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.
