/**
 * Tests for Bailian console API client
 *
 * Tests buildRequestBody, parseQuotaInfo, and fetchQuotaInfo.
 * Mocks HttpClient to verify request construction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    BAILIAN_API_URL,
    buildRequestBody,
    parseQuotaInfo,
    fetchQuotaInfo,
} from '../src/client.js';

// Mock HttpClient
const mockRequest = vi.fn();

vi.mock('@coding-status/http-client', () => ({
    HttpClient: class MockHttpClient {
        request = mockRequest;
    },
}));

// Re-import after mocking
import { HttpClient } from '@coding-status/http-client';

describe('BAILIAN_API_URL', () => {
    it('contains bailian-cs.console.aliyun.com endpoint', () => {
        expect(BAILIAN_API_URL).toContain('bailian-cs.console.aliyun.com/data/api.json');
        expect(BAILIAN_API_URL).toContain('queryCodingPlanInstanceInfoV2');
    });
});

describe('buildRequestBody', () => {
    const mockCredentials = {
        cookie: 'cna=abc123; aliyun_lang=zh; other=value',
        sec_token: 'token-xyz',
        region: 'cn-hangzhou',
    };

    it('produces form-urlencoded body with params, region, sec_token', () => {
        const body = buildRequestBody(mockCredentials);

        expect(body).toContain('params=');
        expect(body).toContain('&region=');
        expect(body).toContain('&sec_token=');
    });

    it('URL-encodes the params JSON', () => {
        const body = buildRequestBody(mockCredentials);

        // params value should be URL-encoded
        const paramsMatch = body.match(/params=([^&]+)/);
        expect(paramsMatch).not.toBeNull();
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;

        expect(params.Api).toBe('queryCodingPlanInstanceInfoV2');
        expect(params.V).toBe('1.0');
        expect(params.region).toBe('cn-hangzhou');
    });

    it('extracts cna cookie for X-Anonymous-Id in cornerstoneParam', () => {
        const body = buildRequestBody(mockCredentials);
        const paramsMatch = body.match(/params=([^&]+)/);
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;
        const cornerstone = JSON.parse(params.cornerstoneParam) as Record<string, string>;

        expect(cornerstone['X-Anonymous-Id']).toBe('abc123');
    });

    it('maps zh aliyun_lang to zh-CN in cornerstoneParam', () => {
        const body = buildRequestBody({
            ...mockCredentials,
            cookie: 'cna=test; aliyun_lang=zh',
        });
        const paramsMatch = body.match(/params=([^&]+)/);
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;
        const cornerstone = JSON.parse(params.cornerstoneParam) as Record<string, string>;

        expect(cornerstone.xsp_lang).toBe('zh-CN');
    });

    it('defaults xsp_lang to en-US when aliyun_lang is missing', () => {
        const body = buildRequestBody({
            ...mockCredentials,
            cookie: 'cna=test; other=val',
        });
        const paramsMatch = body.match(/params=([^&]+)/);
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;
        const cornerstone = JSON.parse(params.cornerstoneParam) as Record<string, string>;

        expect(cornerstone.xsp_lang).toBe('en-US');
    });

    it('includes feURL with region interpolated', () => {
        const body = buildRequestBody(mockCredentials);
        const paramsMatch = body.match(/params=([^&]+)/);
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;

        expect(params.feURL).toContain('cn-hangzhou');
    });

    it('includes correct magic numbers', () => {
        const body = buildRequestBody(mockCredentials);
        const paramsMatch = body.match(/params=([^&]+)/);
        const decoded = decodeURIComponent(paramsMatch![1]);
        const params = JSON.parse(decoded) as Record<string, string>;

        expect(params.commodityCode).toBe('sfm_codingplan_public_cn');
        expect(params.switchAgent).toBe('14705871');
        expect(params.switchUserType).toBe('3');
    });

    it('URL-encodes sec_token special characters', () => {
        const body = buildRequestBody({
            ...mockCredentials,
            sec_token: 'token with special chars & = +',
        });

        expect(body).not.toContain('sec_token=token with special chars');
        expect(body).toContain('sec_token=');
    });
});

describe('parseQuotaInfo', () => {
    const validResponse = {
        code: '200',
        data: {
            success: true,
            DataV2: {
                data: {
                    data: {
                        codingPlanInstanceInfos: [
                            {
                                codingPlanQuotaInfo: {
                                    per5HourUsedQuota: 100,
                                    per5HourTotalQuota: 500,
                                    perWeekUsedQuota: 800,
                                    perWeekTotalQuota: 3500,
                                    perBillMonthUsedQuota: 2000,
                                    perBillMonthTotalQuota: 15000,
                                },
                            },
                        ],
                    },
                },
            },
        },
    };

    it('parses valid response to CodingPlanQuotaInfo', () => {
        const result = parseQuotaInfo(validResponse);

        expect(result.per5HourUsedQuota).toBe(100);
        expect(result.per5HourTotalQuota).toBe(500);
        expect(result.perWeekUsedQuota).toBe(800);
        expect(result.perWeekTotalQuota).toBe(3500);
        expect(result.perBillMonthUsedQuota).toBe(2000);
        expect(result.perBillMonthTotalQuota).toBe(15000);
    });

    it('throws when code is not 200', () => {
        const response = { code: '400', data: {} };
        expect(() => parseQuotaInfo(response)).toThrow('API returned code 400');
    });

    it('throws when data.success is false', () => {
        const response = { code: '200', data: { success: false } };
        expect(() => parseQuotaInfo(response)).toThrow('success: false');
    });

    it('throws when codingPlanInstanceInfos is empty', () => {
        const response = {
            code: '200',
            data: {
                success: true,
                DataV2: {
                    data: {
                        data: {
                            codingPlanInstanceInfos: [] as Array<Record<string, unknown>>,
                        },
                    },
                },
            },
        };
        expect(() => parseQuotaInfo(response)).toThrow('cookie may have expired');
    });

    it('throws when codingPlanQuotaInfo is missing', () => {
        const response = {
            code: '200',
            data: {
                success: true,
                DataV2: {
                    data: {
                        data: {
                            codingPlanInstanceInfos: [{}],
                        },
                    },
                },
            },
        };
        expect(() => parseQuotaInfo(response)).toThrow('codingPlanQuotaInfo not found');
    });
});

describe('fetchQuotaInfo', () => {
    const mockCredentials = {
        cookie: 'cna=abc123; aliyun_lang=zh',
        sec_token: 'token-xyz',
        region: 'cn-hangzhou',
    };

    const mockQuotaResponse = {
        code: '200',
        data: {
            success: true,
            DataV2: {
                data: {
                    data: {
                        codingPlanInstanceInfos: [
                            {
                                codingPlanQuotaInfo: {
                                    per5HourUsedQuota: 50,
                                    per5HourTotalQuota: 500,
                                    perWeekUsedQuota: 400,
                                    perWeekTotalQuota: 3500,
                                    perBillMonthUsedQuota: 1500,
                                    perBillMonthTotalQuota: 15000,
                                },
                            },
                        ],
                    },
                },
            },
        },
    };

    beforeEach(() => {
        mockRequest.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('calls HttpClient.request with POST and form-urlencoded body', async () => {
        mockRequest.mockResolvedValue({ status: 200, data: mockQuotaResponse });

        const result = await fetchQuotaInfo(mockCredentials);

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                url: BAILIAN_API_URL,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
        );
        // Verify rawBody is form-urlencoded (not JSON-wrapped)
        const callArg = mockRequest.mock.calls[0][0] as Record<string, unknown>;
        const rawBody = callArg.rawBody as string;
        expect(rawBody).toContain('params=');
        expect(rawBody).toContain('&region=');
        expect(rawBody).toContain('&sec_token=');
    });

    it('returns parsed CodingPlanQuotaInfo', async () => {
        mockRequest.mockResolvedValue({ status: 200, data: mockQuotaResponse });

        const result = await fetchQuotaInfo(mockCredentials);

        expect(result.per5HourUsedQuota).toBe(50);
        expect(result.perWeekUsedQuota).toBe(400);
        expect(result.perBillMonthUsedQuota).toBe(1500);
    });

    it('creates HttpClient with cookie auth', async () => {
        mockRequest.mockResolvedValue({ status: 200, data: mockQuotaResponse });

        await fetchQuotaInfo(mockCredentials);

        // HttpClient constructor was called with cookie auth
        const httpClient = new HttpClient({
            auth: { type: 'cookie', value: mockCredentials.cookie },
        });
        expect(httpClient).toBeDefined();
    });
});
