import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { merge } from '../src/merge.js';

describe('merge', () => {
  it('adds new bullets from incoming', () => {
    const canonical = {
      title: 'AI Memory',
      sections: [{ heading: 'Prefs', bullets: ['- Existing'] }],
    };
    const incoming = {
      title: '',
      sections: [{ heading: 'Prefs', bullets: ['- Existing', '- New one'] }],
    };
    const result = merge(canonical, incoming);
    assert.equal(result.sections[0].bullets.length, 2);
    assert.equal(result.sections[0].bullets[1], '- New one');
  });

  it('deduplicates by normalized text', () => {
    const canonical = {
      title: '',
      sections: [{ heading: 'S', bullets: ['- Use const over let'] }],
    };
    const incoming = {
      title: '',
      sections: [{ heading: 'S', bullets: ['- use const over let'] }],
    };
    const result = merge(canonical, incoming);
    assert.equal(result.sections[0].bullets.length, 1);
  });

  it('adds new sections from incoming', () => {
    const canonical = {
      title: '',
      sections: [{ heading: 'A', bullets: ['- One'] }],
    };
    const incoming = {
      title: '',
      sections: [{ heading: 'B', bullets: ['- Two'] }],
    };
    const result = merge(canonical, incoming);
    assert.equal(result.sections.length, 2);
    assert.equal(result.sections[1].heading, 'B');
  });

  it('never removes canonical bullets', () => {
    const canonical = {
      title: '',
      sections: [{ heading: 'S', bullets: ['- Keep this', '- Also keep'] }],
    };
    const incoming = {
      title: '',
      sections: [{ heading: 'S', bullets: [] }],
    };
    const result = merge(canonical, incoming);
    assert.equal(result.sections[0].bullets.length, 2);
  });

  it('handles case-insensitive section matching', () => {
    const canonical = {
      title: '',
      sections: [{ heading: 'Code Style', bullets: ['- A'] }],
    };
    const incoming = {
      title: '',
      sections: [{ heading: 'code style', bullets: ['- B'] }],
    };
    const result = merge(canonical, incoming);
    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0].bullets.length, 2);
  });
});
