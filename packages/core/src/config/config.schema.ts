/**
 * Config schema validation
 *
 * Zod schemas for config.json validation.
 * Validates provider configuration and overall config structure.
 */

import { z } from 'zod';

/**
 * Provider schema per D-11 and D-15
 *
 * Validates individual provider configuration.
 * First version only supports 'bailian' type (D-15).
 */
export const ProviderSchema = z.object({
    name: z
        .string()
        .min(1, 'Provider name is required')
        .max(32, 'Provider name too long (max 32 chars)'),
    type: z.enum(['bailian']), // D-15: first version only bailian
    packageName: z.string().min(1, 'Package name is required'),
    credentials: z.record(z.string(), z.string()), // Flexible credentials object
});

/**
 * Config schema per D-11
 *
 * Validates the overall configuration file structure.
 */
export const ConfigSchema = z.object({
    providers: z.array(ProviderSchema).default([]),
    current: z.string().optional(), // Name reference to active provider
    cacheTtl: z.number().int().positive().default(300), // D-11: default 300 seconds (5 minutes)
});

/**
 * Inferred Provider type from schema
 */
export type Provider = z.infer<typeof ProviderSchema>;

/**
 * Inferred Config type from schema
 */
export type Config = z.infer<typeof ConfigSchema>;
