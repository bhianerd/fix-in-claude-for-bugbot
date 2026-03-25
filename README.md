# aimemory

**One memory. Every AI coding tool. Always in sync.**

You use Cursor at work, Claude Code on side projects, Copilot for quick fixes, and Windsurf when you feel like it. Each one learns your preferences separately. You end up repeating yourself — *"use tabs not spaces," "we use pnpm here," "always prefer named exports"* — over and over, to every tool, in every project.

aimemory fixes that. It maintains a single canonical memory file and syncs it everywhere, so every AI coding tool knows what you've taught any of them.

```
$ aimemory add "Always use TypeScript strict mode"
✓ Added: - Always use TypeScript strict mode
✓ Synced cursor → .cursor/rules/aimemory.mdc
✓ Synced claude → CLAUDE.md
✓ Synced codex → AGENTS.md
✓ Synced windsurf → .windsurfrules
✓ Synced copilot → .github/copilot-instructions.md
```

One command. Five tools updated.

## Supported Tools

| Tool | Config Path | Format |
|------|------------|--------|
| **Cursor** | `.cursor/rules/aimemory.mdc` | MDC (frontmatter + markdown) |
| **Claude Code** | `CLAUDE.md` | Markdown |
| **OpenAI Codex** | `AGENTS.md` | Markdown |
| **Windsurf** | `.windsurfrules` | Plain text rules |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Markdown |

Each tool gets its preferences in the format it natively understands. No hacks, no workarounds.

## Install

```bash
npm install -g aimemory
```

Requires Node.js 20+.

## Quick Start

```bash
# Initialize in your project — auto-detects which tools you use
cd your-project
aimemory init

# Add a preference
aimemory add "Prefer functional components with hooks"

# Add a workspace fact
aimemory add "This project uses PostgreSQL 16" --section "Learned Workspace Facts"

# See what's in sync
aimemory status
```

## Commands

### `aimemory init`

Scans your project for AI tool configs (`.cursor/`, `CLAUDE.md`, `.windsurfrules`, `.github/`, etc.) and creates a `.aimemory.json` config listing the detected tools. Also creates the global canonical memory at `~/.aimemory/memory.md` if it doesn't exist.

### `aimemory sync`

The core operation. Pulls new preferences from every tool's config file, merges them into the canonical memory (additive only — nothing is ever deleted), then writes the updated memory back to every tool in its native format.

```bash
aimemory sync
```

### `aimemory watch`

Runs `sync` automatically whenever any memory file changes. Uses `fs.watch` with 500ms debounce. Leave it running in a terminal while you work.

```bash
aimemory watch
```

### `aimemory status`

Shows a table of every tool, whether its config file exists, and how many preferences it has.

```
ℹ Canonical: ~/.aimemory/memory.md
ℹ Sections: 2, Bullets: 5

Tool       | Path                              | Exists | Bullets
-----------|-----------------------------------|--------|--------
cursor     | .cursor/rules/aimemory.mdc        | yes    | 5
claude     | CLAUDE.md                         | yes    | 5
codex      | AGENTS.md                         | yes    | 5
windsurf   | .windsurfrules                    | yes    | 5
copilot    | .github/copilot-instructions.md   | yes    | 5
```

### `aimemory add <text>`

Adds a bullet to the canonical memory and syncs immediately.

```bash
aimemory add "Use ESM imports, never CommonJS"
aimemory add "Project uses Redis for caching" --section "Learned Workspace Facts"
```

## How It Works

### The Canonical File

Everything lives in `~/.aimemory/memory.md`:

```markdown
# AI Memory

## Learned User Preferences
- Always use TypeScript strict mode
- Prefer named exports over default exports
- Use 2-space indentation

## Learned Workspace Facts
- This project uses PostgreSQL 16
- Deployment target is AWS ECS
```

Plain markdown. Human-readable. Version-controllable if you want.

### Merge Strategy

Sync is **additive only** into the canonical file. When a tool file has new bullets that the canonical doesn't, they get merged in. When the canonical is written back to tool files, it's a full overwrite — the canonical is always authoritative.

Deduplication uses normalized text comparison (lowercase, strip punctuation, collapse whitespace). If you taught Cursor `"use const over let"` and then told Claude Code `"Use const over let."`, aimemory knows that's the same preference.

### Adapter System

Each tool has an adapter that handles format translation:

- **Cursor**: Wraps markdown in `.mdc` frontmatter (`alwaysApply: true`) so Cursor auto-loads it
- **Windsurf**: Converts between plain text lines and markdown bullets
- **Claude Code, Codex, Copilot**: Native markdown pass-through

Adding a new tool is one file — implement `name`, `relPath`, and optionally `toMarkdown()`/`fromMarkdown()`.

## Project Structure

```
src/
├── cli.ts                 # Command router
├── types.ts               # Document, Section, Config interfaces
├── markdown.ts            # Markdown parser/serializer
├── merge.ts               # Per-bullet merge engine
├── config.ts              # .aimemory.json read/write
├── memory.ts              # ~/.aimemory/memory.md read/write
├── log.ts                 # Colored terminal output
├── adapters/
│   ├── base.ts            # Abstract adapter class
│   ├── cursor.ts          # .cursor/rules/aimemory.mdc
│   ├── claude.ts          # CLAUDE.md
│   ├── codex.ts           # AGENTS.md
│   ├── windsurf.ts        # .windsurfrules
│   ├── copilot.ts         # .github/copilot-instructions.md
│   └── index.ts           # Adapter registry
└── commands/
    ├── init.ts
    ├── sync.ts
    ├── watch.ts
    ├── status.ts
    └── add.ts
```

## Development

```bash
git clone <repo>
cd aimemory
npm install
npm run build        # Compile with tsup
npm test             # Run tests (node:test + tsx)
npm run typecheck    # Type-check without emitting
```

Zero runtime dependencies. TypeScript, tsup, tsx, and `@types/node` are dev-only.

## Design Principles

- **No AI calls.** This is a pure sync tool. The AI tools generate the content; aimemory just keeps them in sync.
- **No lock-in.** Everything is plain markdown. Delete aimemory and your tool configs still work exactly as before.
- **Additive merges.** Preferences are never silently deleted. You add things; you remove them manually if you want.
- **Native formats.** Each tool gets its config in the format it expects. No shims, no compatibility layers.
- **Zero dependencies.** Only Node.js built-ins at runtime.

## License

MIT
