/**
 * Add command implementation
 *
 * Per D-13: 5-step interactive flow
 * Per D-14: Validation failure allows retry
 * Per D-15: First version only shows bailian option
 */

import * as p from '@clack/prompts';
import { Command } from 'commander';

import { loadConfig, saveConfig, type Provider } from '../config/index.js';

/**
 * Register the add command with Commander program.
 *
 * Per D-13: 5-step interactive flow
 * Per D-14: Validation failure allows retry
 * Per D-15: First version only shows bailian option
 *
 * @param program - Commander program instance
 */
export function registerAdd(program: Command): void {
    program
        .command('add')
        .description('Add a new provider configuration')
        .action(async () => {
            p.intro('Add a new provider');

            // Load existing config to check for duplicates
            const config = await loadConfig();

            // Step 1: Select provider type (D-13, D-15)
            const providerType = await p.select({
                message: 'Select provider type',
                options: [{ value: 'bailian', label: 'Aliyun Bailian' }],
            });

            if (p.isCancel(providerType)) {
                p.outro('Cancelled');
                return;
            }

            // Step 2: Input provider name (D-13)
            const name = await p.text({
                message: 'Provider name',
                placeholder: 'my-bailian',
                validate: value => {
                    const trimmed = value.trim();
                    if (!trimmed) return 'Name is required';
                    if (trimmed.length > 32) return 'Name too long (max 32 chars)';
                    // Check for duplicate (D-14)
                    if (config.providers.some(p => p.name === trimmed)) {
                        return 'Provider name already exists';
                    }
                    return undefined;
                },
            });

            if (p.isCancel(name)) {
                p.outro('Cancelled');
                return;
            }

            // Step 3: Input credentials (D-13)
            const accessKeyId = await p.text({
                message: 'AccessKey ID',
                placeholder: 'LTAI...',
                validate: value => {
                    if (!value.trim()) return 'AccessKey ID is required';
                    return undefined;
                },
            });

            if (p.isCancel(accessKeyId)) {
                p.outro('Cancelled');
                return;
            }

            const accessKeySecret = await p.password({
                message: 'AccessKey Secret',
                validate: value => {
                    if (!value.trim()) return 'AccessKey Secret is required';
                    return undefined;
                },
            });

            if (p.isCancel(accessKeySecret)) {
                p.outro('Cancelled');
                return;
            }

            // Step 4: Validate credentials (D-13)
            // Note: Actual validation stub until Phase 5 (Bailian Adapter)
            // For Phase 3, we assume validation passes
            const spinner = p.spinner();
            spinner.start('Validating credentials...');

            // Placeholder validation - actual implementation in Phase 5
            // Per RESEARCH.md: doctor should check config structure only in Phase 3
            const valid = true; // Stub for Phase 3

            if (valid) {
                spinner.stop('Credentials validated (stub - actual validation in Phase 5)');

                // Step 5: Save to config (D-13)
                const newProvider: Provider = {
                    name: name as string,
                    type: providerType as 'bailian',
                    packageName: '@cdps/usage-adapter-bailian',
                    credentials: {
                        accessKeyId: accessKeyId as string,
                        accessKeySecret: accessKeySecret as string,
                    },
                };

                config.providers.push(newProvider);

                // First provider becomes current automatically (D-13)
                if (config.providers.length === 1) {
                    config.current = name as string;
                }

                await saveConfig(config);

                p.outro(`Provider "${name}" added successfully!`);
            } else {
                // D-14: Display error, allow retry (would re-prompt in full implementation)
                spinner.stop('Validation failed');
                p.log.error('Credential validation failed. Please check your AccessKey.');
                // Note: Full retry loop would be implemented if validation actually runs
            }
        });
}
