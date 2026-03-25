import { readConfig } from '../config.js';
import { readMemory, getMemoryPath } from '../memory.js';
import { getAdapters } from '../adapters/index.js';
import { parse } from '../markdown.js';
import * as log from '../log.js';

interface StatusRow {
  tool: string;
  path: string;
  exists: string;
  bullets: string | number;
}

export async function status(projectDir: string): Promise<void> {
  const memoryRaw = await readMemory();
  if (!memoryRaw) {
    log.warn('No canonical memory found. Run `aimemory init` first.');
    return;
  }

  const canonical = parse(memoryRaw);
  const canonicalCount = canonical.sections.reduce((s, sec) => s + sec.bullets.length, 0);

  log.info(`Canonical: ${getMemoryPath()}`);
  log.info(`Sections: ${canonical.sections.length}, Bullets: ${canonicalCount}`);
  console.log('');

  const config = await readConfig(projectDir);
  const adapters = getAdapters(projectDir, config.tools);

  const rows: StatusRow[] = [];
  for (const adapter of adapters) {
    const exists = await adapter.exists();
    let bulletCount: string | number = '-';
    if (exists) {
      const raw = await adapter.read();
      if (raw) {
        const md = adapter.toMarkdown(raw);
        const doc = parse(md);
        bulletCount = doc.sections.reduce((s, sec) => s + sec.bullets.length, 0);
      }
    }
    rows.push({
      tool: adapter.name,
      path: adapter.relPath,
      exists: exists ? 'yes' : 'no',
      bullets: bulletCount,
    });
  }

  // Simple table output
  console.log('Tool       | Path                              | Exists | Bullets');
  console.log('-----------|-----------------------------------|--------|--------');
  for (const row of rows) {
    console.log(
      `${row.tool.padEnd(10)} | ${row.path.padEnd(33)} | ${row.exists.padEnd(6)} | ${row.bullets}`
    );
  }
}
