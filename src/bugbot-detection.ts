// Configurable selectors and patterns for detecting Bugbot comments.
// Tweak these if GitHub or Bugbot changes their DOM/naming.

export const BUGBOT_AUTHOR_LOGINS = [
  'cursor-bugbot',
  'cursor-bugbot[bot]',
  'bugbot',
  'bugbot[bot]',
];

export const BUGBOT_TEXT_PATTERNS = [
  /bugbot/i,
  /cursor.*bug/i,
  /\[Bugbot\]/i,
];

export const BOT_LABEL_SELECTOR = '.Label--secondary';

export function isBugbotAuthor(authorElement: Element | null): boolean {
  if (!authorElement) return false;
  const login = (
    authorElement.getAttribute('href')?.split('/').pop() ??
    authorElement.textContent ??
    ''
  ).trim().toLowerCase();
  return BUGBOT_AUTHOR_LOGINS.some((a) => login.includes(a.toLowerCase()));
}

export function hasBugbotTextPattern(text: string): boolean {
  return BUGBOT_TEXT_PATTERNS.some((p) => p.test(text));
}

export function isBugbotComment(commentEl: Element): boolean {
  // Check author link
  const authorLink =
    commentEl.querySelector('.author') ??
    commentEl.querySelector('a.timeline-comment-header-text');
  if (isBugbotAuthor(authorLink)) return true;

  // Check for bot label
  const labels = commentEl.querySelectorAll(BOT_LABEL_SELECTOR);
  for (const label of labels) {
    if (label.textContent?.trim().toLowerCase() === 'bot') {
      const nearbyAuthor =
        label.closest('.timeline-comment-header')?.querySelector('.author') ??
        null;
      if (isBugbotAuthor(nearbyAuthor)) return true;
    }
  }

  // Check comment header area for bugbot text patterns
  const header = commentEl.querySelector('.timeline-comment-header');
  if (header && hasBugbotTextPattern(header.textContent ?? '')) return true;

  // Check the first line of the comment body for bugbot markers
  const body = commentEl.querySelector('.comment-body, .review-comment-body');
  if (body) {
    const firstLine = (body.textContent ?? '').slice(0, 200);
    if (hasBugbotTextPattern(firstLine)) return true;
  }

  return false;
}
