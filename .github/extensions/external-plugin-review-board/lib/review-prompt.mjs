export const REVIEW_FIELDS_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["number", "recommendation", "rationale"],
    properties: {
        number: { type: "integer", description: "Issue number." },
        queueId: { type: "string", description: "Review token from the queued board card." },
        recommendation: {
            type: "string",
            enum: ["straight-reject", "probably-reject", "needs-review", "accept"],
        },
        pluginName: { type: "string" },
        repository: { type: "string", description: "owner/repo of the submitted plugin." },
        repoFacts: { type: "string", description: "Repo age, stars, commits, author account notes." },
        signals: { type: "string", description: "Automated signals: AGT risk, gate warnings, pricing heuristics." },
        contents: { type: "string", description: "What the plugin actually contains." },
        commercial: { type: "string", description: "Is it a pitch for a paid or brand-new product? Evidence." },
        rationale: { type: "string", description: "1-2 sentence justification referencing the decision pattern." },
        checkNext: { type: "string", description: "For probably-reject/needs-review: what the maintainer should look at." },
        rereviewGuidance: { type: "string", description: "Maintainer guidance that prompted this re-review, if any." },
        suggestedComment: {
            type: "string",
            description: "Suggested maintainer comment, starting with /approve or /reject <reason>.",
        },
    },
};

const REVIEW_FIELD_LIST =
    "number, queueId (copy the reviewToken exactly), recommendation (straight-reject | probably-reject | needs-review | accept), pluginName, repository, repoFacts, signals, contents, commercial, rationale, checkNext (optional), suggestedComment (e.g. \"/reject <reason in the maintainer's terse style>\" or \"/approve\")";

function formatHistory(history) {
    return history.length
        ? history
              .slice(0, 25)
              .map(
                  (entry) =>
                      `- #${entry.number} ${entry.title}: /${entry.kind}${entry.comment ? ` ${entry.comment}` : ""}` +
                      (entry.aiRecommendation ? ` (AI suggested ${entry.aiRecommendation})` : ""),
              )
              .join("\n")
        : "- (none recorded from the board yet)";
}

export function buildRereviewPrompt({ item, guidance, instanceId, canvasId, guidancePath, history, repo }) {
    const previous = item.review
        ? Object.entries(item.review)
              .filter(([key, value]) => value && key !== "rereviewGuidance")
              .map(([key, value]) => `  - ${key}: ${value}`)
              .join("\n")
        : "  - (no previous AI review)";
    const focus = guidance
        ? `The maintainer asked for this re-review with the following guidance. Treat it as the main question to answer, and let it override the previous assessment where the evidence supports that:\n"""\n${guidance}\n"""`
        : "The maintainer didn't give specific guidance; take a fresh, independent look.";

    const childPrompt = `Re-review external plugin submission #${item.number} ("${item.title}" by @${item.author}) in ${repo}.
Review token: ${item.queueId}

Read the review guidance first (use the view tool, absolute path): ${guidancePath}
Follow its per-issue procedure. Work strictly read-only: do NOT comment on, label, close, or modify any issue or repository, and do not edit files.

${focus}

Previous AI review for context:
${previous}

Recent maintainer decisions (calibrate against these as well as the guidance):
${formatHistory(history)}

When you're done, send your result back to the session that created you (your creator) as a single message containing ONLY a JSON object with these fields: ${REVIEW_FIELD_LIST}. Include queueId: "${item.queueId}". In the rationale, explicitly address the maintainer's guidance.`;

    return `The maintainer requested a guided re-review of #${item.number} from the External Plugin Review Board canvas. Run it as a separate sub-session; do NOT perform the review yourself in this session.

1. Call create_session with name "Re-review #${item.number}", coordinate_with_creator true, notify_on_idle "once", and kickoff { mode: "autopilot", prompt: <the prompt between the markers below, verbatim> }.
2. Reply briefly that the re-review has started, then end your turn.
3. When the sub-session sends back its JSON result, record it by calling invoke_canvas_action with instanceId "${instanceId}", actionName "record_review", input { "reviews": [ <that object, with rereviewGuidance set to the maintainer guidance${guidance ? "" : " (omit if none)"}> ] }. If that instance is no longer open, first call open_canvas with canvasId "${canvasId}" and the same instanceId. Then summarise the outcome in one line (old bucket → new bucket). If the sub-session fails or never reports back, say so instead of reviewing it yourself.

----- BEGIN SUB-SESSION PROMPT -----
${childPrompt}
----- END SUB-SESSION PROMPT -----`;
}

export function buildReviewPrompt({ items, instanceId, canvasId, guidancePath, history }) {
    const list = items
        .map(
            (item) =>
                `- #${item.number} ${item.title} (reviewToken: ${item.queueId}; by @${item.author}; labels: ${item.labels.join(", ") || "none"})`,
        )
        .join("\n");

    const recent = formatHistory(history);

    return `Perform an AI review of ${items.length} external plugin submission(s) on the External Plugin Review Board canvas.

Read the review guidance first (use the view tool): ${guidancePath}
It contains the maintainer's decision pattern, the per-issue review procedure, and the recommendation buckets. Work strictly read-only: do NOT comment on, label, or close any issue.

Recent decisions made from the board (calibrate against these as well as the guidance):
${recent}

Submissions to review:
${list}

For more than ~5 submissions, split them across parallel general-purpose sub-agents (give each the guidance path and its issue numbers, and ask them to return the fields below), grouping submissions from the same author together so bulk submissions are assessed as a batch.

Record results on the board as you go by calling invoke_canvas_action with instanceId "${instanceId}", actionName "record_review", input { "reviews": [ ... ] }. Each review object has: ${REVIEW_FIELD_LIST}. If that instance is no longer open, first call open_canvas with canvasId "${canvasId}" and the same instanceId.

When finished, reply with a short summary of the counts per bucket.`;
}
