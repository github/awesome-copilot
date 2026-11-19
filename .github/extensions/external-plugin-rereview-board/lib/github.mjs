import { runGh } from "../../duplicate-review-board/lib/github.mjs";
import { extractSubmissionData, REREVIEW_REPORT_MARKER } from "../../../scripts/external-plugins/external-plugin-rereview.mjs";
import { REPO, digest, issueNumber, parseReport } from "./report.mjs";
import { inspectUpstream } from "./upstream.mjs";

const normalize = (value) => String(value ?? "").toLowerCase();
const labels = (issue) => (issue.labels ?? []).map((label) => label.name).sort();

export function createGitHub(run = runGh) {
    const api = async (suffix, method, payload) => JSON.parse(await run([
        "api", `repos/${REPO}/${suffix}`,
        ...(method ? ["--method", method, "--input", "-"] : []),
    ], payload ? JSON.stringify(payload) : undefined));
    const comments = async (number) => JSON.parse(await run([
        "api", `repos/${REPO}/issues/${issueNumber(number)}/comments?per_page=100`, "--paginate", "--slurp",
    ])).flat();
    const catalog = async () => {
        const value = JSON.parse(await run([
            "api", `repos/${REPO}/contents/plugins/external.json?ref=main`,
            "-H", "Accept: application/vnd.github.raw",
        ]));
        if (!Array.isArray(value)) throw new Error("The current external plugin catalog is not an array.");
        return value;
    };
    async function report(number) {
        const issue = await api(`issues/${issueNumber(number)}`);
        if (issue.pull_request || !labels(issue).includes("re-review-due") || !issue.body?.startsWith(REREVIEW_REPORT_MARKER)) {
            throw new Error("Only six-month review report issues labelled re-review-due can be imported.");
        }
        parseReport(issue.body);
        return issue;
    }
    async function evidence(row, plugins) {
        const issue = await api(`issues/${issueNumber(row.id)}`);
        const discussion = await comments(row.id);
        const candidates = plugins.filter((plugin) => normalize(plugin.name) === normalize(row.name) &&
            normalize(plugin.source?.repo) === normalize(row.repo));
        const plugin = candidates.length === 1 ? candidates[0] : null;
        const submission = extractSubmissionData(issue);
        const reasons = [];
        const names = labels(issue);
        if (issue.pull_request || !names.includes("external-plugin") || !names.includes("approved")) {
            reasons.push("The destination is not an approved external-plugin submission.");
        }
        if (!names.includes("re-review-due") && !names.includes("re-review-follow-up")) reasons.push("This submission is no longer due.");
        if (names.includes("removed")) reasons.push("This plugin is marked removed.");
        if (issue.state !== "closed" || issue.closed_at?.slice(0, 10) !== row.closedDate) {
            reasons.push("The approval/renewal date changed or the submission is open; refresh the report after automation finishes.");
        }
        if (!plugin) reasons.push("No unique matching plugin exists in the current main-branch catalog.");
        if (normalize(submission.pluginName) !== normalize(row.name) ||
            normalize(submission.sourceRepo) !== normalize(row.repo)) {
            reasons.push("The original submission does not match the report's plugin identity.");
        }
        const value = {
            issue: {
                number: issue.number, title: issue.title, body: issue.body, url: issue.html_url,
                state: issue.state, closedAt: issue.closed_at, labels: names,
            },
            comments: discussion.map((comment) => ({
                id: comment.id, body: comment.body, author: comment.user?.login,
                url: comment.html_url, updatedAt: comment.updated_at,
            })),
            plugin, reasons,
            upstream: plugin ? await inspectUpstream(plugin, run) : null,
        };
        return { ...value, hash: digest(value) };
    }
    return {
        async list() {
            const issues = JSON.parse(await run([
                "issue", "list", "-R", REPO, "--label", "re-review-due", "--state", "open", "--limit", "100",
                "--json", "number,title,url,state,body",
            ]));
            return issues.filter((issue) => issue.body?.startsWith(REREVIEW_REPORT_MARKER))
                .map(({ body, ...issue }) => issue);
        },
        report, evidence, catalog, comments,
        async load(number) {
            const [issue, plugins] = await Promise.all([report(number), catalog()]);
            const rows = parseReport(issue.body);
            // Bound GitHub concurrency for larger queues.
            const items = [];
            for (const row of rows) items.push({ ...row, evidence: await evidence(row, plugins) });
            return { issue, items };
        },
        async preflight(number, row) {
            const [issue, plugins] = await Promise.all([report(number), catalog()]);
            return { issue, evidence: await evidence(row, plugins) };
        },
        async maintainer() {
            const user = JSON.parse(await run(["api", "user"]));
            if (!await this.hasWritePermission(user.login)) throw new Error("The authenticated GitHub account needs repository write access.");
            return user.login;
        },
        async hasWritePermission(login) {
            const result = await api(`collaborators/${encodeURIComponent(login)}/permission`);
            return ["admin", "maintain", "write"].includes(result.permission);
        },
        post: (number, body) => api(`issues/${issueNumber(number)}/comments`, "POST", { body }),
    };
}
