export const RECOMMENDATION_GUIDE = [
    "`approve` — the change is correct, in scope, compliant with the contribution rules, and ready to merge.",
    "`request-changes` — the idea fits the repository but concrete fixes are required before merge.",
    "`needs-insight` — a maintainer judgement call is needed (policy, duplication, product direction) that a review cannot settle.",
    "`close` — the submission does not belong in this repository and no reasonable revision would change that (including vendor funnels and non-developer domains).",
].join("\n");

/** Shared schema for a single recorded review. Reused directly as the `record_review` input schema. */
export const REVIEW_FIELDS_SCHEMA = {
    type: "object",
    required: ["number", "queueId", "recommendation", "rationale"],
    properties: {
        number: { type: "integer", description: "Pull request number." },
        queueId: {
            type: "string",
            minLength: 1,
            description: "The current queueId handed out when the review was requested; must match exactly.",
        },
        recommendation: {
            type: "string",
            enum: ["close", "request-changes", "needs-insight", "approve"],
            description: "Which bucket the pull request belongs in.",
        },
        rationale: { type: "string", description: "One sentence explaining the deciding factor, shown on the card." },
        summary: { type: "string", description: "What the pull request actually changes." },
        repoFit: { type: "string", description: "Repository fit and meaningful value for Copilot users." },
        compliance: { type: "string", description: "Deterministic checks: frontmatter, naming, README regeneration, manifests." },
        differentiation: {
            type: "string",
            description:
                "Knowledge-uplift verdict (high / partial / none) with the specific content a capable model would not produce unprompted, plus overlap with existing resources.",
        },
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
        "Frontmatter must be valid YAML and meet the required metadata fields, types, lengths, and naming rules. Accept plain, single-quoted, double-quoted, literal, and folded scalars when they meet those requirements. Do not request changes solely because a value is not single-quoted.",
        "For skills, review SKILL.md against the Agent Skills specification at https://agentskills.io/specification plus the repository's additional skill checks in `.github/copilot-instructions.md`. Valid YAML alone is not enough: check field types, naming constraints, lengths, and optional-field structure. In particular, `metadata` must map string keys to string values, and `allowed-tools` must be a space-separated string, not a YAML sequence. Do not impose a quote style.",
        "For each pull request gather real evidence before deciding:",
        "  - `gh pr view <number> -R " + repo + " --comments` for the description and discussion.",
        "  - `gh pr diff <number> -R " + repo + "` for the actual change (use `--name-only` first if the diff is large).",
        "  - `gh pr checks <number> -R " + repo + "` when checks are failing, to see which ones and why.",
        "  - `gh pr list -R " + repo + " --author <login> --state all` to find the author's sibling PRs. If siblings were closed for a reason, apply it consistently and cite them; flag any open sibling recorded more leniently in `checkNext`.",
        "Judge the submitted result, not assumptions about the tool that produced it. A title ending in 🤖🤖🤖 is a disclosure, not a defect.",
        "",
        provenanceRules(),
        "",
        knowledgeUpliftRules(),
    ].join("\n");
}

function provenanceRules() {
    return [
        "Provenance, repo fit, and validation — these are the checks earlier reviews under-called:",
        "  - Vendor funnel: inspect the LICENSE copyright holder, frontmatter `metadata.author`, any \"Adapted from\" link, and the upstream README (`gh api -H \"Accept: application/vnd.github.raw\" repos/<owner>/<repo>/readme`). Look for MCP/connector setup commands, UTM or referral links, paid/credit upsells, and a \"free skill → paid connector\" shape, even when the vendor name was stripped from the adapted copy. A vendor funnel is `close`, not `request-changes`.",
        "  - Repo fit: non-developer domains (growth marketing, dating, career/LinkedIn, ad creative) are not GitHub Copilot development workflows; weigh that heavily even when the content is polished.",
        "  - Validation: AI-only synthetic evaluations (especially fixtures built to exercise the skill's own rules) and testing only in a non-Copilot harness (e.g. Claude Code) are weak evidence. Long evaluation transcripts are not evidence of value.",
    ].join("\n");
}

function knowledgeUpliftRules() {
    return [
        "Knowledge uplift — apply the \"Knowledge uplift\" test from the code-review skill to every agent, instruction, skill, prompt, hook, or workflow the PR adds or substantially changes. It is the criterion most often under-applied, so do not skip it for well-formatted PRs:",
        "  - Always start the `differentiation` field with the `high` / `partial` / `none` classification and the quoted lines that justify it, then note any overlap with existing resources.",
        "  - `none` must not be `approve`: use `needs-insight`, or `close` when it is also a near-duplicate. `partial` is usually `request-changes`; name the generic sections to cut in `suggestedComment`. But a thin real core wrapped in generic practice (\"cite sources\", \"label facts\", \"structure the report\") combined with weak repo fit or a vendor funnel is `close`.",
    ].join("\n");
}

function recordingRules(instanceId) {
    return [
        `Record every result by calling \`invoke_canvas_action\` with instanceId \`${instanceId}\`, actionName \`record_review\`, and input \`{ "reviews": [ ... ] }\`.`,
        "Each review object needs `number`, `queueId`, `recommendation`, and `rationale`; fill in `summary`, `repoFit`, `compliance`, `differentiation`, `risks`, `validation`, `confidence`, `checkNext`, and `suggestedComment` whenever you have something real to say.",
        "`suggestedComment` should be the comment you would leave on the pull request — specific, actionable, and written for the author.",
        "You may record in batches as you go. If the canvas is closed, re-open it first with `open_canvas` using canvasId `open-pr-board` and that same instanceId.",
        "Check `gh pr view <number> --json state` before recording: closed or merged PRs are dropped from the board and `record_review` skips them as \"not on the board\". A \"stale review result\" skip means the queueId was already consumed; call `get_pr` to see what is stored rather than re-recording.",
        "",
        "Recommendations:",
        RECOMMENDATION_GUIDE,
    ].join("\n");
}

export const MAX_PRS_PER_AGENT = 3;

function delegationRules(count, instanceId) {
    const split =
        count === 1
            ? "Launch one background agent for this pull request."
            : `Launch background agents in parallel, one per pull request (or up to ${MAX_PRS_PER_AGENT} per agent when there are many), and give each agent only its own pull request entries.`;
    return [
        "Delegate this work — do not review in the main session. Keeping the main conversation free is the point of this request.",
        `  - ${split} Use the \`task\` tool with \`mode: "background"\` and a general-purpose agent type.`,
        "  - Pass each agent everything below this list verbatim (rules, its pull request entries, and recording instructions); it has no other context.",
        `  - Agents with \`invoke_canvas_action\` record their own results against instanceId \`${instanceId}\`. Agents without it must return the review objects as JSON; when they finish, record those yourself with \`record_review\`.`,
        "  - Do not gather evidence yourself or poll the agents. After launching, reply with one short line saying the reviews are running in the background, then end your turn.",
        "  - When an agent completes, read its result once, record anything it could not, and report only failures.",
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
        delegationRules(items.length, instanceId),
        "",
        "--- Agent brief ---",
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
        delegationRules(1, instanceId),
        "",
        "--- Agent brief ---",
        sharedRules(repo, guidancePath),
        "",
        "Pull request:",
        describeItem(item),
        prior,
        guidance
            ? `\nMaintainer guidance for this re-review (a strong prior — verify it against the evidence and cite what confirms or contradicts it; it does not replace the evidence):\n${guidance}`
            : "",
        "",
        "Start fresh from the evidence; the previous review is context, not a conclusion.",
        "",
        recordingRules(instanceId),
    ]
        .filter(Boolean)
        .join("\n");
}
