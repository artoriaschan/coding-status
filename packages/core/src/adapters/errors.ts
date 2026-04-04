/**
 * Custom error classes for adapter operations
 *
 * Typed errors for different adapter failure modes.
 * CLI catches these and displays user-friendly messages.
 */

/**
 * Base error class for adapter operations
 */
export abstract class AdapterError extends Error {
  constructor(
    public readonly packageName: string,
    message: string
  ) {
    super(`[${packageName}] ${message}`);
    this.name = 'AdapterError';
  }
}

/**
 * Adapter package not found in node_modules
 *
 * Thrown when dynamic import fails with ERR_MODULE_NOT_FOUND.
 */
export class AdapterNotFoundError extends AdapterError {
  constructor(packageName: string, originalMessage: string) {
    super(packageName, `Adapter package not found: ${originalMessage}`);
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * Adapter package structure invalid
 *
 * Thrown when package missing default export or required methods.
 */
export class AdapterLoadError extends AdapterError {
  constructor(packageName: string, reason: string) {
    super(packageName, `Failed to load adapter: ${reason}`);
    this.name = 'AdapterLoadError';
  }
}

/**
 * Adapter initialization failed
 *
 * Thrown when credential validation fails in init() method.
 */
export class AdapterInitError extends AdapterError {
  constructor(packageName: string, reason: string) {
    super(packageName, `Initialization failed: ${reason}`);
    this.name = 'AdapterInitError';
  }
}

/**
 * Usage fetch failed
 *
 * Thrown when getUsage() method fails (Phase 5 usage).
 */
export class AdapterUsageError extends AdapterError {
  constructor(
    packageName: string,
    public readonly dimension: string,
    reason: string
  ) {
    super(packageName, `Failed to fetch usage for ${dimension}: ${reason}`);
    this.name = 'AdapterUsageError';
  }
}