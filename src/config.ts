import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from './types.js';

const CONFIG_NAME = '.aimemory.json';

const DEFAULTS: Config = {
  tools: ['cursor', 'claude', 'codex', 'windsurf', 'copilot'],
};

export async function readConfig(projectDir: string): Promise<Config> {
  const configPath = join(projectDir, CONFIG_NAME);
  try {
    const raw = await readFile(configPath, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) } as Config;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeConfig(projectDir: string, config: Config): Promise<void> {
  const configPath = join(projectDir, CONFIG_NAME);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}
