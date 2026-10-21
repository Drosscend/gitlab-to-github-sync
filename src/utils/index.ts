import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import chalk from "chalk";
import type { SyncedCommitsRecord } from "../types";

/**
 * Loads the record of already synced commits
 */
export async function loadSyncedCommits(
  filePath: string,
): Promise<SyncedCommitsRecord> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return { commits: {}, lastSync: new Date().toISOString() };
  }

  try {
    return await file.json();
  } catch (error) {
    throw new Error(`Could not read ${filePath}: ${error}`);
  }
}

/**
 * Saves the record of synced commits
 */
export async function saveSyncedCommits(
  filePath: string,
  record: SyncedCommitsRecord,
): Promise<void> {
  const dir = dirname(filePath);
  if (dir && dir !== ".") {
    await mkdir(dir, { recursive: true });
  }

  record.lastSync = new Date().toISOString();
  await Bun.write(filePath, JSON.stringify(record, null, 2));
}

/**
 * Checks if a commit has already been synced
 */
export function isCommitSynced(
  record: SyncedCommitsRecord,
  commitHash: string,
): boolean {
  return commitHash in record.commits;
}

/**
 * Marks a commit as synced
 */
export function markCommitSynced(
  record: SyncedCommitsRecord,
  commitHash: string,
): void {
  record.commits[commitHash] = new Date().toISOString();
}

/**
 * Logger utility with colored output
 */
export const log = {
  info: (message: string) => console.log(chalk.blue("[INFO]"), message),
  success: (message: string) => console.log(chalk.green("[OK]"), message),
  warn: (message: string) => console.log(chalk.yellow("[WARN]"), message),
  error: (message: string) => console.log(chalk.red("[ERR]"), message),
};

/**
 * Progress bar for syncing commits
 */
export class ProgressBar {
  private total: number;
  private current = 0;
  private currentDate = "";
  private barWidth = 30;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(current: number, date: string): void {
    this.current = current;
    this.currentDate = date;
    this.render();
  }

  private render(): void {
    const percent = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.barWidth);
    const empty = this.barWidth - filled;

    const bar = chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
    const stats = `${this.current}/${this.total}`;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);

    process.stdout.write(
      `\r  [${bar}] ${chalk.cyan(percent.toString().padStart(3))}% ${chalk.gray(`(${stats})`)} ${chalk.yellow(this.currentDate)} ${chalk.gray(`${elapsed}s`)}`,
    );
  }

  complete(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write("\n");
    log.success(`Synced ${this.current}/${this.total} commits in ${elapsed}s`);
  }
}
