import { GitHubApiError, githubRequest } from "./github.mjs";
import { normalizeRepository } from "./state.mjs";

export const RERUN_WINDOW_DAYS = 30;
export const MAX_RERUNS = 50;
const DAY_MS = 86_400_000;
const FAILED_CONCLUSIONS = new Set(["failure", "timed_out"]);
const inFlight = new Map();

export class RerunError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "RerunError";
    this.status = status;
    this.extra = extra;
  }
}

function repositoryPath(repository) {
  return normalizeRepository(repository).split("/").map(encodeURIComponent).join("/");
}

function positiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RerunError(400, `${label} must be a positive integer.`);
  }
  return parsed;
}

/** Pure eligibility rules shared by the prep read and the confirmed write. */
export function evaluateRerun(run, { permissions = null, now = Date.now() } = {}) {
  const attempt = Number(run.attempt) || 1;
  const initialAt = Date.parse(run.createdAt);
  const reruns = Math.max(0, attempt - 1);
  const failedAllowed = FAILED_CONCLUSIONS.has(run.conclusion);
  let disabledReason = null;
  if (!Number.isFinite(initialAt)) {
    disabledReason = "GitHub did not report when the original run started, so eligibility cannot be confirmed.";
  } else if (run.status !== "completed") {
    disabledReason = "This run is still in progress. A run can be re-run only after it completes.";
  } else if (now - initialAt > RERUN_WINDOW_DAYS * DAY_MS) {
    disabledReason = `Runs can only be re-run within ${RERUN_WINDOW_DAYS} days of the original run.`;
  } else if (reruns >= MAX_RERUNS) {
    disabledReason = `This run already used the maximum of ${MAX_RERUNS} re-runs.`;
  } else if (permissions && permissions.push !== true && permissions.admin !== true && permissions.maintain !== true) {
    disabledReason = "This account has read-only access to the repository, so GitHub will not allow a re-run.";
  }
  return {
    eligible: disabledReason === null,
    failedEligible: disabledReason === null && failedAllowed,
    disabledReason,
    permissionKnown: Boolean(permissions),
    rerunsUsed: reruns,
    rerunsRemaining: Math.max(0, MAX_RERUNS - reruns),
    expiresAt: Number.isFinite(initialAt) ? new Date(initialAt + RERUN_WINDOW_DAYS * DAY_MS).toISOString() : null,
  };
}

/** Read-only, fresh GETs. Validates that the run belongs to the repository (and artifact/PR when supplied). */
export async function prepareRerun(token, { repository, runId, artifactId = null, pullNumber = null, now = Date.now() }) {
  const repo = normalizeRepository(repository);
  const id = positiveInt(runId, "Run id");
  const base = `/repos/${repositoryPath(repo)}`;
  const raw = await githubRequest(token, `${base}/actions/runs/${id}`);
  if (!raw || Number(raw.id) !== id) throw new RerunError(404, "GitHub did not return the requested workflow run.");
  if (raw.repository?.full_name && raw.repository.full_name.toLowerCase() !== repo.toLowerCase()) {
    throw new RerunError(409, "The workflow run does not belong to this repository.");
  }
  if (artifactId != null) {
    const artifact = await githubRequest(token, `${base}/actions/artifacts/${positiveInt(artifactId, "Artifact id")}`);
    if (Number(artifact?.workflow_run?.id) !== id) {
      throw new RerunError(409, "The artifact was not produced by this workflow run.");
    }
  }
  let permissions = null;
  try {
    const repoInfo = await githubRequest(token, base);
    permissions = repoInfo?.permissions && typeof repoInfo.permissions === "object" ? repoInfo.permissions : null;
  } catch (error) {
    if (error instanceof RerunError) throw error;
    const status = error instanceof GitHubApiError ? error.status : null;
    throw new RerunError(status ?? 502, `Could not verify repository permissions, so no re-run was sent. ${describeGitHubFailure(error)}`, { code: "permission_check_failed" });
  }
  let pullHeadSha = null;
  if (pullNumber != null) {
    const pull = await githubRequest(token, `${base}/pulls/${positiveInt(pullNumber, "Pull request number")}`);
    pullHeadSha = pull?.head?.sha ?? null;
  }
  const run = {
    id,
    name: raw.name ?? raw.display_title ?? "Workflow",
    number: raw.run_number,
    attempt: raw.run_attempt ?? 1,
    status: raw.status,
    conclusion: raw.conclusion ?? null,
    event: raw.event,
    createdAt: raw.created_at,
    headSha: raw.head_sha ?? null,
    headBranch: raw.head_branch ?? null,
    actor: raw.actor?.login ?? null,
    triggeringActor: raw.triggering_actor?.login ?? null,
    url: raw.html_url ?? null,
  };
  return {
    repository: repo,
    run,
    ...evaluateRerun(run, { permissions, now }),
    pullHeadSha,
    newerHead: Boolean(pullHeadSha && run.headSha && pullHeadSha !== run.headSha),
  };
}

function describeGitHubFailure(error) {
  const status = error.status;
  const detail = error.message ? ` GitHub said: ${error.message}` : "";
  if (status === 403 || status === 429) {
    const limited = status === 429 || /rate limit/i.test(error.message ?? "");
    return limited
      ? `GitHub rate-limited the request. Wait before trying again.${detail}`
      : `GitHub denied the re-run. The account needs write access (repo scope or Actions: write).${detail}`;
  }
  if (status === 404) return `GitHub could not find the run, or this account cannot re-run it.${detail}`;
  if (status === 422) return `GitHub rejected the re-run (it may be too old, already running, or out of re-runs).${detail}`;
  if (status === 401) return `GitHub rejected the account credentials.${detail}`;
  return `GitHub could not start the re-run (${status ?? "network error"}).${detail}`;
}

/** One revalidated POST. No retries; concurrent calls for the same run are refused. */
export async function requestRerun(token, input) {
  const scope = input.scope === "failed" ? "failed" : input.scope === "all" ? "all" : null;
  if (!scope) throw new RerunError(400, 'Scope must be "all" or "failed".');
  const expectedAttempt = positiveInt(input.attempt, "Attempt");
  const repo = normalizeRepository(input.repository);
  const id = positiveInt(input.runId, "Run id");
  const key = `${repo.toLowerCase()}#${id}`;
  if (inFlight.has(key)) throw new RerunError(409, "A re-run request for this workflow run is already in progress.");
  inFlight.set(key, scope);
  try {
    const fresh = await prepareRerun(token, { repository: repo, runId: id, artifactId: input.artifactId ?? null, pullNumber: input.pullNumber ?? null });
    if (Number(fresh.run.attempt) !== expectedAttempt) {
      throw new RerunError(409, `The run changed (now attempt ${fresh.run.attempt}). Review it and confirm again.`, { code: "attempt_changed", context: fresh });
    }
    if (!fresh.eligible) throw new RerunError(409, fresh.disabledReason, { code: "ineligible", context: fresh });
    if (scope === "failed" && !fresh.failedEligible) {
      throw new RerunError(409, "Only failed or timed-out runs can re-run failed jobs.", { code: "ineligible", context: fresh });
    }
    const suffix = scope === "failed" ? "rerun-failed-jobs" : "rerun";
    try {
      await githubRequest(token, `/repos/${repositoryPath(repo)}/actions/runs/${id}/${suffix}`, { method: "POST" });
    } catch (error) {
      if (error instanceof GitHubApiError) throw new RerunError(error.status ?? 502, describeGitHubFailure(error), { code: "github_error" });
      throw error;
    }
    return {
      requested: true,
      scope,
      repository: repo,
      runId: id,
      previousAttempt: expectedAttempt,
      url: fresh.run.url,
      message: "Re-run requested. GitHub is queueing the workflow; the status is not final yet.",
    };
  } finally {
    inFlight.delete(key);
  }
}
