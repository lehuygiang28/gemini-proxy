# Environment Configuration Guide

This guide explains how to configure the Gemini Proxy CLI using environment variables.

## Quick Start

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:****

   ```bash
   # Required
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Optional
   GEMINI_API_KEY=your-gemini-api-keys
   PROXY_API_KEY=your-proxy-api-keys
   ```

3. Test your configuration:

   ```bash
   gproxy config test
   ```

## Environment Variables

### Required Variables

#### `SUPABASE_URL`

- **Description**: Your Supabase project URL
- **Format**: `https://your-project-id.supabase.co`
- **Where to find**: Supabase Dashboard > Settings > API > Project URL
- **Example**: `https://abc123def456.supabase.co`

#### `SUPABASE_SERVICE_ROLE_KEY`

- **Description**: Your Supabase service role key for database access
- **Format**: JWT token starting with `eyJ...`
- **Where to find**:
  - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/your-project-id/settings/api-keys/new)
  - Navigate to **Project Settings > API Keys > API Keys** (use new API keys, not legacy)
  - Copy the `service_role` key (not the `anon` key)
- **Security**: ⚠️ **Keep this secret!** Never commit to version control
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Optional Variables

#### `GEMINI_API_KEY`

- **Description**: Gemini API keys for sync operations
- **Usage**: Used with `gproxy api-keys sync` command
- **Formats**: Supports two formats (see below)

#### `PROXY_API_KEY`

- **Description**: Proxy API key IDs for sync operations
- **Usage**: Used with `gproxy proxy-keys sync` command
- **Formats**: Supports two formats (see below)

#### `DEBUG`

- **Description**: Enable debug logging
- **Values**: `true` or `false`
- **Default**: `false`

#### `VERBOSE`

- **Description**: Enable verbose logging
- **Values**: `true` or `false`
- **Default**: `false`

## API Key Formats

The CLI supports two formats for API keys: simple comma-separated and advanced JSON array.

### Simple Format (Comma-separated)

**Gemini API Keys:**

```bash
GEMINI_API_KEY=GEMINI_API_KEY_REDACTED,GEMINI_API_KEY_REDACTED
```

**Proxy API Keys:**

```bash
PROXY_API_KEY=gproxy_abc123def4567890,gproxy_ghi789jkl0123456
```

**Pros:**

- Simple and easy to read
- Good for basic use cases
- Easy to copy/paste

**Cons:**

- No custom names (uses auto-generated names like "API Key 1", "API Key 2")
- Limited organization

### Advanced Format (JSON Array)

**Gemini API Keys:**

```bash
GEMINI_API_KEY=[{"name":"Production Key","key":"GEMINI_API_KEY_REDACTED"},{"name":"Development Key","key":"GEMINI_API_KEY_REDACTED"}]
```

**Proxy API Keys:**

```bash
PROXY_API_KEY=[{"name":"Client A","key":"gproxy_abc123def4567890"},{"name":"Client B","key":"gproxy_ghi789jkl0123456"}]
```

**Pros:**

- Custom names for better organization
- More descriptive and maintainable
- Better for complex setups

**Cons:**

- More complex to write
- Requires proper JSON formatting

## Configuration Priority

The CLI uses the following priority order for configuration:

1. **`.env` file** in current directory (highest priority)
2. **Saved configuration** in `.gproxy/config.json`
3. **Interactive prompt** (lowest priority)

**Important**: The `.env` file must be in the same directory where you run the CLI commands. This is a **scoped configuration**, not a global one.

## Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
.env
.gproxy/
```

### 2. Use Different Keys for Different Environments

```bash
# Development
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=dev-service-role-key

# Production
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
```

### 3. Rotate Keys Regularly

- Change your service role key periodically
- Monitor for unauthorized access
- Use environment-specific keys

### 4. Validate Configuration

```bash
# Test your configuration
gproxy config test

# Show current configuration (masks sensitive data)
gproxy config show
```

## Sync Operations

### Syncing API Keys

```bash
# Preview what would be synced
gproxy api-keys sync --dry-run

# Actually sync from environment
gproxy api-keys sync --force
```

### Syncing Proxy Keys

```bash
# Preview what would be synced
gproxy proxy-keys sync --dry-run

# Actually sync from environment
gproxy proxy-keys sync --force
```

## Troubleshooting

### Common Issues

#### 1. "Configuration not found"

```bash
# Solution: Run setup
gproxy config setup
```

#### 2. "Database connection failed"

```bash
# Check your Supabase URL and service role key
gproxy config test

# Verify in Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/your-project-id/settings/api-keys/new
# Navigate to: Project Settings > API Keys > API Keys (use new API keys, not legacy)
# Copy the service_role key (not the anon key)
```

#### 3. "Invalid API key format"

```bash
# For simple format, use comma-separated values
GEMINI_API_KEY=key1,key2,key3

# For JSON format, ensure valid JSON
GEMINI_API_KEY=[{"name":"Key 1","key":"value1"}]
```

#### 4. "Permission denied"

```bash
# Check if service role key has correct permissions
# Ensure it's the service_role key, not anon key
# Verify in Supabase Dashboard: https://supabase.com/dashboard/project/your-project-id/settings/api-keys/new
# Navigate to: Project Settings > API Keys > API Keys (use new API keys, not legacy)
```

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
# Set in .env
DEBUG=true

# Or use command line
gproxy --debug api-keys list
```

## Examples

### Basic Setup

```bash
# .env
SUPABASE_URL=https://my-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### With API Keys

```bash
# .env
SUPABASE_URL=https://my-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Simple format (currently only Gemini API keys are supported)
GEMINI_API_KEY=GEMINI_API_KEY_REDACTED,GEMINI_API_KEY_REDACTED
PROXY_API_KEY=gproxy_abc123def4567890,gproxy_ghi789jkl0123456

# Or JSON format (currently only Gemini API keys are supported)
GEMINI_API_KEY=[{"name":"Production","key":"GEMINI_API_KEY_REDACTED"},{"name":"Development","key":"GEMINI_API_KEY_REDACTED"}]
PROXY_API_KEY=[{"name":"Client A","key":"gproxy_abc123def4567890"},{"name":"Client B","key":"gproxy_ghi789jkl0123456"}]
```

### Development vs Production

```bash
# .env.development
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=dev-service-role-key
DEBUG=true

# .env.production
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
DEBUG=false
```

## Related Commands

- `gproxy config setup` - Interactive configuration setup
- `gproxy config show` - Display current configuration
- `gproxy config test` - Test database connection
- `gproxy config update` - Update saved configuration
- `gproxy config clear` - Clear saved configuration
- `gproxy api-keys sync` - Sync API keys from environment
- `gproxy proxy-keys sync` - Sync proxy keys from environment
