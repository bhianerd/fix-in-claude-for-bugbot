import type { Document, Section } from './types.js';

/**
 * Markdown parser/serializer for memory files.
 * AST: { title: string, sections: [{ heading: string, bullets: string[] }] }
 */

export function parse(markdown: string): Document {
  const lines = markdown.split('\n');
  const doc: Document = { title: '', sections: [] };
  let currentSection: Section | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      doc.title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith('## ')) {
      currentSection = { heading: line.slice(3).trim(), bullets: [] };
      doc.sections.push(currentSection);
      continue;
    }

    if (/^[-*] /.test(line)) {
      if (!currentSection) {
        currentSection = { heading: 'General', bullets: [] };
        doc.sections.push(currentSection);
      }
      currentSection.bullets.push(line.replace(/^[*] /, '- '));
      continue;
    }

    // Continuation line (indented, non-empty, belongs to previous bullet)
    if (line.match(/^\s+\S/) && currentSection && currentSection.bullets.length > 0) {
      currentSection.bullets[currentSection.bullets.length - 1] += '\n' + line;
      continue;
    }
  }

  return doc;
}

export function serialize(doc: Document): string {
  const lines: string[] = [];

  if (doc.title) {
    lines.push(`# ${doc.title}`, '');
  }

  for (const section of doc.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const bullet of section.bullets) {
      lines.push(bullet);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function normalizeBullet(bullet: string): string {
  return bullet
    .replace(/^[-*]\s+/, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
