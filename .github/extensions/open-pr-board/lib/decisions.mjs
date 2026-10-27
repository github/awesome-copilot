import * as gh from "./github.mjs";

const DECISION_KINDS = ["approve", "request-changes", "comment", "close"];
const MAX_COMMENT_LENGTH = 60000;
const decisionsInFlight = new Set();

export async function applyDecisionOnGitHub({ store, number, kind, comment, headRefOid, refresh, github = gh }) {
    if (!DECISION_KINDS.includes(kind)) throw new Error(`Unknown decision "${kind}".`);
    const key = `${store.repo}#${number}`;
    if (decisionsInFlight.has(key)) throw new Error(`#${number} already has a GitHub action in progress.`);
    decisionsInFlight.add(key);
    try {
        const item = store.getItem(number);
        if (!item) throw new Error(`Pull request #${number} is not on the board. Refresh first.`);
        if (item.decision) throw new Error(`#${number} was already actioned (${item.decision.kind}).`);
        const actionHeadRefOid = item.headRefOid ?? null;
        if ((kind === "comment" || kind === "request-changes") &&
            (!headRefOid || headRefOid !== actionHeadRefOid)) {
            throw new Error("PR changed since it was displayed; review the current commit before submitting feedback.");
        }

        const body = String(comment ?? "").trim().slice(0, MAX_COMMENT_LENGTH);
        if ((kind === "request-changes" || kind === "comment") && !body) {
            throw new Error(`A ${kind} decision needs a non-empty comment.`);
        }

        let result;
        if (kind === "approve") {
            if (!headRefOid || headRefOid !== item.headRefOid) {
                throw new Error("PR changed since it was displayed; refresh and review it again before approving.");
            }
            result = await github.approveAndEnableAutoMerge(store.repo, number, { body, headRefOid });
        } else if (kind === "close") {
            result = await github.closePullRequest(store.repo, number, { body });
        } else {
            result = await github.submitPullRequestReview(store.repo, number, { kind, body });
        }

        const warnings = result.warning ? [result.warning] : [];
        try {
            await store.recordDecision(number, { kind, comment: body, status: result.status, headRefOid: actionHeadRefOid });
        } catch (error) {
            warnings.push(`GitHub was updated, but the board could not record the action: ${error.message}`);
        }
        try {
            await refresh(store);
        } catch (error) {
            warnings.push(`GitHub was updated, but the board could not refresh: ${error.message}`);
        }
        return {
            number,
            kind,
            comment: body,
            posted: true,
            status: result.status,
            warning: warnings.length ? warnings.join(" ") : null,
            url: item.url,
        };
    } finally {
        decisionsInFlight.delete(key);
    }
}
