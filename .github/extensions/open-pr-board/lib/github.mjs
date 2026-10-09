import { spawn } from "node:child_process";

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

export async function approveAndEnableAutoMerge(repo, number, { body } = {}, runner = runGh) {
    await submitPullRequestReview(repo, number, { kind: "approve", body }, runner);

    try {
        await runner(["pr", "merge", String(number), "-R", repo, "--auto", "--merge"]);
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

const FAILING_CONCLUSIONS = new Set(["FAILURE", "TIMED_OUT", "ACTION_REQUIRED", "CANCELLED", "STALE", "STARTUP_FAILURE"]);

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
        if (conclusion === "SKIPPED") state = "skipped";
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
    const counts = { total: checks.length, success: 0, failure: 0, pending: 0, skipped: 0 };
    for (const check of checks) counts[check.state] += 1;
    const state = counts.total === 0 ? "none" : counts.failure ? "failure" : counts.pending ? "pending" : "success";
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
    };
}

const LIST_FIELDS = [
    "number",
    "title",
    "url",
    "author",
    "createdAt",
    "updatedAt",
    "isDraft",
    "labels",
    "baseRefName",
    "headRefName",
    "additions",
    "deletions",
    "changedFiles",
    "statusCheckRollup",
    "reviewDecision",
    "mergeStateStatus",
].join(",");

export async function listOpenPullRequests(repo) {
    const out = await runGh(["pr", "list", "-R", repo, "--state", "open", "--limit", "200", "--json", LIST_FIELDS]);
    return JSON.parse(out).map(normalizePullRequest);
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
