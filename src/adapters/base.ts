import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export abstract class BaseAdapter {
  protected projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  abstract get name(): string;
  abstract get relPath(): string;

  get filePath(): string {
    return join(this.projectDir, this.relPath);
  }

  async exists(): Promise<boolean> {
    try {
      await stat(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<string | null> {
    try {
      return await readFile(this.filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async write(content: string): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, content);
  }

  /** Convert tool-specific format to canonical markdown */
  toMarkdown(raw: string): string {
    return raw;
  }

  /** Convert canonical markdown to tool-specific format */
  fromMarkdown(md: string): string {
    return md;
  }

  /** Detect if this tool is in use in the project */
  async detect(): Promise<boolean> {
    return this.exists();
  }
}
