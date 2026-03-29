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
    document.querySelector('[data-target="issue-header.title"]');
  const prTitle = titleEl?.textContent?.trim() ?? 'unknown';

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
  const threadPath = el
    .closest('.review-thread')
    ?.querySelector('.file-header, [data-path]');
  if (threadPath) {
    return (
      threadPath.getAttribute('data-path') ??
      threadPath.textContent?.trim() ??
      null
    );
  }

  return null;
}

function extractLineRange(el: Element): string | null {
  // Look for line number links in the thread
  const thread = el.closest('.review-thread, .inline-comments');
  if (!thread) return null;

  const lineLinks = thread.querySelectorAll(
    'td.blob-num[data-line-number], a[data-line-number]'
  );
  if (lineLinks.length === 0) return null;

  const lineNums = Array.from(lineLinks)
    .map((l) => {
      const num = l.getAttribute('data-line-number');
      return num ? parseInt(num, 10) : NaN;
    })
    .filter((n) => !isNaN(n));

  if (lineNums.length === 0) return null;
  const min = Math.min(...lineNums);
  const max = Math.max(...lineNums);
  return min === max ? String(min) : `${min}-${max}`;
}

function extractCodeSnippet(el: Element): {
  code: string | null;
  language: string | null;
} {
  // Try to get code from the surrounding diff hunk
  const thread = el.closest('.review-thread, .inline-comments');
  const diffTable =
    thread?.closest('.file')?.querySelector('table.diff-table') ??
    thread?.querySelector('table.diff-table');

  if (diffTable) {
    const codeLines = Array.from(
      diffTable.querySelectorAll('.blob-code-inner')
    )
      .slice(-20) // last 20 lines near the comment
      .map((line) => line.textContent ?? '')
      .join('\n');
    if (codeLines.trim()) {
      const lang = guessLanguage(el);
      return { code: codeLines, language: lang };
    }
  }

  // Fallback: code blocks inside the comment itself
  const codeBlock = el.querySelector('.comment-body pre code, .review-comment-body pre code');
  if (codeBlock) {
    const lang =
      Array.from(codeBlock.classList)
        .find((c) => c.startsWith('language-'))
        ?.replace('language-', '') ?? null;
    return { code: codeBlock.textContent?.trim() ?? null, language: lang };
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
    '.timeline-comment',
    '.review-comment',
    '.js-comment',
    '.discussion-timeline-actions .comment',
  ];
  const all = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => all.add(el));
  }
  return Array.from(all);
}
