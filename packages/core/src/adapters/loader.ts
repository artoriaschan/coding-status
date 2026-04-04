/**
 * Adapter loader with singleton cache
 *
 * Per D-22: Dynamic loading mechanism for adapter packages.
 * - Singleton pattern with lazy loading
 * - Cache by packageName
 * - Credential validation on init
 */

import type { UsageAdapter } from '@cdps/widget-renderer';

import {
  AdapterNotFoundError,
  AdapterLoadError,
  AdapterInitError,
} from './errors.js';

/**
 * Adapter loader singleton per D-22
 *
 * Manages adapter instance lifecycle:
 * - Lazy loading on first request
 * - Caching by packageName
 * - Credential validation on init
 */
export class AdapterLoader {
  /** Singleton instance */
  private static instance: AdapterLoader | null = null;

  /** Adapter cache by packageName */
  private cache: Map<string, UsageAdapter> = new Map();

  /** Private constructor for singleton */
  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AdapterLoader {
    if (!AdapterLoader.instance) {
      AdapterLoader.instance = new AdapterLoader();
    }
    return AdapterLoader.instance;
  }

  /**
   * Load and initialize adapter per D-22
   *
   * Steps:
   * 1. Check cache for existing instance
   * 2. Dynamic import package
   * 3. Validate module structure (default export)
   * 4. Validate adapter interface (required methods)
   * 5. Call init(credentials)
   * 6. Cache instance
   *
   * @param packageName - npm package name (e.g., '@cdps/usage-adapter-bailian')
   * @param credentials - Provider credentials from config.json
   * @throws AdapterNotFoundError if package not found
   * @throws AdapterLoadError if module structure invalid
   * @throws AdapterInitError if credential validation fails
   */
  async getAdapter(
    packageName: string,
    credentials: Record<string, string>
  ): Promise<UsageAdapter> {
    // Check cache first
    const cached = this.cache.get(packageName);
    if (cached) {
      return cached;
    }

    // Dynamic import per D-22
    try {
      const module = await import(packageName);

      // Validate module has default export
      if (!module.default) {
        throw new AdapterLoadError(
          packageName,
          'Package has no default export'
        );
      }

      const adapter = module.default as UsageAdapter;

      // Validate adapter structure (required methods per D-19)
      if (
        typeof adapter.name !== 'string' ||
        typeof adapter.displayName !== 'string' ||
        typeof adapter.init !== 'function' ||
        typeof adapter.getDimensions !== 'function' ||
        typeof adapter.getUsage !== 'function'
      ) {
        throw new AdapterLoadError(
          packageName,
          'Default export does not implement UsageAdapter interface'
        );
      }

      // Initialize with credentials (may throw AdapterInitError)
      await adapter.init(credentials);

      // Cache successful instance
      this.cache.set(packageName, adapter);

      return adapter;
    } catch (error) {
      // Re-throw our custom errors
      if (
        error instanceof AdapterLoadError ||
        error instanceof AdapterInitError
      ) {
        throw error;
      }

      // Node.js import error (MODULE_NOT_FOUND)
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new AdapterNotFoundError(packageName, error.message);
      }

      // Unknown error during import
      throw new AdapterLoadError(
        packageName,
        error instanceof Error ? error.message : 'Unknown import error'
      );
    }
  }

  /**
   * Clear cache (for testing or forced reload)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached adapter names (for debugging)
   */
  getCachedAdapterNames(): string[] {
    return Array.from(this.cache.keys());
  }
}