# Gemini Proxy CLI Usage Examples

## Setup

The CLI supports multiple configuration methods:

### Option 1: Interactive Setup (Recommended)

```bash
gproxy config setup
```

### Option 2: Environment Variables

Create a `.env` file in your project directory:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Option 3: Test Configuration

```bash
gproxy config test
```

## API Keys Management

### List all API keys

```bash
gproxy api-keys list
# or
gproxy ak ls
```

### Create a new API key

```bash
# Interactive mode
gproxy api-keys create

# With options
gproxy api-keys create \
  --name "Production Gemini Key" \
  --key "AIzaSyC..." \
  --provider "gemini" \
  --user-id "user-uuid"
```

### Get API key details

```bash
gproxy api-keys get abc123-def456-ghi789
```

### Update an API key

```bash
# Interactive mode
gproxy api-keys update abc123-def456-ghi789

# With options
gproxy api-keys update abc123-def456-ghi789 \
  --name "Updated Key Name" \
  --key "new-api-key-value"
```

### Delete an API key

```bash
# With confirmation
gproxy api-keys delete abc123-def456-ghi789

# Force delete without confirmation
gproxy api-keys delete abc123-def456-ghi789 --force
```

### Toggle API key status

```bash
gproxy api-keys toggle abc123-def456-ghi789
```

## Proxy Keys Management

### List all proxy keys

```bash
gproxy proxy-keys list
# or
gproxy pk ls
```

### Create a new proxy key

```bash
# Interactive mode
gproxy proxy-keys create

# With options
gproxy proxy-keys create \
  --name "Client Proxy Key" \
  --key-id "custom-key-id" \
  --user-id "user-uuid"
```

### Get proxy key details

```bash
gproxy proxy-keys get abc123-def456-ghi789
```

### Update a proxy key

```bash
# Interactive mode
gproxy proxy-keys update abc123-def456-ghi789

# With options
gproxy proxy-keys update abc123-def456-ghi789 \
  --name "Updated Proxy Key" \
  --key-id "new-key-id"
```

### Delete a proxy key

```bash
# With confirmation
gproxy proxy-keys delete abc123-def456-ghi789

# Force delete without confirmation
gproxy proxy-keys delete abc123-def456-ghi789 --force
```

### Toggle proxy key status

```bash
gproxy proxy-keys toggle abc123-def456-ghi789
```

### Generate a new key ID

```bash
gproxy proxy-keys generate-id
```

## Quick Start Workflow

1. **Setup configuration:**

   ```bash
   gproxy config setup
   # Follow the prompts to enter your Supabase credentials
   ```

2. **Test your configuration:**

   ```bash
   gproxy config test
   # Verify that your connection is working
   ```

3. **Create your first API key:**

   ```bash
   gproxy api-keys create
   # Follow the prompts to enter name, API key value, etc.
   ```

4. **Create a proxy key for client access:**

   ```bash
   gproxy proxy-keys create
   # Follow the prompts to enter name and optionally custom key ID
   ```

5. **List your keys:**

   ```bash
   gproxy api-keys list
   gproxy proxy-keys list
   ```

6. **Use the proxy key ID in your API requests:**

   ```bash
   # The CLI will show you the key ID to use
   # Example: gproxy_abc123def4567890
   ```

## Configuration

The CLI supports multiple configuration sources with automatic fallback:

### Configuration Sources (in order of priority)

1. **`.env` file** - Environment variables in current directory
2. **Saved configuration** - Persistent settings in `.gproxy/config.json` (project directory)
3. **Interactive prompt** - One-time setup when no saved config exists

### Environment Variables (for .env file)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Yes |

### Configuration Files

- **Saved config**: `.gproxy/config.json` (automatically created in project directory)
- **Environment file**: `.env` (optional, in project directory)

## Features

- **Interactive Prompts**: All commands support interactive mode for easy input
- **Colored Output**: Beautiful terminal output with status indicators
- **Loading Spinners**: Visual feedback during operations
- **Error Handling**: Comprehensive error messages
- **Confirmation Dialogs**: Safe deletion with confirmation
- **Auto-generation**: Automatic key ID generation for proxy keys
- **Type Safety**: Full TypeScript support with database types
- **Smart Configuration**: Multiple configuration sources with automatic fallback
- **Persistent Settings**: Save configuration for future use
- **Environment Support**: Read from .env files or environment variables
- **Configuration Management**: Setup, update, test, and clear configuration
