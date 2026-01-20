import { join } from "node:path";
import {
  createContributionCommit,
  fetchAllGitLabCommits,
  initGitHubRepo,
  pushToGitHub,
} from "./services";
import type { SyncConfig, SyncedCommitsRecord } from "./types";
import {
  isCommitSynced,
  loadSyncedCommits,
  log,
  markCommitSynced,
  saveSyncedCommits,
} from "./utils";

/**
 * Loads configuration from config.json
 */
async function loadConfig(): Promise<SyncConfig> {
  const configPath = join(process.cwd(), "config.json");
  const configFile = Bun.file(configPath);

  if (!(await configFile.exists())) {
    log.error(
      "config.json not found. Please create it based on config.example.json",
    );
    process.exit(1);
  }

  const content = await configFile.text();
  return JSON.parse(content);
}

/**
 * Main sync function
 */
async function sync(): Promise<void> {
  console.log(`\n${"═".repeat(60)}`);
  console.log("  GitLab → GitHub Contributions Sync");
  console.log(`${"═".repeat(60)}\n`);

  // Load configuration
  const config = await loadConfig();

  // Handle insecure TLS for self-hosted GitLab
  if (config.gitlab.insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    log.warn("TLS certificate verification disabled");
  }

  log.info(`GitLab: ${config.gitlab.url}`);
  log.info(`Author: ${config.gitlab.authorEmail}`);

  // Initialize GitHub repo if needed
  await initGitHubRepo(config.githubRepoPath);

  // Load synced commits record
  const syncedFile = config.syncedCommitsFile ?? ".synced-commits.json";
  const syncedRecord: SyncedCommitsRecord = await loadSyncedCommits(syncedFile);
  const syncedCount = Object.keys(syncedRecord.commits).length;
  log.info(`Found ${syncedCount} previously synced commits\n`);

  // Fetch all commits from GitLab API
  const allCommits = await fetchAllGitLabCommits(config.gitlab);
  log.success(`\nTotal: ${allCommits.length} commits found`);

  // Filter out already synced commits
  const newCommits = allCommits.filter(
    (commit) => !isCommitSynced(syncedRecord, commit.hash),
  );
  log.info(`${newCommits.length} new commits to sync`);

  if (newCommits.length === 0) {
    log.success("Everything is up to date!");
    return;
  }

  // Sort commits by date (oldest first)
  newCommits.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Create contribution commits
  console.log("\nSyncing commits:");
  let successCount = 0;

  for (const commit of newCommits) {
    try {
      await createContributionCommit(
        config.githubRepoPath,
        commit,
        config.githubAuthorName,
        config.githubAuthorEmail,
      );
      markCommitSynced(syncedRecord, commit.hash);
      log.commit(commit.repoName, commit.message, commit.date.substring(0, 10));
      successCount++;
    } catch (error) {
      log.error(`Failed to sync commit ${commit.hash}: ${error}`);
    }
  }

  // Save synced commits record
  await saveSyncedCommits(syncedFile, syncedRecord);

  console.log(`\n${"─".repeat(60)}`);
  log.success(`Synced ${successCount}/${newCommits.length} commits`);

  // Push to GitHub
  console.log("\nPushing to GitHub...");
  await pushToGitHub(config.githubRepoPath);

  console.log(`\n${"═".repeat(60)}`);
  log.success("Sync complete!");
  console.log(`${"═".repeat(60)}\n`);
}

// Run the sync
sync().catch((error) => {
  log.error(`Sync failed: ${error}`);
  process.exit(1);
});
