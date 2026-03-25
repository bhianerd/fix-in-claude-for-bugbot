import { watch as fsWatch } from 'node:fs';
import { readConfig } from '../config.js';
import { getMemoryPath } from '../memory.js';
import { getAdapters } from '../adapters/index.js';
import { sync } from './sync.js';
import * as log from '../log.js';

export async function watch(projectDir: string): Promise<void> {
  const config = await readConfig(projectDir);
  const adapters = getAdapters(projectDir, config.tools);

  let isSyncing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerSync = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        log.dim(`[${new Date().toLocaleTimeString()}] Syncing...`);
        await sync(projectDir);
      } catch (err) {
        log.error(`Sync failed: ${(err as Error).message}`);
      } finally {
        isSyncing = false;
      }
    }, 500);
  };

  // Watch canonical memory file
  const memoryPath = getMemoryPath();
  try {
    fsWatch(memoryPath, triggerSync);
    log.info(`Watching ${memoryPath}`);
  } catch {
    log.warn(`Cannot watch ${memoryPath} — run \`aimemory init\` first`);
  }

  // Watch adapter files
  for (const adapter of adapters) {
    if (await adapter.exists()) {
      try {
        fsWatch(adapter.filePath, triggerSync);
        log.info(`Watching ${adapter.relPath}`);
      } catch {
        log.warn(`Cannot watch ${adapter.relPath}`);
      }
    }
  }

  log.success('Watching for changes. Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', () => {
    log.info('Stopping watch.');
    process.exit(0);
  });

  await new Promise<never>(() => {}); // hang forever
}
