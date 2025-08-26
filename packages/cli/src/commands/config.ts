import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
import { colors } from '../lib/colors';
import { ConfigManager } from '../lib/config';

export function configCommands(program: Command) {
    const config = program
        .command('config')
        .description('Manage Gemini Proxy configuration')
        .alias('cfg');

    // Setup configuration
    config
        .command('setup')
        .description('Setup initial configuration')
        .action(async () => {
            try {
                await ConfigManager.getConfig();
                console.log(colors.green('\n✓ Configuration setup completed successfully!'));
            } catch (error) {
                console.error(colors.red('Failed to setup configuration:'), error);
                process.exit(1);
            }
        });

    // Show current configuration
    config
        .command('show')
        .description('Show current configuration')
        .alias('ls')
        .action(() => {
            ConfigManager.showConfig();
        });

    // Update configuration
    config
        .command('update')
        .description('Update existing configuration')
        .alias('edit')
        .action(async () => {
            try {
                await ConfigManager.updateConfig();
            } catch (error) {
                console.error(colors.red('Failed to update configuration:'), error);
                process.exit(1);
            }
        });

    // Clear configuration
    config
        .command('clear')
        .description('Clear saved configuration')
        .option('-f, --force', 'Skip confirmation')
        .action(async (options) => {
            if (!options.force) {
                const confirmed = await confirm({
                    message: 'Are you sure you want to clear the saved configuration?',
                    default: false,
                });

                if (!confirmed) {
                    console.log(colors.yellow('Operation cancelled'));
                    return;
                }
            }

            ConfigManager.clearConfig();
        });

    // Test configuration
    config
        .command('test')
        .description('Test current configuration')
        .action(async () => {
            try {
                const config = await ConfigManager.getConfig();
                console.log(colors.blue('🔧 Testing Configuration'));
                console.log('');

                // Test Supabase connection
                console.log(colors.gray('Testing Supabase connection...'));
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });

                // Try to fetch a simple query to test connection
                const { data, error } = await supabase.from('api_keys').select('count').limit(1);

                if (error) {
                    console.log(colors.red('✗ Connection failed:'), error.message);
                    process.exit(1);
                }

                console.log(colors.green('✓ Configuration is valid and connection successful!'));
                console.log(colors.gray('You can now use gproxy commands'));
            } catch (error) {
                console.error(colors.red('✗ Configuration test failed:'), error);
                process.exit(1);
            }
        });
}
