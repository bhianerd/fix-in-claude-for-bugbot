import { BaseAdapter } from './base.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export class ClaudeAdapter extends BaseAdapter {
  get name(): string { return 'claude'; }
  get relPath(): string { return 'CLAUDE.md'; }

  async detect(): Promise<boolean> {
    try {
      await stat(join(this.projectDir, '.claude'));
      return true;
    } catch {
      return this.exists();
    }
  }
}
