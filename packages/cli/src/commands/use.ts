/**
 * Use command implementation
 *
 * Per CLI-04:
 * - Switch current provider to specified name
 * - Validate provider exists
 * - Show success/error message
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { loadConfig, saveConfig } from '../config/index.js';

/**
 * Register the use command with Commander program.
 *
 * Per CLI-04:
 * - Switch active provider to specified name
 * - Validate provider exists
 * - Show success/error message
 *
 * @param program - Commander program instance
 */
export function registerUse(program: Command): void {
    program
        .command('use <provider>')
        .description('Switch to a different provider')
        .action(async (providerName: string) => {
            const config = await loadConfig();

            // Validate provider exists
            const provider = config.providers.find(p => p.name === providerName);
            if (!provider) {
                console.log(chalk.red(`Error: Provider "${providerName}" not found.`));
                console.log('Run `coding-status list` to see available providers.');
                return;
            }

            // Update current provider
            config.current = providerName;
            await saveConfig(config);

            console.log(chalk.green(`Switched to provider "${providerName}".`));
        });
}
