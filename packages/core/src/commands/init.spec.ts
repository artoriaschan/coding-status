/**
 * Tests for init command
 *
 * Per D-16:
 * - Creates ~/.cdps/ directory
 * - Creates config.json with empty providers array
 * - Creates settings.json with DEFAULT_SETTINGS
 * - Updates Claude Code settings.json (if exists)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

import { registerInit } from './init.js';

// Mock dependencies
vi.mock('../config/index.js', () => ({
  saveConfig: vi.fn(),
  updateClaudeSettings: vi.fn(),
}));

vi.mock('@cdps/widget-renderer', () => ({
  saveSettings: vi.fn(),
  DEFAULT_SETTINGS: {
    cacheTtl: 300000,
    rows: [
      [
        { widget: 'provider', color: 'cyan' },
        { widget: 'separator' },
        { widget: 'usage', options: { dimension: '5h', label: '5h' } },
      ],
    ],
    theme: {
      barColors: { low: 'green', medium: 'yellow', high: 'red' },
      thresholds: { low: 50, medium: 80 },
    },
    plain: false,
  },
}));

// Import mocked functions after mocking
import { saveConfig, updateClaudeSettings } from '../config/index.js';
import { saveSettings, DEFAULT_SETTINGS } from '@cdps/widget-renderer';

describe('registerInit', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should register "init" command with Commander program', () => {
    // Arrange
    const program = new Command();
    const commandSpy = vi.spyOn(program, 'command');

    // Act
    registerInit(program);

    // Assert
    expect(commandSpy).toHaveBeenCalledWith('init');
  });

  it('should have correct description for init command', () => {
    // Arrange
    const program = new Command();

    // Act
    registerInit(program);

    // Assert
    const commands = program.commands;
    const initCommand = commands.find((cmd) => cmd.name() === 'init');
    expect(initCommand).toBeDefined();
    expect(initCommand?.description()).toBe(
      'Initialize ~/.cdps/ directory and configure Claude Code statusline',
    );
  });

  it('should create config.json with empty providers array', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(saveConfig).toHaveBeenCalledWith({
      providers: [],
      current: undefined,
      cacheTtl: 300,
    });
  });

  it('should create settings.json with DEFAULT_SETTINGS', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(saveSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it('should call updateClaudeSettings', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);
    vi.mocked(updateClaudeSettings).mockResolvedValue(true);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(updateClaudeSettings).toHaveBeenCalled();
  });

  it('should output success message', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);
    vi.mocked(updateClaudeSettings).mockResolvedValue(true);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('Initialization complete!');
    expect(consoleLogSpy).toHaveBeenCalledWith('Config directory: ~/.cdps/');
    expect(consoleLogSpy).toHaveBeenCalledWith('Next step: Run `cdps add` to add a provider');
  });

  it('should output message when Claude Code settings updated', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);
    vi.mocked(updateClaudeSettings).mockResolvedValue(true);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('Updated Claude Code settings.json');
  });

  it('should output message when Claude Code settings not found', async () => {
    // Arrange
    const program = new Command();
    registerInit(program);
    vi.mocked(updateClaudeSettings).mockResolvedValue(false);

    // Act - trigger the action handler
    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');
    await initCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Claude Code settings.json not found (skipped)',
    );
  });
});