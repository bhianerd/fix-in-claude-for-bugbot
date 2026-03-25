import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import * as log from './log.js';

const HELP = `
aimemory — Sync AI coding tool memory

Usage: aimemory <command> [options]

Commands:
  init                Initialize in current project
  sync                Sync canonical memory to all tool files
  watch               Watch for changes and auto-sync
  status              Show sync status across tools
  add <text>          Add a bullet to memory
    --section, -s     Target section (default: "Learned User Preferences")

Options:
  --help, -h          Show help
  --version, -v       Show version
`.trim();

export async function run(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      section: { type: 'string', short: 's', default: 'Learned User Preferences' },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version: string };
    console.log(pkg.version);
    return;
  }

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return;
  }

  const command = positionals[0];
  const projectDir = resolve('.');

  try {
    switch (command) {
      case 'init': {
        const { init } = await import('./commands/init.js');
        await init(projectDir);
        break;
      }
      case 'sync': {
        const { sync } = await import('./commands/sync.js');
        await sync(projectDir);
        break;
      }
      case 'watch': {
        const { watch } = await import('./commands/watch.js');
        await watch(projectDir);
        break;
      }
      case 'status': {
        const { status } = await import('./commands/status.js');
        await status(projectDir);
        break;
      }
      case 'add': {
        const text = positionals.slice(1).join(' ');
        if (!text) {
          log.error('Usage: aimemory add "your preference text"');
          process.exit(1);
        }
        const { add } = await import('./commands/add.js');
        await add(projectDir, text, values.section as string);
        break;
      }
      default:
        log.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    log.error((err as Error).message);
    process.exit(1);
  }
}
