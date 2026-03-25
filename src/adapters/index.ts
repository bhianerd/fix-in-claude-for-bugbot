import { CursorAdapter } from './cursor.js';
import { ClaudeAdapter } from './claude.js';
import { CodexAdapter } from './codex.js';
import { WindsurfAdapter } from './windsurf.js';
import { CopilotAdapter } from './copilot.js';
import type { BaseAdapter } from './base.js';

type AdapterConstructor = new (projectDir: string) => BaseAdapter;

const ADAPTER_MAP: Record<string, AdapterConstructor> = {
  cursor: CursorAdapter,
  claude: ClaudeAdapter,
  codex: CodexAdapter,
  windsurf: WindsurfAdapter,
  copilot: CopilotAdapter,
};

export function getAdapters(projectDir: string, toolNames: string[]): BaseAdapter[] {
  return toolNames
    .filter((name) => ADAPTER_MAP[name])
    .map((name) => new ADAPTER_MAP[name](projectDir));
}

export function getAllAdapters(projectDir: string): BaseAdapter[] {
  return Object.values(ADAPTER_MAP).map((Cls) => new Cls(projectDir));
}

export { ADAPTER_MAP };
