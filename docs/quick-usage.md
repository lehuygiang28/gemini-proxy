# ⚡ Quick Usage (CLI)

After creating your Supabase project and deploying any supported service (Next.js on Vercel, Cloudflare Worker, Appwrite Function, Standalone API, etc.), seed your proxy keys and Google Gemini API keys using the CLI.

## 1. Create a .env file

Create a `.env` with the following content. Replace values with yours. Ensure JSON arrays have NO trailing commas.

```bash
SUPABASE_PROJECT_ID="<your-project-id>"
SUPABASE_URL="<your-supabase-url>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
SUPABASE_DB_PASSWORD="<your-db-password>"

PROXY_API_KEY='[
    {"name":"proxy_key_1","key":"gproxy_test_giang1"},
    {"name":"proxy_key_2","key":"gproxy_test_giang2"}
]'

GEMINI_API_KEY='[
    {"name":"Google_key_1","key":"AIzaSyDM3fM6tfjxxxxxxxxxxxxxxxxxxxxxxxx"},
    {"name":"Google_key_2","key":"AIzaSyDM3fM6tfjxxxxxxxxxxxxxxxxxxxxxxxy"}
]'
```

Notes:

- Keep `SUPABASE_SERVICE_ROLE_KEY` secret.
- No comma after the last element in each JSON array.

## 2. Sync proxy keys to the database

```bash
npx -y @lehuygiang28/gemini-proxy-cli pk sync
```

## 3. Sync Google Gemini API keys to the database

```bash
npx -y @lehuygiang28/gemini-proxy-cli ak sync
```

Once synced, use your proxy key(s) to call Gemini via the proxy. Your Google API keys will be managed and load-balanced behind the scenes.

- Schema reference: [schema.sql](https://github.com/lehuygiang28/gemini-proxy/blob/main/packages/database/sql/schema.sql)
