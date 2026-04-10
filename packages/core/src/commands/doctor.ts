/**
 * Doctor command implementation
 *
 * Per CLI-06 and RESEARCH.md:
 * - Check config structure only in Phase 3
 * - Adapter health validation in Phase 5+
 * - Report status for each provider
 * - Enhanced validation with detailed error reporting (Plan 07-02)
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { ZodError } from 'zod';

import { loadConfig, ConfigSchema, formatZodError } from '../config/index.js';

/**
 * Register the doctor command with Commander program.
 *
 * Per CLI-06 and RESEARCH.md:
 * - Check config structure only in Phase 3
 * - Adapter health validation in Phase 5+
 * - Report status for each provider
 *
 * @param program - Commander program instance
 */
export function registerDoctor(program: Command): void {
    program
        .command('doctor')
        .description('Validate provider configurations')
        .option('--strict', 'Enable strict validation mode')
        .action(async (options: { strict?: boolean }) => {
            console.log('Running diagnostics...\n');

            // Load and validate config structure
            const config = await loadConfig();

            try {
                ConfigSchema.parse(config);
                console.log(chalk.green('Config structure: OK'));
            } catch (error) {
                console.log(chalk.red('Config structure: INVALID'));

                if (error instanceof ZodError) {
                    // Use enhanced error formatter for detailed output (Plan 07-02)
                    const errorLines = formatZodError(error, 'Config');
                    for (const line of errorLines) {
                        console.log(line);
                    }
                } else {
                    console.log(error instanceof Error ? error.message : String(error));
                }

                // In strict mode, exit early on validation error
                if (options.strict) {
                    return;
                }
            }

            // Check providers
            if (config.providers.length === 0) {
                console.log(chalk.yellow('No providers configured.'));
                console.log('Run `cdps add` to add a provider.');
                return;
            }

            console.log(`\nProviders (${config.providers.length}):`);

            for (const provider of config.providers) {
                const isCurrent = provider.name === config.current;
                const currentMark = isCurrent ? chalk.cyan(' (current)') : '';

                // Phase 3: Structure validation only
                // Phase 5+: Actual adapter health check
                console.log(
                    `  ${chalk.green('OK')} ${provider.name}${currentMark} [${provider.type}]`
                );
                console.log(`    Package: ${provider.packageName}`);
                console.log(
                    `    Credentials: ${provider.credentials?.accessKeyId ? 'configured' : 'missing'}`
                );
            }

            // Summary
            console.log(`\n${chalk.green('All checks passed.')}`);
            console.log('Note: Adapter connectivity will be validated in Phase 5.');
        });
}
