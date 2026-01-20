import { join } from "node:path";
import {
  createContributionCommit,
  fetchAllGitLabCommits,
  initGitHubRepo,
  pushToGitHub,
} from "./services";
import type { SyncConfig, SyncedCommitsRecord } from "./types";
import {
  ProgressBar,
  isCommitSynced,
  loadSyncedCommits,
  log,
  markCommitSynced,
  saveSyncedCommits,
} from "./utils";

/**
 * Validates the configuration object
 */
function validateConfig(config: unknown): SyncConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object");
  }

  const c = config as Record<string, unknown>;

  // Validate gitlab section
  if (!c.gitlab || typeof c.gitlab !== "object") {
    throw new Error("Missing 'gitlab' section in config");
  }
  const gitlab = c.gitlab as Record<string, unknown>;
  if (typeof gitlab.url !== "string" || !gitlab.url) {
    throw new Error("Missing 'gitlab.url' in config");
  }
  if (typeof gitlab.token !== "string" || !gitlab.token) {
    throw new Error("Missing 'gitlab.token' in config");
  }
  if (typeof gitlab.authorEmail !== "string" || !gitlab.authorEmail) {
    throw new Error("Missing 'gitlab.authorEmail' in config");
  }

  // Validate other required fields
  if (typeof c.githubRepoPath !== "string" || !c.githubRepoPath) {
    throw new Error("Missing 'githubRepoPath' in config");
  }
  if (typeof c.githubAuthorName !== "string" || !c.githubAuthorName) {
    throw new Error("Missing 'githubAuthorName' in config");
  }
  if (typeof c.githubAuthorEmail !== "string" || !c.githubAuthorEmail) {
    throw new Error("Missing 'githubAuthorEmail' in config");
  }

  return config as SyncConfig;
}

/**
 * Loads configuration from config.json
 */
async function loadConfig(): Promise<SyncConfig> {
  const configPath = join(process.cwd(), "config.json");
  const configFile = Bun.file(configPath);

  if (!(await configFile.exists())) {
    throw new Error(
      "config.json not found. Please create it based on config.example.json",
    );
  }

  const content = await configFile.text();

  try {
    const parsed = JSON.parse(content);
    return validateConfig(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config.json: ${error.message}`);
    }
    throw error;
  }
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

  // Create contribution commits with incremental save
  console.log("\nSyncing commits:\n");
  let successCount = 0;
  const saveInterval = 50;
  const progress = new ProgressBar(newCommits.length);

  for (let i = 0; i < newCommits.length; i++) {
    const commit = newCommits[i];
    try {
      await createContributionCommit(
        config.githubRepoPath,
        commit,
        config.githubAuthorName,
        config.githubAuthorEmail,
      );
      markCommitSynced(syncedRecord, commit.hash);
      successCount++;
      progress.update(successCount, commit.date.substring(0, 10));

      // Incremental save to prevent data loss on crash
      if (successCount % saveInterval === 0) {
        await saveSyncedCommits(syncedFile, syncedRecord);
      }
    } catch (error) {
      log.error(`\nFailed to sync commit ${commit.hash}: ${error}`);
    }
  }

  // Final save
  await saveSyncedCommits(syncedFile, syncedRecord);
  progress.complete();

  console.log(`${"─".repeat(60)}`);

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
