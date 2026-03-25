import { readMemory, writeMemory, ensureMemory } from '../memory.js';
import { parse, serialize } from '../markdown.js';
import { sync } from './sync.js';
import * as log from '../log.js';

export async function add(projectDir: string, text: string, section = 'Learned User Preferences'): Promise<void> {
  await ensureMemory();

  const raw = (await readMemory())!;
  const doc = parse(raw);

  let targetSection = doc.sections.find(
    (s) => s.heading.toLowerCase() === section.toLowerCase()
  );

  if (!targetSection) {
    targetSection = { heading: section, bullets: [] };
    doc.sections.push(targetSection);
  }

  const bullet = text.startsWith('- ') ? text : `- ${text}`;
  targetSection.bullets.push(bullet);

  await writeMemory(serialize(doc));
  log.success(`Added: ${bullet}`);

  await sync(projectDir);
}
