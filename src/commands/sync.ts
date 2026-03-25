import { readConfig } from '../config.js';
import { readMemory, writeMemory, ensureMemory } from '../memory.js';
import { getAdapters } from '../adapters/index.js';
import { parse, serialize } from '../markdown.js';
import { merge } from '../merge.js';
import * as log from '../log.js';
import type { Document } from '../types.js';

export async function sync(projectDir: string): Promise<void> {
  await ensureMemory();

  const config = await readConfig(projectDir);
  const adapters = getAdapters(projectDir, config.tools);

  // Step 1: Read canonical
  let canonical = parse((await readMemory())!);

  // Step 2: Merge from each adapter into canonical
  let addedCount = 0;
  for (const adapter of adapters) {
    const raw = await adapter.read();
    if (!raw) continue;

    const md = adapter.toMarkdown(raw);
    const incoming = parse(md);
    const beforeCount = countBullets(canonical);
    canonical = merge(canonical, incoming);
    const afterCount = countBullets(canonical);
    const diff = afterCount - beforeCount;
    if (diff > 0) {
      log.info(`Merged ${diff} new bullet(s) from ${adapter.name}`);
      addedCount += diff;
    }
  }

  // Step 3: Write updated canonical
  const canonicalMd = serialize(canonical);
  await writeMemory(canonicalMd);

  // Step 4: Write to each adapter (deduplicate shared paths)
  const written = new Set<string>();
  for (const adapter of adapters) {
    const absPath = adapter.filePath;
    if (written.has(absPath)) continue;
    written.add(absPath);

    const content = adapter.fromMarkdown(canonicalMd);
    await adapter.write(content);
    log.success(`Synced ${adapter.name} → ${adapter.relPath}`);
  }

  if (addedCount === 0) {
    log.dim('Everything in sync, no new bullets found.');
  }
}

function countBullets(doc: Document): number {
  return doc.sections.reduce((sum, s) => sum + s.bullets.length, 0);
}
