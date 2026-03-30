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

function extractFilePath(el: Element): string | null {
  // Inline review comments live inside a file diff container
  const fileHeader =
    el.closest('.file')?.querySelector('.file-header') ??
    el.closest('[data-path]');

  if (fileHeader) {
    const path =
      fileHeader.getAttribute('data-path') ??
      fileHeader.querySelector('.file-info a, [title]')?.getAttribute('title') ??
      fileHeader.querySelector('.file-info a')?.textContent?.trim() ??
      null;
    if (path) return path;
  }

  // Try the review thread header
  const thread = el.closest('.review-thread, .js-resolvable-timeline-thread-container');
  if (thread) {
    const threadPath = thread.querySelector('.file-header, [data-path]');
    if (threadPath) {
      return (
        threadPath.getAttribute('data-path') ??
        threadPath.textContent?.trim() ??
        null
      );
    }
    // GitHub shows file path as a link above the code snippet in conversation view
    const fileLink = thread.querySelector('a[title][href*="#diff-"]');
    if (fileLink) {
      return fileLink.getAttribute('title') ?? fileLink.textContent?.trim() ?? null;
    }
  }

  // Try to extract from the comment body itself — Bugbot often mentions the file path
  const body = el.querySelector('.comment-body, .review-comment-body, .markdown-body');
  if (body) {
    // Look for file path patterns in code blocks or text
    const codeEls = body.querySelectorAll('code');
    for (const code of codeEls) {
      const text = code.textContent ?? '';
      // Match paths like src/foo/bar.ts
      if (/^[\w./-]+\.\w{1,5}$/.test(text) && text.includes('/')) {
        return text;
      }
    }
  }

  // Look for file path in a sibling or parent element above the comment
  const prevSibling = el.previousElementSibling;
  if (prevSibling) {
    const pathEl = prevSibling.querySelector('[data-path], .file-header a[title]');
    if (pathEl) {
      return pathEl.getAttribute('data-path') ?? pathEl.getAttribute('title') ?? null;
    }
    // Check for text content that looks like a file path
    const text = prevSibling.textContent?.trim() ?? '';
    if (/^[\w./-]+\.\w{1,5}$/.test(text) && text.includes('/')) {
      return text;
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
