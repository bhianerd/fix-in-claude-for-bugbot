import { isBugbotComment } from './bugbot-detection';
import { getAllCommentElements, getPRContext, getCommentContext } from './github-dom';
import { buildPrompt } from './prompt-builder';
import { copyToClipboard, showToast } from './clipboard';

const BUTTON_ATTR = 'data-fix-in-claude';

function createButton(commentEl: Element): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'fix-in-claude-btn';
  btn.setAttribute(BUTTON_ATTR, 'true');
  btn.type = 'button';
  btn.title = 'Copy a Claude-ready fix prompt to clipboard';
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg> Fix in Claude`;
  // Use a wrench-like icon instead
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.429 1.525a6.593 6.593 0 0 1 1.71-.209c.372 0 .744.036 1.11.106.333.064.664.148.989.25a.75.75 0 0 1 .345 1.237l-2.83 2.83a1.5 1.5 0 1 0 2.122 2.122l2.83-2.83a.75.75 0 0 1 1.237.345c.293.938.39 1.937.217 2.958a5.063 5.063 0 0 1-4.03 4.03c-1.021.173-2.02.076-2.958-.217a.75.75 0 0 1-.345-1.237l.262-.262-5.07-5.07a.75.75 0 0 1 0-1.06L4.997 1.52a.75.75 0 0 1 1.06 0l1.372 1.372V1.525Z"/></svg> Fix in Claude`;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const prCtx = getPRContext();
    const commentCtx = getCommentContext(commentEl);
    const prompt = buildPrompt(prCtx, commentCtx);

    const ok = await copyToClipboard(prompt);
    if (ok) {
      showToast('Copied Fix in Claude prompt');
      btn.classList.add('fix-in-claude-btn--copied');
      setTimeout(() => btn.classList.remove('fix-in-claude-btn--copied'), 1500);
    } else {
      showToast('Failed to copy — check clipboard permissions');
    }
  });

  return btn;
}

function injectButtons(): void {
  const comments = getAllCommentElements();
  for (const commentEl of comments) {
    // Skip if already injected
    if (commentEl.querySelector(`[${BUTTON_ATTR}]`)) continue;

    if (!isBugbotComment(commentEl)) continue;

    const btn = createButton(commentEl);

    // Try to place next to existing action buttons
    const actionsBar =
      commentEl.querySelector('.timeline-comment-actions') ??
      commentEl.querySelector('.comment-actions') ??
      commentEl.querySelector('.review-comment-contents .d-flex');

    if (actionsBar) {
      actionsBar.appendChild(btn);
    } else {
      // Fallback: insert at the top of the comment header
      const header =
        commentEl.querySelector('.timeline-comment-header') ??
        commentEl.querySelector('.comment-header');
      if (header) {
        header.appendChild(btn);
      } else {
        // Last resort: prepend to the comment itself
        commentEl.prepend(btn);
      }
    }
  }
}

function init(): void {
  // Initial injection
  injectButtons();

  // Re-inject on DOM changes (GitHub dynamically updates the page)
  const observer = new MutationObserver(() => {
    injectButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Wait for the page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
