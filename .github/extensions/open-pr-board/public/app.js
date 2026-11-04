const TOKEN = document.querySelector('meta[name="board-token"]')?.content ?? "";
const CONFIRM_MS = 6000;

const COLUMN_HINTS = {
    unreviewed: "Not reviewed yet",
    reviewing: "Waiting on the agent",
    close: "Doesn't belong here",
    "request-changes": "Fixable, needs work",
    "needs-insight": "Needs a maintainer call",
    approve: "Ready to merge",
    actioned: "GitHub action completed",
};

const DECISION_LABELS = {
    approve: "Approve + auto-merge",
    "request-changes": "Request changes",
    comment: "Submit feedback",
    close: "Close PR",
};

const DECISION_BUTTONS = {
    approve: "Approve + auto-merge",
    "request-changes": "Request changes",
    comment: "Submit feedback",
    close: "Close PR",
};

const CONFIRM_LABELS = {
    approve: "Confirm: approve + merge",
    "request-changes": "Confirm: request changes",
    comment: "Confirm: submit feedback",
    close: "Confirm: close PR",
};

let board = null;
let selectedNumber = null;
let detail = null;
let detailError = null;
let detailErrorHandoff = true;
let previewHeadRefOid = null;
let activeTab = "review";
let filterText = "";
let pendingConfirm = null;
let detailGeneration = 0;
let drawerOriginNumber = null;
const decisionsInFlight = new Set();
const stagedComments = new Map();
let bulkBusy = false;

const el = {
    title: document.getElementById("board-title"),
    summary: document.getElementById("board-summary"),
    filter: document.getElementById("filter"),
    refresh: document.getElementById("refresh-button"),
    reset: document.getElementById("reset-button"),
    review: document.getElementById("review-button"),
    board: document.getElementById("board"),
    toolbar: document.querySelector(".toolbar"),
    drawer: document.getElementById("drawer"),
    kicker: document.getElementById("drawer-kicker"),
    drawerTitle: document.getElementById("drawer-title"),
    drawerMeta: document.getElementById("drawer-meta"),
    drawerLabels: document.getElementById("drawer-labels"),
    drawerColumn: document.getElementById("drawer-column"),
    drawerLink: document.getElementById("drawer-link"),
    drawerBody: document.getElementById("drawer-body"),
    drawerClose: document.getElementById("drawer-close"),
    rereviewToggle: document.getElementById("rereview-toggle"),
    rereviewPanel: document.getElementById("rereview-panel"),
    rereviewGuidance: document.getElementById("rereview-guidance"),
    rereviewStart: document.getElementById("rereview-start"),
    rereviewCancel: document.getElementById("rereview-cancel"),
    comment: document.getElementById("decision-comment"),
    toasts: document.getElementById("toasts"),
};

/* ------------------------------------------------------------------ utils */

function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined || value === false) continue;
        if (key === "class") node.className = value;
        else if (key === "dataset") Object.assign(node.dataset, value);
        else if (key === "vars") for (const [name, val] of Object.entries(value)) node.style.setProperty(name, val);
        else if (key.startsWith("on") && typeof value === "function")
            node.addEventListener(key.slice(2).toLowerCase(), value);
        else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false) continue;
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
}

/**
 * Renders HTML that GitHub produced and sanitised (`body_html` from the REST API
 * with the full+json media type). Never pass user-authored raw strings here.
 */
function markdownBlock(html) {
    const node = h("div", { class: "markdown" });
    node.innerHTML = html || "<p><em>No content.</em></p>";
    for (const anchor of node.querySelectorAll("a")) {
        anchor.target = "_blank";
        anchor.rel = "noreferrer noopener";
    }
    return node;
}

function relativeTime(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function toast(message, { error = false, handoff = error, url } = {}) {
    const node = h(
        "div",
        { class: error ? "toast error" : "toast", ...(handoff ? { "data-agent-error": "" } : {}) },
        message,
        url ? " " : null,
        url ? h("a", { href: url, target: "_blank", rel: "noreferrer noopener" }, "View") : null,
    );
    el.toasts.append(node);
    setTimeout(() => node.remove(), error ? 9000 : 5000);
}

async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
        method,
        headers: {
            "X-Board-Token": TOKEN,
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status})`),
        { handoff: data.handoff !== false });
    return data;
}

async function run(button, work, successMessage) {
    const label = button?.textContent;
    if (button) {
        button.disabled = true;
        button.textContent = "Working…";
    }
    try {
        const result = await work();
        if (successMessage) toast(typeof successMessage === "function" ? successMessage(result) : successMessage);
        return result;
    } catch (error) {
        toast(error.message, { error: true, handoff: error.handoff !== false });
        return null;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = label;
        }
    }
}

function currentItem() {
    if (selectedNumber === null) return null;
    return board?.items.find((item) => item.number === selectedNumber) ?? null;
}

function matchesFilter(item) {
    if (!filterText) return true;
    const haystack = [
        String(item.number),
        item.title,
        item.author,
        ...(item.labels ?? []).map((label) => label.name),
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(filterText);
}

/* ------------------------------------------------------------------- pills */

function labelChips(labels, limit) {
    const shown = limit ? labels.slice(0, limit) : labels;
    const chips = shown.map((label) =>
        h(
            "span",
            {
                class: "label-chip",
                title: label.description || label.name,
                vars: label.color ? { "--label": `#${label.color}` } : null,
            },
            label.name,
        ),
    );
    if (limit && labels.length > limit) {
        chips.push(h("span", { class: "label-chip label-chip-more" }, `+${labels.length - limit}`));
    }
    return chips;
}

function statusPills(item) {
    const pills = [];
    const add = (text, tone, title) => pills.push(h("span", { class: `pill pill-${tone}`, title: title || text }, text));

    if (item.isDraft) add("draft", "info");
    if (item.checkCounts?.total) {
        if (item.checksState === "failure") add(`${item.checkCounts.failure} failing`, "danger", "Failing checks");
        if (item.checkCounts.actionRequired) add(`${item.checkCounts.actionRequired} need attention`, "caution", "Check action required; not necessarily workflow execution approval");
        if (item.checkCounts.pending) add(`${item.checkCounts.pending} pending`, "caution", "Checks queued or running");
        if (item.checksState === "success" && !item.workflowApprovals?.length && !item.workflowApprovalError)
            add("checks pass", "success", "All checks passed");
    }
    if (item.workflowApprovals?.length) add(`${item.workflowApprovals.length} awaiting workflow approval`, "caution", "Open Checks to authorize fork workflow execution");
    if (item.workflowApprovalError) add("workflow approvals unavailable", "caution", item.workflowApprovalError);
    if (item.mergeStateStatus === "DIRTY") add("conflicts", "danger", "Merge conflicts with the base branch");
    if (item.reviewDecision === "APPROVED") add("approved", "success", "Approved on GitHub");
    if (item.reviewDecision === "CHANGES_REQUESTED") add("changes requested", "warn", "Changes requested on GitHub");

    if (item.reviewStatus === "queued") add("review queued", "ai", "Waiting on the agent's review");
    else if (item.review) {
        add(`AI: ${item.review.recommendation}`, "ai", item.review.rationale || "AI recommendation");
        if (item.reviewStale) add("PR changed", "caution", "The PR was updated after this review was recorded");
    }
    if (item.manualColumn) add("moved", "info", "Manually moved; overrides the AI recommendation");
    if (item.decision)
        add(
            item.decision.status || DECISION_LABELS[item.decision.kind] || item.decision.kind,
            "info",
            `GitHub action: ${item.decision.status || item.decision.kind}`,
        );
    return pills;
}

/* ------------------------------------------------------------------- board */

function renderCard(item) {
    const card = h(
        "article",
        {
            class: item.number === selectedNumber ? "card selected" : "card",
            draggable: item.decision ? "false" : "true",
            dataset: { number: String(item.number) },
            tabindex: "0",
            role: "button",
            "aria-label": `#${item.number} ${item.title}`,
            onclick: () => openDrawer(item.number),
            onkeydown: (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDrawer(item.number);
                }
            },
            ondragstart: (event) => {
                event.dataTransfer.setData("text/plain", String(item.number));
                event.dataTransfer.setData("application/x-pr-head", item.headRefOid ?? "");
                event.dataTransfer.effectAllowed = "move";
                card.classList.add("dragging");
            },
            ondragend: () => card.classList.remove("dragging"),
        },
        h(
            "div",
            { class: "card-top" },
            h("span", { class: "card-number" }, `#${item.number}`),
            h("span", { class: "card-byline" }, `@${item.author} · ${relativeTime(item.updatedAt)}`),
        ),
        h("p", { class: "card-title" }, item.title),
        item.labels?.length ? h("div", { class: "pills" }, labelChips(item.labels, 6)) : null,
        h("div", { class: "pills" }, statusPills(item)),
        item.review?.rationale ? h("p", { class: "card-rationale" }, item.review.rationale) : null,
    );
    return card;
}

function renderBoard() {
    if (!board) return;
    const scroll = new Map();
    for (const list of el.board.querySelectorAll(".column-cards")) scroll.set(list.dataset.column, list.scrollTop);

    const columns = board.columns.map((column) => {
        const items = board.items
            .filter((item) => item.column === column.id && matchesFilter(item))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.number - b.number);
        const list = h(
            "div",
            {
                class: "column-cards",
                dataset: { column: column.id },
                ondragover: (event) => {
                    if (!column.droppable) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    list.closest(".column")?.classList.add("drop-target");
                },
                ondragleave: () => list.closest(".column")?.classList.remove("drop-target"),
                ondrop: async (event) => {
                    list.closest(".column")?.classList.remove("drop-target");
                    if (!column.droppable) return;
                    event.preventDefault();
                    const number = Number(event.dataTransfer.getData("text/plain"));
                    if (!Number.isInteger(number)) return;
                    try {
                        await api("/api/move", { method: "POST", body: {
                            number, column: column.id, headRefOid: event.dataTransfer.getData("application/x-pr-head") || null,
                        } });
                    } catch (error) {
                        toast(error.message, { error: true, handoff: error.handoff !== false });
                    }
                },
            },
            items.length ? items.map(renderCard) : h("p", { class: "empty" }, COLUMN_HINTS[column.id] ?? "Empty"),
        );
        return h(
            "section",
            { class: "column", dataset: { column: column.id } },
            h(
                "header",
                { class: "column-header" },
                h("span", { class: "column-name" }, column.label),
                h("span", { class: "count" }, String(items.length)),
            ),
            column.droppable ? renderColumnActions(column) : null,
            list,
        );
    });

    el.board.replaceChildren(...columns);
    for (const list of el.board.querySelectorAll(".column-cards")) {
        const previous = scroll.get(list.dataset.column);
        if (previous) list.scrollTop = previous;
    }

    const open = board.items.filter((item) => !item.decision).length;
    const pending = board.items.filter((item) => !item.decision && (!item.review || item.reviewStale)).length;
    el.title.textContent = `Open pull requests — ${board.repo}`;
    el.summary.textContent = [
        `${board.items.length} open`,
        `${board.reviewed} reviewed`,
        `${pending} pending review`,
        `${board.items.length - open} actioned`,
        board.updatedAt ? `synced ${relativeTime(board.updatedAt)}` : "never synced",
    ].join(" · ");
    el.review.textContent = pending ? `Review ${pending} pending` : "Review pending";
    el.review.disabled = pending === 0;
}

function columnItems(columnId) {
    return board.items.filter((item) => item.column === columnId && !item.decision &&
        item.reviewStatus !== "queued" && !decisionsInFlight.has(item.number));
}

function stagedComment(item) {
    return stagedComments.get(item.number) ?? item.review?.suggestedComment ?? "";
}

function renderColumnActions(column) {
    const count = columnItems(column.id).length;
    const rejectKind = column.id === "close" ? "close" : "request-changes";
    const actions = [["approve", "Approve + auto-merge"], [rejectKind, DECISION_LABELS[rejectKind]], ["rereview", "Re-review"]];
    return h("div", { class: "column-actions", role: "group", "aria-label": `${column.label} bulk actions` },
        actions.map(([kind, label]) => h("button", {
            type: "button", class: "btn btn-small", disabled: bulkBusy || !count,
            title: `Apply to all ${count} eligible PRs in this column, including hidden search results`,
            onclick: () => bulkAction(column.id, kind),
        }, `${label} all`)));
}

async function bulkAction(columnId, kind) {
    if (bulkBusy) return;
    const items = columnItems(columnId).map((item) => ({
        number: item.number, headRefOid: item.headRefOid, comment: stagedComment(item),
    }));
    if (!items.length) return;
    if (kind === "close" || kind === "request-changes") {
        const missing = items.filter((item) => !item.comment.trim());
        if (missing.length) {
            toast(`Stage feedback for ${missing.map((item) => `#${item.number}`).join(", ")} before actioning this column.`, { error: true, handoff: false });
            return;
        }
    }
    const label = kind === "rereview" ? "Re-review" : DECISION_LABELS[kind];
    const preview = items.map((item) => `#${item.number}${kind === "rereview" ? "" : `: ${item.comment || "(no comment)"}`}`).join("\n\n");
    if (!confirm(`${label} all ${items.length} PRs in this column (including hidden search results)?\n${
        kind === "rereview" ? "Queues AI reviews; GitHub is not changed." : kind === "approve" ?
            "Submits approvals and enables auto-merge with a merge commit." : "Uses each PR's staged comment on GitHub."}\n\n${preview}`)) return;
    bulkBusy = true;
    renderBoard();
    let completed = 0;
    const failures = [];
    let handoff = false;
    try {
        if (kind === "rereview") {
            const result = await api("/api/review", { method: "POST", body: { numbers: items.map((item) => item.number) } });
            toast(result.message);
            return;
        }
        for (const item of items) {
            try {
                const current = columnItems(columnId).find((current) => current.number === item.number);
                if (!current || current.headRefOid !== item.headRefOid) {
                    throw Object.assign(new Error("PR moved, changed, or was already actioned; review it again."), { handoff: false });
                }
                if (kind === "approve" && (current.manualColumn === "approve" ? current.approvalStale : current.reviewStale)) {
                    throw Object.assign(new Error("PR changed since its AI review or manual approval choice; review the current commit before approving."), { handoff: false });
                }
                decisionsInFlight.add(item.number);
                const result = await api("/api/decision", {
                    method: "POST", body: {
                        number: item.number, kind, comment: item.comment,
                        ...(kind !== "close" ? { headRefOid: item.headRefOid } : {}),
                    },
                });
                completed++;
                if (selectedNumber === item.number) closeDrawer();
                if (result.warning) {
                    failures.push(`#${item.number}: ${result.warning}`);
                    handoff = true;
                }
            } catch (error) {
                failures.push(`#${item.number}: ${error.message}`);
                handoff ||= error.handoff !== false;
            } finally {
                decisionsInFlight.delete(item.number);
            }
        }
        toast(`${label}: ${completed}/${items.length} actions submitted.${failures.length ? ` Attention needed: ${failures.join(" ")}` : ""}`,
            { error: failures.length > 0, handoff });
    } catch (error) {
        toast(error.message, { error: true, handoff: error.handoff !== false });
    } finally {
        bulkBusy = false;
        renderBoard();
        if (currentItem()) renderDrawerHeader();
    }
}

/* ------------------------------------------------------------------ drawer */

function reviewTab(item) {
    if (item.reviewStatus === "queued") {
        return h("p", { class: "notice" }, "Queued — the agent is reviewing this pull request now.");
    }
    if (!item.review) {
        return h(
            "div",
            { class: "notice" },
            h("p", { class: "meta" }, "No AI review recorded yet."),
            h(
                "button",
                {
                    class: "btn btn-small btn-primary",
                    type: "button",
                    onclick: async (event) => {
                        const result = await run(
                            event.currentTarget,
                            () => api("/api/review", { method: "POST", body: { numbers: [item.number] } }),
                            (result) => result.message ?? "Review requested.",
                        );
                        if (result && selectedNumber === item.number) closeDrawer();
                    },
                },
                "Review this PR",
            ),
        );
    }

    const review = item.review;
    const rows = [
        ["Recommendation", review.recommendation],
        ["Confidence", review.confidence],
        ["Rationale", review.rationale],
        ["Summary", review.summary],
        ["Repo fit", review.repoFit],
        ["Compliance", review.compliance],
        ["Differentiation", review.differentiation],
        ["Risks", review.risks],
        ["Validation", review.validation],
        ["Check next", review.checkNext],
    ].filter(([, value]) => value);

    return h(
        "div",
        {},
        item.reviewStale
            ? h("p", { class: "notice" }, "This pull request changed after the review was recorded. Consider a re-review.")
            : null,
        h("dl", { class: "review-grid" }, rows.map(([term, value]) => [h("dt", {}, term), h("dd", {}, value)])),
        review.reviewedAt ? h("p", { class: "meta", style: "margin-top:12px" }, `Reviewed ${relativeTime(review.reviewedAt)}`) : null,
    );
}

function conversationTab() {
    const entries = [
        ...(detail.reviews ?? []).map((review) => ({ ...review, kind: `review: ${review.state.toLowerCase()}`, at: review.submittedAt })),
        ...(detail.comments ?? []).map((comment) => ({ ...comment, kind: "comment", at: comment.createdAt })),
    ]
        .filter((entry) => entry.bodyHtml || entry.kind.startsWith("review"))
        .sort((a, b) => new Date(a.at) - new Date(b.at));

    if (!entries.length) return h("p", { class: "notice" }, "No comments or reviews yet.");

    return h(
        "div",
        {},
        entries.map((entry) => {
            const body = markdownBlock(entry.bodyHtml);
            const wrapper = h(
                "article",
                { class: "comment collapsed" },
                h(
                    "header",
                    { class: "comment-header" },
                    h("strong", {}, `@${entry.author ?? "unknown"}`),
                    h("span", { class: "meta" }, `${entry.kind} · ${relativeTime(entry.at)}`),
                    entry.url ? h("a", { href: entry.url, target: "_blank", rel: "noreferrer noopener" }, "link") : null,
                    h(
                        "button",
                        {
                            class: "btn btn-small comment-toggle",
                            type: "button",
                            onclick: (event) => {
                                const collapsed = wrapper.classList.toggle("collapsed");
                                event.currentTarget.textContent = collapsed ? "Expand" : "Collapse";
                            },
                        },
                        "Expand",
                    ),
                ),
                body,
            );
            return wrapper;
        }),
    );
}

function filesTab() {
    if (!detail.files?.length) return h("p", { class: "notice" }, "No changed files reported.");
    return h(
        "ul",
        { class: "row-list" },
        detail.files.map((file) =>
            h(
                "li",
                { class: "row" },
                h("span", { class: "row-name" }, file.filename),
                h("span", { class: "meta" }, file.status),
                h(
                    "span",
                    { class: "row-stat" },
                    h("span", { class: "add" }, `+${file.additions}`),
                    " ",
                    h("span", { class: "del" }, `-${file.deletions}`),
                ),
            ),
        ),
    );
}

function checksTab(item) {
    return h(
        "div",
        {},
        item.workflowApprovalError ? h("p", { class: "notice", "data-agent-error": "" }, item.workflowApprovalError) : null,
        item.workflowApprovals?.length ? h("div", {},
            h("p", { class: "notice" }, "Fork workflows await execution approval. Review the contributor's code before running it. This does not approve the PR, enable auto-merge, or bypass required checks."),
            h("ul", { class: "row-list" }, item.workflowApprovals.map((workflow) => h("li", { class: "row" },
                h("a", { class: "row-name", href: workflow.url, target: "_blank", rel: "noreferrer noopener" }, `${workflow.name} (run ${workflow.id}, attempt ${workflow.attempt})`),
                h("button", {
                    class: "btn btn-small", type: "button",
                    disabled: bulkBusy || decisionsInFlight.has(item.number),
                    onclick: (event) => submitWorkflowApproval(event.currentTarget, item, workflow),
                }, "Approve and run checks"),
            ))),
        ) : null,
        item.checkCounts?.actionRequired ? h("p", { class: "notice" },
            "Action-required checks can also be submission gates awaiting PR reviews. Only eligible fork workflow runs above can be authorized here. Deployment approvals and other gates must be handled on GitHub.") : null,
        !item.checks?.length ? h("p", { class: "notice" }, "No checks reported for this pull request.") : h(
            "ul",
            { class: "row-list" },
            item.checks.map((check) =>
                h(
                    "li",
                    { class: "row" },
                    h("span", { class: "state-dot", dataset: { state: check.state }, title: check.state }),
                    check.url
                        ? h(
                              "a",
                              { class: "row-name", href: check.url, target: "_blank", rel: "noreferrer noopener" },
                              check.name,
                          )
                        : h("span", { class: "row-name" }, check.name),
                    check.workflow ? h("span", { class: "meta" }, check.workflow) : null,
                    h("span", { class: "meta" }, check.state === "actionRequired" ? "action required" : check.state),
                ),
            ),
        ),
    );
}

function renderDrawerBody() {
    const item = currentItem();
    if (!item) return;

    for (const tab of el.drawer.querySelectorAll(".tab")) {
        const selected = tab.dataset.tab === activeTab;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
    }
    el.drawerBody.setAttribute("aria-labelledby", `tab-${activeTab}`);

    if (activeTab === "review") {
        el.drawerBody.replaceChildren(reviewTab(item));
        return;
    }
    if (activeTab === "checks") {
        el.drawerBody.replaceChildren(checksTab(item));
        return;
    }
    if (detailError) {
        el.drawerBody.replaceChildren(h("p", { class: "notice", ...(detailErrorHandoff ? { "data-agent-error": "" } : {}) }, detailError));
        return;
    }
    if (!detail || detail.number !== item.number) {
        el.drawerBody.replaceChildren(h("p", { class: "notice" }, "Loading…"));
        return;
    }
    if (activeTab === "description") el.drawerBody.replaceChildren(markdownBlock(detail.bodyHtml));
    else if (activeTab === "conversation") el.drawerBody.replaceChildren(conversationTab());
    else if (activeTab === "files") el.drawerBody.replaceChildren(filesTab());
}

function renderDrawerHeader() {
    const item = currentItem();
    if (!item) return;

    el.kicker.textContent = `#${item.number} · ${item.headRefName} → ${item.baseRefName}`;
    el.drawerTitle.textContent = item.title;
    el.drawerMeta.textContent = [
        `@${item.author}`,
        `opened ${relativeTime(item.createdAt)}`,
        `+${item.additions}/-${item.deletions} in ${item.changedFiles} files`,
        item.decision ? `actioned: ${item.decision.status || DECISION_LABELS[item.decision.kind] || item.decision.kind}` : null,
    ]
        .filter(Boolean)
        .join(" · ");
    el.drawerLabels.replaceChildren(...labelChips(item.labels ?? []));
    el.drawerLink.href = item.url;

    const droppable = board.columns.filter((column) => column.droppable);
    const options = droppable.map((column) => h("option", { value: column.id }, column.label));
    const fixed = board.columns.find((column) => !column.droppable && column.id === item.column);
    if (fixed) options.push(h("option", { value: fixed.id, disabled: true }, fixed.label));
    el.drawerColumn.replaceChildren(...options);
    el.drawerColumn.value = item.column;
    el.drawerColumn.disabled = Boolean(item.decision);
    el.rereviewToggle.disabled = Boolean(item.decision) || item.reviewStatus === "queued";

    for (const button of el.drawer.querySelectorAll("[data-decision]")) {
        button.disabled = bulkBusy || Boolean(item.decision) || decisionsInFlight.has(item.number);
        button.classList.remove("confirming");
        button.textContent = DECISION_BUTTONS[button.dataset.decision];
    }
    clearTimeout(pendingConfirm?.timer);
    pendingConfirm = null;
}

async function loadDetail(number, { force = false } = {}) {
    if (selectedNumber !== number) return;
    const generation = ++detailGeneration;
    const headRefOid = currentItem()?.headRefOid;
    previewHeadRefOid = null;
    detail = null;
    detailError = null;
    renderDrawerBody();
    try {
        const response = await api(`/api/pr/${number}`, force ? { method: "POST" } : {});
        if (generation !== detailGeneration || selectedNumber !== number) return;
        if (response.headRefOid && response.headRefOid !== headRefOid) {
            throw Object.assign(new Error("PR changed while loading its preview; refresh and review the current commit."), { handoff: false });
        }
        detail = response;
        previewHeadRefOid = response.headRefOid ?? null;
    } catch (error) {
        if (generation !== detailGeneration || selectedNumber !== number) return;
        detailError = error.message;
        detailErrorHandoff = error.handoff !== false;
    }
    if (selectedNumber === number) renderDrawerBody();
}

function openDrawer(number) {
    const changed = selectedNumber !== number;
    selectedNumber = number;
    const item = currentItem();
    if (!item) return;

    if (!el.drawer.classList.contains("open")) drawerOriginNumber = number;
    el.drawer.inert = false;
    el.board.inert = true;
    el.toolbar.inert = true;
    el.drawer.classList.add("open");
    el.drawer.setAttribute("aria-hidden", "false");
    el.rereviewPanel.hidden = true;
    if (changed) {
        el.comment.value = stagedComment(item);
        detail = null;
        detailError = null;
        previewHeadRefOid = null;
    }
    renderDrawerHeader();
    renderDrawerBody();
    renderBoard();
    el.drawerClose.focus();
    if (changed) loadDetail(number);
}

function closeDrawer() {
    ++detailGeneration;
    selectedNumber = null;
    detail = null;
    detailError = null;
    previewHeadRefOid = null;
    clearTimeout(pendingConfirm?.timer);
    pendingConfirm = null;
    el.drawer.classList.remove("open");
    el.drawer.setAttribute("aria-hidden", "true");
    el.drawer.inert = true;
    el.board.inert = false;
    el.toolbar.inert = false;
    renderBoard();
    const origin = el.board.querySelector(`[data-number="${drawerOriginNumber}"]`);
    (origin ?? el.filter).focus();
    drawerOriginNumber = null;
}

/* --------------------------------------------------------------- decisions */

async function submitWorkflowApproval(button, item, workflow) {
    if (bulkBusy || decisionsInFlight.has(item.number)) return;
    const current = currentItem();
    if (!current || current.number !== item.number || current.headRefOid !== workflow.headRefOid ||
        !current.workflowApprovals?.some((run) => run.id === workflow.id && run.attempt === workflow.attempt)) {
        toast("Workflow or PR changed. Refresh before approving workflow execution.", { error: true, handoff: false });
        return;
    }
    if (!confirm(`Approve and run "${workflow.name}" (run ${workflow.id}, attempt ${workflow.attempt}) for #${item.number} at ${workflow.headRefOid}?\n\nThis authorizes execution of contributor code using the authenticated gh account. Review that code first. It does not submit a PR review, enable auto-merge, or bypass required checks.`)) return;
    clearTimeout(pendingConfirm?.timer);
    pendingConfirm = null;
    decisionsInFlight.add(item.number);
    renderDrawerHeader();
    renderDrawerBody();
    const result = await run(button, () => api("/api/workflow-approval", { method: "POST", body: {
        number: item.number, runId: workflow.id, attempt: workflow.attempt,
        headRefOid: workflow.headRefOid, confirmed: true,
    } }));
    decisionsInFlight.delete(item.number);
    if (selectedNumber === item.number) {
        renderDrawerHeader();
        renderDrawerBody();
    }
    if (result) {
        if (result.warning) toast(result.warning, { error: true, url: result.url });
        else toast(`#${item.number}: workflow execution approved; checks may now queue or run.`, { url: workflow.url });
    }
}

function armConfirm(button, kind) {
    if (pendingConfirm?.kind === kind) return true;
    if (pendingConfirm) {
        clearTimeout(pendingConfirm.timer);
        pendingConfirm.button.classList.remove("confirming");
        pendingConfirm.button.textContent = DECISION_BUTTONS[pendingConfirm.kind];
    }
    button.classList.add("confirming");
    button.textContent = CONFIRM_LABELS[kind];
    pendingConfirm = {
        kind,
        button,
        timer: setTimeout(() => {
            button.classList.remove("confirming");
            button.textContent = DECISION_BUTTONS[kind];
            pendingConfirm = null;
        }, CONFIRM_MS),
    };
    return false;
}

async function submitDecision(button, kind) {
    const item = currentItem();
    if (!item || bulkBusy || decisionsInFlight.has(item.number)) return;
    if (kind === "approve" && (!previewHeadRefOid || previewHeadRefOid !== item.headRefOid)) {
        toast("PR preview is loading or changed; review the current commit before approving.", { error: true, handoff: false });
        return;
    }
    if (!armConfirm(button, kind)) return;
    clearTimeout(pendingConfirm.timer);
    pendingConfirm = null;
    button.classList.remove("confirming");

    const comment = el.comment.value;
    decisionsInFlight.add(item.number);
    renderDrawerHeader();
    const result = await run(button, () =>
        api("/api/decision", { method: "POST", body: {
            number: item.number, kind, comment,
            ...(kind !== "close" ? { headRefOid: kind === "approve" ? previewHeadRefOid : item.headRefOid } : {}),
        } }),
    );
    decisionsInFlight.delete(item.number);
    if (selectedNumber === item.number) renderDrawerHeader();
    button.textContent = DECISION_BUTTONS[kind];
    if (result) {
        if (result.warning) toast(result.warning, { error: true, url: result.url });
        else toast(`#${item.number}: ${result.status}.`, { url: result.url });
        if (selectedNumber === item.number) closeDrawer();
    }
}

/* ----------------------------------------------------------------- wire-up */

el.filter.addEventListener("input", (event) => {
    filterText = event.target.value.trim().toLowerCase();
    renderBoard();
});

el.refresh.addEventListener("click", (event) =>
    run(event.currentTarget, () => api("/api/refresh", { method: "POST" }), "Board refreshed."),
);

let resetConfirmTimer = null;

function disarmReset() {
    clearTimeout(resetConfirmTimer);
    resetConfirmTimer = null;
    el.reset.classList.remove("confirming");
    el.reset.textContent = "Reset board";
}

el.reset.addEventListener("click", async (event) => {
    if (!resetConfirmTimer) {
        el.reset.classList.add("confirming");
        el.reset.textContent = "Confirm reset";
        resetConfirmTimer = setTimeout(disarmReset, CONFIRM_MS);
        return;
    }
    disarmReset();
    const result = await run(event.currentTarget, () => api("/api/reset", { method: "POST" }));
    if (!result) return;
    closeDrawer();
    if (result.warning) toast(result.warning, { error: true });
    else toast("Board reset. Local reviews and history cleared; GitHub was not changed.");
});

el.review.addEventListener("click", (event) =>
    run(event.currentTarget, () => api("/api/review", { method: "POST", body: {} }), (result) => result.message ?? "Review requested."),
);

el.drawerClose.addEventListener("click", closeDrawer);

document.addEventListener("pointerdown", (event) => {
    if (selectedNumber !== null && !el.drawer.contains(event.target)) closeDrawer();
}, true);

document.addEventListener("keydown", (event) => {
    if (!el.drawer.classList.contains("open")) return;
    if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
    } else if (event.key === "Tab") {
        const controls = [...el.drawer.querySelectorAll(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )].filter((node) => node.getClientRects().length);
        const first = controls[0] ?? el.drawer;
        const last = controls.at(-1) ?? el.drawer;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === el.drawer)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

el.drawerColumn.addEventListener("change", async (event) => {
    const item = currentItem();
    if (!item) return;
    const column = event.target.value;
    if (column === item.column) return;
    try {
        await api("/api/move", { method: "POST", body: { number: item.number, column, headRefOid: item.headRefOid } });
        if (selectedNumber === item.number) closeDrawer();
    } catch (error) {
        toast(error.message, { error: true, handoff: error.handoff !== false });
        event.target.value = item.column;
    }
});

const tabs = [...el.drawer.querySelectorAll(".tab")];
for (const tab of tabs) {
    tab.addEventListener("click", () => {
        activeTab = tab.dataset.tab;
        renderDrawerBody();
        if (!detail && !detailError && selectedNumber !== null) loadDetail(selectedNumber);
    });
    tab.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(tab);
        const next = {
            ArrowRight: (index + 1) % tabs.length,
            ArrowLeft: (index - 1 + tabs.length) % tabs.length,
            Home: 0,
            End: tabs.length - 1,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
    });
}

el.rereviewToggle.addEventListener("click", () => {
    el.rereviewPanel.hidden = !el.rereviewPanel.hidden;
    if (!el.rereviewPanel.hidden) el.rereviewGuidance.focus();
});

el.rereviewCancel.addEventListener("click", () => {
    el.rereviewPanel.hidden = true;
});

el.rereviewStart.addEventListener("click", async (event) => {
    const item = currentItem();
    if (!item) return;
    const result = await run(
        event.currentTarget,
        () =>
            api("/api/rereview", {
                method: "POST",
                body: { number: item.number, guidance: el.rereviewGuidance.value },
            }),
        (value) => value.message ?? "Re-review requested.",
    );
    if (result && selectedNumber === item.number) {
        el.rereviewGuidance.value = "";
        el.rereviewPanel.hidden = true;
        closeDrawer();
    }
});

for (const button of el.drawer.querySelectorAll("[data-decision]")) {
    button.addEventListener("click", () => submitDecision(button, button.dataset.decision));
}

el.comment.addEventListener("input", () => {
    if (selectedNumber !== null) stagedComments.set(selectedNumber, el.comment.value);
    clearTimeout(pendingConfirm?.timer);
    pendingConfirm = null;
    if (currentItem()) renderDrawerHeader();
});

function applySnapshot(snapshot) {
    const previousHead = currentItem()?.headRefOid;
    const refreshed = board?.updatedAt !== snapshot.updatedAt;
    board = snapshot;
    renderBoard();
    if (selectedNumber !== null) {
        if (!currentItem()) closeDrawer();
        else {
            renderDrawerHeader();
            if (previousHead !== currentItem().headRefOid || (refreshed && detailError)) {
                loadDetail(selectedNumber, { force: true });
            }
            else renderDrawerBody();
        }
    }
}

const events = new EventSource(`/events?token=${encodeURIComponent(TOKEN)}`);
events.addEventListener("board", (event) => applySnapshot(JSON.parse(event.data)));
events.addEventListener("refresh-error", (event) => toast(JSON.parse(event.data).error, { error: true }));
events.addEventListener("error", () => {
    el.summary.textContent = "Connection lost — reopen the canvas to reconnect.";
});

api("/api/board").then(applySnapshot).catch((error) => toast(error.message, { error: true }));
