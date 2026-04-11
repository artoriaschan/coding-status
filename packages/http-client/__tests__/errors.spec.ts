/**
 * HttpError hierarchy tests
 *
 * Tests error class construction, property assignment, and inheritance.
 */

import { describe, it, expect } from 'vitest';
import { HttpError, HttpTimeoutError, HttpNetworkError } from '../src/errors.js';

describe('HttpError', () => {
    it('stores statusCode, bodyCode, and message', () => {
        const error = new HttpError(404, 'NOT_FOUND', 'Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.bodyCode).toBe('NOT_FOUND');
        expect(error.message).toBe('Resource not found');
        expect(error.name).toBe('HttpError');
        expect(error).toBeInstanceOf(Error);
    });

    it('accepts undefined bodyCode', () => {
        const error = new HttpError(500, undefined, 'Server error');
        expect(error.statusCode).toBe(500);
        expect(error.bodyCode).toBeUndefined();
        expect(error.message).toBe('Server error');
    });
});

describe('HttpTimeoutError', () => {
    it('stores timeoutMs and url', () => {
        const error = new HttpTimeoutError(5000, 'https://api.example.com/data');
        expect(error.timeoutMs).toBe(5000);
        expect(error.url).toBe('https://api.example.com/data');
        expect(error.name).toBe('HttpTimeoutError');
        expect(error.message).toContain('5000');
        expect(error.message).toContain('api.example.com/data');
        expect(error).toBeInstanceOf(Error);
    });
});

describe('HttpNetworkError', () => {
    it('stores url, message, and optional cause', () => {
        const cause = new Error('ECONNREFUSED');
        const error = new HttpNetworkError('https://api.example.com', 'connect ECONNREFUSED', cause);
        expect(error.url).toBe('https://api.example.com');
        expect(error.message).toBe('connect ECONNREFUSED');
        expect(error.cause).toBe(cause);
        expect(error.name).toBe('HttpNetworkError');
        expect(error).toBeInstanceOf(Error);
    });

    it('works without cause', () => {
        const error = new HttpNetworkError('https://api.example.com', 'network unreachable');
        expect(error.url).toBe('https://api.example.com');
        expect(error.cause).toBeUndefined();
    });
});

describe('Error hierarchy isolation', () => {
    it('HttpError is not instanceof HttpTimeoutError or HttpNetworkError', () => {
        const error = new HttpError(404, undefined, 'Not found');
        expect(error).not.toBeInstanceOf(HttpTimeoutError);
        expect(error).not.toBeInstanceOf(HttpNetworkError);
    });

    it('HttpTimeoutError is not instanceof HttpError or HttpNetworkError', () => {
        const error = new HttpTimeoutError(1000, 'http://localhost');
        expect(error).not.toBeInstanceOf(HttpError);
        expect(error).not.toBeInstanceOf(HttpNetworkError);
    });

    it('HttpNetworkError is not instanceof HttpError or HttpTimeoutError', () => {
        const error = new HttpNetworkError('http://localhost', 'fail');
        expect(error).not.toBeInstanceOf(HttpError);
        expect(error).not.toBeInstanceOf(HttpTimeoutError);
    });
});
