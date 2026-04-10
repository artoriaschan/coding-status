/**
 * Tests for list command
 *
 * Per CLI-03:
 * - List command shows providers in table format
 * - Shows provider name and type columns
 * - Current provider is marked with indicator
 * - Empty providers handled gracefully
 * - Chalk coloring for current provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';

import { registerList } from '../../src/commands/list.js';

// Mock dependencies
vi.mock('../../src/config/index.js', () => ({
    loadConfig: vi.fn(),
}));

// Import mocked functions after mocking
import { loadConfig } from '../../src/config/index.js';

describe('registerList', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Default config mock
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [],
            current: undefined,
            cacheTtl: 300,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should register "list" command with Commander program', () => {
        // Arrange
        const program = new Command();
        const commandSpy = vi.spyOn(program, 'command');

        // Act
        registerList(program);

        // Assert
        expect(commandSpy).toHaveBeenCalledWith('list');
    });

    it('should have "ls" as an alias for list command', () => {
        // Arrange
        const program = new Command();

        // Act
        registerList(program);

        // Assert
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        expect(listCommand).toBeDefined();
        expect(listCommand?.aliases()).toContain('ls');
    });

    it('should have correct description for list command', () => {
        // Arrange
        const program = new Command();

        // Act
        registerList(program);

        // Assert
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        expect(listCommand).toBeDefined();
        expect(listCommand?.description()).toBe('List configured providers');
    });

    it('should output "No providers configured" when providers array is empty', async () => {
        // Arrange
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [],
            current: undefined,
            cacheTtl: 300,
        });

        const program = new Command();
        registerList(program);

        // Act - trigger the action handler
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('No providers configured.');
    });

    it('should output table with name and type columns when providers exist', async () => {
        // Arrange
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'my-bailian',
                    type: 'bailian',
                    packageName: '@cdps/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                },
            ],
            current: 'my-bailian',
            cacheTtl: 300,
        });

        const program = new Command();
        registerList(program);

        // Act
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert - check that provider name and type are displayed
        const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
        expect(output).toContain('my-bailian');
        expect(output).toContain('bailian');
    });

    it('should mark current provider with indicator', async () => {
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
        registerList(program);

        // Act
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert
        const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
        expect(output).toContain('current');
    });

    it('should use chalk to highlight current provider row', async () => {
        // Arrange
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'highlighted-provider',
                    type: 'bailian',
                    packageName: '@cdps/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                },
            ],
            current: 'highlighted-provider',
            cacheTtl: 300,
        });

        const program = new Command();
        registerList(program);

        // Act
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert - check that chalk.cyan was used for the current provider name
        // The output should contain ANSI codes for cyan color
        const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
        // chalk.cyan adds ANSI escape codes
        expect(output).toContain(chalk.cyan('highlighted-provider'));
    });

    it('should show total count of providers', async () => {
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
        registerList(program);

        // Act
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('Total: 2 provider(s)');
    });

    it('should show Providers header with bold styling', async () => {
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
        registerList(program);

        // Act
        const listCommand = program.commands.find(cmd => cmd.name() === 'list');
        await listCommand?.parseAsync([], { from: 'user' });

        // Assert - check that bold "Providers:" is shown
        const output = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n');
        expect(output).toContain(chalk.bold('Providers:'));
    });
});
