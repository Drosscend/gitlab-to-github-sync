import type {
  CommitInfo,
  GitLabCommit,
  GitLabConfig,
  GitLabProject,
} from "../types";
import { log } from "../utils";

const CONCURRENCY_LIMIT = 5;
const MAX_PAGES = 1000; // Safety limit to prevent infinite loops
const PER_PAGE = 100;

/**
 * Fetches every page of a GitLab list endpoint
 */
async function fetchAllPages<T>(
  config: GitLabConfig,
  path: string,
  params: Record<string, string>,
  { notFoundAsEmpty = false } = {},
): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${config.url}/api/v4/${path}`);
    for (const [key, value] of Object.entries({
      ...params,
      per_page: String(PER_PAGE),
      page: String(page),
    })) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: { "PRIVATE-TOKEN": config.token },
    });

    if (!response.ok) {
      // Projects without a repository answer 404
      if (notFoundAsEmpty && response.status === 404) break;
      throw new Error(
        `GitLab API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T[];
    items.push(...data);

    if (data.length < PER_PAGE) break;
  }

  return items;
}

/**
 * Fetches all commits from a project filtered by author email
 */
async function fetchProjectCommits(
  config: GitLabConfig,
  project: GitLabProject,
): Promise<CommitInfo[]> {
  const commits = await fetchAllPages<GitLabCommit>(
    config,
    `projects/${project.id}/repository/commits`,
    { all: "true" },
    { notFoundAsEmpty: true },
  );
  const email = config.authorEmail.toLowerCase();

  return commits
    .filter((c) => c.author_email.toLowerCase() === email)
    .map((c) => ({ hash: c.id, date: c.authored_date }));
}

/**
 * Process items in parallel with concurrency limit
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const queue = items.map((_, i) => i);

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;
      results[index] = await fn(items[index]);
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
  const projects = await fetchAllPages<GitLabProject>(config, "projects", {
    membership: "true",
  });
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
