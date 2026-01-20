import type {
  CommitInfo,
  GitLabCommit,
  GitLabConfig,
  GitLabProject,
} from "../types";
import { log } from "../utils";

const CONCURRENCY_LIMIT = 5;
const MAX_PAGES = 1000; // Safety limit to prevent infinite loops

/**
 * Fetches all projects the user has access to
 */
async function fetchAllProjects(
  config: GitLabConfig,
): Promise<GitLabProject[]> {
  const projects: GitLabProject[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= MAX_PAGES) {
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

  while (page <= MAX_PAGES) {
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
 * Process items in parallel with concurrency limit
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
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

  // Fetch commits from all projects in parallel with concurrency limit
  const results = await parallelMap(
    projects,
    async (project) => {
      try {
        const commits = await fetchProjectCommits(config, project);
        if (commits.length > 0) {
          log.info(
            `  ${project.path_with_namespace}: ${commits.length} commits`,
          );
        }
        return commits;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn(`  ${project.path_with_namespace}: skipped (${message})`);
        return [];
      }
    },
    CONCURRENCY_LIMIT,
  );

  return results.flat();
}
