import { spawn } from "node:child_process";
import { expectedNotice } from "./errors.mjs";

const MAX_CHECKS = 60;

export function runGh(args, { input } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn("gh", args, { windowsHide: true, env: process.env });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => (stdout += chunk));
        child.stderr.on("data", (chunk) => (stderr += chunk));
        child.on("error", (error) => {
            reject(
                new Error(
                    error.code === "ENOENT"
                        ? "GitHub CLI (gh) was not found on PATH. Install it and run `gh auth login`."
                        : error.message,
                ),
            );
        });
        child.on("close", (code) => {
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr.trim() || `gh exited with code ${code}`));
        });
        child.stdin.end(input ?? undefined);
    });
}

function appendReviewBody(args, body) {
    const text = String(body ?? "").trim();
    if (text) args.push("--body-file", "-");
    return text;
}

export async function submitPullRequestReview(repo, number, { kind, body } = {}, runner = runGh) {
    const reviewFlag = {
        approve: "--approve",
        comment: "--comment",
        "request-changes": "--request-changes",
    }[kind];
    if (!reviewFlag) throw new Error(`Unsupported review kind "${kind}".`);

    const args = ["pr", "review", String(number), "-R", repo, reviewFlag];
    const input = appendReviewBody(args, body);
    await runner(args, { input });
    return { status: kind === "request-changes" ? "changes-requested" : `${kind}-submitted` };
}

export async function closePullRequest(repo, number, { body } = {}, runner = runGh) {
    await runner(["pr", "close", String(number), "-R", repo]);

    const comment = String(body ?? "").trim();
    if (!comment) return { status: "closed" };

    try {
        await runner(["pr", "comment", String(number), "-R", repo, "--body-file", "-"], { input: comment });
        return { status: "closed", commentPosted: true };
    } catch (error) {
        return {
            status: "closed",
            commentPosted: false,
            warning: `The pull request was closed, but the closing comment could not be posted: ${error.message}`,
        };
    }
}

export async function approveAndEnableAutoMerge(repo, number, { body, headRefOid } = {}, runner = runGh) {
    if (!headRefOid) throw expectedNotice("The board has no commit SHA for this pull request. Refresh before approving.");
    const current = JSON.parse(await runner(["api", `repos/${repo}/pulls/${number}`]));
    if (current.state !== "open" || current.head?.sha !== headRefOid) {
        throw expectedNotice("The pull request changed or is no longer open. Refresh and review it again before approving.");
    }
    await runner(["api", `repos/${repo}/pulls/${number}/reviews`, "--method", "POST", "--input", "-"], {
        input: JSON.stringify({ event: "APPROVE", commit_id: headRefOid, body: String(body ?? "").trim() }),
    });

    try {
        await runner(["pr", "merge", String(number), "-R", repo, "--auto", "--merge", "--match-head-commit", headRefOid]);
    } catch (error) {
        return {
            status: "approval-submitted",
            warning: `The approving review was submitted, but auto-merge could not be enabled: ${error.message}`,
        };
    }

    try {
        const raw = await runner([
            "pr",
            "view",
            String(number),
            "-R",
            repo,
            "--json",
            "state,mergedAt,autoMergeRequest",
        ]);
        const state = JSON.parse(raw);
        if (state.mergedAt || state.state === "MERGED") return { status: "merged" };
        if (state.autoMergeRequest) return { status: "auto-merge-enabled" };
    } catch {
        // The merge request succeeded; inability to refine its display status is non-fatal.
    }
    return { status: "merge-requested" };
}

const FAILING_CONCLUSIONS = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "STALE", "STARTUP_FAILURE"]);

/** Normalises a CheckRun or StatusContext rollup entry into one shape. */
function normalizeCheck(raw) {
    if (raw.__typename === "StatusContext" || raw.state) {
        const state = String(raw.state ?? "").toUpperCase();
        return {
            name: raw.context ?? "status",
            workflow: null,
            url: raw.targetUrl ?? null,
            state: state === "SUCCESS" ? "success" : state === "PENDING" || state === "EXPECTED" ? "pending" : "failure",
        };
    }
    const status = String(raw.status ?? "").toUpperCase();
    const conclusion = String(raw.conclusion ?? "").toUpperCase();
    let state = "pending";
    if (status === "COMPLETED") {
        if (conclusion === "ACTION_REQUIRED") state = "actionRequired";
        else if (conclusion === "SKIPPED") state = "skipped";
        else if (conclusion === "SUCCESS" || conclusion === "NEUTRAL") state = "success";
        else if (FAILING_CONCLUSIONS.has(conclusion)) state = "failure";
        else state = "failure";
    }
    return {
        name: raw.name ?? "check",
        workflow: raw.workflowName || null,
        url: raw.detailsUrl ?? null,
        state,
    };
}

export function summarizeChecks(rollup) {
    const checks = (Array.isArray(rollup) ? rollup : []).map(normalizeCheck);
    const counts = { total: checks.length, success: 0, failure: 0, pending: 0, skipped: 0, actionRequired: 0 };
    for (const check of checks) counts[check.state] += 1;
    const state = counts.total === 0 ? "none" : counts.failure ? "failure" : counts.actionRequired ? "actionRequired" : counts.pending ? "pending" : "success";
    return { state, counts, checks: checks.slice(0, MAX_CHECKS) };
}

function normalizePullRequest(raw) {
    const checks = summarizeChecks(raw.statusCheckRollup);
    return {
        number: raw.number,
        title: raw.title,
        url: raw.url,
        author: raw.author?.login ?? "unknown",
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        isDraft: Boolean(raw.isDraft),
        baseRefName: raw.baseRefName,
        headRefName: raw.headRefName,
        headRefOid: raw.headRefOid,
        additions: raw.additions ?? 0,
        deletions: raw.deletions ?? 0,
        changedFiles: raw.changedFiles ?? 0,
        reviewDecision: raw.reviewDecision || "NONE",
        mergeStateStatus: raw.mergeStateStatus || "UNKNOWN",
        labels: (raw.labels ?? []).map((label) => ({
            name: label.name,
            // Only trust 6-digit hex so the UI can safely use it as a CSS custom property.
            color: /^[0-9a-fA-F]{6}$/.test(label.color ?? "") ? label.color.toLowerCase() : null,
            description: label.description ?? "",
        })),
        checksState: checks.state,
        checkCounts: checks.counts,
        checks: checks.checks,
        workflowApprovals: raw.workflowApprovals ?? [],
        workflowApprovalError: raw.workflowApprovalError ?? null,
    };
}

// A check's ACTION_REQUIRED conclusion alone is not evidence of fork approval:
// submission gates and other apps use it for unrelated maintainer decisions.
function isForkApprovalRun(run, pr) {
    return Number.isSafeInteger(run.id) && run.id > 0 &&
        Number.isSafeInteger(run.workflow_id) && run.workflow_id > 0 &&
        Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0 &&
        run.event === "pull_request" && run.status === "completed" && run.conclusion === "action_required" &&
        run.head_sha === pr.head?.sha && run.head_branch === pr.head?.ref &&
        pr.head?.repo?.private === false && pr.head.repo.id !== pr.base?.repo?.id &&
        run.repository?.id === pr.base?.repo?.id && run.head_repository?.id === pr.head.repo.id &&
        (!run.pull_requests?.length || run.pull_requests.some((entry) => entry.number === pr.number));
}

export async function listWorkflowApprovals(repo, pr, runner = runGh) {
    if (!Number.isSafeInteger(pr.head?.repo?.id) || !Number.isSafeInteger(pr.base?.repo?.id) ||
        pr.head.repo.id === pr.base.repo.id || pr.head.repo.private !== false) return [];
    const pages = JSON.parse(await runner(["api", "--paginate", "--slurp",
        `repos/${repo}/actions/runs?event=pull_request&head_sha=${encodeURIComponent(pr.head.sha)}&per_page=100`]));
    const latest = new Map();
    for (const run of pages.flatMap((page) => page.workflow_runs)) {
        if (run.head_sha !== pr.head.sha || run.head_branch !== pr.head.ref ||
            run.repository?.id !== pr.base.repo.id || run.head_repository?.id !== pr.head.repo.id ||
            (run.pull_requests?.length && !run.pull_requests.some((entry) => entry.number === pr.number))) continue;
        const previous = latest.get(run.workflow_id);
        if (!previous || run.id > previous.id) latest.set(run.workflow_id, run);
    }
    return [...latest.values()].filter((run) => isForkApprovalRun(run, pr)).map((run) => ({
        id: run.id, attempt: run.run_attempt, name: run.name || "Workflow",
        url: run.html_url, headRefOid: run.head_sha,
    }));
}

export async function approveWorkflowRun(repo, number, { runId, attempt, headRefOid } = {}, runner = runGh) {
    if (!headRefOid || !Number.isSafeInteger(runId) || runId <= 0 ||
        !Number.isSafeInteger(attempt) || attempt <= 0) {
        throw expectedNotice("Refresh and select a workflow run with its current commit and attempt.");
    }
    const repository = JSON.parse(await runner(["api", `repos/${repo}`]));
    if (repository.permissions?.push !== true) {
        throw expectedNotice("The authenticated gh account needs repository write access to approve workflow execution.");
    }
    const pr = JSON.parse(await runner(["api", `repos/${repo}/pulls/${number}`]));
    if (pr.state !== "open" || pr.head?.sha !== headRefOid) {
        throw expectedNotice("The pull request changed or is no longer open. Refresh before approving workflow execution.");
    }
    const eligible = await listWorkflowApprovals(repo, pr, runner);
    if (!eligible.some((run) => run.id === runId && run.attempt === attempt)) {
        throw expectedNotice("This run is no longer awaiting supported fork workflow approval. Refresh; queued, failed, and deployment-waiting runs cannot be approved here.");
    }
    const run = JSON.parse(await runner(["api", `repos/${repo}/actions/runs/${runId}`]));
    if (run.id !== runId || !isForkApprovalRun(run, pr) || run.run_attempt !== attempt) {
        throw expectedNotice("The workflow run changed or no longer needs approval. Refresh first.");
    }
    // Recheck the PR after run discovery; GitHub's approval endpoint has no SHA precondition.
    const current = JSON.parse(await runner(["api", `repos/${repo}/pulls/${number}`]));
    if (current.state !== "open" || current.head?.sha !== headRefOid) {
        throw expectedNotice("The pull request changed or is no longer open. Refresh before approving workflow execution.");
    }
    try {
        await runner(["api", `repos/${repo}/actions/runs/${runId}/approve`, "--method", "POST"]);
    } catch (error) {
        throw new Error(`Workflow execution approval was not confirmed. Check the run on GitHub before retrying; the gh account needs write access and an eligible fork run: ${error.message}`);
    }
    return { status: "workflow-execution-approved" };
}

const PR_ENRICHMENT_CONCURRENCY = 6;

async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

// Use REST for the bulk listing: a large `gh pr list` GraphQL query can fail at
// GitHub's gateway on repositories with many open PRs. Keep GraphQL enrichment
// per PR and bounded, and let a failed enrichment leave the REST listing usable.
export async function listOpenPullRequests(repo, runner = runGh) {
    const out = await runner(["api", "--paginate", "--slurp", `repos/${repo}/pulls?state=open&per_page=100`]);
    const pullRequests = JSON.parse(out).flat().map((raw) => ({
        number: raw.number,
        title: raw.title,
        url: raw.html_url,
        author: raw.user,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
        isDraft: raw.draft,
        labels: raw.labels,
        baseRefName: raw.base?.ref,
        headRefName: raw.head?.ref,
        headRefOid: raw.head?.sha,
        head: raw.head,
        base: raw.base,
    }));
    await mapWithConcurrency(pullRequests, PR_ENRICHMENT_CONCURRENCY, async (pr) => {
        try {
            const raw = await runner([
                "pr",
                "view",
                String(pr.number),
                "-R",
                repo,
                "--json",
                "additions,deletions,changedFiles,reviewDecision,mergeStateStatus,statusCheckRollup",
            ]);
            Object.assign(pr, JSON.parse(raw));
        } catch {
            pr.statusCheckRollup = [];
        }
        try {
            pr.workflowApprovals = await listWorkflowApprovals(repo, pr, runner);
        } catch {
            pr.workflowApprovals = [];
            pr.workflowApprovalError = "Could not discover workflow approvals (WORKFLOW_APPROVAL_DISCOVERY_FAILED).";
        }
    });
    return pullRequests.map(normalizePullRequest);
}

const FULL_JSON = ["-H", "Accept: application/vnd.github.full+json"];

export async function getPullRequestDetail(repo, number) {
    const [prRaw, commentsRaw, reviewsRaw, filesRaw] = await Promise.all([
        runGh(["api", `repos/${repo}/pulls/${number}`, ...FULL_JSON]),
        runGh(["api", `repos/${repo}/issues/${number}/comments?per_page=100`, "--paginate", "--slurp", ...FULL_JSON]),
        runGh(["api", `repos/${repo}/pulls/${number}/reviews?per_page=100`, "--paginate", "--slurp", ...FULL_JSON]),
        runGh(["api", `repos/${repo}/pulls/${number}/files?per_page=100`, "--paginate", "--slurp"]),
    ]);
    const pr = JSON.parse(prRaw);
    const comments = JSON.parse(commentsRaw).flat();
    const reviews = JSON.parse(reviewsRaw).flat();
    const files = JSON.parse(filesRaw).flat();

    return {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        headRefOid: pr.head?.sha,
        merged: Boolean(pr.merged),
        mergeableState: pr.mergeable_state ?? null,
        url: pr.html_url,
        author: pr.user?.login,
        createdAt: pr.created_at,
        bodyHtml: pr.body_html ?? "",
        comments: comments.map((comment) => ({
            id: comment.id,
            author: comment.user?.login,
            association: comment.author_association,
            createdAt: comment.created_at,
            url: comment.html_url,
            bodyHtml: comment.body_html ?? "",
        })),
        reviews: reviews
            .filter((review) => review.state !== "PENDING")
            .map((review) => ({
                id: review.id,
                author: review.user?.login,
                state: review.state,
                submittedAt: review.submitted_at,
                url: review.html_url,
                bodyHtml: review.body_html ?? "",
            })),
        files: files.map((file) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
        })),
    };
}
