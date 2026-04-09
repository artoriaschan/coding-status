/**
 * Error formatter utilities
 *
 * Formats Zod validation errors and JSON parse errors with chalk styling.
 * Provides field paths, error types, line/column numbers, and fix suggestions.
 */

import chalk from 'chalk';
import { type ZodError, type ZodIssue } from 'zod';

// =============================================================================
// Formatted Error Interface (D-07)
// =============================================================================

/**
 * Structured error representation per D-07
 */
export interface FormattedError {
  /** Field path (e.g., 'providers[0].credentials') */
  field: string;
  /** Error type code (e.g., 'required', 'invalid_type', 'too_small') */
  errorType: string;
  /** Human-readable error message */
  message: string;
  /** Optional fix suggestion */
  suggestion?: string;
}

// =============================================================================
// Fix Suggestions (D-10)
// =============================================================================

/**
 * Get fix suggestion based on error type and path per D-10
 *
 * @param issue - Zod validation issue
 * @returns Fix suggestion string or undefined
 */
export function getFixSuggestion(issue: ZodIssue): string | undefined {
  const pathStr = issue.path.join('.').toLowerCase();

  // Credentials field suggestions (T-07-03: do not display credential values)
  if (pathStr.includes('credentials') || pathStr.includes('accesskey')) {
    return 'Check credentials include accessKeyId and accessKeySecret';
  }

  // Error type-based suggestions
  switch (issue.code) {
    case 'invalid_type':
      if (issue.expected === 'string') {
        return 'Ensure this field is a string value';
      }
      if (issue.expected === 'number') {
        return 'Ensure this field is a numeric value';
      }
      return `Ensure this field is of type ${issue.expected}`;

    case 'too_small':
      if (issue.type === 'string' && issue.path.includes('name')) {
        return 'Provider name must be 1-32 characters';
      }
      if (issue.type === 'number') {
        return 'Ensure this value meets the minimum requirement';
      }
      return 'Ensure this value meets the size requirement';

    case 'too_big':
      if (issue.type === 'string' && issue.path.includes('name')) {
        return 'Provider name must be 1-32 characters';
      }
      return 'Ensure this value does not exceed the maximum';

    case 'invalid_string':
      return 'Ensure this field matches the expected format';

    case 'invalid_enum_value':
      return `Valid options: ${(issue.options as string[]).join(', ')}`;

    case 'custom':
      return 'Check the value meets the validation rules';

    default:
      return 'Check the value matches the expected format';
  }
}

// =============================================================================
// Zod Error Formatter (D-07, D-08, D-10)
// =============================================================================

/**
 * Format Zod validation error with chalk styling per D-07, D-08, D-10
 *
 * @param error - ZodError from validation
 * @param context - Context name for header (e.g., 'Config', 'Settings')
 * @returns Array of formatted lines for console output
 */
export function formatZodError(error: ZodError, context: string): string[] {
  const lines: string[] = [];

  // Header with chalk.red and X mark (D-08)
  lines.push(chalk.red(`\u2717 ${context} validation failed`));

  // Process each ZodIssue
  for (const issue of error.errors) {
    // Field path (D-07)
    const fieldPath = issue.path.map((p) => p).join('.');
    const formattedPath = fieldPath || '(root)';

    // Error type and message
    const errorType = issue.code;
    const message = issue.message;

    // Format line with chalk colors (D-08)
    lines.push(`  ${chalk.cyan('Field:')} ${formattedPath}`);
    lines.push(`  ${chalk.cyan('Error:')} ${errorType} - ${message}`);

    // Fix suggestion (D-10)
    const suggestion = getFixSuggestion(issue);
    if (suggestion) {
      lines.push(`  ${chalk.yellow('Suggestion:')} ${suggestion}`);
    }

    // Separator between issues
    lines.push('');
  }

  return lines;
}

// =============================================================================
// JSON Parse Error Formatter (D-09)
// =============================================================================

/**
 * Extended SyntaxError with line/column properties (from parse-json library)
 */
interface JsonSyntaxError extends SyntaxError {
  line?: number;
  column?: number;
}

/**
 * Format JSON parse error with line/column info per D-09
 *
 * @param error - SyntaxError from JSON parsing (may have line/column properties)
 * @returns Array of formatted lines for console output
 */
export function formatJsonParseError(error: SyntaxError): string[] {
  const lines: string[] = [];
  const jsonError = error as JsonSyntaxError;

  // Header with chalk.red and X mark
  lines.push(chalk.red('\u2717 JSON syntax error'));

  // Line number if available (D-09)
  if (jsonError.line !== undefined) {
    lines.push(`  ${chalk.cyan('Line:')} ${jsonError.line}`);
  }

  // Column number if available (D-09)
  if (jsonError.column !== undefined) {
    lines.push(`  ${chalk.cyan('Column:')} ${jsonError.column}`);
  }

  // Error message
  lines.push(`  ${chalk.cyan('Message:')} ${error.message}`);

  return lines;
}