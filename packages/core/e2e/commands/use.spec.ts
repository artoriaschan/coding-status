/**
 * Tests for use command
 *
 * Per CLI-04:
 * - Switch current provider to specified name
 * - Validate provider exists
 * - Show success/error message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';

import { registerUse } from '../../src/commands/use.js';

// Mock dependencies
vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
  },
}));

// Import mocked functions after mocking
import { loadConfig, saveConfig } from '../../src/config/index.js';

describe('registerUse', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default config mock with two providers
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [
        { name: 'provider-one', type: 'bailian', packageName: '@cdps/usage-adapter-bailian', credentials: { accessKeyId: 'key1', accessKeySecret: 'secret1' } },
        { name: 'provider-two', type: 'bailian', packageName: '@cdps/usage-adapter-bailian', credentials: { accessKeyId: 'key2', accessKeySecret: 'secret2' } },
      ],
      current: 'provider-one',
      cacheTtl: 300,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register "use <provider>" command with Commander program', () => {
    // Arrange
    const program = new Command();
    const commandSpy = vi.spyOn(program, 'command');

    // Act
    registerUse(program);

    // Assert
    expect(commandSpy).toHaveBeenCalledWith('use <provider>');
  });

  it('should have correct description for use command', () => {
    // Arrange
    const program = new Command();

    // Act
    registerUse(program);

    // Assert
    const commands = program.commands;
    const useCommand = commands.find((cmd) => cmd.name() === 'use');
    expect(useCommand).toBeDefined();
    expect(useCommand?.description()).toBe('Switch to a different provider');
  });

  it('should load config and find provider by name', async () => {
    // Arrange
    const program = new Command();
    registerUse(program);

    // Act
    const useCommand = program.commands.find((cmd) => cmd.name() === 'use');
    await useCommand?.parseAsync(['provider-two'], { from: 'user' });

    // Assert
    expect(loadConfig).toHaveBeenCalled();
  });

  it('should update config.current to specified provider', async () => {
    // Arrange
    const program = new Command();
    registerUse(program);

    // Act
    const useCommand = program.commands.find((cmd) => cmd.name() === 'use');
    await useCommand?.parseAsync(['provider-two'], { from: 'user' });

    // Assert
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 'provider-two',
      }),
    );
  });

  it('should save config after update', async () => {
    // Arrange
    const program = new Command();
    registerUse(program);

    // Act
    const useCommand = program.commands.find((cmd) => cmd.name() === 'use');
    await useCommand?.parseAsync(['provider-two'], { from: 'user' });

    // Assert
    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  it('should show error when provider does not exist', async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = new Command();
    registerUse(program);

    // Act
    const useCommand = program.commands.find((cmd) => cmd.name() === 'use');
    await useCommand?.parseAsync(['non-existent'], { from: 'user' });

    // Assert
    expect(chalk.red).toHaveBeenCalledWith('Error: Provider "non-existent" not found.');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Run `cdps list`'));
    expect(saveConfig).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should show success message after switching', async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = new Command();
    registerUse(program);

    // Act
    const useCommand = program.commands.find((cmd) => cmd.name() === 'use');
    await useCommand?.parseAsync(['provider-two'], { from: 'user' });

    // Assert
    expect(chalk.green).toHaveBeenCalledWith('Switched to provider "provider-two".');
    expect(saveConfig).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});