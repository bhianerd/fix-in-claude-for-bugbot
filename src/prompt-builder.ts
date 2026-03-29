import type { PRContext, CommentContext } from './github-dom';

export function buildPrompt(pr: PRContext, comment: CommentContext): string {
  const lines: string[] = [
    'Fix the issue identified by Cursor Bugbot in this pull request.',
    '',
    `Repo: ${pr.repo}`,
    `PR: ${pr.prTitle}`,
    `File: ${comment.filePath ?? 'unknown'}`,
    `Line: ${comment.lineRange ?? 'unknown'}`,
  ];

  if (comment.permalink) {
    lines.push(`Permalink: ${comment.permalink}`);
  }

  lines.push('', 'Bugbot comment:', comment.commentText);

  if (comment.codeSnippet) {
    const lang = comment.language ?? '';
    lines.push('', 'Relevant code:', `\`\`\`${lang}`, comment.codeSnippet, '```');
  }

  lines.push(
    '',
    'Please:',
    '- explain whether Bugbot is correct',
    '- identify the root issue',
    '- provide the minimal fix',
    '- preserve existing behavior unless a change is necessary',
    '- mention any tests or edge cases to cover',
  );

  return lines.join('\n');
}
