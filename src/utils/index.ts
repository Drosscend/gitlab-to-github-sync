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
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const content = await file.text();
      return JSON.parse(content);
    }
  } catch (_error) {
    log.warn("Could not load synced commits file, starting fresh");
  }

  return {
    commits: {},
    lastSync: new Date().toISOString(),
  };
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
  info: (message: string) => console.log(chalk.blue("ℹ"), message),
  success: (message: string) => console.log(chalk.green("✓"), message),
  warn: (message: string) => console.log(chalk.yellow("⚠"), message),
  error: (message: string) => console.log(chalk.red("✗"), message),
  commit: (repo: string, message: string, date: string) => {
    console.log(
      chalk.gray("  │"),
      chalk.cyan(`[${repo}]`),
      chalk.white(message.substring(0, 50)),
      chalk.gray(date),
    );
  },
};

/**
 * Ensures a directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
