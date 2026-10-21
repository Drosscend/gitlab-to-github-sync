# GitLab → GitHub Contributions Sync

Synchronizes GitLab commit activity to a GitHub repository using the GitLab API.

## Features

- **No cloning required** - Uses the GitLab API to fetch commit metadata
- **Empty commits only** - Reproduces just the date; no source code, commit message, hash or project name is exposed
- Automatically discovers all projects you have access to
- Syncs commits from all branches
- Filter by author email
- Only processes new commits (avoids duplicates)
- Preserves original commit dates

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- A GitLab Personal Access Token with `read_api` scope

## Installation

```bash
# Clone this repo
git clone <repo-url>
cd gitlab-to-github-sync

# Install dependencies
bun install
```

## Configuration

### 1. Create a GitLab Personal Access Token

1. Go to your GitLab instance → **Settings** → **Access Tokens**
   - GitLab.com: https://gitlab.com/-/user_settings/personal_access_tokens
   - Self-hosted: `https://your-gitlab.com/-/user_settings/personal_access_tokens`

2. Create a token with the `read_api` scope

3. Copy the token (starts with `glpat-`)

### 2. Create the GitHub contributions repo

```bash
mkdir ~/github-contributions
cd ~/github-contributions
git init
git remote add origin https://github.com/YOUR_USERNAME/contributions.git
```

### 3. Create the configuration file

```bash
cp config.example.json config.json
```

Edit `config.json`:

```json
{
  "gitlab": {
    "url": "https://gitlab.com",
    "token": "glpat-xxxxxxxxxxxxxxxxxxxx",
    "authorEmail": "your.email@company.com"
  },
  "githubRepoPath": "/path/to/your/github-contributions",
  "githubAuthorName": "Your Name",
  "githubAuthorEmail": "your-github-email@example.com"
}
```

### Configuration Options

| Field                | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `gitlab.url`         | GitLab instance URL                                                        |
| `gitlab.token`       | Personal Access Token with `read_api` scope                                |
| `gitlab.authorEmail` | Email to filter commits (only your commits)                                |
| `gitlab.insecure`    | Optional. `true` skips TLS verification (self-signed GitLab certificate)   |
| `githubRepoPath`     | Path to the local GitHub repo                                              |
| `githubAuthorName`   | Name used for GitHub commits                                               |
| `githubAuthorEmail`  | Email for GitHub commits (must be verified on your account)                |
| `syncedCommitsFile`  | Optional. File tracking synced commits, defaults to `.synced-commits.json` |

## Usage

### Run the synchronization

```bash
bun start
```

### Example output

```
════════════════════════════════════════════════════════════
  GitLab → GitHub Contributions Sync
════════════════════════════════════════════════════════════

[INFO] GitLab: https://gitlab.example.com
[INFO] Author: your.email@company.com
[INFO] Found 0 previously synced commits

[INFO] Fetching projects from GitLab...
[OK] Found 16 projects
[INFO]   group/project-1: 45 commits
[INFO]   group/project-2: 123 commits
...
[OK] Total: 500 commits found
[INFO] 500 new commits to sync

Syncing commits:

  [██████████████████████████████] 100% (500/500) 2024-01-16 9s
[OK] Synced 500/500 commits in 9.4s
────────────────────────────────────────────────────────────

Pushing to GitHub...
[OK] Pushed changes to GitHub

════════════════════════════════════════════════════════════
[OK] Sync complete!
════════════════════════════════════════════════════════════
```

The process exits with code 1 when a commit or the push fails, so a
scheduler can report the failure. Failed commits are retried on the next run.

### Automation with cron

To automatically synchronize every day:

```bash
# Edit crontab
crontab -e

# Add this line (sync at 8 PM every day)
0 20 * * * cd /path/to/gitlab-to-github-sync && bun start >> /var/log/gitlab-sync.log 2>&1
```

## Important: GitHub Visibility

For contributions to appear on your GitHub graph:
1. **The commit email must match** a verified email on your GitHub account
2. **The repo must exist** (public or private)
3. **Enable private contributions** in GitHub settings if the repo is private

## Development

```bash
# Type check
bun run typecheck

# Lint & format
bun run check
```

## License

MIT
