import { BaseAdapter } from './base.js';

export class CodexAdapter extends BaseAdapter {
  get name(): string { return 'codex'; }
  get relPath(): string { return 'AGENTS.md'; }
}
