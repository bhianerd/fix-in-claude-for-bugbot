// Configurable selectors and patterns for detecting Bugbot comments.
// Tweak these if GitHub or Bugbot changes their DOM/naming.

export const BUGBOT_AUTHOR_LOGINS = [
  'cursor-bugbot',
  'cursor-bugbot[bot]',
  'bugbot',
  'bugbot[bot]',
  'cursor',
  'cursor[bot]',
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
  // Check all author links in the comment (may be nested)
  const authorLinks = commentEl.querySelectorAll(
    '.author, a.timeline-comment-header-text, a[data-hovercard-type="user"]'
  );
  for (const link of authorLinks) {
    if (isBugbotAuthor(link)) return true;
  }

  // Check for bot label near an author we recognize
  const labels = commentEl.querySelectorAll(
    '.Label--secondary, .Label, [class*="Label"]'
  );
  for (const label of labels) {
    if (label.textContent?.trim().toLowerCase() === 'bot') {
      // Walk up to find the nearest author
      const container =
        label.closest('.timeline-comment-header') ??
        label.closest('.review-comment-header') ??
        label.parentElement;
      const nearbyAuthor = container?.querySelector('.author') ?? null;
      if (isBugbotAuthor(nearbyAuthor)) return true;

      // If cursor + bot label, that's Bugbot
      const authorText = container?.textContent?.toLowerCase() ?? '';
      if (authorText.includes('cursor')) return true;
    }
  }

  // Check comment header area for bugbot text patterns
  const headers = commentEl.querySelectorAll(
    '.timeline-comment-header, .review-comment-header, .comment-header'
  );
  for (const header of headers) {
    if (hasBugbotTextPattern(header.textContent ?? '')) return true;
  }

  // Check the first part of the comment body for bugbot markers
  const body = commentEl.querySelector(
    '.comment-body, .review-comment-body, .markdown-body'
  );
  if (body) {
    const firstLine = (body.textContent ?? '').slice(0, 300);
    if (hasBugbotTextPattern(firstLine)) return true;
  }

  // Check for Bugbot's "Fix in Cursor" button as a strong signal
  const fixInCursor = commentEl.querySelector(
    'a[href*="cursor://"], button:has(> span)'
  );
  if (fixInCursor?.textContent?.includes('Fix in Cursor')) return true;

  return false;
}
