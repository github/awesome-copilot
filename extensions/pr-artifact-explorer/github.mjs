import { GITHUB_API, USER_AGENT } from "./constants.mjs";
import { normalizeRepository } from "./state.mjs";

const PULL_ARTIFACT_FILTERS = new Set(["all", "with", "without"]);
const PULL_CI_FILTERS = new Set(["all", "failing", "passing", "pending", "none"]);
const ARTIFACT_PRESENCE_TTL_MS = 5 * 60 * 1_000;
const MISSING_ARTIFACT_TTL_MS = 30 * 1_000;
const ARTIFACT_PRESENCE_CACHE_LIMIT = 1_000;
// Each run fans out into paginated artifact requests, so keep the initial view bounded.
const MAX_PULL_REQUEST_RUNS = 30;
const MAX_PULL_REQUEST_ARTIFACTS = 2_000;
const artifactPresenceCache = new Map();

export class GitHubApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.details = details;
  }
}

function repositoryPath(repository) {
  return normalizeRepository(repository).split("/").map(encodeURIComponent).join("/");
}

function headersFor(token, extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("json")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new GitHubApiError("GitHub returned malformed JSON.", response.status, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return text;
}

export async function githubRequest(token, path, options = {}) {
  if (!token) throw new GitHubApiError("No GitHub account is selected.", 401);
  if (!path.startsWith("/")) throw new Error("GitHub API paths must be absolute.");

  const response = await fetch(`${GITHUB_API}${path}`, {
    method: options.method ?? "GET",
    headers: headersFor(token, options.headers),
    body: options.body,
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });
  const payload = await readPayload(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : `GitHub API request failed (${response.status}).`;
    throw new GitHubApiError(message, response.status, payload);
  }
  return payload;
}

function repositorySummary(repository) {
  return {
    fullName: repository.full_name,
    name: repository.name,
    owner: {
      login: repository.owner?.login ?? "",
      avatarUrl: repository.owner?.avatar_url ?? null,
      type: repository.owner?.type ?? null,
    },
    description: repository.description ?? null,
    private: repository.private === true,
    archived: repository.archived === true,
    visibility: repository.visibility ?? (repository.private ? "private" : "public"),
    url: repository.html_url,
    updatedAt: repository.updated_at ?? null,
  };
}

export async function getRepository(token, repository) {
  return repositorySummary(
    await githubRequest(token, `/repos/${repositoryPath(repository)}`),
  );
}

async function contributorProfilesByNodeId(token, contributors) {
  const ids = contributors
    .map((contributor) => contributor.node_id)
    .filter(Boolean);
  if (!ids.length) return new Map();

  const payload = await githubRequest(token, "/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ContributorProfiles($ids: [ID!]!) {
          nodes(ids: $ids) {
            id
            ... on User {
              login
              name
            }
            ... on Bot {
              login
            }
          }
        }
      `,
      variables: { ids },
    }),
  });
  if (payload?.errors?.length) {
    throw new GitHubApiError(
      payload.errors[0]?.message ?? "GitHub could not load contributor profiles.",
      502,
      payload.errors,
    );
  }
  if (!Array.isArray(payload?.data?.nodes)) {
    throw new GitHubApiError("GitHub returned invalid contributor profile data.", 502, payload);
  }

  return new Map(
    payload.data.nodes
      .filter((profile) => profile?.id)
      .map((profile) => [profile.id, profile]),
  );
}

export async function listRepositoryContributors(token, repository) {
  const contributors = (
    await githubRequest(
      token,
      `/repos/${repositoryPath(repository)}/contributors?anon=0&per_page=100`,
    )
  ).filter((contributor) => contributor?.login);
  const profilesById = await contributorProfilesByNodeId(token, contributors);

  return contributors
    .map((contributor) => ({
      login: contributor.login,
      name:
        typeof profilesById.get(contributor.node_id)?.name === "string"
          ? profilesById.get(contributor.node_id).name.trim() || null
          : null,
      avatarUrl: contributor.avatar_url ?? null,
      profileUrl: contributor.html_url ?? null,
      type: contributor.type ?? null,
      contributions: Number(contributor.contributions) || 0,
    }));
}

export async function suggestRepositories(token, query) {
  const value = String(query ?? "").trim();
  if (!value || value.length > 100) return [];

  const slash = value.indexOf("/");
  if (slash > 0) {
    const owner = value.slice(0, slash).trim();
    const partial = value.slice(slash + 1).trim();
    if (!/^[A-Za-z0-9_.-]+$/.test(owner)) return [];

    const profile = await githubRequest(token, `/users/${encodeURIComponent(owner)}`);
    if (partial) {
      const qualifier = profile.type === "Organization" ? "org" : "user";
      const result = await githubRequest(
        token,
        `/search/repositories?q=${encodeURIComponent(`${partial} in:name ${qualifier}:${owner}`)}&sort=updated&order=desc&per_page=12`,
      );
      return (result.items ?? []).map(repositorySummary);
    }

    const endpoint =
      profile.type === "Organization"
        ? `/orgs/${encodeURIComponent(owner)}/repos?type=all&sort=updated&direction=desc&per_page=20`
        : `/users/${encodeURIComponent(owner)}/repos?type=all&sort=updated&direction=desc&per_page=20`;
    return (await githubRequest(token, endpoint)).map(repositorySummary);
  }

  if (value.length < 2) return [];
  const result = await githubRequest(
    token,
    `/search/repositories?q=${encodeURIComponent(`${value} in:name`)}&sort=updated&order=desc&per_page=12`,
  );
  return (result.items ?? []).map(repositorySummary);
}

function mapPullRequest(item) {
  return {
    number: item.number,
    title: item.title,
    state: item.state,
    draft: Boolean(item.draft),
    url: item.html_url,
    author: item.user?.login ?? "ghost",
    authorAvatarUrl: item.user?.avatar_url ?? null,
    authorType: item.user?.type ?? null,
    authorAssociation: item.author_association ?? null,
    comments: Number(item.comments) || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    closedAt: item.closed_at,
    mergedAt: item.merged_at ?? null,
    headSha: item.head?.sha ?? null,
    headRef: item.head?.ref ?? null,
    baseRef: item.base?.ref ?? null,
    labels: (item.labels ?? []).map((label) => ({
      name: label.name,
      color: label.color,
      description: label.description ?? null,
    })),
  };
}

function mapSearchPullRequest(item) {
  return {
    number: item.number,
    title: item.title,
    state: item.state,
    draft: Boolean(item.draft),
    url: item.html_url,
    author: item.user?.login ?? "ghost",
    authorAvatarUrl: item.user?.avatar_url ?? null,
    authorType: item.user?.type ?? null,
    authorAssociation: item.author_association ?? null,
    comments: Number(item.comments) || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    closedAt: item.closed_at,
    mergedAt: item.pull_request?.merged_at ?? null,
    headSha: null,
    headRef: null,
    baseRef: null,
    labels: (item.labels ?? []).map((label) => ({
      name: label.name,
      color: label.color,
      description: label.description ?? null,
    })),
  };
}

function normalizePullFilters(filters = {}) {
  return {
    artifacts: PULL_ARTIFACT_FILTERS.has(filters.artifacts) ? filters.artifacts : "all",
    ci: PULL_CI_FILTERS.has(filters.ci) ? filters.ci : "all",
  };
}

function ciStatusForRollup(state) {
  if (state === "FAILURE" || state === "ERROR") return "failing";
  if (state === "SUCCESS") return "passing";
  if (state === "PENDING" || state === "EXPECTED") return "pending";
  return "none";
}

async function pullRequestSignals(token, repository, pulls) {
  if (!pulls.length) return new Map();
  const [owner, name] = normalizeRepository(repository).split("/");
  const selections = pulls
    .map(
      (pull, index) => `
        pull${index}: pullRequest(number: ${Number(pull.number)}) {
          number
          isDraft
          headRefOid
          reviewDecision
          totalCommentsCount
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                }
              }
            }
          }
        }`,
    )
    .join("\n");
  const payload = await githubRequest(token, "/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query PullRequestSignals($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            ${selections}
          }
        }
      `,
      variables: { owner, name },
    }),
  });
  if (payload?.errors?.length) {
    throw new GitHubApiError(
      payload.errors[0]?.message ?? "GitHub could not load pull request signals.",
      502,
      payload.errors,
    );
  }
  const result = payload?.data?.repository;
  if (!result || typeof result !== "object") {
    throw new GitHubApiError("GitHub returned invalid pull request signal data.", 502, payload);
  }

  return new Map(
    pulls.map((pull, index) => {
      const signal = result[`pull${index}`];
      if (!signal) {
        throw new GitHubApiError(
          `GitHub did not return signal data for pull request #${pull.number}.`,
          502,
          payload,
        );
      }
      const rollupState =
        signal.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state ?? null;
      return [
        Number(pull.number),
        {
          draft: Boolean(signal.isDraft),
          headSha: signal.headRefOid ?? null,
          ciStatus: ciStatusForRollup(rollupState),
          reviewDecision: signal.reviewDecision ?? null,
          comments: Number(signal.totalCommentsCount) || 0,
        },
      ];
    }),
  );
}

async function findArtifactHeads(token, repository) {
  const heads = new Set();
  let artifactCount = 0;
  for (let page = 1; ; page++) {
    const payload = await githubRequest(
      token,
      `/repos/${repositoryPath(repository)}/actions/artifacts?per_page=100&page=${page}`,
    );
    const artifacts = payload.artifacts ?? [];
    artifactCount += artifacts.length;
    for (const artifact of artifacts) {
      const headSha = artifact.workflow_run?.head_sha;
      if (headSha) heads.add(headSha);
    }
    const totalCount = Number(payload.total_count) || 0;
    if (artifacts.length < 100 || artifactCount >= totalCount) return heads;
  }
}

function pruneArtifactPresenceCache() {
  const now = Date.now();
  for (const [key, entry] of artifactPresenceCache) {
    if (entry.positiveExpiresAt <= now) artifactPresenceCache.delete(key);
  }
  while (artifactPresenceCache.size >= ARTIFACT_PRESENCE_CACHE_LIMIT) {
    artifactPresenceCache.delete(artifactPresenceCache.keys().next().value);
  }
}

async function artifactHeadsForPulls(token, repository, headShas) {
  const requestedHeads = new Set(headShas.filter(Boolean));
  if (!requestedHeads.size) return new Set();
  const key = normalizeRepository(repository).toLocaleLowerCase();
  const now = Date.now();
  const cached = artifactPresenceCache.get(key);
  if (cached?.missingExpiresAt > now) return cached.promise;
  if (cached?.positiveExpiresAt > now) {
    const cachedHeads = await cached.promise;
    if ([...requestedHeads].every((headSha) => cachedHeads.has(headSha))) {
      return cachedHeads;
    }
  }

  pruneArtifactPresenceCache();
  const entry = {
    missingExpiresAt: now + MISSING_ARTIFACT_TTL_MS,
    positiveExpiresAt: now + ARTIFACT_PRESENCE_TTL_MS,
    promise: findArtifactHeads(token, repository),
  };
  artifactPresenceCache.set(key, entry);
  try {
    return await entry.promise;
  } catch (error) {
    if (artifactPresenceCache.get(key) === entry) {
      artifactPresenceCache.delete(key);
    }
    throw error;
  }
}

export async function listPullRequests(token, repository, state = "open") {
  const normalizedState = ["open", "closed", "all"].includes(state) ? state : "open";
  const query = new URLSearchParams({
    state: normalizedState,
    sort: "updated",
    direction: "desc",
    per_page: "50",
  });
  const payload = await githubRequest(
    token,
    `/repos/${repositoryPath(repository)}/pulls?${query}`,
  );
  return payload.map(mapPullRequest);
}

function normalizePullSearchQuery(filter, state) {
  const normalizedState = ["open", "closed", "all"].includes(state) ? state : "open";
  let query = String(filter ?? "")
    .trim()
    .slice(0, 500)
    .replace(/(^|\s)(?:repo|org|user):(?:"[^"]+"|\S+)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\bis:pr\b/i.test(query)) query = `is:pr ${query}`.trim();
  if (
    normalizedState !== "all" &&
    !/\bis:(?:open|closed|merged|unmerged)\b/i.test(query)
  ) {
    query = `${query} is:${normalizedState}`;
  }
  return query;
}

export async function searchPullRequestBase(
  token,
  repository,
  filter = "",
  state = "open",
  filters = {},
  { perPage = 100 } = {},
) {
  const normalizedFilters = normalizePullFilters(filters);
  const query = normalizePullSearchQuery(filter, state);
  const normalizedPerPage = Math.max(1, Math.min(100, Number(perPage) || 100));
  const parameters = new URLSearchParams({
    q: `repo:${normalizeRepository(repository)} ${query}`,
    sort: "updated",
    order: "desc",
    per_page: String(normalizedPerPage),
  });
  const payload = await githubRequest(token, `/search/issues?${parameters}`);
  const sourcePulls = (payload.items ?? []).map(mapSearchPullRequest);
  return {
    query,
    totalCount: Number(payload.total_count) || 0,
    incomplete: payload.incomplete_results === true,
    filters: normalizedFilters,
    evaluatedCount: sourcePulls.length,
    filtered: false,
    pulls: sourcePulls,
  };
}

export async function enrichPullRequests(token, repository, pulls, filters = {}) {
  const normalizedFilters = normalizePullFilters(filters);
  let enriched = pulls;
  if (pulls.length) {
    const signals = await pullRequestSignals(token, repository, pulls);
    enriched = pulls.map((pull) => ({
      ...pull,
      ...signals.get(Number(pull.number)),
    }));
  }
  if (normalizedFilters.artifacts !== "all") {
    const artifactHeads = await artifactHeadsForPulls(
      token,
      repository,
      enriched.map((pull) => pull.headSha),
    );
    enriched = enriched.map((pull) => ({
      ...pull,
      hasArtifacts: Boolean(pull.headSha && artifactHeads.has(pull.headSha)),
    }));
  }
  return enriched;
}

export function filterPullRequests(pulls, filters = {}) {
  const normalizedFilters = normalizePullFilters(filters);
  let filtered = pulls;
  if (normalizedFilters.ci !== "all") {
    filtered = filtered.filter((pull) => pull.ciStatus === normalizedFilters.ci);
  }
  if (normalizedFilters.artifacts !== "all") {
    const expected = normalizedFilters.artifacts === "with";
    filtered = filtered.filter((pull) => pull.hasArtifacts === expected);
  }
  return filtered;
}

export async function searchPullRequests(
  token,
  repository,
  filter = "",
  state = "open",
  filters = {},
) {
  const base = await searchPullRequestBase(
    token,
    repository,
    filter,
    state,
    filters,
  );
  const enriched = await enrichPullRequests(
    token,
    repository,
    base.pulls,
    base.filters,
  );
  const derivedFilterActive =
    base.filters.artifacts !== "all" || base.filters.ci !== "all";
  return {
    ...base,
    filtered: derivedFilterActive,
    pulls: filterPullRequests(enriched, base.filters),
  };
}

export async function getPullRequest(token, repository, pullNumber) {
  const number = Number.parseInt(pullNumber, 10);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error("Pull request number must be a positive integer.");
  }
  return mapPullRequest(
    await githubRequest(token, `/repos/${repositoryPath(repository)}/pulls/${number}`),
  );
}

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function listRunArtifacts(token, repository, runId) {
  const artifacts = [];
  for (let page = 1; page <= 10; page++) {
    const payload = await githubRequest(
      token,
      `/repos/${repositoryPath(repository)}/actions/runs/${runId}/artifacts?per_page=100&page=${page}`,
    );
    const pageArtifacts = payload.artifacts ?? [];
    artifacts.push(...pageArtifacts);
    if (pageArtifacts.length < 100 || artifacts.length >= Number(payload.total_count ?? 0)) {
      break;
    }
  }
  return artifacts;
}

export async function listPullRequestArtifacts(token, repository, pullNumber) {
  const pullRequest = await getPullRequest(token, repository, pullNumber);
  if (!pullRequest.headSha) {
    return {
      pullRequest,
      runs: [],
      runCount: 0,
      runsTruncated: false,
      artifacts: [],
      artifactCount: 0,
      artifactsTruncated: false,
    };
  }

  const query = new URLSearchParams({
    head_sha: pullRequest.headSha,
    per_page: String(MAX_PULL_REQUEST_RUNS),
  });
  const runsPayload = await githubRequest(
    token,
    `/repos/${repositoryPath(repository)}/actions/runs?${query}`,
  );
  const returnedRuns = (runsPayload.workflow_runs ?? [])
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  const runCount = Math.max(
    returnedRuns.length,
    Number(runsPayload.total_count) || 0,
  );
  const runs = returnedRuns.slice(0, MAX_PULL_REQUEST_RUNS);
  const runsTruncated = runs.length < runCount;

  const artifactGroups = await mapLimit(runs, 5, async (run) => {
    const runArtifacts = await listRunArtifacts(token, repository, run.id);
    return runArtifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      sizeInBytes: artifact.size_in_bytes,
      expired: Boolean(artifact.expired),
      createdAt: artifact.created_at,
      updatedAt: artifact.updated_at,
      expiresAt: artifact.expires_at,
      run: {
        id: run.id,
        name: run.name,
        number: run.run_number,
        attempt: run.run_attempt,
        event: run.event,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        url: run.html_url,
      },
    }));
  });

  const allArtifacts = [...new Map(
    artifactGroups.flat().map((artifact) => [String(artifact.id), artifact]),
  ).values()].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const artifacts = allArtifacts.slice(0, MAX_PULL_REQUEST_ARTIFACTS);

  return {
    pullRequest,
    runs: runs.map((run) => ({
      id: run.id,
      name: run.name,
      number: run.run_number,
      attempt: run.run_attempt,
      event: run.event,
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      url: run.html_url,
    })),
    runCount,
    runsTruncated,
    artifacts,
    artifactCount: allArtifacts.length,
    artifactsTruncated:
      runsTruncated || artifacts.length < allArtifacts.length,
  };
}

export async function getArtifact(token, repository, artifactId) {
  const id = Number.parseInt(artifactId, 10);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Artifact id must be a positive integer.");
  }
  const artifact = await githubRequest(
    token,
    `/repos/${repositoryPath(repository)}/actions/artifacts/${id}`,
  );
  return {
    id: artifact.id,
    name: artifact.name,
    sizeInBytes: artifact.size_in_bytes,
    expired: Boolean(artifact.expired),
    createdAt: artifact.created_at,
    updatedAt: artifact.updated_at,
    expiresAt: artifact.expires_at,
    run: artifact.workflow_run
      ? {
          id: artifact.workflow_run.id,
          headBranch: artifact.workflow_run.head_branch,
          headSha: artifact.workflow_run.head_sha,
        }
      : null,
  };
}

export async function openArtifactDownload(
  token,
  repository,
  artifactId,
  { signal } = {},
) {
  if (!token) throw new GitHubApiError("No GitHub account is selected.", 401);
  const id = Number.parseInt(artifactId, 10);
  const response = await fetch(
    `${GITHUB_API}/repos/${repositoryPath(repository)}/actions/artifacts/${id}/zip`,
    {
      headers: headersFor(token),
      redirect: "follow",
      signal,
    },
  );
  if (!response.ok) {
    const payload = await readPayload(response);
    const message =
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : `Artifact download failed (${response.status}).`;
    throw new GitHubApiError(message, response.status, payload);
  }
  if (!response.body) {
    throw new GitHubApiError("Artifact download returned an empty response.", response.status);
  }
  return response;
}
