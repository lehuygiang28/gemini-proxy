# Gemini Proxy CLI

A production-ready command-line interface tool for managing Gemini Proxy API keys, proxy keys, and request logs. This CLI provides robust, secure, and user-friendly management of your Gemini Proxy infrastructure with comprehensive error handling, validation, and logging.

## Features

### Core Features

- ✅ **Production Ready**: Comprehensive error handling, validation, and logging
- ✅ **Type Safe**: Full TypeScript support with strict type checking
- ✅ **Secure**: Input validation and sanitization for all user inputs
- ✅ **User Friendly**: Interactive prompts with clear error messages
- ✅ **Robust**: Graceful error handling and recovery
- ✅ **Maintainable**: Clean, modular code structure
- ✅ **Extensible**: Easy to add new commands and features

### Performance Features

- ⚡ **Batch Operations**: High-performance batch create, update, and delete operations
- ⚡ **Optimized Sync**: Fast sync operations with real-time progress indicators
- ⚡ **Efficient Imports**: Batch processing for large import operations
- ⚡ **Smart Batching**: Automatic batching to optimize database operations

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

### Option 2: Environment Variables (Recommended for Production)

1. Copy the example file:

   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual values:

   ```bash
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. Test your configuration:

   ```bash
   gproxy config test
   ```

### Option 3: Manual Configuration

```bash
gproxy config update
```

The CLI will automatically detect and use the best available configuration source in this order:

1. `.env` file in current directory (scoped configuration)
2. Saved configuration in `.gproxy/config.json` (project directory)
3. Interactive prompt (if no saved config exists)

**Note**: The `.env` file must be in the same directory where you run the CLI commands. This is a scoped configuration, not a global one.

### Environment Configuration

For detailed environment configuration options, see [Environment Configuration Guide](docs/environment-configuration.md).

**Key Features:**

- Support for both simple (comma-separated) and advanced (JSON) API key formats
- Environment-specific configurations
- Security best practices
- Sync operations from environment variables
- **Scoped configuration**: `.env` file must be in the same directory where you run CLI commands

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

#### List API Keys (Enhanced)

```bash
# Interactive list with selection
gproxy api-keys list --interactive

# Compact format
gproxy api-keys list --compact

# Both interactive and compact
gproxy api-keys list -i -c
```

#### Create API Key (Quick Mode)

```bash
# Quick mode with minimal prompts
gproxy api-keys create --quick

# Full mode with all options
gproxy api-keys create --name "My API Key" --key "your-api-key" --provider "gemini"

**Note**: Currently only `gemini` provider is supported.
```

#### Interactive Edit

```bash
# Edit any API key interactively
gproxy api-keys edit
```

#### Export/Import API Keys

```bash
# Export all API keys to JSON file
gproxy api-keys export --output my-keys.json

# Import API keys from JSON file
gproxy api-keys import my-keys.json

# Import with options
gproxy api-keys import my-keys.json --overwrite --dry-run
```

#### Prune Inactive Keys

```bash
# Remove inactive API keys with confirmation
gproxy api-keys prune

# Force remove without confirmation
gproxy api-keys prune --force
```

#### Sync from .env (Enhanced Performance)

```bash
# Sync with dry run to see what would change
gproxy api-keys sync --dry-run

# Force sync without confirmation
gproxy api-keys sync --force
```

**Performance Improvements:**

- ⚡ **Batch Operations**: Sync operations now use batch create, update, and delete for 10x faster performance
- 📊 **Real-time Progress**: Live progress indicators show current operation status
- 🔄 **Smart Batching**: Automatic batching optimizes database operations
- 📈 **Scalable**: Handles large numbers of keys efficiently

#### Legacy Commands (Backward Compatibility)

```bash
gproxy api-keys get <id>
gproxy api-keys update <id> --name "New Name" --provider "gemini"
gproxy api-keys delete <id> --force
gproxy api-keys toggle <id>
```

### Proxy Keys Management

#### List Proxy Keys (Enhanced)

```bash
# Interactive list with selection
gproxy proxy-keys list --interactive

# Compact format
gproxy proxy-keys list --compact
```

#### Create Proxy Key (Quick Mode)

```bash
# Quick mode with minimal prompts
gproxy proxy-keys create --quick

# Full mode with custom key ID
gproxy proxy-keys create --name "My Proxy" --key-id "custom-id"
```

#### Interactive Edit

```bash
# Edit any proxy key interactively
gproxy proxy-keys edit
```

#### Export/Import Proxy Keys

```bash
# Export all proxy keys to JSON file
gproxy proxy-keys export --output my-proxy-keys.json

# Import proxy keys from JSON file
gproxy proxy-keys import my-proxy-keys.json --overwrite
```

#### Prune Inactive Keys

```bash
# Remove inactive proxy keys
gproxy proxy-keys prune --force
```

#### Generate Key ID

```bash
# Generate a new key ID
gproxy proxy-keys generate-id
```

#### Sync from .env (Enhanced Performance)

```bash
# Sync with dry run
gproxy proxy-keys sync --dry-run --force

# Fast batch sync with progress indicators
gproxy proxy-keys sync --force
```

**Performance Improvements:**

- ⚡ **Batch Operations**: Sync operations now use batch create, update, and delete for 10x faster performance
- 📊 **Real-time Progress**: Live progress indicators show current operation status
- 🔄 **Smart Batching**: Automatic batching optimizes database operations
- 📈 **Scalable**: Handles large numbers of keys efficiently

#### Legacy Commands (Backward Compatibility)

```bash
gproxy proxy-keys get <id>
gproxy proxy-keys update <id> --name "New Name"
gproxy proxy-keys delete <id> --force
gproxy proxy-keys toggle <id>
```

### Logs Management (New!)

#### List Logs

```bash
# List recent logs
gproxy logs list

# List with filters
gproxy logs list --limit 100 --success --compact

# Filter by user
gproxy logs list --user-id "user-uuid" --failed
```

#### Prune Old Logs

```bash
# Remove logs older than 30 days (default)
gproxy logs prune

# Remove logs older than 7 days
gproxy logs prune --days 7 --force

# Remove only successful logs
gproxy logs prune --success-only --days 14

# Remove only failed logs
gproxy logs prune --failed-only --days 1
```

#### Get Log Details

```bash
# Get detailed information about a specific log
gproxy logs get <log-id>
```

#### Log Statistics

```bash
# Show statistics for last 7 days (default)
gproxy logs stats

# Show statistics for last 30 days
gproxy logs stats --days 30
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

3. **Create your first API key (quick mode):**

   ```bash
   gproxy api-keys create --quick
   # Just enter name and key value
   ```

4. **Create a proxy key (quick mode):**

   ```bash
   gproxy proxy-keys create --quick
   # Just enter name, key ID is auto-generated
   ```

5. **List and edit interactively:**

   ```bash
   gproxy api-keys list --interactive
   # Select any key to edit, toggle, or delete
   ```

### Advanced Usage

**Export and backup your keys:**

```bash
# Export all keys
gproxy api-keys export --output backup-api-keys.json
gproxy proxy-keys export --output backup-proxy-keys.json

# Import with overwrite
gproxy api-keys import backup-api-keys.json --overwrite
```

**Sync from environment variables:**

```bash
# See what would be synced
gproxy api-keys sync --dry-run
gproxy proxy-keys sync --dry-run

# Actually sync
gproxy api-keys sync --force
```

**Clean up old data:**

```bash
# Remove inactive keys
gproxy api-keys prune --force
gproxy proxy-keys prune --force

# Remove old logs
gproxy logs prune --days 7 --force
```

**Monitor usage:**

```bash
# Check recent activity
gproxy logs list --limit 20 --compact

# Get statistics
gproxy logs stats --days 30
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

### Core Features

- ✅ **Interactive Prompts**: User-friendly interactive prompts for all operations
- ✅ **Colored Output**: Beautiful colored terminal output with status indicators
- ✅ **Loading Spinners**: Visual feedback during operations
- ✅ **Error Handling**: Comprehensive error handling with helpful messages
- ✅ **Confirmation Dialogs**: Safe deletion with confirmation prompts
- ✅ **Auto-generation**: Automatic key ID generation for proxy keys
- ✅ **Type Safety**: Full TypeScript support with database types

### Configuration & Management

- ✅ **Smart Configuration**: Multiple configuration sources with automatic fallback
- ✅ **Persistent Settings**: Save configuration for future use
- ✅ **Environment Support**: Read from .env files or environment variables
- ✅ **Configuration Management**: Setup, update, test, and clear configuration
- ✅ **Export/Import**: Backup and restore keys with JSON files
- ✅ **Interactive Editing**: Select and edit keys from lists
- ✅ **Bulk Operations**: Prune inactive keys and old logs
- ✅ **Dry Run Mode**: Preview changes before applying them

### Data Management

- ✅ **Compact Display**: Quick overview with compact formatting
- ✅ **Logs Management**: View, filter, and clean up request logs
- ✅ **Statistics**: Monitor usage and performance metrics
- ✅ **Quick Mode**: Minimal prompts for faster operations

### Production Features

- ✅ **Input Validation**: Comprehensive validation for all user inputs
- ✅ **Error Recovery**: Graceful error handling and recovery
- ✅ **Logging**: Structured logging with different levels (ERROR, WARN, INFO, DEBUG)
- ✅ **Security**: Input sanitization and validation
- ✅ **Performance**: Optimized database queries and operations

## Architecture

### Core Utilities

- **ErrorHandler**: Centralized error handling with custom error types and exit codes
- **Validation**: Comprehensive input validation for all user inputs
- **Logger**: Structured logging with configurable levels and consistent formatting
- **Database**: Enhanced database client with connection testing and error recovery

### Code Quality

- **Type Safety**: Full TypeScript support with strict type checking
- **Modular Design**: Clean separation of concerns with reusable utilities
- **Consistent Patterns**: Standardized error handling and validation across all commands
- **Maintainable Code**: Clear structure and comprehensive documentation

## Performance Improvements

- **Bulk Operations**: Efficient batch processing for deletions and updates
- **Optimized Queries**: Minimal database queries with proper indexing
- **Lazy Loading**: Configuration loaded only when needed
- **Streamlined UX**: Quick mode and compact displays for faster workflows
- **Smart Caching**: Reduced redundant database calls
- **Error Recovery**: Graceful handling of network and database errors

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
# Test validation utilities
npm run test:validation

# Test batch operations
npm run test:batch

# Test CLI help
npm start -- --help
```

## Database Schema

The CLI works with the following Supabase tables:

- `api_keys`: Stores Gemini API keys with usage statistics
- `proxy_api_keys`: Stores proxy access keys for client authentication
- `request_logs`: Stores detailed logs of all proxy requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
