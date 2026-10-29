export interface CommitInfo {
  hash: string;
  date: string;
}

export interface GitLabConfig {
  /** GitLab instance URL (e.g., https://gitlab.com or https://gitlab.company.com) */
  url: string;
  /** Personal Access Token with read_api scope */
  token: string;
  authorEmail: string;
  /** Skip TLS certificate verification (for self-hosted GitLab with self-signed certs) */
  insecure?: boolean;
}

export interface SyncConfig {
  gitlab: GitLabConfig;
  /** Local path to the GitHub contributions repository */
  githubRepoPath: string;
  /** Path to the file tracking synced commits (default: .synced-commits.json) */
  syncedCommitsFile?: string;
  /** Email to use for GitHub commits (must match a verified email on your GitHub account) */
  githubAuthorEmail: string;
  githubAuthorName: string;
}

export interface SyncedCommitsRecord {
  /** Map of original commit hash to sync date */
  commits: Record<string, string>;
  lastSync: string;
}

export interface GitLabProject {
  id: number;
  path_with_namespace: string;
}

export interface GitLabBranch {
  name: string;
}

export interface GitLabCommit {
  id: string;
  author_email: string;
  authored_date: string;
}
