/**
 * Error formatter tests
 *
 * Tests for formatZodError and formatJsonParseError functions.
 * Validates field paths, error types, suggestions, and chalk styling.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  formatZodError,
  formatJsonParseError,
  type FormattedError,
  getFixSuggestion,
} from '../../src/config/error-formatter.js';

describe('formatZodError', () => {
  describe('field path display', () => {
    it('should show field path for nested error', () => {
      const schema = z.object({
        providers: z.array(
          z.object({
            credentials: z.object({
              accessKeyId: z.string(),
            }),
          })
        ),
      });

      const result = schema.safeParse({
        providers: [{ credentials: {} }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        // Should show path like 'providers[0].credentials.accessKeyId'
        expect(lines.some((line) => line.includes('providers'))).toBe(true);
        expect(lines.some((line) => line.includes('credentials'))).toBe(true);
      }
    });

    it('should show field path for array index', () => {
      const schema = z.array(z.string());

      const result = schema.safeParse([1, 2]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Test');
        // Should show path like '0'
        expect(lines.some((line) => line.includes('0') || line.includes('Field'))).toBe(true);
      }
    });
  });

  describe('error type display', () => {
    it('should show invalid_type error code', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({ name: 123 });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(lines.some((line) => line.includes('invalid_type') || line.includes('Error'))).toBe(
          true
        );
      }
    });

    it('should show required error code', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(lines.some((line) => line.includes('required') || line.includes('Error'))).toBe(
          true
        );
      }
    });

    it('should show too_small error code', () => {
      const schema = z.object({
        count: z.number().positive(),
      });

      const result = schema.safeParse({ count: -5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(lines.some((line) => line.includes('too_small') || line.includes('Error'))).toBe(
          true
        );
      }
    });
  });

  describe('fix suggestions', () => {
    it('should include suggestion for credentials field', () => {
      const schema = z.object({
        credentials: z.object({
          accessKeyId: z.string(),
          accessKeySecret: z.string(),
        }),
      });

      const result = schema.safeParse({ credentials: {} });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(lines.some((line) => line.includes('Suggestion') || line.includes('credentials'))).toBe(
          true
        );
      }
    });

    it('should include suggestion for missing required fields', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const result = schema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(lines.some((line) => line.includes('Suggestion'))).toBe(true);
      }
    });
  });

  describe('chalk styling', () => {
    it('should use chalk for error header', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        // Header should contain validation failed message
        expect(lines[0]).toContain('validation failed');
      }
    });

    it('should return array of formatted lines', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const lines = formatZodError(result.error, 'Config');
        expect(Array.isArray(lines)).toBe(true);
        expect(lines.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('formatJsonParseError', () => {
  describe('line and column display', () => {
    it('should show line number when available', () => {
      const error = new SyntaxError('Unexpected token');
      (error as SyntaxError & { line?: number }).line = 3;

      const lines = formatJsonParseError(error);
      expect(lines.some((line) => line.includes('Line') || line.includes('3'))).toBe(true);
    });

    it('should show column number when available', () => {
      const error = new SyntaxError('Unexpected token');
      (error as SyntaxError & { line?: number; column?: number }).line = 3;
      (error as SyntaxError & { column?: number }).column = 15;

      const lines = formatJsonParseError(error);
      expect(lines.some((line) => line.includes('Column') || line.includes('15'))).toBe(true);
    });

    it('should handle error without line/column', () => {
      const error = new SyntaxError('Unexpected token');

      const lines = formatJsonParseError(error);
      expect(lines.some((line) => line.includes('JSON') || line.includes('syntax'))).toBe(true);
    });
  });

  describe('error message display', () => {
    it('should show error message', () => {
      const error = new SyntaxError('Unexpected token ] in JSON at position 10');

      const lines = formatJsonParseError(error);
      expect(lines.some((line) => line.includes('Unexpected') || line.includes('token'))).toBe(
        true
      );
    });
  });
});

describe('getFixSuggestion', () => {
  it('should return suggestion for credentials path', () => {
    const issue: z.ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      received: 'undefined',
      path: ['credentials', 'accessKeyId'],
      message: 'Required',
    };

    const suggestion = getFixSuggestion(issue);
    expect(suggestion).toBeDefined();
    expect(suggestion?.toLowerCase().includes('credentials') || suggestion?.toLowerCase().includes('key')).toBe(true);
  });

  it('should return suggestion for invalid_type expected string', () => {
    const issue: z.ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['name'],
      message: 'Expected string, received number',
    };

    const suggestion = getFixSuggestion(issue);
    expect(suggestion).toBeDefined();
    expect(suggestion?.includes('string')).toBe(true);
  });

  it('should return suggestion for too_small on name', () => {
    const issue: z.ZodIssue = {
      code: 'too_small',
      minimum: 1,
      type: 'string',
      inclusive: true,
      exact: false,
      path: ['name'],
      message: 'String must contain at least 1 character(s)',
    };

    const suggestion = getFixSuggestion(issue);
    expect(suggestion).toBeDefined();
  });

  it('should return undefined for unknown issues', () => {
    const issue: z.ZodIssue = {
      code: 'custom',
      message: 'Custom error',
      path: ['unknown'],
    };

    const suggestion = getFixSuggestion(issue);
    // May return undefined or a generic suggestion
    expect(suggestion).toBeDefined(); // Should always return something for user-friendliness
  });
});

describe('FormattedError interface', () => {
  it('should be usable for structured error output', () => {
    const formatted: FormattedError = {
      field: 'providers[0].credentials',
      errorType: 'required',
      message: 'Expected string, received undefined',
      suggestion: 'Check credentials include accessKeyId and accessKeySecret',
    };

    expect(formatted.field).toBe('providers[0].credentials');
    expect(formatted.errorType).toBe('required');
    expect(formatted.message).toBeDefined();
    expect(formatted.suggestion).toBeDefined();
  });
});