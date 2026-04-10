/**
 * Tests for statusline command
 *
 * Phase 6: Full integration with adapter loading, timeout protection,
 * silent failure mode, and proper output format per D-14~21.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

import { registerStatusline } from '../../src/commands/statusline.js';

// Mock config module
vi.mock('../../src/config/index.js', () => ({
    loadConfig: vi.fn(),
}));

// Mock widget-renderer module
vi.mock('@coding-status/widget-renderer', () => ({
    loadSettings: vi.fn(),
    renderStatusLine: vi.fn(),
    setPlainMode: vi.fn(),
}));

// Mock AdapterLoader
vi.mock('../../src/adapters/loader.js', () => ({
    AdapterLoader: {
        getInstance: vi.fn(),
    },
}));

// Mock timeout utility
vi.mock('../../src/utils/index.js', () => ({
    withTimeout: vi.fn(),
    TimeoutError: class TimeoutError extends Error {
        constructor(operation: string, timeoutMs: number) {
            super(`${operation} timed out after ${timeoutMs}ms`);
            this.name = 'TimeoutError';
        }
    },
    STATUSLINE_TIMEOUT_MS: 1000,
}));

// Import mocked functions after mocking
import { loadConfig } from '../../src/config/index.js';
import { loadSettings, renderStatusLine, setPlainMode } from '@coding-status/widget-renderer';
import { AdapterLoader } from '../../src/adapters/loader.js';
import { withTimeout, TimeoutError, STATUSLINE_TIMEOUT_MS } from '../../src/utils/index.js';
import type { UsageAdapter, UsageDimension, Settings } from '@coding-status/widget-renderer';

describe('registerStatusline', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
    let mockAdapter: UsageAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

        // Create mock adapter
        mockAdapter = {
            name: 'bailian',
            displayName: 'Aliyun Bailian',
            init: vi.fn().mockResolvedValue(undefined),
            getDimensions: vi.fn().mockResolvedValue([
                { key: '5h', label: '5 Hours' },
                { key: 'week', label: 'Weekly' },
            ] as UsageDimension[]),
            getUsage: vi.fn().mockImplementation(async (dim: string) => {
                if (dim === '5h') return 100;
                if (dim === 'week') return 500;
                return 0;
            }),
        };

        // Default mocks
        vi.mocked(AdapterLoader.getInstance).mockReturnValue({
            getAdapter: vi.fn().mockResolvedValue(mockAdapter),
            clearCache: vi.fn(),
            getCachedAdapterNames: vi.fn().mockReturnValue([]),
        } as unknown as AdapterLoader);

        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'test-provider',
                    type: 'bailian',
                    packageName: '@coding-status/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                },
            ],
            current: 'test-provider',
            cacheTtl: 300,
        });

        vi.mocked(loadSettings).mockResolvedValue({
            cacheTtl: 300000,
            rows: [[]],
            theme: {
                barColors: { low: 'green', medium: 'yellow', high: 'red' },
                thresholds: { low: 50, medium: 80 },
            },
            plain: false,
        } as Settings);

        vi.mocked(renderStatusLine).mockReturnValue('test-provider | usage: 100');

        // Default: withTimeout passes through the result
        vi.mocked(withTimeout).mockImplementation(async promise => promise);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.NO_COLOR;
    });

    describe('command registration', () => {
        it('should register "statusline" command with Commander program', () => {
            // Arrange
            const program = new Command();
            const commandSpy = vi.spyOn(program, 'command');

            // Act
            registerStatusline(program);

            // Assert
            expect(commandSpy).toHaveBeenCalledWith('statusline');
        });

        it('should have correct description indicating Phase 6 full integration', () => {
            // Arrange
            const program = new Command();

            // Act
            registerStatusline(program);

            // Assert
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            expect(statuslineCommand).toBeDefined();
            expect(statuslineCommand?.description()).toContain('Phase 6');
        });
    });

    describe('output format (STAT-05, D-18)', () => {
        it('should use process.stdout.write instead of console.log', async () => {
            // Arrange
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(stdoutWriteSpy).toHaveBeenCalled();
        });

        it('should not add newline to output', async () => {
            // Arrange
            vi.mocked(renderStatusLine).mockReturnValue('test-provider');
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            const output = stdoutWriteSpy.mock.calls[0][0];
            expect(output).not.toMatch(/\n$/); // No trailing newline
        });
    });

    describe('NO_COLOR support (STAT-04, D-19)', () => {
        it('should call setPlainMode(true) when NO_COLOR is set', async () => {
            // Arrange
            process.env.NO_COLOR = '1';
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(setPlainMode).toHaveBeenCalledWith(true);
        });

        it('should call setPlainMode(false) when NO_COLOR is not set and settings.plain is false', async () => {
            // Arrange
            vi.mocked(loadSettings).mockResolvedValue({
                cacheTtl: 300000,
                rows: [[]],
                theme: {
                    barColors: { low: 'green', medium: 'yellow', high: 'red' },
                    thresholds: { low: 50, medium: 80 },
                },
                plain: false,
            } as Settings);

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(setPlainMode).toHaveBeenCalledWith(false);
        });

        it('should call setPlainMode(true) when settings.plain is true', async () => {
            // Arrange
            vi.mocked(loadSettings).mockResolvedValue({
                cacheTtl: 300000,
                rows: [[]],
                theme: {
                    barColors: { low: 'green', medium: 'yellow', high: 'red' },
                    thresholds: { low: 50, medium: 80 },
                },
                plain: true,
            } as Settings);

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(setPlainMode).toHaveBeenCalledWith(true);
        });
    });

    describe('timeout protection (STAT-02, D-14, D-15)', () => {
        it('should wrap execution in withTimeout with STATUSLINE_TIMEOUT_MS', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(withTimeout).toHaveBeenCalledWith(
                expect.any(Promise),
                STATUSLINE_TIMEOUT_MS,
                'Statusline execution'
            );
        });

        it('should output provider name only when execution times out', async () => {
            // Arrange
            vi.mocked(withTimeout).mockRejectedValueOnce(
                new TimeoutError('Statusline execution', 1000)
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - should output provider name only, not call renderStatusLine
            expect(stdoutWriteSpy).toHaveBeenCalledWith('test-provider');
        });
    });

    describe('silent failure mode (STAT-03, D-17)', () => {
        it('should output provider name only when adapter init fails', async () => {
            // Arrange
            vi.mocked(AdapterLoader.getInstance).mockReturnValue({
                getAdapter: vi.fn().mockRejectedValue(new Error('Adapter init failed')),
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            } as unknown as AdapterLoader);

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(stdoutWriteSpy).toHaveBeenCalledWith('test-provider');
        });

        it('should output empty string when no provider configured', async () => {
            // Arrange
            vi.mocked(loadConfig).mockResolvedValue({
                providers: [],
                current: undefined,
                cacheTtl: 300,
            });

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - empty string, not message
            expect(stdoutWriteSpy).toHaveBeenCalledWith('');
        });

        it('should output empty string when current provider not found', async () => {
            // Arrange
            vi.mocked(loadConfig).mockResolvedValue({
                providers: [
                    {
                        name: 'other-provider',
                        type: 'bailian',
                        packageName: '@coding-status/usage-adapter-bailian',
                        credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                    },
                ],
                current: 'missing-provider',
                cacheTtl: 300,
            });

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(stdoutWriteSpy).toHaveBeenCalledWith('');
        });
    });

    describe('partial success handling (D-16)', () => {
        it('should show successful dimensions when some fail', async () => {
            // Arrange
            vi.mocked(mockAdapter.getUsage).mockImplementation(async (dim: string) => {
                if (dim === '5h') return 100;
                throw new Error('week fetch failed');
            });

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - renderStatusLine should be called with partial data
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    usageData: { '5h': 100 }, // week not included
                }),
                expect.anything()
            );
        });

        it('should still render when all dimensions fail', async () => {
            // Arrange
            vi.mocked(mockAdapter.getUsage).mockRejectedValue(new Error('All failed'));

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - should still call renderStatusLine with empty usageData
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    usageData: {},
                }),
                expect.anything()
            );
        });
    });

    describe('adapter integration (D-21)', () => {
        it('should load adapter via AdapterLoader', async () => {
            // Arrange
            const mockLoader = {
                getAdapter: vi.fn().mockResolvedValue(mockAdapter),
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            };
            vi.mocked(AdapterLoader.getInstance).mockReturnValue(
                mockLoader as unknown as AdapterLoader
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(mockLoader.getAdapter).toHaveBeenCalledWith(
                '@coding-status/usage-adapter-bailian',
                {
                    accessKeyId: 'key',
                    accessKeySecret: 'secret',
                }
            );
        });

        it('should call adapter.getDimensions', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(mockAdapter.getDimensions).toHaveBeenCalled();
        });

        it('should call adapter.getUsage for each dimension', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(mockAdapter.getUsage).toHaveBeenCalledWith('5h');
            expect(mockAdapter.getUsage).toHaveBeenCalledWith('week');
        });

        it('should use adapter displayName in context', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    providerDisplayName: 'Aliyun Bailian',
                }),
                expect.anything()
            );
        });
    });

    describe('render context', () => {
        it('should pass dimensions from adapter to renderStatusLine', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    dimensions: [
                        { key: '5h', label: '5 Hours' },
                        { key: 'week', label: 'Weekly' },
                    ],
                }),
                expect.anything()
            );
        });

        it('should pass terminal width to renderStatusLine', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    terminalWidth: expect.any(Number),
                }),
                expect.anything()
            );
        });

        it('should use usage data from adapter', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    usageData: { '5h': 100, week: 500 },
                }),
                expect.anything()
            );
        });
    });

    // =============================================================================
    // Integration Tests (Phase 6 Plan 03)
    // =============================================================================

    describe('integration', () => {
        it('should complete full flow: load config -> load adapter -> fetch data -> render', async () => {
            // Arrange - create mock loader that simulates real getAdapter behavior (calls init)
            const initSpy = vi.fn().mockResolvedValue(undefined);
            const getDimensionsSpy = vi.fn().mockResolvedValue([
                { key: '5h', label: '5 Hours' },
                { key: 'week', label: 'Weekly' },
            ] as UsageDimension[]);
            const getUsageSpy = vi.fn().mockImplementation(async (dim: string) => {
                if (dim === '5h') return 100;
                if (dim === 'week') return 500;
                return 0;
            });

            const adapterWithSpies = {
                name: 'bailian',
                displayName: 'Aliyun Bailian',
                init: initSpy,
                getDimensions: getDimensionsSpy,
                getUsage: getUsageSpy,
            };

            // Mock getAdapter to call init before returning (simulates real loader behavior)
            const getAdapterMock = vi.fn().mockImplementation(async () => {
                await adapterWithSpies.init();
                return adapterWithSpies;
            });

            const mockLoader = {
                getAdapter: getAdapterMock,
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            };
            vi.mocked(AdapterLoader.getInstance).mockReturnValue(
                mockLoader as unknown as AdapterLoader
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - verify full flow was executed
            expect(loadConfig).toHaveBeenCalled();
            expect(AdapterLoader.getInstance).toHaveBeenCalled();
            expect(initSpy).toHaveBeenCalled(); // init is called by loader
            expect(getDimensionsSpy).toHaveBeenCalled();
            expect(getUsageSpy).toHaveBeenCalled();
            expect(renderStatusLine).toHaveBeenCalled();
            expect(stdoutWriteSpy).toHaveBeenCalled();
        });

        it('should render with correct RenderContext structure', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - verify RenderContext structure
            const ctx = vi.mocked(renderStatusLine).mock.calls[0][0];
            expect(ctx).toHaveProperty('activeProvider');
            expect(ctx).toHaveProperty('providerDisplayName');
            expect(ctx).toHaveProperty('dimensions');
            expect(ctx).toHaveProperty('usageData');
            expect(ctx).toHaveProperty('terminalWidth');
            expect(ctx).toHaveProperty('settings');

            // Verify dimensions have correct structure
            expect(ctx.dimensions).toHaveLength(2);
            expect(ctx.dimensions[0]).toHaveProperty('key');
            expect(ctx.dimensions[0]).toHaveProperty('label');

            // Verify usageData has correct keys
            expect(ctx.usageData).toHaveProperty('5h');
            expect(ctx.usageData).toHaveProperty('week');
        });

        it('should handle adapter returning empty dimensions', async () => {
            // Arrange - create adapter with empty dimensions
            const adapterWithEmptyDims = {
                name: 'bailian',
                displayName: 'Aliyun Bailian',
                init: vi.fn().mockResolvedValue(undefined),
                getDimensions: vi.fn().mockResolvedValue([]),
                getUsage: vi.fn().mockResolvedValue(0),
            };

            const getAdapterMock = vi.fn().mockImplementation(async () => {
                await adapterWithEmptyDims.init();
                return adapterWithEmptyDims;
            });

            const mockLoader = {
                getAdapter: getAdapterMock,
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            };
            vi.mocked(AdapterLoader.getInstance).mockReturnValue(
                mockLoader as unknown as AdapterLoader
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - should still render with empty dimensions
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    dimensions: [],
                    usageData: {},
                }),
                expect.anything()
            );
        });

        it('should pass adapter displayName to context', async () => {
            // Arrange - create adapter with custom displayName
            const adapterWithCustomName = {
                name: 'bailian',
                displayName: 'Custom Provider Display',
                init: vi.fn().mockResolvedValue(undefined),
                getDimensions: vi
                    .fn()
                    .mockResolvedValue([{ key: '5h', label: '5 Hours' }] as UsageDimension[]),
                getUsage: vi.fn().mockResolvedValue(100),
            };

            const getAdapterMock = vi.fn().mockImplementation(async () => {
                await adapterWithCustomName.init();
                return adapterWithCustomName;
            });

            const mockLoader = {
                getAdapter: getAdapterMock,
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            };
            vi.mocked(AdapterLoader.getInstance).mockReturnValue(
                mockLoader as unknown as AdapterLoader
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    providerDisplayName: 'Custom Provider Display',
                }),
                expect.anything()
            );
        });

        it('should handle three dimensions (5h, week, month)', async () => {
            // Arrange - mock three dimensions like Bailian adapter
            const adapterWithThreeDims = {
                name: 'bailian',
                displayName: 'Aliyun Bailian',
                init: vi.fn().mockResolvedValue(undefined),
                getDimensions: vi.fn().mockResolvedValue([
                    { key: '5h', label: '5 Hours', category: 'usage' },
                    { key: 'week', label: 'Weekly', category: 'usage' },
                    { key: 'month', label: 'Monthly', category: 'usage' },
                ] as UsageDimension[]),
                getUsage: vi.fn().mockImplementation(async (dim: string) => {
                    const values: Record<string, number> = { '5h': 1000, week: 5000, month: 15000 };
                    return values[dim] ?? 0;
                }),
            };

            const getAdapterMock = vi.fn().mockImplementation(async () => {
                await adapterWithThreeDims.init();
                return adapterWithThreeDims;
            });

            const mockLoader = {
                getAdapter: getAdapterMock,
                clearCache: vi.fn(),
                getCachedAdapterNames: vi.fn().mockReturnValue([]),
            };
            vi.mocked(AdapterLoader.getInstance).mockReturnValue(
                mockLoader as unknown as AdapterLoader
            );

            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert
            expect(renderStatusLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    dimensions: expect.arrayContaining([
                        expect.objectContaining({ key: '5h' }),
                        expect.objectContaining({ key: 'week' }),
                        expect.objectContaining({ key: 'month' }),
                    ]),
                    usageData: { '5h': 1000, week: 5000, month: 15000 },
                }),
                expect.anything()
            );
        });
    });

    // =============================================================================
    // Execution Timing Tests (STAT-02)
    // =============================================================================

    describe('execution timing', () => {
        it('should complete within 1 second with successful adapter', async () => {
            // Arrange - fast mock adapter
            const program = new Command();
            registerStatusline(program);

            // Act
            const start = Date.now();
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });
            const elapsed = Date.now() - start;

            // Assert - STAT-02: execution should be fast (< 1000ms)
            // Note: mock operations are instant, so elapsed should be very small
            expect(elapsed).toBeLessThan(1000);
        });

        it('should respect timeout wrapper even on fast execution', async () => {
            // Arrange
            const program = new Command();
            registerStatusline(program);

            // Act
            const statuslineCommand = program.commands.find(cmd => cmd.name() === 'statusline');
            await statuslineCommand?.parseAsync([], { from: 'user' });

            // Assert - withTimeout should be called with 1000ms timeout
            expect(withTimeout).toHaveBeenCalledWith(
                expect.any(Promise),
                1000, // STATUSLINE_TIMEOUT_MS
                'Statusline execution'
            );
        });
    });
});
