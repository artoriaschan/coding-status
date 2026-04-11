/**
 * Bailian console API client for queryCodingPlanInstanceInfoV2
 *
 * Replaces the CMS SDK (DescribeMetricList) with direct HTTP calls
 * via @coding-status/http-client using browser cookie authentication.
 */

import { HttpClient } from '@coding-status/http-client';

// =============================================================================
// Constants
// =============================================================================

/** Bailian console API endpoint for coding plan quota info */
export const BAILIAN_API_URL =
    'https://bailian-cs.console.aliyun.com/data/api.json?action=BroadScopeAspnGateway&product=sfm_bailian&api=zeldaEasy.broadscope-bailian.codingPlan.queryCodingPlanInstanceInfoV2&_v=undefined';

// =============================================================================
// Types
// =============================================================================

/**
 * Credentials for Bailian console API authentication
 *
 * Per D-05: Replaces accessKeyId/accessKeySecret with browser cookie + sec_token + region.
 */
export interface BailianCredentials {
    cookie: string;
    sec_token: string;
    region: string;
}

/**
 * Quota info returned from the Bailian console API
 *
 * Per D-07: Field mappings for 5h/week/month usage dimensions.
 */
export interface CodingPlanQuotaInfo {
    per5HourUsedQuota: number;
    per5HourTotalQuota: number;
    perWeekUsedQuota: number;
    perWeekTotalQuota: number;
    perBillMonthUsedQuota: number;
    perBillMonthTotalQuota: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract a cookie value from a cookie string
 */
function extractCookieValue(cookieString: string, key: string): string {
    const found = cookieString
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${key}=`));
    if (!found) return '';
    // Preserve '=' in value by splitting with limit
    const idx = found.indexOf('=');
    return idx >= 0 ? found.slice(idx + 1) : '';
}

/**
 * Build the form-urlencoded request body for the Bailian console API
 *
 * Per D-02: Constructs params JSON with static fields, dynamic cookie extraction,
 * and magic numbers. Returns URL-encoded form string.
 *
 * Body format: params=<URL-encoded JSON>&region=<region>&sec_token=<token>
 */
export function buildRequestBody(options: {
    region: string;
    sec_token: string;
    cookie: string;
}): string {
    const cna = extractCookieValue(options.cookie, 'cna');
    const aliyunLang = extractCookieValue(options.cookie, 'aliyun_lang');
    const lang = aliyunLang === 'zh' ? 'zh-CN' : aliyunLang || 'en-US';

    const params = {
        Api: 'queryCodingPlanInstanceInfoV2',
        V: '1.0',
        onlyLatestOne: '1',
        protocol: 'https',
        console: 'true',
        productCode: 'sfm_bailian',
        domain: 'bailian-cs.console.aliyun.com',
        consoleSite: 'bailian-cs.console.aliyun.com',
        region: options.region,
        feURL: `https://bailian.console.aliyun.com/${options.region}/?tab=coding-plan#/efm/coding-plan-detail`,
        feTraceId: crypto.randomUUID(),
        commodityCode: 'sfm_codingplan_public_cn',
        switchAgent: '14705871',
        switchUserType: '3',
        cornerstoneParam: JSON.stringify({
            'X-Anonymous-Id': cna,
            xsp_lang: lang,
        }),
    };

    return `params=${encodeURIComponent(JSON.stringify(params))}&region=${encodeURIComponent(options.region)}&sec_token=${encodeURIComponent(options.sec_token)}`;
}

/**
 * Parse the Bailian console API response to extract quota info
 *
 * Per D-07: Navigates nested response path:
 * data.DataV2.data.data.codingPlanInstanceInfos[0].codingPlanQuotaInfo
 *
 * @param data - Raw API response body
 * @returns Parsed CodingPlanQuotaInfo
 * @throws Error if response structure is invalid or API returned an error
 */
export function parseQuotaInfo(data: unknown): CodingPlanQuotaInfo {
    const root = data as Record<string, unknown>;

    // Check outer code
    if (root.code !== '200') {
        throw new Error(`API returned code ${String(root.code)}`);
    }

    const innerData = root.data as Record<string, unknown> | undefined;
    if (!innerData) {
        throw new Error('API response missing data field');
    }

    // Check success flag
    if (innerData.success !== true) {
        throw new Error('API returned success: false');
    }

    // Navigate: data.DataV2.data.data.codingPlanInstanceInfos[0].codingPlanQuotaInfo
    const dataV2 = innerData.DataV2 as Record<string, unknown> | undefined;
    if (!dataV2) {
        throw new Error('Response missing DataV2 field');
    }

    const level1 = dataV2.data as Record<string, unknown> | undefined;
    if (!level1) {
        throw new Error('Response missing DataV2.data field');
    }

    const level2 = level1.data as Record<string, unknown> | undefined;
    if (!level2) {
        throw new Error('Response missing DataV2.data.data field');
    }

    const instances = level2.codingPlanInstanceInfos as
        | Array<Record<string, unknown>>
        | undefined;

    if (!instances || instances.length === 0) {
        throw new Error(
            'No coding plan instances found — cookie may have expired. Please re-copy your browser cookie from DevTools.'
        );
    }

    const quotaInfo = instances[0].codingPlanQuotaInfo as
        | CodingPlanQuotaInfo
        | undefined;

    if (!quotaInfo) {
        throw new Error('codingPlanQuotaInfo not found in response');
    }

    // Validate required numeric fields
    const requiredFields: (keyof CodingPlanQuotaInfo)[] = [
        'per5HourUsedQuota', 'per5HourTotalQuota',
        'perWeekUsedQuota', 'perWeekTotalQuota',
        'perBillMonthUsedQuota', 'perBillMonthTotalQuota',
    ];
    for (const field of requiredFields) {
        if (typeof quotaInfo[field] !== 'number') {
            throw new Error(`Invalid or missing quota field: ${String(field)}`);
        }
    }

    return quotaInfo;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch coding plan quota info from the Bailian console API
 *
 * Creates an HttpClient with cookie auth, sends a POST request with
 * form-urlencoded body, and parses the nested response.
 *
 * @param credentials - Bailian credentials (cookie, sec_token, region)
 * @returns Parsed CodingPlanQuotaInfo
 * @throws HttpError, HttpTimeoutError, HttpNetworkError, or parsing errors
 */
export async function fetchQuotaInfo(
    credentials: BailianCredentials
): Promise<CodingPlanQuotaInfo> {
    const client = new HttpClient({
        auth: { type: 'cookie', value: credentials.cookie },
        timeout: 10_000,
        retry: 2,
    });

    const rawBody = buildRequestBody({
        region: credentials.region,
        sec_token: credentials.sec_token,
        cookie: credentials.cookie,
    });

    const { data } = await client.request({
        url: BAILIAN_API_URL,
        method: 'POST',
        rawBody,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    return parseQuotaInfo(data);
}
