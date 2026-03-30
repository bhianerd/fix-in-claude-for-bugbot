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
  // Clipboard icon — matches GitHub's icon style
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.75 1a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75h-4.5Zm.75 3V2.5h3V4h-3Zm-2.874-.467a.75.75 0 0 0-.752.657L2.25 5.504V13.5a.5.5 0 0 0 .5.5h10.5a.5.5 0 0 0 .5-.5V5.504l-.624-1.314a.75.75 0 0 0-.752-.657H11.5v1.5h.19l.31.653V13H4V5.686l.31-.653H4.5v-1.5H3.626Z"/></svg> Fix in Claude`;

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

    // Try to place next to Bugbot's own action buttons ("Fix in Cursor", "Fix in Web")
    const bugbotActions = commentEl.querySelector('a[href*="cursor://"]')?.closest('div, p, span');
    if (bugbotActions) {
      bugbotActions.appendChild(btn);
    } else {
      // Try standard comment action areas
      const actionsBar =
        commentEl.querySelector('.timeline-comment-actions') ??
        commentEl.querySelector('.comment-actions') ??
        commentEl.querySelector('.review-comment-contents .d-flex') ??
        commentEl.querySelector('.review-comment-header');

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
