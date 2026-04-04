/**
 * Tests for statusline command
 *
 * Per RESEARCH.md Open Questions:
 * - Implement statusline command structure in Phase 3
 * - Output placeholder until Phase 6 (adapter integration)
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
}));

// Import mocked functions after mocking
import { loadConfig } from '../config/index.js';
import { loadSettings, renderStatusLine } from '@cdps/widget-renderer';

describe('registerStatusline', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mocks
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
    });

    vi.mocked(renderStatusLine).mockReturnValue('test-provider | usage: N/A');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('should load config from config-store', async () => {
    // Arrange
    const program = new Command();
    registerStatusline(program);

    // Act
    const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
    await statuslineCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(loadConfig).toHaveBeenCalled();
  });

  it('should load settings from widget-renderer', async () => {
    // Arrange
    const program = new Command();
    registerStatusline(program);

    // Act
    const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
    await statuslineCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(loadSettings).toHaveBeenCalled();
  });

  it('should output "No provider configured" message when current is undefined', async () => {
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

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('No provider configured. Run `cdps add` first.');
  });

  it('should output "Current provider not found" when provider missing', async () => {
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
      current: 'missing-provider', // current doesn't match any provider
      cacheTtl: 300,
    });

    const program = new Command();
    registerStatusline(program);

    // Act
    const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
    await statuslineCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('Current provider not found in config.');
  });

  it('should call renderStatusLine with stub context containing provider info', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [
        {
          name: 'my-provider',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
      current: 'my-provider',
      cacheTtl: 300,
    });

    const program = new Command();
    registerStatusline(program);

    // Act
    const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
    await statuslineCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(renderStatusLine).toHaveBeenCalled();
    // Verify the context passed has correct RenderContext fields
    const callArgs = vi.mocked(renderStatusLine).mock.calls[0];
    expect(callArgs[0].activeProvider).toBe('my-provider');
    expect(callArgs[0].providerDisplayName).toBe('my-provider');
  });

  it('should pass empty usageData in context (Phase 3 stub)', async () => {
    // Arrange
    const program = new Command();
    registerStatusline(program);

    // Act
    const statuslineCommand = program.commands.find((cmd) => cmd.name() === 'statusline');
    await statuslineCommand?.parseAsync([], { from: 'user' });

    // Assert - usageData should be empty object (no adapter data in Phase 3)
    const callArgs = vi.mocked(renderStatusLine).mock.calls[0];
    expect(callArgs[0].usageData).toEqual({});
  });
});