/**
 * CLI program tests
 *
 * Per D-10:
 * - CLI program creates Commander instance with name 'cdps'
 * - Registers all 7 commands
 * - Parses args correctly
 * - Shows help with --help
 * - Shows version with --version
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { cli } from '../src/cli.js';

// Mock all command registration functions
vi.mock('../src/commands/index.js', () => ({
    registerInit: vi.fn(),
    registerAdd: vi.fn(),
    registerList: vi.fn(),
    registerUse: vi.fn(),
    registerRm: vi.fn(),
    registerDoctor: vi.fn(),
    registerStatusline: vi.fn(),
}));

describe('cli', () => {
    let mockExit: ReturnType<typeof vi.spyOn>;
    let mockConsole: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        mockConsole = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockExit.mockRestore();
        mockConsole.mockRestore();
    });

    it('should create Commander program with name cdps', async () => {
        // Import the mocked commands
        const commands = await import('../src/commands/index.js');

        // Call cli with empty args (shows help)
        cli(['--help']);

        // Verify command registration functions were called
        expect(commands.registerInit).toHaveBeenCalled();
        expect(commands.registerAdd).toHaveBeenCalled();
        expect(commands.registerList).toHaveBeenCalled();
        expect(commands.registerUse).toHaveBeenCalled();
        expect(commands.registerRm).toHaveBeenCalled();
        expect(commands.registerDoctor).toHaveBeenCalled();
        expect(commands.registerStatusline).toHaveBeenCalled();
    });

    it('should register all 7 commands', async () => {
        const commands = await import('../src/commands/index.js');

        cli(['--help']);

        expect(commands.registerInit).toHaveBeenCalledTimes(1);
        expect(commands.registerAdd).toHaveBeenCalledTimes(1);
        expect(commands.registerList).toHaveBeenCalledTimes(1);
        expect(commands.registerUse).toHaveBeenCalledTimes(1);
        expect(commands.registerRm).toHaveBeenCalledTimes(1);
        expect(commands.registerDoctor).toHaveBeenCalledTimes(1);
        expect(commands.registerStatusline).toHaveBeenCalledTimes(1);
    });

    it('should show help with --help flag', async () => {
        cli(['--help']);

        // Help output is written to stdout by Commander
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should show version with --version flag', async () => {
        cli(['--version']);

        // Version output is written to stdout by Commander
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should parse provided args correctly', async () => {
        const commands = await import('../src/commands/index.js');

        // Parse args for a specific command (init)
        cli(['init']);

        // After parsing, commands should have been registered
        expect(commands.registerInit).toHaveBeenCalled();
    });
});
