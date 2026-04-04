/**
 * Commands module barrel export
 *
 * Exports all command registration functions for CLI.
 */

// Init command
export { registerInit } from './init.js';

// Add command
export { registerAdd } from './add.js';

// List command
export { registerList } from './list.js';

// Placeholder exports for commands to be implemented in later plans
// export { registerUse } from './use.js';
// export { registerRm } from './rm.js';
// export { registerDoctor } from './doctor.js';
// export { registerStatusline } from './statusline.js';