/**
 * Sheriff configuration - Module boundary enforcement
 *
 * Defines architectural layers and dependency rules to prevent
 * unwanted imports and maintain clean architecture per D-01.
 */

import { noDependencies, type SheriffConfig } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
    version: 1,
    // Use tsconfig.base.json to find all TypeScript files
    tsConfig: './tsconfig.base.json',
    // Entry point for module graph (CLI entry)
    entryFile: './packages/core/src/index.ts',
    tagging: {
        // Domain layer - shared types across all packages
        'packages/widget-renderer/src/types': 'domain:types',
        'packages/core/src/types': 'domain:types',
        'packages/usage-adapter-bailian/src/types': 'domain:types',

        // Core layer - widget-renderer (base rendering layer)
        'packages/widget-renderer/src': 'core:widgets',
        'packages/widget-renderer/src/widgets': 'core:widgets',
        'packages/widget-renderer/src/shared': 'core:widgets',

        // Core layer - core package modules
        'packages/core/src/config': 'core:config',
        'packages/core/src/adapter-loader': 'core:adapter',
        'packages/core/src/adapters': 'core:adapter',
        'packages/core/src/utils': 'core:utils',

        // Feature layer - CLI commands
        'packages/core/src/commands': 'feature:cli',
        'packages/core/src/cli.ts': 'feature:cli',
        'packages/core/src/index.ts': 'feature:cli',

        // Feature layer - adapters (can import domain + core:widgets)
        'packages/usage-adapter-bailian/src': 'feature:adapter',
    },
    depRules: {
        // Domain layer: types can only import external packages
        'domain:types': ['domain:types', 'external:*'],

        // Core layer: can import domain + other core modules
        'core:widgets': ['domain:types', 'core:widgets', 'external:*'],
        'core:config': ['domain:types', 'core:*', 'external:*'],
        'core:adapter': ['domain:types', 'core:*', 'external:*'],
        'core:utils': ['domain:types', 'core:*', 'external:*'],

        // Feature layer: can import everything except other features
        'feature:cli': ['domain:*', 'core:*', 'feature:adapter', 'external:*'],
        'feature:adapter': ['domain:*', 'core:widgets', 'external:*'],

        // Untagged files: can import anything (permissive for flexibility)
        noTag: ['domain:*', 'core:*', 'feature:*', 'external:*'],

        // Default: root files can import anything
        root: ['domain:*', 'core:*', 'feature:*', 'external:*'],
    },
};

export default sheriffConfig;
