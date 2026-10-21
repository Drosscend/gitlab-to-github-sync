import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { SyncedCommitsRecord } from "../types";

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

export function isCommitSynced(
  record: SyncedCommitsRecord,
  commitHash: string,
): boolean {
  return commitHash in record.commits;
}

export function markCommitSynced(
  record: SyncedCommitsRecord,
  commitHash: string,
): void {
  record.commits[commitHash] = new Date().toISOString();
}
