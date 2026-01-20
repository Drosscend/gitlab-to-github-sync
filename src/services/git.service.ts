import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import simpleGit, { type SimpleGit } from "simple-git";
import type { CommitInfo } from "../types";
import { log } from "../utils";

async function directoryExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Creates a contribution commit in the GitHub repository
 */
export async function createContributionCommit(
  githubRepoPath: string,
  commit: CommitInfo,
  authorName: string,
  authorEmail: string,
): Promise<void> {
  const git: SimpleGit = simpleGit(githubRepoPath);
  const commitTitle = commit.message.split("\n")[0];

  // Update sync file with current commit hash (O(1) - just overwrite)
  const syncFilePath = join(githubRepoPath, ".sync");
  await Bun.write(syncFilePath, commit.hash);

  await git.add(syncFilePath);

  const commitMessage = `[${commit.repoName}] ${commitTitle}`;

  await git
    .env("GIT_AUTHOR_DATE", commit.date)
    .env("GIT_COMMITTER_DATE", commit.date)
    .env("GIT_AUTHOR_NAME", authorName)
    .env("GIT_AUTHOR_EMAIL", authorEmail)
    .env("GIT_COMMITTER_NAME", authorName)
    .env("GIT_COMMITTER_EMAIL", authorEmail)
    .commit(commitMessage);
}

/**
 * Initializes the GitHub contributions repository if needed
 */
export async function initGitHubRepo(repoPath: string): Promise<void> {
  if (!(await directoryExists(repoPath))) {
    await mkdir(repoPath, { recursive: true });
  }

  const gitDir = join(repoPath, ".git");
  const gitDirExists = await directoryExists(gitDir);

  if (!gitDirExists) {
    const git: SimpleGit = simpleGit(repoPath);
    await git.init();
    log.info(`Initialized new git repository at ${repoPath}`);

    const readmePath = join(repoPath, "README.md");
    await Bun.write(
      readmePath,
      "# Work Activity\n\nThis repository tracks my coding activity.\n",
    );

    const syncPath = join(repoPath, ".sync");
    await Bun.write(syncPath, "init");

    await git.add(".");
    await git.commit("Initial commit");
    log.success("Created initial commit");
  }
}

/**
 * Pushes changes to GitHub remote
 */
export async function pushToGitHub(repoPath: string): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    const remotes = await git.getRemotes(true);

    if (remotes.length === 0) {
      log.warn("No remote configured. Please add a GitHub remote:");
      log.info(
        "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git",
      );
      return;
    }

    await git.push("origin", "main");
    log.success("Pushed changes to GitHub");
  } catch (_error) {
    // Try with master branch
    try {
      await git.push("origin", "master");
      log.success("Pushed changes to GitHub");
    } catch {
      log.error("Could not push to GitHub. Check your remote configuration.");
    }
  }
}
