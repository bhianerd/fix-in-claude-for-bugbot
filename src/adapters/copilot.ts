import { BaseAdapter } from './base.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export class CopilotAdapter extends BaseAdapter {
  get name(): string { return 'copilot'; }
  get relPath(): string { return '.github/copilot-instructions.md'; }

  async detect(): Promise<boolean> {
    try {
      await stat(join(this.projectDir, '.github'));
      return true;
    } catch {
      return this.exists();
    }
  }
}
