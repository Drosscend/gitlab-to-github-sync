import type {
  CommitInfo,
  GitLabCommit,
  GitLabConfig,
  GitLabProject,
} from "../types";
import { log } from "../utils";

/**
 * Fetches all projects the user has access to
 */
async function fetchAllProjects(
  config: GitLabConfig,
): Promise<GitLabProject[]> {
  const projects: GitLabProject[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `${config.url}/api/v4/projects?membership=true&per_page=${perPage}&page=${page}`,
      {
        headers: { "PRIVATE-TOKEN": config.token },
      },
    );

    if (!response.ok) {
      throw new Error(
        `GitLab API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GitLabProject[];
    projects.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return projects;
}

/**
 * Fetches all commits from a project filtered by author email
 */
async function fetchProjectCommits(
  config: GitLabConfig,
  project: GitLabProject,
): Promise<CommitInfo[]> {
  const commits: CommitInfo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = new URL(
      `${config.url}/api/v4/projects/${project.id}/repository/commits`,
    );
    url.searchParams.set("per_page", perPage.toString());
    url.searchParams.set("page", page.toString());
    url.searchParams.set("all", "true"); // All branches

    const response = await fetch(url.toString(), {
      headers: { "PRIVATE-TOKEN": config.token },
    });

    if (!response.ok) {
      // Some repos might not have commits or access issues
      if (response.status === 404) break;
      throw new Error(
        `GitLab API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GitLabCommit[];

    // Filter by author email
    const filtered = data.filter(
      (c) => c.author_email.toLowerCase() === config.authorEmail.toLowerCase(),
    );

    for (const commit of filtered) {
      commits.push({
        hash: commit.id,
        date: commit.authored_date,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        repoName: project.path_with_namespace,
      });
    }

    if (data.length < perPage) break;
    page++;
  }

  return commits;
}

/**
 * Fetches all commits from all GitLab projects for the configured author
 */
export async function fetchAllGitLabCommits(
  config: GitLabConfig,
): Promise<CommitInfo[]> {
  log.info("Fetching projects from GitLab...");
  const projects = await fetchAllProjects(config);
  log.success(`Found ${projects.length} projects`);

  const allCommits: CommitInfo[] = [];

  for (const project of projects) {
    try {
      const commits = await fetchProjectCommits(config, project);
      if (commits.length > 0) {
        log.info(`  ${project.path_with_namespace}: ${commits.length} commits`);
        allCommits.push(...commits);
      }
    } catch (error) {
      log.warn(`  ${project.path_with_namespace}: skipped (${error})`);
    }
  }

  return allCommits;
}
