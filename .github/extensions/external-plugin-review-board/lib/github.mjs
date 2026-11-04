import { spawn } from "node:child_process";

function runGh(args, { input } = {}) {
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
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr.trim() || `gh exited with code ${code}`));
            }
        });
        child.stdin.end(input ?? undefined);
    });
}

export function mapBoardIssues(issues) {
    const boardStates = new Set(["ready-for-review", "awaiting-review", "requires-submitter-fixes"]);
    return issues
        .filter((issue) => (issue.labels ?? []).some((label) => boardStates.has(label.name)))
        .map((issue) => ({
            number: issue.number,
            title: issue.title,
            author: issue.author?.login ?? "unknown",
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            url: issue.url,
            labels: (issue.labels ?? []).map((label) => label.name),
        }));
}

export async function listBoardIssues(repo) {
    const out = await runGh([
        "issue",
        "list",
        "-R",
        repo,
        "--label",
        "external-plugin",
        "--state",
        "open",
        "--limit",
        "500",
        "--json",
        "number,title,author,createdAt,updatedAt,labels,url",
    ]);
    return mapBoardIssues(JSON.parse(out));
}

const FULL_JSON = ["-H", "Accept: application/vnd.github.full+json"];

export async function getIssueDetail(repo, number) {
    const [issueRaw, commentsRaw] = await Promise.all([
        runGh(["api", `repos/${repo}/issues/${number}`, ...FULL_JSON]),
        runGh(["api", `repos/${repo}/issues/${number}/comments?per_page=100`, "--paginate", "--slurp", ...FULL_JSON]),
    ]);
    const issue = JSON.parse(issueRaw);
    const comments = JSON.parse(commentsRaw).flat();
    return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        author: issue.user?.login,
        createdAt: issue.created_at,
        labels: (issue.labels ?? []).map((label) => label.name),
        bodyHtml: issue.body_html ?? "",
        comments: comments.map((comment) => ({
            id: comment.id,
            author: comment.user?.login,
            authorType: comment.user?.type,
            association: comment.author_association,
            createdAt: comment.created_at,
            url: comment.html_url,
            bodyHtml: comment.body_html ?? "",
        })),
    };
}

export async function getIssueStatus(repo, number) {
    const out = await runGh(["issue", "view", String(number), "-R", repo, "--json", "state,labels"]);
    const data = JSON.parse(out);
    return { state: data.state, labels: (data.labels ?? []).map((label) => label.name) };
}

export const MAX_COMMENT_LENGTH = 60000;

// Free-form comments must never be parsed as slash commands by the external plugin command router,
// which matches on the comment body starting with `/<command>`.
export function normalizeFreeformComment(body) {
    const text = String(body ?? "").trim();
    if (!text) throw new Error("Comment cannot be empty.");
    if (text.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Comment is too long (${text.length} characters; maximum ${MAX_COMMENT_LENGTH}).`);
    }
    if (text.startsWith("/")) {
        throw new Error(
            "Comments starting with \"/\" could trigger issue automation. Use the Approve, Reject, or Request fixes actions instead, or reword the comment.",
        );
    }
    return text;
}

// Builds the `/request-fixes <reason>` command handled by the external plugin command router. The
// router ignores the command without a reason, so one is required here too.
export function buildRequestFixesCommand(reason) {
    const text = String(reason ?? "")
        .trim()
        .replace(/^\/request-fixes(?![\w-])/i, "")
        .trim();
    if (!text) throw new Error("Request fixes needs a description of what the submitter must change.");
    if (text.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Comment is too long (${text.length} characters; maximum ${MAX_COMMENT_LENGTH}).`);
    }
    return `/request-fixes ${text}`;
}

export async function postComment(repo, number, body) {
    const out = await runGh(["issue", "comment", String(number), "-R", repo, "--body-file", "-"], { input: body });
    return out.trim();
}
