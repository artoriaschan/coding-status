/**
 * Tests for add command
 *
 * Per D-13, D-14, D-15:
 * - Interactive flow with provider type selection (bailian only for first version)
 * - Provider name input with validation
 * - Credential input (accessKeyId, accessKeySecret)
 * - Duplicate name validation
 * - First provider becomes current automatically
 * - Cancel handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import * as p from '@clack/prompts';

import { registerAdd } from '../../src/commands/add.js';

// Mock dependencies
vi.mock('../../src/config/index.js', () => ({
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
    intro: vi.fn(),
    outro: vi.fn(),
    select: vi.fn(),
    text: vi.fn(),
    password: vi.fn(),
    spinner: vi.fn(),
    isCancel: vi.fn(),
    log: {
        error: vi.fn(),
    },
}));

// Import mocked functions after mocking
import { loadConfig, saveConfig } from '../../src/config/index.js';

describe('registerAdd', () => {
    let mockSpinner: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup spinner mock
        mockSpinner = {
            start: vi.fn(),
            stop: vi.fn(),
        };
        vi.mocked(p.spinner).mockReturnValue(
            mockSpinner as unknown as ReturnType<typeof p.spinner>
        );

        // Default config mock
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [],
            current: undefined,
            cacheTtl: 300,
        });

        // Default cancel check - no cancel
        vi.mocked(p.isCancel).mockReturnValue(false);

        // Default prompt responses
        vi.mocked(p.select).mockResolvedValue('bailian');
        vi.mocked(p.text).mockResolvedValue('my-bailian');
        vi.mocked(p.password).mockResolvedValue('my-secret');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should register "add" command with Commander program', () => {
        // Arrange
        const program = new Command();
        const commandSpy = vi.spyOn(program, 'command');

        // Act
        registerAdd(program);

        // Assert
        expect(commandSpy).toHaveBeenCalledWith('add');
    });

    it('should have correct description for add command', () => {
        // Arrange
        const program = new Command();

        // Act
        registerAdd(program);

        // Assert
        const commands = program.commands;
        const addCommand = commands.find(cmd => cmd.name() === 'add');
        expect(addCommand).toBeDefined();
        expect(addCommand?.description()).toBe('Add a new provider configuration');
    });

    it('should show intro message with @clack/prompts', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act - trigger the action handler
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.intro).toHaveBeenCalledWith('Add a new provider');
    });

    it('should prompt for provider type with bailian option only', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.select).toHaveBeenCalledWith({
            message: 'Select provider type',
            options: [{ value: 'bailian', label: 'Aliyun Bailian' }],
        });
    });

    it('should prompt for provider name with validation (min 1, max 32 chars)', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.text).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Provider name',
                placeholder: 'my-bailian',
            })
        );

        // Verify validate function exists
        const textCall = vi
            .mocked(p.text)
            .mock.calls.find(call => call[0]?.message === 'Provider name');
        expect(textCall?.[0]?.validate).toBeDefined();
    });

    it('should prompt for accessKeyId and accessKeySecret', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.text).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'AccessKey ID',
                placeholder: 'LTAI...',
            })
        );
        expect(p.password).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'AccessKey Secret',
            })
        );
    });

    it('should check for duplicate provider names in existing config', async () => {
        // Arrange
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'existing-provider',
                    type: 'bailian',
                    packageName: '@coding-status/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                },
            ],
            current: 'existing-provider',
            cacheTtl: 300,
        });

        const program = new Command();
        registerAdd(program);

        // Get the validate function
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        const textCall = vi
            .mocked(p.text)
            .mock.calls.find(call => call[0]?.message === 'Provider name');
        const validate = textCall?.[0]?.validate;

        // Assert - validate should detect duplicate
        if (validate) {
            expect(validate('existing-provider')).toBe('Provider name already exists');
            expect(validate('new-provider')).toBeUndefined();
        }
    });

    it('should save new provider to config', async () => {
        // Arrange
        vi.mocked(p.text).mockResolvedValue('test-provider');
        vi.mocked(p.password).mockResolvedValue('test-secret');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                providers: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'test-provider',
                        type: 'bailian',
                        packageName: '@coding-status/usage-adapter-bailian',
                    }),
                ]),
            })
        );
    });

    it('should set first provider as current automatically', async () => {
        // Arrange - empty config (first provider)
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [],
            current: undefined,
            cacheTtl: 300,
        });
        vi.mocked(p.text).mockResolvedValue('first-provider');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                current: 'first-provider',
            })
        );
    });

    it('should not change current when adding second provider', async () => {
        // Arrange - existing provider
        vi.mocked(loadConfig).mockResolvedValue({
            providers: [
                {
                    name: 'existing',
                    type: 'bailian',
                    packageName: '@coding-status/usage-adapter-bailian',
                    credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
                },
            ],
            current: 'existing',
            cacheTtl: 300,
        });
        vi.mocked(p.text).mockResolvedValue('second-provider');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                current: 'existing', // unchanged
            })
        );
    });

    it('should handle cancel on provider type selection', async () => {
        // Arrange
        vi.mocked(p.isCancel).mockReturnValue(true);

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.outro).toHaveBeenCalledWith('Cancelled');
        expect(saveConfig).not.toHaveBeenCalled();
    });

    it('should handle cancel on provider name input', async () => {
        // Arrange
        vi.mocked(p.isCancel).mockImplementation(value => {
            // Return true only for name (second prompt)
            return value === 'cancelled-name';
        });
        vi.mocked(p.text).mockResolvedValueOnce('cancelled-name');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.outro).toHaveBeenCalledWith('Cancelled');
        expect(saveConfig).not.toHaveBeenCalled();
    });

    it('should handle cancel on accessKeyId input', async () => {
        // Arrange
        vi.mocked(p.isCancel).mockImplementation(value => {
            return value === 'cancelled-key';
        });
        vi.mocked(p.text)
            .mockResolvedValueOnce('my-bailian') // name
            .mockResolvedValueOnce('cancelled-key'); // accessKeyId

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.outro).toHaveBeenCalledWith('Cancelled');
        expect(saveConfig).not.toHaveBeenCalled();
    });

    it('should handle cancel on accessKeySecret input', async () => {
        // Arrange
        vi.mocked(p.isCancel).mockImplementation(value => {
            return value === 'cancelled-secret';
        });
        vi.mocked(p.text)
            .mockResolvedValueOnce('my-bailian') // name
            .mockResolvedValueOnce('LTAI...'); // accessKeyId
        vi.mocked(p.password).mockResolvedValueOnce('cancelled-secret');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.outro).toHaveBeenCalledWith('Cancelled');
        expect(saveConfig).not.toHaveBeenCalled();
    });

    it('should validate empty provider name', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act - get validate function
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        const textCall = vi
            .mocked(p.text)
            .mock.calls.find(call => call[0]?.message === 'Provider name');
        const validate = textCall?.[0]?.validate;

        // Assert
        if (validate) {
            expect(validate('')).toBe('Name is required');
            expect(validate('   ')).toBe('Name is required');
        }
    });

    it('should validate provider name length (max 32 chars)', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act - get validate function
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        const textCall = vi
            .mocked(p.text)
            .mock.calls.find(call => call[0]?.message === 'Provider name');
        const validate = textCall?.[0]?.validate;

        // Assert
        if (validate) {
            const longName = 'a'.repeat(33);
            expect(validate(longName)).toBe('Name too long (max 32 chars)');
            const validName = 'a'.repeat(32);
            expect(validate(validName)).toBeUndefined();
        }
    });

    it('should validate empty accessKeyId', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act - get validate function
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        const textCall = vi
            .mocked(p.text)
            .mock.calls.find(call => call[0]?.message === 'AccessKey ID');
        const validate = textCall?.[0]?.validate;

        // Assert
        if (validate) {
            expect(validate('')).toBe('AccessKey ID is required');
            expect(validate('   ')).toBe('AccessKey ID is required');
        }
    });

    it('should validate empty accessKeySecret', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act - get validate function
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        const passwordCall = vi
            .mocked(p.password)
            .mock.calls.find(call => call[0]?.message === 'AccessKey Secret');
        const validate = passwordCall?.[0]?.validate;

        // Assert
        if (validate) {
            expect(validate('')).toBe('AccessKey Secret is required');
            expect(validate('   ')).toBe('AccessKey Secret is required');
        }
    });

    it('should show spinner during validation', async () => {
        // Arrange
        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(mockSpinner.start).toHaveBeenCalledWith('Validating credentials...');
        expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should output success message after adding provider', async () => {
        // Arrange
        vi.mocked(p.text).mockResolvedValue('my-new-provider');

        const program = new Command();
        registerAdd(program);

        // Act
        const addCommand = program.commands.find(cmd => cmd.name() === 'add');
        await addCommand?.parseAsync([], { from: 'user' });

        // Assert
        expect(p.outro).toHaveBeenCalledWith('Provider "my-new-provider" added successfully!');
    });
});
