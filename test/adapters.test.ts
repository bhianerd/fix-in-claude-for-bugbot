import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WindsurfAdapter } from '../src/adapters/windsurf.js';
import { CursorAdapter } from '../src/adapters/cursor.js';
import { parse } from '../src/markdown.js';

describe('WindsurfAdapter', () => {
  it('converts plain text to markdown', () => {
    const adapter = new WindsurfAdapter('/tmp/test');
    const md = adapter.toMarkdown('Use 2-space indentation\nPrefer const over let\n');
    const doc = parse(md);
    assert.equal(doc.sections.length, 1);
    assert.equal(doc.sections[0].bullets.length, 2);
    assert.equal(doc.sections[0].bullets[0], '- Use 2-space indentation');
  });

  it('converts markdown to plain text', () => {
    const adapter = new WindsurfAdapter('/tmp/test');
    const md = `# AI Memory

## Prefs
- Use 2-space indentation
- Prefer const

## Facts
- Project uses ESM
`;
    const result = adapter.fromMarkdown(md);
    const lines = result.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], 'Use 2-space indentation');
    assert.equal(lines[2], 'Project uses ESM');
  });
});

describe('CursorAdapter', () => {
  it('strips MDC frontmatter when reading', () => {
    const adapter = new CursorAdapter('/tmp/test');
    const mdc = `---
description: My rules
alwaysApply: true
---

## Code Style
- Use 2-space indentation
`;
    const md = adapter.toMarkdown(mdc);
    const doc = parse(md);
    assert.equal(doc.sections.length, 1);
    assert.equal(doc.sections[0].heading, 'Code Style');
    assert.equal(doc.sections[0].bullets[0], '- Use 2-space indentation');
  });

  it('adds MDC frontmatter when writing', () => {
    const adapter = new CursorAdapter('/tmp/test');
    const md = `# AI Memory

## Prefs
- Use tabs
`;
    const result = adapter.fromMarkdown(md);
    assert.ok(result.startsWith('---\n'));
    assert.ok(result.includes('alwaysApply: true'));
    assert.ok(result.includes('- Use tabs'));
  });

  it('uses .cursor/rules/aimemory.mdc path', () => {
    const adapter = new CursorAdapter('/tmp/test');
    assert.equal(adapter.relPath, '.cursor/rules/aimemory.mdc');
  });
});
