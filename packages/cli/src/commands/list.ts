/**
 * List command implementation
 *
 * Per CLI-03:
 * - Outputs providers in table format
 * - Shows provider name, type columns
 * - Current provider marked with indicator
 * - Uses chalk for coloring
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { loadConfig } from '../config/index.js';

/**
 * Register the list command with Commander program.
 *
 * Per CLI-03:
 * - Outputs providers in table format
 * - Shows current provider indicator
 * - Uses chalk for coloring
 *
 * @param program - Commander program instance
 */
export function registerList(program: Command): void {
    program
        .command('list')
        .alias('ls')
        .description('List configured providers')
        .action(async () => {
            const config = await loadConfig();

            if (config.providers.length === 0) {
                console.log('No providers configured.');
                console.log('Run `coding-status add` to add a provider.');
                return;
            }

            // Table header
            console.log();
            console.log(chalk.bold('Providers:'));
            console.log();

            // Simple table format: name | type | current
            for (const provider of config.providers) {
                const isCurrent = provider.name === config.current;
                const currentIndicator = isCurrent ? chalk.green('* (current)') : '';
                const nameDisplay = isCurrent ? chalk.cyan(provider.name) : provider.name;

                console.log(
                    `  ${nameDisplay.padEnd(20)} ${provider.type.padEnd(10)} ${currentIndicator}`
                );
            }

            console.log();
            console.log(`Total: ${config.providers.length} provider(s)`);
        });
}
