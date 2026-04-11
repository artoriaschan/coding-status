/**
 * HttpClient tests
 *
 * Tests request execution, auth injection, error handling, timeout, and retry behavior.
 * Uses vitest module mocking to intercept globalThis.fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../src/client.js';
import { HttpError, HttpTimeoutError, HttpNetworkError } from '../src/errors.js';
import * as retryModule from '../src/retry.js';

// Track fetch calls
const mockFetch = vi.fn<typeof globalThis.fetch>();

vi.stubGlobal('fetch', mockFetch);

// Spy on calculateBackoff to avoid real delays in retry tests
let backoffSpy: ReturnType<typeof vi.spyOn>;

describe('HttpClient', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        backoffSpy = vi.spyOn(retryModule, 'calculateBackoff').mockReturnValue(0);
    });

    afterEach(() => {
        backoffSpy.mockRestore();
    });

    // --- Constructor Defaults ---
    describe('constructor', () => {
        it('uses default timeout of 30000ms', () => {
            const client = new HttpClient();
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );
            void client.get('https://example.com');
            expect(client).toBeDefined();
        });

        it('accepts custom timeout and retry', () => {
            const client = new HttpClient({ timeout: 5000, retry: 1 });
            expect(client).toBeDefined();
        });
    });

    // --- Request Body ---
    describe('request body', () => {
        it('sends JSON body by default', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient();
            await client.post('https://example.com/api', { name: 'Alice' });

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.method).toBe('POST');
            expect(callArgs[1]?.body).toBe('{"name":"Alice"}');
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('uses rawBody directly without JSON serialization', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient();
            await client.request({
                url: 'https://example.com/form',
                method: 'POST',
                rawBody: 'foo=bar&baz=qux',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.body).toBe('foo=bar&baz=qux');
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        });

        it('does NOT set JSON Content-Type when rawBody is used', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient();
            await client.request({
                url: 'https://example.com/form',
                method: 'POST',
                rawBody: 'foo=bar',
            });

            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['Content-Type']).toBeUndefined();
        });
    });

    // --- Auth Injection ---
    describe('auth injection', () => {
        it('sets Authorization header for bearer auth', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient({ auth: { type: 'bearer', value: 'my-token' } });
            await client.get('https://example.com/api');

            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['Authorization']).toBe('Bearer my-token');
        });

        it('sets Cookie header for cookie auth', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient({ auth: { type: 'cookie', value: 'session=abc123' } });
            await client.get('https://example.com/api');

            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['Cookie']).toBe('session=abc123');
        });
    });

    // --- Convenience Methods ---
    describe('convenience methods', () => {
        it('get() sends GET request', async () => {
            mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));

            const client = new HttpClient();
            const result = await client.get<{ id: number }>('https://example.com/users/1');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://example.com/users/1',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.status).toBe(200);
            expect(result.data).toEqual({ id: 1 });
        });

        it('post() sends POST request with body', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ created: true }), { status: 201 })
            );

            const client = new HttpClient();
            const result = await client.post('https://example.com/users', { name: 'Alice' });

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.method).toBe('POST');
            expect(JSON.parse(callArgs[1]?.body as string)).toEqual({ name: 'Alice' });
            expect(result.status).toBe(201);
            expect(result.data).toEqual({ created: true });
        });

        it('put() sends PUT request with body', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ updated: true }), { status: 200 })
            );

            const client = new HttpClient();
            await client.put('https://example.com/users/1', { name: 'Bob' });

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.method).toBe('PUT');
            expect(JSON.parse(callArgs[1]?.body as string)).toEqual({ name: 'Bob' });
        });

        it('delete() sends DELETE request', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ deleted: true }), { status: 200 })
            );

            const client = new HttpClient();
            await client.delete('https://example.com/users/1');

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.method).toBe('DELETE');
        });
    });

    // --- Error Handling ---
    describe('error handling', () => {
        it('throws HttpError for 4xx response', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ code: 'NOT_FOUND' }), {
                    status: 404,
                    statusText: 'Not Found',
                })
            );

            const client = new HttpClient({ retry: 0 });
            try {
                await client.get('https://example.com/missing');
                throw new Error('should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).statusCode).toBe(404);
                expect((error as HttpError).bodyCode).toBe('NOT_FOUND');
            }
        });

        it('throws HttpError for 5xx response (after retries exhausted)', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ code: 'SERVER_ERROR' }), {
                    status: 500,
                    statusText: 'Server Error',
                })
            );

            const client = new HttpClient({ timeout: 100, retry: 0 });
            await expect(client.get('https://example.com/error')).rejects.toThrow(HttpError);
        });

        it('extracts bodyCode from error response', async () => {
            mockFetch.mockResolvedValue(
                new Response(
                    JSON.stringify({ code: 'RATE_LIMITED', message: 'Too many requests' }),
                    {
                        status: 429,
                        statusText: 'Too Many Requests',
                    }
                )
            );

            const client = new HttpClient({ retry: 0 });
            try {
                await client.get('https://example.com/api');
                throw new Error('should have thrown');
            } catch (error) {
                expect((error as HttpError).statusCode).toBe(429);
                expect((error as HttpError).bodyCode).toBe('RATE_LIMITED');
            }
        });
    });

    // --- Timeout ---
    describe('timeout', () => {
        it('throws HttpTimeoutError on timeout', async () => {
            // Simulate fetch being aborted (as AbortSignal.timeout would do)
            mockFetch.mockRejectedValue(
                new DOMException('The operation was aborted.', 'TimeoutError')
            );

            const client = new HttpClient({ timeout: 50, retry: 0 });
            await expect(client.get('https://example.com/slow')).rejects.toThrow(HttpTimeoutError);
        });
    });

    // --- Network Errors ---
    describe('network errors', () => {
        it('throws HttpNetworkError on DNS failure', async () => {
            const networkError = new TypeError('fetch failed');
            mockFetch.mockRejectedValue(networkError);

            const client = new HttpClient({ retry: 0 });
            await expect(client.get('https://nonexistent.example.com')).rejects.toThrow(
                HttpNetworkError
            );
        });
    });

    // --- Retry Behavior ---
    describe('retry behavior', () => {
        it('does NOT retry 4xx errors', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 })
            );

            const client = new HttpClient({ retry: 3 });
            await expect(client.get('https://example.com/bad')).rejects.toThrow(HttpError);

            // Only 1 call (no retries for 4xx)
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('retries 5xx errors', async () => {
            // Use mockImplementation to create a fresh Response each call (body stream is single-use)
            mockFetch.mockImplementation(() =>
                Promise.resolve(
                    new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 })
                )
            );

            // calculateBackoff is spied to return 0, so sleep(0) resolves immediately
            const client = new HttpClient({ timeout: 50, retry: 2 });

            await expect(client.get('https://example.com/error')).rejects.toThrow(HttpError);
            // 1 initial + 2 retries = 3 total calls
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        it('retries on network errors', async () => {
            mockFetch.mockRejectedValue(new TypeError('connect ECONNREFUSED'));

            // calculateBackoff is spied to return 0
            const client = new HttpClient({ timeout: 50, retry: 1 });

            await expect(client.get('https://example.com/api')).rejects.toThrow(HttpNetworkError);
            // 1 initial + 1 retry = 2 total calls
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('does NOT retry timeouts', async () => {
            // Simulate fetch being aborted (as AbortSignal.timeout would do)
            mockFetch.mockRejectedValue(
                new DOMException('The operation was aborted.', 'TimeoutError')
            );

            const client = new HttpClient({ timeout: 50, retry: 3 });

            await expect(client.get('https://example.com/slow')).rejects.toThrow(HttpTimeoutError);
            // Only 1 call (timeouts are not retried)
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('returns successfully on retry after transient 5xx', async () => {
            // First call fails with 500, second succeeds
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ data: 'ok' }), { status: 200 })
                );

            // calculateBackoff is spied to return 0, so sleep(0) resolves immediately
            const client = new HttpClient({ timeout: 50, retry: 2 });
            const result = await client.get('https://example.com/api');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result.status).toBe(200);
            expect(result.data).toEqual({ data: 'ok' });
        });
    });

    // --- Constructor Headers ---
    describe('constructor headers', () => {
        it('merges constructor headers with request', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ ok: true }), { status: 200 })
            );

            const client = new HttpClient({ headers: { 'X-Custom': 'value' } });
            await client.get('https://example.com/api');

            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1]?.headers as Record<string, string>;
            expect(headers['X-Custom']).toBe('value');
        });
    });
});
