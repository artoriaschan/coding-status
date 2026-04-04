/**
 * Tests for doctor command
 *
 * Per CLI-06 and RESEARCH.md:
 * - Doctor validates config structure (Phase 3 scope)
 * - Adapter health validation deferred to Phase 5+
 * - Reports status for each provider
 * - Shows summary of providers checked
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';

import { registerDoctor } from './doctor.js';

// Mock dependencies - only mock loadConfig, keep real ConfigSchema for validation
vi.mock('../config/index.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config/index.js')>();
  return {
    ...original,
    loadConfig: vi.fn(),
  };
});

// Import mocked functions after mocking
import { loadConfig } from '../config/index.js';

describe('registerDoctor', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default config mock with valid structure
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [],
      current: undefined,
      cacheTtl: 300,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register "doctor" command with Commander program', () => {
    // Arrange
    const program = new Command();
    const commandSpy = vi.spyOn(program, 'command');

    // Act
    registerDoctor(program);

    // Assert
    expect(commandSpy).toHaveBeenCalledWith('doctor');
  });

  it('should have correct description for doctor command', () => {
    // Arrange
    const program = new Command();

    // Act
    registerDoctor(program);

    // Assert
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    expect(doctorCommand).toBeDefined();
    expect(doctorCommand?.description()).toBe('Validate provider configurations');
  });

  it('should load config from config-store', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [],
      current: undefined,
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(loadConfig).toHaveBeenCalled();
  });

  it('should output "Config structure: OK" when config is valid', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [],
      current: undefined,
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert - check that green OK message is displayed
    const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
    expect(output).toContain(chalk.green('Config structure: OK'));
  });

  it('should output "No providers configured" when providers array is empty', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [],
      current: undefined,
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('No providers configured.'));
  });

  it('should report status for each provider with name, type, and credentials info', async () => {
    // Arrange
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

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert - check provider status output
    const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
    expect(output).toContain('test-provider');
    expect(output).toContain('bailian');
    expect(output).toContain('@cdps/usage-adapter-bailian');
    expect(output).toContain('configured'); // credentials status
  });

  it('should show summary of providers checked', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [
        {
          name: 'provider1',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key1', accessKeySecret: 'secret1' },
        },
        {
          name: 'provider2',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key2', accessKeySecret: 'secret2' },
        },
      ],
      current: 'provider1',
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert - check summary output
    const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
    expect(output).toContain(chalk.green('All checks passed.'));
  });

  it('should mark current provider with (current) label', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [
        {
          name: 'current-provider',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
        {
          name: 'other-provider',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key2', accessKeySecret: 'secret2' },
        },
      ],
      current: 'current-provider',
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert - check current provider marked
    const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
    expect(output).toContain(chalk.cyan('(current)'));
  });

  it('should show "missing" for credentials when accessKeyId is not set', async () => {
    // Arrange
    vi.mocked(loadConfig).mockResolvedValue({
      providers: [
        {
          name: 'incomplete-provider',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeySecret: 'secret' }, // missing accessKeyId
        },
      ],
      current: 'incomplete-provider',
      cacheTtl: 300,
    });

    const program = new Command();
    registerDoctor(program);

    // Act
    const doctorCommand = program.commands.find((cmd) => cmd.name() === 'doctor');
    await doctorCommand?.parseAsync([], { from: 'user' });

    // Assert - check missing credentials indicator
    const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
    expect(output).toContain('missing');
  });
});