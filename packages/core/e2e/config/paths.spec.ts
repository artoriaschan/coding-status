/**
 * Config paths tests
 *
 * Tests for CONFIG_DIR, CONFIG_PATH, and SETTINGS_PATH constants.
 */

import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { CONFIG_DIR, CONFIG_PATH, SETTINGS_PATH } from '../../src/config/paths.js';

describe('paths', () => {
  describe('CONFIG_DIR', () => {
    it('should equal join(homedir(), ".cdps")', () => {
      expect(CONFIG_DIR).toBe(join(homedir(), '.cdps'));
    });
  });

  describe('CONFIG_PATH', () => {
    it('should equal join(CONFIG_DIR, "config.json")', () => {
      expect(CONFIG_PATH).toBe(join(CONFIG_DIR, 'config.json'));
    });
  });

  describe('SETTINGS_PATH', () => {
    it('should equal join(CONFIG_DIR, "settings.json")', () => {
      expect(SETTINGS_PATH).toBe(join(CONFIG_DIR, 'settings.json'));
    });
  });
});