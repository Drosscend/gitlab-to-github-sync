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

| Field                | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `gitlab.url`         | GitLab instance URL                                         |
| `gitlab.token`       | Personal Access Token with `read_api` scope                 |
| `gitlab.authorEmail` | Email to filter commits (only your commits)                 |
| `githubRepoPath`     | Path to the local GitHub repo                               |
| `githubAuthorName`   | Name used for GitHub commits                                |
| `githubAuthorEmail`  | Email for GitHub commits (must be verified on your account) |

## Usage

### Run the synchronization

```bash
bun run sync
```

### Example output

```
════════════════════════════════════════════════════════════
  GitLab → GitHub Contributions Sync
════════════════════════════════════════════════════════════

ℹ GitLab: https://gitlab.example.com
ℹ Author: your.email@company.com
ℹ Found 0 previously synced commits

ℹ Fetching projects from GitLab...
✓ Found 16 projects
  interne/project-1: 45 commits
  interne/project-2: 123 commits
  ...

✓ Total: 500 commits found
ℹ 500 new commits to sync

Syncing commits:
  │ Work activity                                     2024-01-15
  │ Work activity                                     2024-01-16
  ...

────────────────────────────────────────────────────────────
✓ Synced 500/500 commits

Pushing to GitHub...
✓ Pushed changes to GitHub

════════════════════════════════════════════════════════════
✓ Sync complete!
════════════════════════════════════════════════════════════
```

### Automation with cron

To automatically synchronize every day:

```bash
# Edit crontab
crontab -e

# Add this line (sync at 8 PM every day)
0 20 * * * cd /path/to/gitlab-to-github-sync && bun run sync >> /var/log/gitlab-sync.log 2>&1
```

## Important: GitHub Visibility

For contributions to appear on your GitHub graph:
1. **The commit email must match** a verified email on your GitHub account
2. **The repo must exist** (public or private)
3. **Enable private contributions** in GitHub settings if the repo is private

## Development

```bash
# Development mode
bun run dev

# Type check
bun run typecheck

# Lint & format
bun run check
```

## License

MIT
