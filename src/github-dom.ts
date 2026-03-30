// Helpers for extracting PR context from the GitHub DOM.

export interface PRContext {
  repo: string;
  prTitle: string;
  prNumber: string;
}

export interface CommentContext {
  filePath: string | null;
  lineRange: string | null;
  commentText: string;
  codeSnippet: string | null;
  language: string | null;
  permalink: string | null;
}

export function getPRContext(): PRContext {
  const pathParts = window.location.pathname.split('/');
  // /owner/repo/pull/123
  const repo = pathParts.length >= 3 ? `${pathParts[1]}/${pathParts[2]}` : 'unknown';
  const prNumber = pathParts[4] ?? 'unknown';

  const titleEl =
    document.querySelector('.js-issue-title') ??
    document.querySelector('.gh-header-title .markdown-title') ??
    document.querySelector('[data-target="issue-header.title"]') ??
    document.querySelector('bdi.js-issue-title') ??
    document.querySelector('.gh-header-title') ??
    document.querySelector('h1.gh-header-title') ??
    document.querySelector('[data-testid="issue-title"]') ??
    document.querySelector('h1 bdi');
  const prTitle = titleEl?.textContent?.trim() ?? document.title.replace(/ · .*$/, '').replace(/^Pull Request #\d+: /, '') ?? 'unknown';

  return { repo, prTitle, prNumber };
}

export function getCommentContext(commentEl: Element): CommentContext {
  const commentText = extractCommentText(commentEl);
  const filePath = extractFilePath(commentEl);
  const lineRange = extractLineRange(commentEl);
  const { code: codeSnippet, language } = extractCodeSnippet(commentEl);
  const permalink = extractPermalink(commentEl);

  return { filePath, lineRange, commentText, codeSnippet, language, permalink };
}

function extractCommentText(el: Element): string {
  const body =
    el.querySelector('.comment-body') ??
    el.querySelector('.review-comment-body') ??
    el.querySelector('.markdown-body');
  return body?.textContent?.trim() ?? el.textContent?.trim() ?? '';
}

// Regex that matches file paths like src/foo/bar.tsx, app/models/user.rb, etc.
const FILE_PATH_RE = /(?:^|\s)((?:[\w@.-]+\/)+[\w.-]+\.[\w]{1,10})(?:\s|$)/;

function extractFilePath(el: Element): string | null {
  // Strategy 1: data-path attribute on the element or ancestors
  const dataPathEl = el.closest('[data-path]');
  if (dataPathEl?.getAttribute('data-path')) {
    return dataPathEl.getAttribute('data-path');
  }

  // Strategy 2: Walk up to the nearest thread/timeline container and search broadly
  const container =
    el.closest('.js-resolvable-timeline-thread-container') ??
    el.closest('.review-thread') ??
    el.closest('.js-timeline-item') ??
    el.closest('.file') ??
    el.closest('.inline-comments');

  if (container) {
    // 2a: data-path anywhere in the container
    const dpEl = container.querySelector('[data-path]');
    if (dpEl?.getAttribute('data-path')) {
      return dpEl.getAttribute('data-path');
    }

    // 2b: Links with title attribute pointing to files (GitHub file links)
    const fileLinks = container.querySelectorAll('a[title], a[href*="#diff-"]');
    for (const link of fileLinks) {
      const title = link.getAttribute('title') ?? '';
      if (title.includes('/') && /\.\w{1,10}$/.test(title)) {
        return title;
      }
      const text = link.textContent?.trim() ?? '';
      if (text.includes('/') && /\.\w{1,10}$/.test(text) && !text.includes(' ')) {
        return text;
      }
    }

    // 2c: Scan all text nodes in the container ABOVE the comment for file path patterns.
    // The file path in GitHub's conversation view is rendered as plain text in a div
    // above the code snippet table.
    const allElements = container.querySelectorAll('*');
    for (const child of allElements) {
      // Stop when we reach the comment element itself
      if (el.contains(child) || child.contains(el)) continue;

      // Check if this element is above the comment in DOM order
      if (el.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING) continue;

      const text = child.textContent?.trim() ?? '';
      // Short text that looks like a clean file path
      if (text.length < 300 && text.includes('/') && /\.\w{1,10}$/.test(text)) {
        const match = text.match(FILE_PATH_RE);
        if (match) return match[1];
        // If the entire text content is a path
        if (/^[\w@./-]+\.\w{1,10}$/.test(text)) return text;
      }
    }
  }

  // Strategy 3: Walk up previous siblings from the comment
  let sibling: Element | null = el.previousElementSibling;
  let depth = 0;
  while (sibling && depth < 5) {
    // Check the sibling's text
    const text = sibling.textContent?.trim() ?? '';
    if (text.length < 300 && text.includes('/')) {
      const match = text.match(FILE_PATH_RE);
      if (match) return match[1];
      if (/^[\w@./-]+\.\w{1,10}$/.test(text)) return text;
    }
    // Check data-path
    const dp = sibling.getAttribute('data-path') ??
      sibling.querySelector('[data-path]')?.getAttribute('data-path');
    if (dp) return dp;

    sibling = sibling.previousElementSibling;
    depth++;
  }

  // Strategy 4: Walk up parent chain and check each parent's previous siblings
  let parent: Element | null = el.parentElement;
  let parentDepth = 0;
  while (parent && parentDepth < 8) {
    // Check parent for data-path
    if (parent.getAttribute('data-path')) return parent.getAttribute('data-path');

    let pSibling: Element | null = parent.previousElementSibling;
    let psd = 0;
    while (pSibling && psd < 3) {
      const text = pSibling.textContent?.trim() ?? '';
      if (text.length < 300 && text.includes('/')) {
        const match = text.match(FILE_PATH_RE);
        if (match) return match[1];
        if (/^[\w@./-]+\.\w{1,10}$/.test(text)) return text;
      }
      const dp = pSibling.getAttribute('data-path') ??
        pSibling.querySelector('[data-path]')?.getAttribute('data-path');
      if (dp) return dp;
      pSibling = pSibling.previousElementSibling;
      psd++;
    }
    parent = parent.parentElement;
    parentDepth++;
  }

  // Strategy 5: Check comment body for file paths mentioned by Bugbot
  const body = el.querySelector('.comment-body, .review-comment-body, .markdown-body');
  if (body) {
    const codeEls = body.querySelectorAll('code');
    for (const code of codeEls) {
      const text = code.textContent?.trim() ?? '';
      if (text.includes('/') && /\.\w{1,10}$/.test(text) && !text.includes(' ')) {
        return text;
      }
    }
  }

  return null;
}

function extractLineRange(el: Element): string | null {
  // Look for line number links in the thread
  const thread =
    el.closest('.review-thread, .inline-comments, .js-resolvable-timeline-thread-container');
  if (!thread) return null;

  const lineLinks = thread.querySelectorAll(
    'td.blob-num[data-line-number], a[data-line-number], [data-line-number]'
  );

  const lineNums = Array.from(lineLinks)
    .map((l) => {
      const num = l.getAttribute('data-line-number');
      return num ? parseInt(num, 10) : NaN;
    })
    .filter((n) => !isNaN(n));

  if (lineNums.length === 0) {
    // Fallback: look for line numbers in text (e.g., "Line 15" or "L15-L18")
    const headerText = thread.querySelector('.file-header, [data-path]')?.textContent ?? '';
    const lineMatch = headerText.match(/L(\d+)(?:-L?(\d+))?/);
    if (lineMatch) {
      const start = lineMatch[1];
      const end = lineMatch[2];
      return end ? `${start}-${end}` : start;
    }
    return null;
  }

  const min = Math.min(...lineNums);
  const max = Math.max(...lineNums);
  return min === max ? String(min) : `${min}-${max}`;
}

function extractCodeSnippet(el: Element): {
  code: string | null;
  language: string | null;
} {
  // Try to get code from the surrounding diff hunk
  const thread =
    el.closest('.review-thread, .inline-comments, .js-resolvable-timeline-thread-container');

  // Look for diff table in the thread or its parent file container
  const diffTable =
    thread?.querySelector('table.diff-table, table.d-block') ??
    thread?.closest('.file')?.querySelector('table.diff-table') ??
    // In conversation view, the code snippet is shown as a table before the comment
    thread?.querySelector('table');

  if (diffTable) {
    const codeLines = Array.from(
      diffTable.querySelectorAll('.blob-code-inner, td.blob-code')
    )
      .slice(-20) // last 20 lines near the comment
      .map((line) => (line.textContent ?? '').replace(/^\s*[+-]/, ''))
      .join('\n');
    if (codeLines.trim()) {
      const lang = guessLanguage(el);
      return { code: codeLines, language: lang };
    }
  }

  // Try to find code lines shown directly (GitHub sometimes uses divs instead of tables)
  if (thread) {
    const codeContainer = thread.querySelector('.js-blob-code-container, .blob-wrapper');
    if (codeContainer) {
      const code = codeContainer.textContent?.trim() ?? '';
      if (code) {
        return { code, language: guessLanguage(el) };
      }
    }
  }

  // Fallback: code blocks inside the comment body itself
  const body = el.querySelector('.comment-body, .review-comment-body, .markdown-body');
  if (body) {
    const codeBlock = body.querySelector('pre code');
    if (codeBlock) {
      const lang =
        Array.from(codeBlock.classList)
          .find((c) => c.startsWith('language-'))
          ?.replace('language-', '') ?? null;
      return { code: codeBlock.textContent?.trim() ?? null, language: lang };
    }

    // Inline code elements that look like code snippets
    const inlineCodes = body.querySelectorAll('code');
    const codeTexts: string[] = [];
    for (const ic of inlineCodes) {
      const t = ic.textContent?.trim() ?? '';
      if (t.length > 10) codeTexts.push(t);
    }
    if (codeTexts.length > 0) {
      return { code: codeTexts.join('\n'), language: guessLanguage(el) };
    }
  }

  return { code: null, language: null };
}

function guessLanguage(el: Element): string | null {
  const filePath = extractFilePath(el);
  if (!filePath) return null;
  const ext = filePath.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    sh: 'bash',
    sql: 'sql',
    md: 'markdown',
  };
  return ext ? extMap[ext] ?? ext : null;
}

function extractPermalink(el: Element): string | null {
  // Look for a timestamp link which is typically the permalink
  const timestampLink = el.querySelector(
    'a.timestamp, a[href*="#discussion_r"], a[href*="#pullrequestreview"], relative-time'
  );
  if (timestampLink) {
    const anchor = timestampLink.closest('a');
    if (anchor?.href) return anchor.href;
  }

  // Try the comment's id
  const commentId = el.id || el.closest('[id]')?.id;
  if (commentId) {
    return `${window.location.origin}${window.location.pathname}#${commentId}`;
  }

  return null;
}

export function getAllCommentElements(): Element[] {
  const selectors = [
    // Top-level PR comments (conversation tab)
    '.timeline-comment',
    // Inline review comments
    '.review-comment',
    // Generic comment containers
    '.js-comment',
    '.discussion-timeline-actions .comment',
    // Review thread comments (files changed view)
    '.js-resolvable-timeline-thread-container .review-comment',
    // Minimized/outdated review comments
    '.outdated-comment',
    // GitHub's newer review comment structure
    '[data-body-version] .js-comment',
    // Review body in conversation tab (the review summary + inline comments)
    '.js-review-comment',
  ];
  const all = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => all.add(el));
  }
  return Array.from(all);
}
