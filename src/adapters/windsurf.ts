import { BaseAdapter } from './base.js';
import { parse, serialize } from '../markdown.js';

export class WindsurfAdapter extends BaseAdapter {
  get name(): string { return 'windsurf'; }
  get relPath(): string { return '.windsurfrules'; }

  toMarkdown(raw: string): string {
    const lines = raw.split('\n').filter((l) => l.trim());
    const bullets = lines.map((l) => {
      const trimmed = l.replace(/^[-*]\s*/, '').trim();
      return `- ${trimmed}`;
    });
    return serialize({
      title: '',
      sections: [{ heading: 'Learned User Preferences', bullets }],
    });
  }

  fromMarkdown(md: string): string {
    const doc = parse(md);
    const lines: string[] = [];
    for (const section of doc.sections) {
      for (const bullet of section.bullets) {
        lines.push(bullet.replace(/^[-*]\s*/, ''));
      }
    }
    return lines.join('\n') + '\n';
  }
}
