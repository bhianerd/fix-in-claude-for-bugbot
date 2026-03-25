import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const MEMORY_DIR: string = join(homedir(), '.aimemory');
const MEMORY_FILE: string = join(MEMORY_DIR, 'memory.md');

export const TEMPLATE = `# AI Memory

## Learned User Preferences

## Learned Workspace Facts
`;

export function getMemoryPath(): string {
  return MEMORY_FILE;
}

export function getMemoryDir(): string {
  return MEMORY_DIR;
}

export async function readMemory(): Promise<string | null> {
  try {
    return await readFile(MEMORY_FILE, 'utf-8');
  } catch {
    return null;
  }
}

export async function writeMemory(content: string): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true });
  await writeFile(MEMORY_FILE, content);
}

export async function ensureMemory(): Promise<boolean> {
  const existing = await readMemory();
  if (!existing) {
    await writeMemory(TEMPLATE);
    return true;
  }
  return false;
}
