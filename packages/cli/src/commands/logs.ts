import { Command } from 'commander';
import { colors } from '../lib/colors';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import { supabase } from '../lib/database';
import { Validation } from '../lib/validation';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';

export function logsCommands(program: Command) {
    const logs = program.command('logs').description('Manage request logs').alias('log');

    // List logs with filtering
    logs.command('list')
        .description('List request logs')
        .alias('ls')
        .option('-l, --limit <number>', 'Limit number of logs', '50')
        .option('-s, --success', 'Show only successful requests')
        .option('-f, --failed', 'Show only failed requests')
        .option('-u, --user-id <id>', 'Filter by user ID')
        .option('-c, --compact', 'Show compact format')
        .action(async (options) => {
            const spinner = ora('Fetching request logs...').start();
            try {
                const limit = Validation.validateLimit(options.limit);

                await supabase.init();

                let query = supabase.client
                    .from('request_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (options.success) {
                    query = query.eq('is_successful', true);
                } else if (options.failed) {
                    query = query.eq('is_successful', false);
                }

                if (options.userId) {
                    query = query.eq('user_id', options.userId);
                }

                const { data: logs, error } = await query;

                if (error) {
                    throw new Error(`Failed to fetch logs: ${error.message}`);
                }

                spinner.succeed(`Found ${logs?.length || 0} log(s)`);

                if (!logs || logs.length === 0) {
                    console.log(colors.yellow('No request logs found.'));
                    return;
                }

                if (options.compact) {
                    console.log('\n' + colors.bold('Request Logs (Compact):'));
                    logs.forEach((log, index) => {
                        const status = log.is_successful ? colors.green('✓') : colors.red('✗');
                        const date = new Date(log.created_at ?? new Date()).toLocaleDateString();
                        console.log(`${index + 1}. ${status} ${log.request_id} - ${date}`);
                    });
                } else {
                    console.log('\n' + colors.bold('Request Logs:'));
                    logs.forEach((log) => {
                        console.log(formatLog(log));
                    });
                }
            } catch (error) {
                Logger.error('Failed to fetch logs');
                ErrorHandler.handle(error, 'logs list');
            }
        });

    // Prune old logs
    logs.command('prune')
        .description('Remove old request logs')
        .option('-d, --days <number>', 'Remove logs older than N days', '30')
        .option('-f, --force', 'Skip confirmation')
        .option('-s, --success-only', 'Remove only successful logs')
        .option('-e, --failed-only', 'Remove only failed logs')
        .action(async (options) => {
            const spinner = ora('Checking for old logs...').start();
            try {
                const days = Validation.validateDays(options.days);

                await supabase.init();

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);

                let query = supabase.client
                    .from('request_logs')
                    .select('id, created_at, request_id, is_successful')
                    .lt('created_at', cutoffDate.toISOString());

                if (options.successOnly) {
                    query = query.eq('is_successful', true);
                } else if (options.failedOnly) {
                    query = query.eq('is_successful', false);
                }

                const { data: oldLogs, error } = await query;

                if (error) {
                    throw new Error(`Failed to fetch old logs: ${error.message}`);
                }

                if (!oldLogs || oldLogs.length === 0) {
                    spinner.succeed('No old logs found to prune');
                    return;
                }

                spinner.succeed(`Found ${oldLogs.length} old log(s) to prune`);

                if (!options.force) {
                    console.log('\nOld logs to be removed:');
                    oldLogs.slice(0, 10).forEach((log) => {
                        const status = log.is_successful ? colors.green('✓') : colors.red('✗');
                        const date = new Date(log.created_at ?? new Date()).toLocaleDateString();
                        console.log(`  • ${status} ${log.request_id} - ${date}`);
                    });

                    if (oldLogs.length > 10) {
                        console.log(`  ... and ${oldLogs.length - 10} more`);
                    }

                    const confirmed = await confirm({
                        message: `Delete ${oldLogs.length} old log(s)?`,
                        default: false,
                    });

                    if (!confirmed) {
                        console.log(colors.yellow('Operation cancelled'));
                        return;
                    }
                }

                const deleteSpinner = ora('Deleting old logs...').start();

                const ids = oldLogs.map((log) => log.id);
                const { error: deleteError } = await supabase.client
                    .from('request_logs')
                    .delete()
                    .in('id', ids);

                if (deleteError) {
                    throw new Error(`Failed to delete logs: ${deleteError.message}`);
                }

                deleteSpinner.succeed(`Deleted ${oldLogs.length} old log(s)`);
            } catch (error) {
                Logger.error('Failed to prune logs');
                ErrorHandler.handle(error, 'logs prune');
            }
        });

    // Get log details
    logs.command('get <id>')
        .description('Get detailed log information')
        .action(async (id) => {
            const spinner = ora('Fetching log details...').start();
            try {
                await supabase.init();

                const { data: log, error } = await supabase.client
                    .from('request_logs')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') {
                        spinner.fail('Log not found');
                        return;
                    }
                    throw new Error(`Failed to fetch log: ${error.message}`);
                }

                spinner.succeed('Log details fetched successfully');
                console.log('\n' + colors.green('Log Details:'));
                console.log(formatLogDetailed(log));
            } catch (error) {
                Logger.error('Failed to fetch log details');
                ErrorHandler.handle(error, 'logs get');
            }
        });

    // Stats command
    logs.command('stats')
        .description('Show log statistics')
        .option('-d, --days <number>', 'Stats for last N days', '7')
        .action(async (options) => {
            const spinner = ora('Calculating statistics...').start();
            try {
                const days = Validation.validateDays(options.days);

                await supabase.init();

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);

                const { data: logs, error } = await supabase.client
                    .from('request_logs')
                    .select('is_successful, created_at')
                    .gte('created_at', cutoffDate.toISOString());

                if (error) {
                    throw new Error(`Failed to fetch logs: ${error.message}`);
                }

                const total = logs?.length || 0;
                const successful = logs?.filter((log) => log.is_successful).length || 0;
                const failed = total - successful;
                const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';

                spinner.succeed('Statistics calculated');

                console.log('\n' + colors.bold('Log Statistics:'));
                console.log(`📊 Period: Last ${options.days} days`);
                console.log(`📈 Total Requests: ${total}`);
                console.log(`✅ Successful: ${successful}`);
                console.log(`❌ Failed: ${failed}`);
                console.log(`📊 Success Rate: ${successRate}%`);
            } catch (error) {
                Logger.error('Failed to calculate statistics');
                ErrorHandler.handle(error, 'logs stats');
            }
        });
}

function formatLog(log: any): string {
    const status = log.is_successful ? colors.green('● Success') : colors.red('● Failed');
    const date = new Date(log.created_at).toLocaleString();

    return `
${colors.bold(log.request_id)} ${status}
  User ID: ${log.user_id || 'N/A'}
  API Key: ${log.api_key_id}
  Proxy Key: ${log.proxy_key_id || 'N/A'}
  Format: ${log.api_format}
  Stream: ${log.is_stream ? 'Yes' : 'No'}
  Created: ${date}`;
}

function formatLogDetailed(log: any): string {
    const status = log.is_successful ? colors.green('● Success') : colors.red('● Failed');
    const date = new Date(log.created_at).toLocaleString();

    let details = `
${colors.bold('Request ID:')} ${log.request_id}
${colors.bold('Status:')} ${status}
${colors.bold('User ID:')} ${log.user_id || 'N/A'}
${colors.bold('API Key:')} ${log.api_key_id}
${colors.bold('Proxy Key:')} ${log.proxy_key_id || 'N/A'}
${colors.bold('Format:')} ${log.api_format}
${colors.bold('Stream:')} ${log.is_stream ? 'Yes' : 'No'}
${colors.bold('Created:')} ${date}`;

    if (log.usage_metadata) {
        details += `\n${colors.bold('Usage:')} ${JSON.stringify(log.usage_metadata, null, 2)}`;
    }

    if (log.performance_metrics) {
        details += `\n${colors.bold('Performance:')} ${JSON.stringify(log.performance_metrics, null, 2)}`;
    }

    if (log.error_details) {
        details += `\n${colors.bold('Error Details:')} ${JSON.stringify(log.error_details, null, 2)}`;
    }

    return details;
}
