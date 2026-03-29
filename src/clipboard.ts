export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or permission issues
    return fallbackCopy(text);
  }
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    // ignore
  }
  document.body.removeChild(textarea);
  return ok;
}

export function showToast(message: string): void {
  const existing = document.querySelector('.fix-in-claude-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'fix-in-claude-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Force reflow then add visible class for animation
  toast.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
  toast.classList.add('fix-in-claude-toast--visible');

  setTimeout(() => {
    toast.classList.remove('fix-in-claude-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
