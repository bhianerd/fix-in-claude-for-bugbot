import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, serialize, normalizeBullet } from '../src/markdown.js';

describe('parse', () => {
  it('parses title and sections with bullets', () => {
    const md = `# AI Memory

## Code Style
- Use 2-space indentation
- Prefer const over let

## Testing
- Write tests first
`;
    const doc = parse(md);
    assert.equal(doc.title, 'AI Memory');
    assert.equal(doc.sections.length, 2);
    assert.equal(doc.sections[0].heading, 'Code Style');
    assert.deepEqual(doc.sections[0].bullets, [
      '- Use 2-space indentation',
      '- Prefer const over let',
    ]);
    assert.equal(doc.sections[1].heading, 'Testing');
    assert.deepEqual(doc.sections[1].bullets, ['- Write tests first']);
  });

  it('handles empty sections', () => {
    const md = `## Empty Section

## Has Content
- One bullet
`;
    const doc = parse(md);
    assert.equal(doc.sections.length, 2);
    assert.equal(doc.sections[0].bullets.length, 0);
    assert.equal(doc.sections[1].bullets.length, 1);
  });

  it('handles continuation lines', () => {
    const md = `## Section
- First bullet
  with continuation
- Second bullet
`;
    const doc = parse(md);
    assert.equal(doc.sections[0].bullets.length, 2);
    assert.equal(doc.sections[0].bullets[0], '- First bullet\n  with continuation');
  });

  it('handles bullets before any section header', () => {
    const md = `- Orphan bullet
- Another
`;
    const doc = parse(md);
    assert.equal(doc.sections.length, 1);
    assert.equal(doc.sections[0].heading, 'General');
    assert.equal(doc.sections[0].bullets.length, 2);
  });

  it('normalizes * bullets to -', () => {
    const md = `## Section
* Star bullet
- Dash bullet
`;
    const doc = parse(md);
    assert.equal(doc.sections[0].bullets[0], '- Star bullet');
    assert.equal(doc.sections[0].bullets[1], '- Dash bullet');
  });
});

describe('serialize', () => {
  it('round-trips a document', () => {
    const doc = {
      title: 'AI Memory',
      sections: [
        { heading: 'Prefs', bullets: ['- One', '- Two'] },
        { heading: 'Facts', bullets: ['- Fact'] },
      ],
    };
    const md = serialize(doc);
    const reparsed = parse(md);
    assert.equal(reparsed.title, 'AI Memory');
    assert.equal(reparsed.sections.length, 2);
    assert.deepEqual(reparsed.sections[0].bullets, ['- One', '- Two']);
  });
});

describe('normalizeBullet', () => {
  it('normalizes for comparison', () => {
    assert.equal(
      normalizeBullet('- Use 2-space indentation!'),
      normalizeBullet('-  use 2space  indentation ')
    );
  });

  it('strips bullet prefix', () => {
    assert.equal(normalizeBullet('- Hello world'), 'hello world');
  });
});
