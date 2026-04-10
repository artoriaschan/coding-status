/**
 * Tests for rm command
 *
 * Per CLI-05:
 * - Delete provider from config
 * - Fail if provider is current (cannot delete active)
 * - Validate provider exists
 * - Clear current if deleted provider was current
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';

import { registerRm } from '../../src/commands/rm.js';

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

describe('registerRm', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default config mock with two providers
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'provider-one',
                    type: 'bailian',
                    packageName: '@cdps/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key1', accessKeySecret: 'secret1' },
                },
                {
                    name: 'provider-two',
                    type: 'bailian',
                    packageName: '@cdps/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key2', accessKeySecret: 'secret2' },
                },
            ],
            current: 'provider-one',
            cacheTtl: 300,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should register "rm <provider>" command with Commander program', () => {
        // Arrange
        const program = new Command();
        const commandSpy = vi.spyOn(program, 'command');

        // Act
        registerRm(program);

        // Assert
        expect(commandSpy).toHaveBeenCalledWith('rm <provider>');
    });

    it('should have "remove" alias for rm command', () => {
        // Arrange
        const program = new Command();

        // Act
        registerRm(program);

        // Assert
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        expect(rmCommand).toBeDefined();
        expect(rmCommand?.aliases()).toContain('remove');
    });

    it('should have correct description for rm command', () => {
        // Arrange
        const program = new Command();

        // Act
        registerRm(program);

        // Assert
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        expect(rmCommand?.description()).toBe('Remove a provider configuration');
    });

    it('should load config and find provider by name', async () => {
        // Arrange
        const program = new Command();
        registerRm(program);

        // Act
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-two'], { from: 'user' });

        // Assert
        expect(loadConfig).toHaveBeenCalled();
    });

    it('should show error when provider does not exist', async () => {
        // Arrange
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const program = new Command();
        registerRm(program);

        // Act
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['non-existent'], { from: 'user' });

        // Assert
        expect(chalk.red).toHaveBeenCalledWith('Error: Provider "non-existent" not found.');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Run `cdps list`'));
        expect(saveConfig).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should show error when trying to delete current provider', async () => {
        // Arrange
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const program = new Command();
        registerRm(program);

        // Act - provider-one is the current provider
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-one'], { from: 'user' });

        // Assert
        expect(chalk.red).toHaveBeenCalledWith(
            'Error: Cannot delete current provider "provider-one".'
        );
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cdps use'));
        expect(saveConfig).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should remove provider from config.providers array', async () => {
        // Arrange
        const program = new Command();
        registerRm(program);

        // Act - delete provider-two (not current)
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-two'], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                providers: expect.arrayContaining([
                    expect.objectContaining({ name: 'provider-one' }),
                ]),
            })
        );

        // Verify provider-two is NOT in the saved providers
        const savedCall = vi.mocked(saveConfig).mock.calls[0][0];
        expect(savedCall.providers.find(p => p.name === 'provider-two')).toBeUndefined();
    });

    it('should save config after deletion', async () => {
        // Arrange
        const program = new Command();
        registerRm(program);

        // Act
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-two'], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledTimes(1);
    });

    it('should show success message after deletion', async () => {
        // Arrange
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const program = new Command();
        registerRm(program);

        // Act
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-two'], { from: 'user' });

        // Assert
        expect(chalk.green).toHaveBeenCalledWith('Provider "provider-two" removed.');
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should preserve current when deleting non-current provider', async () => {
        // Arrange
        const program = new Command();
        registerRm(program);

        // Act - delete provider-two, current is provider-one
        const rmCommand = program.commands.find(cmd => cmd.name() === 'rm');
        await rmCommand?.parseAsync(['provider-two'], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                current: 'provider-one', // unchanged
            })
        );
    });
});
