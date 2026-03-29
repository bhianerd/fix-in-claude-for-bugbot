# Fix in Claude for Bugbot

Chrome extension that adds a **"Fix in Claude"** button to Cursor Bugbot comments on GitHub pull requests. Clicking the button copies a Claude-ready prompt to your clipboard with the Bugbot issue, relevant code, and PR context.

## Install (load unpacked)

1. `npm install && npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this project directory
5. Navigate to a GitHub PR with Bugbot comments

## How it works

- A content script runs on `github.com/*/pull/*` pages
- It detects Bugbot comments by author login, bot labels, and text patterns
- For each Bugbot comment, a small "Fix in Claude" button is injected into the comment actions area
- Clicking copies a structured prompt with repo, PR title, file path, line range, Bugbot text, and nearby code
- A MutationObserver re-injects buttons when GitHub dynamically updates the DOM

## Tweaking selectors

If GitHub or Bugbot changes their DOM, edit these files:

- **`src/bugbot-detection.ts`** — author logins, text patterns, and DOM selectors for identifying Bugbot comments
- **`src/github-dom.ts`** — selectors for extracting file paths, line numbers, code snippets, and comment text from the GitHub PR DOM

## Development

```sh
npm run dev    # watch mode — rebuild on file changes
npm run build  # one-time production build
```

After rebuilding, click the refresh icon on `chrome://extensions` to reload.

## Limitations

- Detection relies on DOM structure and author names which may change
- Code snippets are best-effort — extracted from visible diff hunks near the comment
- File path and line number may be unavailable for top-level (non-inline) comments
- Only works on `github.com` (not GitHub Enterprise without manifest changes)
