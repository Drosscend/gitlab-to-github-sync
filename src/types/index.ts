/**
 * Represents a commit with its metadata
 */
export interface CommitInfo {
  hash: string;
  date: string;
}

/**
 * GitLab API configuration
 */
export interface GitLabConfig {
  /** GitLab instance URL (e.g., https://gitlab.com or https://gitlab.company.com) */
  url: string;
  /** Personal Access Token with read_api scope */
  token: string;
  /** Email to filter commits by author */
  authorEmail: string;
  /** Skip TLS certificate verification (for self-hosted GitLab with self-signed certs) */
  insecure?: boolean;
}

/**
 * Main configuration for the sync tool
 */
export interface SyncConfig {
  /** GitLab API configuration */
  gitlab: GitLabConfig;
  /** Local path to the GitHub contributions repository */
  githubRepoPath: string;
  /** Path to the file tracking synced commits (default: .synced-commits.json) */
  syncedCommitsFile?: string;
  /** Email to use for GitHub commits (must match a verified email on your GitHub account) */
  githubAuthorEmail: string;
  /** Name to use for GitHub commits */
  githubAuthorName: string;
}

/**
 * Record of already synced commits
 */
export interface SyncedCommitsRecord {
  /** Map of original commit hash to sync date */
  commits: Record<string, string>;
  /** Last sync timestamp */
  lastSync: string;
}

/**
 * GitLab API response types
 */
export interface GitLabProject {
  id: number;
  path_with_namespace: string;
}

export interface GitLabCommit {
  id: string;
  author_email: string;
  authored_date: string;
}
