/**
 * CLI program definition
 *
 * Per D-10:
 * - Define Commander program with name 'cdps'
 * - Register all commands from commands module
 * - Parse args with from: 'user' option
 */

import { Command } from 'commander';

import {
    registerInit,
    registerAdd,
    registerList,
    registerUse,
    registerRm,
    registerDoctor,
    registerStatusline,
} from './commands/index.js';

/**
 * CLI program definition.
 *
 * Per D-10:
 * - Define Commander program
 * - Register all commands
 * - Parse args
 *
 * @param args - Command line arguments (without node and script path)
 */
export function cli(args: string[]): void {
    const program = new Command()
        .name('coding-status')
        .version('0.0.1')
        .description('Cloud provider usage statusline for Claude Code');

    // Register all commands
    registerInit(program);
    registerAdd(program);
    registerList(program);
    registerUse(program);
    registerRm(program);
    registerDoctor(program);
    registerStatusline(program);

    program.parse(args, { from: 'user' });
}
