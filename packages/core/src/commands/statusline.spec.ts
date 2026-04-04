/**
 * Tests for statusline command
 *
 * Phase 6: Full integration with adapter loading, timeout protection,
 * silent failure mode, and proper output format per D-14~21.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

import { registerStatusline } from './statusline.js';

// Mock config module
vi.mock('../config/index.js', () => ({
  loadConfig: vi.fn(),
}));

// Mock widget-renderer module
vi.mock('@cdps/widget-renderer', () => ({
  loadSettings: vi.fn(),
  renderStatusLine: vi.fn(),
  setPlainMode: vi.fn(),
}));

// Mock AdapterLoader
vi.mock('../adapters/loader.js', () => ({
  AdapterLoader: {
    getInstance: vi.fn(),
  },
}));

// Mock timeout utility
vi.mock('../utils/index.js', () => ({
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
import { loadConfig } from '../config/index.js';
import { loadSettings, renderStatusLine, setPlainMode } from '@cdps/widget-renderer';
import { AdapterLoader } from '../adapters/loader.js';
import { withTimeout, TimeoutError, STATUSLINE_TIMEOUT_MS } from '../utils/index.js';
import type { UsageAdapter, UsageDimension, Settings } from '@cdps/widget-renderer';

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
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
      current: 'test-provider',
      cacheTtl: 300,
    });

    vi.mocked(loadSettings).mockResolvedValue({
      cacheTtl: 300000,
      rows: [[]],
      theme: { barColors: { low: 'green', medium: 'yellow', high: 'red' }, thresholds: { low: 50, medium: 80 } },
      plain: false,
    } as Settings);

    vi.mocked(renderStatusLine).mockReturnValue('test-provider | usage: 100');

    // Default: withTimeout passes through the result
    vi.mocked(withTimeout).mockImplementation(async (promise) => promise);
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
      await statuslineCommand?.parseAsync([], { from: 'user' });

      // Assert
      expect(setPlainMode).toHaveBeenCalledWith(true);
    });

    it('should call setPlainMode(false) when NO_COLOR is not set and settings.plain is false', async () => {
      // Arrange
      vi.mocked(loadSettings).mockResolvedValue({
        cacheTtl: 300000,
        rows: [[]],
        theme: { barColors: { low: 'green', medium: 'yellow', high: 'red' }, thresholds: { low: 50, medium: 80 } },
        plain: false,
      } as Settings);

      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
      await statuslineCommand?.parseAsync([], { from: 'user' });

      // Assert
      expect(setPlainMode).toHaveBeenCalledWith(false);
    });

    it('should call setPlainMode(true) when settings.plain is true', async () => {
      // Arrange
      vi.mocked(loadSettings).mockResolvedValue({
        cacheTtl: 300000,
        rows: [[]],
        theme: { barColors: { low: 'green', medium: 'yellow', high: 'red' }, thresholds: { low: 50, medium: 80 } },
        plain: true,
      } as Settings);

      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
            packageName: '@cdps/usage-adapter-bailian',
            credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
          },
        ],
        current: 'missing-provider',
        cacheTtl: 300,
      });

      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      vi.mocked(AdapterLoader.getInstance).mockReturnValue(mockLoader as unknown as AdapterLoader);

      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
      await statuslineCommand?.parseAsync([], { from: 'user' });

      // Assert
      expect(mockLoader.getAdapter).toHaveBeenCalledWith(
        '@cdps/usage-adapter-bailian',
        { accessKeyId: 'key', accessKeySecret: 'secret' }
      );
    });

    it('should call adapter.getDimensions', async () => {
      // Arrange
      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
      await statuslineCommand?.parseAsync([], { from: 'user' });

      // Assert
      expect(mockAdapter.getDimensions).toHaveBeenCalled();
    });

    it('should call adapter.getUsage for each dimension', async () => {
      // Arrange
      const program = new Command();
      registerStatusline(program);

      // Act
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
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
      const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
      await statuslineCommand?.parseAsync([], { from: 'user' });

      // Assert
      expect(renderStatusLine).toHaveBeenCalledWith(
        expect.objectContaining({
          usageData: { '5h': 100, 'week': 500 },
        }),
        expect.anything()
      );
    });
  });
});