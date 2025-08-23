import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ApiKeysManager } from '../lib/api-keys.js';

export function apiKeysCommands(program: Command) {
  const apiKeys = program
    .command('api-keys')
    .description('Manage Gemini API keys')
    .alias('ak');

  // List API keys
  apiKeys
    .command('list')
    .description('List all API keys')
    .alias('ls')
    .action(async () => {
      const spinner = ora('Fetching API keys...').start();
      try {
        const apiKeys = await ApiKeysManager.list();
        spinner.succeed(`Found ${apiKeys.length} API key(s)`);
        
        if (apiKeys.length === 0) {
          console.log(chalk.yellow('No API keys found. Use "gproxy api-keys create" to add one.'));
          return;
        }

        console.log('\n' + chalk.bold('API Keys:'));
        apiKeys.forEach(apiKey => {
          console.log(ApiKeysManager.formatApiKey(apiKey));
        });
      } catch (error) {
        spinner.fail('Failed to fetch API keys');
        throw error;
      }
    });

  // Create API key
  apiKeys
    .command('create')
    .description('Create a new API key')
    .option('-n, --name <name>', 'API key name')
    .option('-k, --key <key>', 'API key value')
    .option('-p, --provider <provider>', 'Provider (default: gemini)')
    .option('-u, --user-id <userId>', 'User ID')
    .action(async (options) => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter API key name:',
          default: options.name,
          validate: (input) => input.trim() ? true : 'Name is required'
        },
        {
          type: 'password',
          name: 'apiKeyValue',
          message: 'Enter API key value:',
          default: options.key,
          validate: (input) => input.trim() ? true : 'API key value is required'
        },
        {
          type: 'input',
          name: 'provider',
          message: 'Enter provider:',
          default: options.provider || 'gemini'
        },
        {
          type: 'input',
          name: 'userId',
          message: 'Enter user ID (optional):',
          default: options.userId
        }
      ]);

      const spinner = ora('Creating API key...').start();
      try {
        const apiKey = await ApiKeysManager.create({
          name: answers.name,
          api_key_value: answers.apiKeyValue,
          provider: answers.provider,
          user_id: answers.userId || null,
          is_active: true,
          success_count: 0,
          failure_count: 0
        });
        
        spinner.succeed('API key created successfully');
        console.log('\n' + chalk.green('Created API Key:'));
        console.log(ApiKeysManager.formatApiKey(apiKey));
      } catch (error) {
        spinner.fail('Failed to create API key');
        throw error;
      }
    });

  // Get API key by ID
  apiKeys
    .command('get <id>')
    .description('Get API key by ID')
    .action(async (id) => {
      const spinner = ora('Fetching API key...').start();
      try {
        const apiKey = await ApiKeysManager.getById(id);
        if (!apiKey) {
          spinner.fail('API key not found');
          return;
        }
        
        spinner.succeed('API key fetched successfully');
        console.log('\n' + chalk.green('API Key Details:'));
        console.log(ApiKeysManager.formatApiKey(apiKey));
      } catch (error) {
        spinner.fail('Failed to fetch API key');
        throw error;
      }
    });

  // Update API key
  apiKeys
    .command('update <id>')
    .description('Update an API key')
    .option('-n, --name <name>', 'New name')
    .option('-k, --key <key>', 'New API key value')
    .option('-p, --provider <provider>', 'New provider')
    .action(async (id, options) => {
      const current = await ApiKeysManager.getById(id);
      if (!current) {
        throw new Error('API key not found');
      }

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter new name:',
          default: options.name || current.name
        },
        {
          type: 'password',
          name: 'apiKeyValue',
          message: 'Enter new API key value (leave empty to keep current):',
          default: options.key
        },
        {
          type: 'input',
          name: 'provider',
          message: 'Enter new provider:',
          default: options.provider || current.provider
        }
      ]);

      const updates: any = {
        name: answers.name,
        provider: answers.provider
      };

      if (answers.apiKeyValue) {
        updates.api_key_value = answers.apiKeyValue;
      }

      const spinner = ora('Updating API key...').start();
      try {
        const apiKey = await ApiKeysManager.update(id, updates);
        spinner.succeed('API key updated successfully');
        console.log('\n' + chalk.green('Updated API Key:'));
        console.log(ApiKeysManager.formatApiKey(apiKey));
      } catch (error) {
        spinner.fail('Failed to update API key');
        throw error;
      }
    });

  // Delete API key
  apiKeys
    .command('delete <id>')
    .description('Delete an API key')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const apiKey = await ApiKeysManager.getById(id);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete API key "${apiKey.name}"?`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }

      const spinner = ora('Deleting API key...').start();
      try {
        await ApiKeysManager.delete(id);
        spinner.succeed('API key deleted successfully');
      } catch (error) {
        spinner.fail('Failed to delete API key');
        throw error;
      }
    });

  // Toggle API key active status
  apiKeys
    .command('toggle <id>')
    .description('Toggle API key active status')
    .action(async (id) => {
      const spinner = ora('Toggling API key status...').start();
      try {
        const apiKey = await ApiKeysManager.toggleActive(id);
        spinner.succeed(`API key ${apiKey.is_active ? 'activated' : 'deactivated'} successfully`);
        console.log('\n' + chalk.green('Updated API Key:'));
        console.log(ApiKeysManager.formatApiKey(apiKey));
      } catch (error) {
        spinner.fail('Failed to toggle API key status');
        throw error;
      }
    });
}
