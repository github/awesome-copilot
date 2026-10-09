export const RECOMMENDATION_GUIDE = [
    "`approve` — the change is correct, in scope, compliant with the contribution rules, and ready to merge.",
    "`request-changes` — the idea fits the repository but concrete fixes are required before merge.",
    "`needs-insight` — a maintainer judgement call is needed (policy, duplication, product direction) that a review cannot settle.",
    "`close` — the submission does not belong in this repository and no reasonable revision would change that.",
].join("\n");

/** Shared schema for a single recorded review. Reused directly as the `record_review` input schema. */
export const REVIEW_FIELDS_SCHEMA = {
    type: "object",
    required: ["number", "recommendation", "rationale"],
    properties: {
        number: { type: "integer", description: "Pull request number." },
        queueId: {
            type: "string",
            description: "The queueId handed out when the review was requested. Omitting it skips the staleness check.",
        },
        recommendation: {
            type: "string",
            enum: ["close", "request-changes", "needs-insight", "approve"],
            description: "Which bucket the pull request belongs in.",
        },
        rationale: { type: "string", description: "Two or three sentences explaining the recommendation." },
        summary: { type: "string", description: "What the pull request actually changes." },
        repoFit: { type: "string", description: "Repository fit and meaningful value for Copilot users." },
        compliance: { type: "string", description: "Deterministic checks: frontmatter, naming, README regeneration, manifests." },
        differentiation: { type: "string", description: "How it differs from existing resources and native model capability." },
        risks: { type: "string", description: "Correctness, security, licensing, or harmful-content concerns." },
        validation: { type: "string", description: "Evidence the contributor tested or validated the change." },
        confidence: { type: "string", enum: ["low", "medium", "high"], description: "Confidence in the recommendation." },
        checkNext: { type: "string", description: "What a maintainer should verify by hand before acting." },
        suggestedComment: { type: "string", description: "A suggested review comment, ready to edit and post." },
    },
    additionalProperties: false,
};

function describeItem(item) {
    const labels = item.labels?.length ? item.labels.map((label) => label.name).join(", ") : "none";
    const checks = item.checkCounts?.total
        ? `${item.checkCounts.failure} failing / ${item.checkCounts.pending} pending / ${item.checkCounts.success} passing`
        : "no checks";
    return [
        `- #${item.number} — ${item.title}`,
        `  queueId: ${item.queueId}`,
        `  author: @${item.author}${item.isDraft ? " (draft)" : ""}`,
        `  labels: ${labels}`,
        `  diff: +${item.additions}/-${item.deletions} across ${item.changedFiles} files`,
        `  checks: ${checks} | review decision: ${item.reviewDecision} | merge state: ${item.mergeStateStatus}`,
        `  url: ${item.url}`,
    ].join("\n");
}

function sharedRules(repo, guidancePath) {
    return [
        "Work strictly read-only: inspect with `gh` and file reads only. Do not post comments, submit reviews, push commits, or modify the repository.",
        `Review criteria, in priority order, live in \`.github/skills/code-review/SKILL.md\` and \`.github/copilot-instructions.md\` in ${repo}. Read the board's own procedure at ${guidancePath} first.`,
        "For each pull request gather real evidence before deciding:",
        "  - `gh pr view <number> -R " + repo + " --comments` for the description and discussion.",
        "  - `gh pr diff <number> -R " + repo + "` for the actual change (use `--name-only` first if the diff is large).",
        "  - `gh pr checks <number> -R " + repo + "` when checks are failing, to see which ones and why.",
        "Judge the submitted result, not assumptions about the tool that produced it. A title ending in 🤖🤖🤖 is a disclosure, not a defect.",
    ].join("\n");
}

function recordingRules(instanceId) {
    return [
        `Record every result by calling \`invoke_canvas_action\` with instanceId \`${instanceId}\`, actionName \`record_review\`, and input \`{ "reviews": [ ... ] }\`.`,
        "Each review object needs `number`, `queueId`, `recommendation`, and `rationale`; fill in `summary`, `repoFit`, `compliance`, `differentiation`, `risks`, `validation`, `confidence`, `checkNext`, and `suggestedComment` whenever you have something real to say.",
        "`suggestedComment` should be the comment you would leave on the pull request — specific, actionable, and written for the author.",
        "You may record in batches as you go. If the canvas is closed, re-open it first with `open_canvas` using canvasId `open-pr-board` and that same instanceId.",
        "",
        "Recommendations:",
        RECOMMENDATION_GUIDE,
    ].join("\n");
}

export function buildReviewPrompt({ instanceId, repo, guidancePath, items, decisions }) {
    const calibration = decisions.length
        ? [
              "",
              "Recent maintainer decisions on this board — use them to calibrate how strict to be:",
              ...decisions
                  .slice(0, 12)
                  .map((entry) => `- #${entry.number} ${entry.kind}${entry.comment ? `: ${entry.comment.slice(0, 160)}` : ""}`),
          ].join("\n")
        : "";

    return [
        `Review ${items.length} open pull request${items.length === 1 ? "" : "s"} in ${repo} for the Open PR Board canvas.`,
        "",
        sharedRules(repo, guidancePath),
        calibration,
        "",
        "Pull requests to review:",
        items.map(describeItem).join("\n"),
        "",
        recordingRules(instanceId),
    ]
        .filter(Boolean)
        .join("\n");
}

export function buildRereviewPrompt({ instanceId, repo, guidancePath, item, guidance, previousReview }) {
    const prior = previousReview
        ? [
              "",
              "Previous review:",
              `- recommendation: ${previousReview.recommendation}`,
              `- rationale: ${previousReview.rationale ?? "(none)"}`,
              `- reviewed at: ${previousReview.reviewedAt}`,
          ].join("\n")
        : "";

    return [
        `Re-review pull request #${item.number} in ${repo} for the Open PR Board canvas.`,
        "",
        sharedRules(repo, guidancePath),
        "",
        "Pull request:",
        describeItem(item),
        prior,
        guidance ? `\nMaintainer guidance for this re-review:\n${guidance}` : "",
        "",
        "Start fresh from the evidence; the previous review is context, not a conclusion.",
        "",
        recordingRules(instanceId),
    ]
        .filter(Boolean)
        .join("\n");
}
