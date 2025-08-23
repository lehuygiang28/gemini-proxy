# Gemini Proxy CLI

A command-line interface tool for managing Gemini Proxy API keys and proxy keys. This CLI provides quick and easy management of your Gemini Proxy infrastructure.

## Installation

```bash
npm install -g @lehuygiang28/gemini-proxy-cli
```

Or using yarn:

```bash
yarn global add @lehuygiang28/gemini-proxy-cli
```

Or using pnpm:

```bash
pnpm install -g @lehuygiang28/gemini-proxy-cli
```

## Setup

The CLI supports multiple ways to configure your Supabase connection:

### Option 1: Interactive Setup (Recommended)

```bash
gproxy config setup
```

This will guide you through the setup process and save your configuration.

### Option 2: Environment Variables

Create a `.env` file in your project directory:

```bash
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Option 3: Manual Configuration

```bash
gproxy config update
```

The CLI will automatically detect and use the best available configuration source in this order:

1. `.env` file in current directory
2. Saved configuration in `.gproxy/config.json` (project directory)
3. Interactive prompt (if no saved config exists)

## Usage

The CLI is available as `gproxy` command:

```bash
gproxy --help
```

## Commands

### Configuration Management

#### Setup Configuration

```bash
gproxy config setup
# or
gproxy cfg setup
```

#### Show Current Configuration

```bash
gproxy config show
# or
gproxy config ls
```

#### Update Configuration

```bash
gproxy config update
# or
gproxy config edit
```

#### Test Configuration

```bash
gproxy config test
```

#### Clear Saved Configuration

```bash
gproxy config clear
# or force clear without confirmation
gproxy config clear --force
```

### API Keys Management

#### List API Keys

```bash
gproxy api-keys list
# or
gproxy ak ls
```

#### Create API Key

```bash
gproxy api-keys create
# or with options
gproxy api-keys create --name "My API Key" --key "your-api-key" --provider "gemini"
```

#### Get API Key Details

```bash
gproxy api-keys get <id>
```

#### Update API Key

```bash
gproxy api-keys update <id>
# or with options
gproxy api-keys update <id> --name "New Name" --key "new-key"
```

#### Delete API Key

```bash
gproxy api-keys delete <id>
# or force delete without confirmation
gproxy api-keys delete <id> --force
```

#### Toggle API Key Status

```bash
gproxy api-keys toggle <id>
```

### Proxy Keys Management

#### List Proxy Keys

```bash
gproxy proxy-keys list
# or
gproxy pk ls
```

#### Create Proxy Key

```bash
gproxy proxy-keys create
# or with options
gproxy proxy-keys create --name "My Proxy Key" --key-id "custom-key-id"
```

#### Get Proxy Key Details

```bash
gproxy proxy-keys get <id>
```

#### Update Proxy Key

```bash
gproxy proxy-keys update <id>
# or with options
gproxy proxy-keys update <id> --name "New Name" --key-id "new-key-id"
```

#### Delete Proxy Key

```bash
gproxy proxy-keys delete <id>
# or force delete without confirmation
gproxy proxy-keys delete <id> --force
```

#### Toggle Proxy Key Status

```bash
gproxy proxy-keys toggle <id>
```

#### Generate Key ID

```bash
gproxy proxy-keys generate-id
```

## Examples

### Quick Start

1. **Setup configuration:**

   ```bash
   gproxy config setup
   # Follow the interactive prompts to enter your Supabase credentials
   ```

2. **Test your configuration:**

   ```bash
   gproxy config test
   # Verify that your connection is working
   ```

3. **Create your first API key:**

   ```bash
   gproxy api-keys create
   # Follow the interactive prompts
   ```

4. **Create a proxy key:**

   ```bash
   gproxy proxy-keys create
   # Follow the interactive prompts
   ```

5. **List all your keys:**

   ```bash
   gproxy api-keys list
   gproxy proxy-keys list
   ```

### Advanced Usage

**Create API key with all options:**

```bash
gproxy api-keys create \
  --name "Production Gemini Key" \
  --key "AIzaSyC..." \
  --provider "gemini" \
  --user-id "user-uuid"
```

**Update proxy key name:**

```bash
gproxy proxy-keys update abc123 --name "Updated Proxy Key"
```

**Force delete without confirmation:**

```bash
gproxy api-keys delete abc123 --force
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

- ✅ **Interactive Prompts**: User-friendly interactive prompts for all operations
- ✅ **Colored Output**: Beautiful colored terminal output with status indicators
- ✅ **Loading Spinners**: Visual feedback during operations
- ✅ **Error Handling**: Comprehensive error handling with helpful messages
- ✅ **Confirmation Dialogs**: Safe deletion with confirmation prompts
- ✅ **Auto-generation**: Automatic key ID generation for proxy keys
- ✅ **Type Safety**: Full TypeScript support with database types
- ✅ **Smart Configuration**: Multiple configuration sources with automatic fallback
- ✅ **Persistent Settings**: Save configuration for future use
- ✅ **Environment Support**: Read from .env files or environment variables
- ✅ **Configuration Management**: Setup, update, test, and clear configuration

## Development

### Building from Source

```bash
git clone <repository>
cd packages/cli
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm start -- --help
```

## Database Schema

The CLI works with the following Supabase tables:

- `api_keys`: Stores Gemini API keys with usage statistics
- `proxy_api_keys`: Stores proxy access keys for client authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
