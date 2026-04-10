/**
 * Config store tests
 *
 * Tests for loadConfig, saveConfig, and getConfigDir operations.
 * Uses mocked fs/promises to avoid real file operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';

import { loadConfig, saveConfig, getConfigDir } from '../../src/config/config-store.js';
import { CONFIG_DIR, CONFIG_PATH } from '../../src/config/paths.js';
import type { Config } from '../../src/config/config.schema.js';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  chmod: vi.fn(),
}));

describe('config-store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when file does not exist', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const config = await loadConfig();

      expect(config.providers).toEqual([]);
      expect(config.cacheTtl).toBe(300);
      expect(config.current).toBeUndefined();
    });

    it('should return parsed config when file exists and is valid', async () => {
      const validConfigJson = JSON.stringify({
        providers: [
          {
            name: 'my-bailian',
            type: 'bailian',
            packageName: '@cdps/usage-adapter-bailian',
            credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
          },
        ],
        current: 'my-bailian',
        cacheTtl: 600,
      });

      vi.mocked(readFile).mockResolvedValueOnce(validConfigJson);

      const config = await loadConfig();

      expect(config.providers).toHaveLength(1);
      expect(config.providers[0].name).toBe('my-bailian');
      expect(config.current).toBe('my-bailian');
      expect(config.cacheTtl).toBe(600);
    });

    it('should return default config when file is malformed JSON', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('not valid json {{{');

      const config = await loadConfig();

      expect(config.providers).toEqual([]);
      expect(config.cacheTtl).toBe(300);
    });
  });

  describe('saveConfig', () => {
    it('should create directory if not exists', async () => {
      vi.mocked(mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(writeFile).mockResolvedValueOnce(undefined);
      vi.mocked(chmod).mockResolvedValueOnce(undefined);

      const config: Config = {
        providers: [],
        cacheTtl: 300,
      };

      await saveConfig(config);

      expect(mkdir).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
    });

    it('should write config as JSON with 2-space indent', async () => {
      vi.mocked(mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(writeFile).mockResolvedValueOnce(undefined);
      vi.mocked(chmod).mockResolvedValueOnce(undefined);

      const config: Config = {
        providers: [
          {
            name: 'test',
            type: 'bailian',
            packageName: '@cdps/usage-adapter-bailian',
            credentials: { key: 'value' },
          },
        ],
        current: 'test',
        cacheTtl: 300,
      };

      await saveConfig(config);

      expect(writeFile).toHaveBeenCalledWith(
        CONFIG_PATH,
        JSON.stringify(config, null, 2),
        'utf-8',
      );
    });

    it('should set file permissions to 0o600', async () => {
      vi.mocked(mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(writeFile).mockResolvedValueOnce(undefined);
      vi.mocked(chmod).mockResolvedValueOnce(undefined);

      const config: Config = {
        providers: [],
        cacheTtl: 300,
      };

      await saveConfig(config);

      expect(chmod).toHaveBeenCalledWith(CONFIG_PATH, 0o600);
    });
  });

  describe('getConfigDir', () => {
    it('should return CONFIG_DIR constant', () => {
      expect(getConfigDir()).toBe(CONFIG_DIR);
    });
  });
});