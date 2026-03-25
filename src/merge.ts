import type { Document, Section } from './types.js';
import { normalizeBullet } from './markdown.js';

/**
 * Merge incoming document into canonical. Additive only —
 * never removes bullets from canonical, only adds new ones.
 */
export function merge(canonical: Document, incoming: Document): Document {
  const result: Document = {
    title: canonical.title || incoming.title,
    sections: canonical.sections.map((s): Section => ({
      heading: s.heading,
      bullets: [...s.bullets],
    })),
  };

  for (const inSection of incoming.sections) {
    let targetSection = result.sections.find(
      (s) => s.heading.toLowerCase() === inSection.heading.toLowerCase()
    );

    if (!targetSection) {
      targetSection = { heading: inSection.heading, bullets: [] };
      result.sections.push(targetSection);
    }

    const existingNormalized = new Set(
      targetSection.bullets.map((b) => normalizeBullet(b))
    );

    for (const bullet of inSection.bullets) {
      const norm = normalizeBullet(bullet);
      if (norm && !existingNormalized.has(norm)) {
        targetSection.bullets.push(bullet);
        existingNormalized.add(norm);
      }
    }
  }

  return result;
}
