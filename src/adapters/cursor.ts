import { BaseAdapter } from './base.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, serialize } from '../markdown.js';

export class CursorAdapter extends BaseAdapter {
  get name(): string { return 'cursor'; }
  get relPath(): string { return '.cursor/rules/aimemory.mdc'; }

  async detect(): Promise<boolean> {
    try {
      await stat(join(this.projectDir, '.cursor'));
      return true;
    } catch {
      return false;
    }
  }

  /** Convert MDC format (frontmatter + markdown) to canonical markdown */
  toMarkdown(raw: string): string {
    // Strip YAML frontmatter if present
    const stripped = raw.replace(/^---\n[\s\S]*?\n---\n*/, '');
    return stripped;
  }

  /** Convert canonical markdown to MDC format with frontmatter */
  fromMarkdown(md: string): string {
    const frontmatter = [
      '---',
      'description: Learned preferences and workspace facts synced by aimemory',
      'alwaysApply: true',
      '---',
      '',
    ].join('\n');
    return frontmatter + md;
  }
}
