import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ProxyKeysManager } from '../lib/proxy-keys.js';

export function proxyKeysCommands(program: Command) {
  const proxyKeys = program
    .command('proxy-keys')
    .description('Manage proxy API keys')
    .alias('pk');

  // List proxy keys
  proxyKeys
    .command('list')
    .description('List all proxy API keys')
    .alias('ls')
    .action(async () => {
      const spinner = ora('Fetching proxy API keys...').start();
      try {
        const proxyKeys = await ProxyKeysManager.list();
        spinner.succeed(`Found ${proxyKeys.length} proxy API key(s)`);
        
        if (proxyKeys.length === 0) {
          console.log(chalk.yellow('No proxy API keys found. Use "gproxy proxy-keys create" to add one.'));
          return;
        }

        console.log('\n' + chalk.bold('Proxy API Keys:'));
        proxyKeys.forEach(proxyKey => {
          console.log(ProxyKeysManager.formatProxyKey(proxyKey));
        });
      } catch (error) {
        spinner.fail('Failed to fetch proxy API keys');
        throw error;
      }
    });

  // Create proxy key
  proxyKeys
    .command('create')
    .description('Create a new proxy API key')
    .option('-n, --name <name>', 'Proxy key name')
    .option('-k, --key-id <keyId>', 'Custom key ID (auto-generated if not provided)')
    .option('-u, --user-id <userId>', 'User ID')
    .action(async (options) => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter proxy key name:',
          default: options.name,
          validate: (input) => input.trim() ? true : 'Name is required'
        },
        {
          type: 'input',
          name: 'keyId',
          message: 'Enter custom key ID (leave empty for auto-generation):',
          default: options.keyId || ProxyKeysManager.generateKeyId()
        },
        {
          type: 'input',
          name: 'userId',
          message: 'Enter user ID (optional):',
          default: options.userId
        }
      ]);

      const spinner = ora('Creating proxy API key...').start();
      try {
        const proxyKey = await ProxyKeysManager.create({
          name: answers.name,
          key_id: answers.keyId,
          user_id: answers.userId || null,
          is_active: true,
          success_count: 0,
          failure_count: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        });
        
        spinner.succeed('Proxy API key created successfully');
        console.log('\n' + chalk.green('Created Proxy API Key:'));
        console.log(ProxyKeysManager.formatProxyKey(proxyKey));
        console.log(chalk.cyan('\nUse this key ID in your API requests:'), chalk.bold(proxyKey.key_id));
      } catch (error) {
        spinner.fail('Failed to create proxy API key');
        throw error;
      }
    });

  // Get proxy key by ID
  proxyKeys
    .command('get <id>')
    .description('Get proxy API key by ID')
    .action(async (id) => {
      const spinner = ora('Fetching proxy API key...').start();
      try {
        const proxyKey = await ProxyKeysManager.getById(id);
        if (!proxyKey) {
          spinner.fail('Proxy API key not found');
          return;
        }
        
        spinner.succeed('Proxy API key fetched successfully');
        console.log('\n' + chalk.green('Proxy API Key Details:'));
        console.log(ProxyKeysManager.formatProxyKey(proxyKey));
      } catch (error) {
        spinner.fail('Failed to fetch proxy API key');
        throw error;
      }
    });

  // Update proxy key
  proxyKeys
    .command('update <id>')
    .description('Update a proxy API key')
    .option('-n, --name <name>', 'New name')
    .option('-k, --key-id <keyId>', 'New key ID')
    .action(async (id, options) => {
      const current = await ProxyKeysManager.getById(id);
      if (!current) {
        throw new Error('Proxy API key not found');
      }

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter new name:',
          default: options.name || current.name
        },
        {
          type: 'input',
          name: 'keyId',
          message: 'Enter new key ID:',
          default: options.keyId || current.key_id
        }
      ]);

      const spinner = ora('Updating proxy API key...').start();
      try {
        const proxyKey = await ProxyKeysManager.update(id, {
          name: answers.name,
          key_id: answers.keyId
        });
        spinner.succeed('Proxy API key updated successfully');
        console.log('\n' + chalk.green('Updated Proxy API Key:'));
        console.log(ProxyKeysManager.formatProxyKey(proxyKey));
      } catch (error) {
        spinner.fail('Failed to update proxy API key');
        throw error;
      }
    });

  // Delete proxy key
  proxyKeys
    .command('delete <id>')
    .description('Delete a proxy API key')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const proxyKey = await ProxyKeysManager.getById(id);
      if (!proxyKey) {
        throw new Error('Proxy API key not found');
      }

      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete proxy API key "${proxyKey.name}"?`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }

      const spinner = ora('Deleting proxy API key...').start();
      try {
        await ProxyKeysManager.delete(id);
        spinner.succeed('Proxy API key deleted successfully');
      } catch (error) {
        spinner.fail('Failed to delete proxy API key');
        throw error;
      }
    });

  // Toggle proxy key active status
  proxyKeys
    .command('toggle <id>')
    .description('Toggle proxy API key active status')
    .action(async (id) => {
      const spinner = ora('Toggling proxy API key status...').start();
      try {
        const proxyKey = await ProxyKeysManager.toggleActive(id);
        spinner.succeed(`Proxy API key ${proxyKey.is_active ? 'activated' : 'deactivated'} successfully`);
        console.log('\n' + chalk.green('Updated Proxy API Key:'));
        console.log(ProxyKeysManager.formatProxyKey(proxyKey));
      } catch (error) {
        spinner.fail('Failed to toggle proxy API key status');
        throw error;
      }
    });

  // Generate new key ID
  proxyKeys
    .command('generate-id')
    .description('Generate a new key ID')
    .action(() => {
      const keyId = ProxyKeysManager.generateKeyId();
      console.log(chalk.green('Generated Key ID:'), chalk.bold(keyId));
    });
}
