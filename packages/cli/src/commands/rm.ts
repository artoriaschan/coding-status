/**
 * Rm command implementation
 *
 * Per CLI-05:
 * - Delete provider from config
 * - Fail if provider is current (cannot delete active)
 * - Validate provider exists
 * - Clear current if deleted provider was current
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { loadConfig, saveConfig } from '../config/index.js';

/**
 * Register the rm command with Commander program.
 *
 * Per CLI-05:
 * - Delete provider from config
 * - Fail if provider is current (cannot delete active)
 * - Validate provider exists
 * - Clear current if deleted provider was current
 *
 * @param program - Commander program instance
 */
export function registerRm(program: Command): void {
    program
        .command('rm <provider>')
        .alias('remove')
        .description('Remove a provider configuration')
        .action(async (providerName: string) => {
            const config = await loadConfig();

            // Validate provider exists
            const providerIndex = config.providers.findIndex(p => p.name === providerName);
            if (providerIndex === -1) {
                console.log(chalk.red(`Error: Provider "${providerName}" not found.`));
                console.log('Run `cdps list` to see available providers.');
                return;
            }

            // Check if provider is current (cannot delete active provider)
            if (config.current === providerName) {
                console.log(chalk.red(`Error: Cannot delete current provider "${providerName}".`));
                console.log('Run `cdps use <other-provider>` to switch first.');
                return;
            }

            // Remove provider from array
            config.providers.splice(providerIndex, 1);

            // If this was somehow the current (edge case), clear it
            if (config.current === providerName) {
                config.current = config.providers.length > 0 ? config.providers[0].name : undefined;
            }

            await saveConfig(config);

            console.log(chalk.green(`Provider "${providerName}" removed.`));
        });
}
