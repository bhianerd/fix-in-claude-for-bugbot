import { getAllAdapters } from '../adapters/index.js';
import { writeConfig } from '../config.js';
import { ensureMemory, getMemoryPath } from '../memory.js';
import * as log from '../log.js';

export async function init(projectDir: string): Promise<void> {
  const created = await ensureMemory();
  if (created) {
    log.success(`Created canonical memory at ${getMemoryPath()}`);
  } else {
    log.info(`Canonical memory already exists at ${getMemoryPath()}`);
  }

  const adapters = getAllAdapters(projectDir);
  const detected: string[] = [];

  for (const adapter of adapters) {
    if (await adapter.detect()) {
      detected.push(adapter.name);
      log.success(`Detected ${adapter.name}`);
    }
  }

  const tools = detected.length > 0 ? detected : ['cursor', 'claude', 'codex', 'windsurf', 'copilot'];

  const config = { tools };
  await writeConfig(projectDir, config);
  log.success(`Created .aimemory.json with tools: ${tools.join(', ')}`);

  log.info('Run `aimemory sync` to synchronize memory across tools.');
}
