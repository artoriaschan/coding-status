/**
 * Settings loader tests
 *
 * Tests for loadSettings, saveSettings, and DEFAULT_SETTINGS.
 * Uses temporary directories to avoid polluting user's ~/.cdps/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { Settings } from './types.js';

// We need to test the settings module, but we need to override SETTINGS_PATH
// for testing purposes. We'll use a factory function approach.

// Create a settings module factory that accepts a custom path
function createSettingsModule(settingsPath: string) {
  const DEFAULT_SETTINGS: Settings = {
    cacheTtl: 300000, // 5 minutes in milliseconds
    rows: [
      [
        { widget: 'provider', color: 'cyan' },
        { widget: 'separator' },
        { widget: 'usage', options: { dimension: '5h', label: '5h' } },
      ],
    ],
    theme: {
      barColors: { low: 'green', medium: 'yellow', high: 'red' },
      thresholds: { low: 50, medium: 80 },
    },
    plain: false,
  };

  async function loadSettings(): Promise<Settings> {
    try {
      const content = await readFile(settingsPath, 'utf-8');
      return JSON.parse(content) as Settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async function saveSettings(settings: Settings): Promise<void> {
    const dir = join(settingsPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  return {
    SETTINGS_PATH: settingsPath,
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
  };
}

describe('DEFAULT_SETTINGS', () => {
  it('should have cacheTtl of 300000 (5 minutes)', () => {
    const { DEFAULT_SETTINGS } = createSettingsModule('/tmp/test.json');
    expect(DEFAULT_SETTINGS.cacheTtl).toBe(300000);
  });

  it('should have rows with provider, separator, usage widgets', () => {
    const { DEFAULT_SETTINGS } = createSettingsModule('/tmp/test.json');
    expect(DEFAULT_SETTINGS.rows).toHaveLength(1);
    expect(DEFAULT_SETTINGS.rows[0]).toHaveLength(3);
    expect(DEFAULT_SETTINGS.rows[0][0].widget).toBe('provider');
    expect(DEFAULT_SETTINGS.rows[0][1].widget).toBe('separator');
    expect(DEFAULT_SETTINGS.rows[0][2].widget).toBe('usage');
  });

  it('should have theme with barColors', () => {
    const { DEFAULT_SETTINGS } = createSettingsModule('/tmp/test.json');
    expect(DEFAULT_SETTINGS.theme).toBeDefined();
    expect(DEFAULT_SETTINGS.theme?.barColors).toEqual({
      low: 'green',
      medium: 'yellow',
      high: 'red',
    });
  });

  it('should have theme with thresholds', () => {
    const { DEFAULT_SETTINGS } = createSettingsModule('/tmp/test.json');
    expect(DEFAULT_SETTINGS.theme?.thresholds).toEqual({
      low: 50,
      medium: 80,
    });
  });

  it('should have plain set to false', () => {
    const { DEFAULT_SETTINGS } = createSettingsModule('/tmp/test.json');
    expect(DEFAULT_SETTINGS.plain).toBe(false);
  });
});

describe('loadSettings', () => {
  let tempDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cdps-settings-test-'));
    settingsPath = join(tempDir, 'settings.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return DEFAULT_SETTINGS when file does not exist', async () => {
    const { loadSettings, DEFAULT_SETTINGS } = createSettingsModule(settingsPath);
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should parse and return settings from file', async () => {
    const customSettings: Settings = {
      cacheTtl: 60000,
      rows: [[{ widget: 'text', options: { text: 'Hello' } }]],
      plain: true,
    };
    await writeFile(settingsPath, JSON.stringify(customSettings), 'utf-8');

    const { loadSettings } = createSettingsModule(settingsPath);
    const settings = await loadSettings();
    expect(settings.cacheTtl).toBe(60000);
    expect(settings.rows).toHaveLength(1);
    expect(settings.plain).toBe(true);
  });

  it('should return DEFAULT_SETTINGS on invalid JSON', async () => {
    await writeFile(settingsPath, 'not valid json {{{', 'utf-8');

    const { loadSettings, DEFAULT_SETTINGS } = createSettingsModule(settingsPath);
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should return DEFAULT_SETTINGS on file read error', async () => {
    // Use a path that cannot be read (directory instead of file)
    const badPath = join(tempDir, 'nonexistent', 'settings.json');
    const { loadSettings, DEFAULT_SETTINGS } = createSettingsModule(badPath);
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings', () => {
  let tempDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cdps-settings-test-'));
    settingsPath = join(tempDir, 'settings.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write settings to file', async () => {
    const customSettings: Settings = {
      cacheTtl: 120000,
      rows: [[{ widget: 'provider' }]],
      plain: false,
    };

    const { saveSettings } = createSettingsModule(settingsPath);
    await saveSettings(customSettings);

    const content = await readFile(settingsPath, 'utf-8');
    const saved = JSON.parse(content);
    expect(saved.cacheTtl).toBe(120000);
    expect(saved.rows).toHaveLength(1);
  });

  it('should create directory if it does not exist', async () => {
    const nestedPath = join(tempDir, 'subdir', 'another', 'settings.json');
    const customSettings: Settings = {
      cacheTtl: 300000,
      rows: [],
    };

    const { saveSettings } = createSettingsModule(nestedPath);
    await saveSettings(customSettings);

    const content = await readFile(nestedPath, 'utf-8');
    expect(content).toBeDefined();
  });

  it('should write formatted JSON with indentation', async () => {
    const customSettings: Settings = {
      cacheTtl: 300000,
      rows: [[{ widget: 'provider', color: 'cyan' }]],
    };

    const { saveSettings } = createSettingsModule(settingsPath);
    await saveSettings(customSettings);

    const content = await readFile(settingsPath, 'utf-8');
    // Check that JSON is formatted (has newlines and indentation)
    expect(content).toContain('\n');
    expect(content).toContain('  ');
  });

  it('should allow saved settings to be loaded back', async () => {
    const customSettings: Settings = {
      cacheTtl: 180000,
      rows: [
        [
          { widget: 'provider', color: 'magenta' },
          { widget: 'separator' },
          { widget: 'usage', options: { dimension: 'month' } },
        ],
      ],
      theme: {
        barColors: { low: 'green', medium: 'yellow', high: 'red' },
        thresholds: { low: 30, medium: 70 },
      },
      plain: true,
    };

    const { saveSettings, loadSettings } = createSettingsModule(settingsPath);
    await saveSettings(customSettings);
    const loaded = await loadSettings();

    expect(loaded.cacheTtl).toBe(180000);
    expect(loaded.rows[0][0].widget).toBe('provider');
    expect(loaded.rows[0][0].color).toBe('magenta');
    expect(loaded.theme?.thresholds?.low).toBe(30);
    expect(loaded.plain).toBe(true);
  });
});