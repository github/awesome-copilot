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
let activeTab = "review";
let filterText = "";
let pendingConfirm = null;

const el = {
    title: document.getElementById("board-title"),
    summary: document.getElementById("board-summary"),
    filter: document.getElementById("filter"),
    refresh: document.getElementById("refresh-button"),
    review: document.getElementById("review-button"),
    board: document.getElementById("board"),
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

function toast(message, { error = false, url } = {}) {
    const node = h(
        "div",
        { class: error ? "toast error" : "toast" },
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
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
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
        toast(error.message, { error: true });
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
        else if (item.checksState === "pending") add(`${item.checkCounts.pending} running`, "caution", "Checks running");
        else add("checks pass", "success", "All checks passed");
    }
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
            draggable: !item.decision,
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
        const items = board.items.filter((item) => item.column === column.id && matchesFilter(item));
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
                        await api("/api/move", { method: "POST", body: { number, column: column.id } });
                    } catch (error) {
                        toast(error.message, { error: true });
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
                    onclick: (event) =>
                        run(
                            event.currentTarget,
                            () => api("/api/review", { method: "POST", body: { numbers: [item.number] } }),
                            (result) => result.message ?? "Review requested.",
                        ),
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
    if (!item.checks?.length) return h("p", { class: "notice" }, "No checks reported for this pull request.");
    return h(
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
            ),
        ),
    );
}

function renderDrawerBody() {
    const item = currentItem();
    if (!item) return;

    for (const tab of el.drawer.querySelectorAll(".tab")) {
        tab.setAttribute("aria-selected", String(tab.dataset.tab === activeTab));
    }

    if (activeTab === "review") {
        el.drawerBody.replaceChildren(reviewTab(item));
        return;
    }
    if (activeTab === "checks") {
        el.drawerBody.replaceChildren(checksTab(item));
        return;
    }
    if (detailError) {
        el.drawerBody.replaceChildren(h("p", { class: "notice" }, detailError));
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
        button.disabled = Boolean(item.decision);
        button.classList.remove("confirming");
        button.textContent = DECISION_BUTTONS[button.dataset.decision];
    }
    pendingConfirm = null;
}

async function loadDetail(number, { force = false } = {}) {
    detail = null;
    detailError = null;
    renderDrawerBody();
    try {
        detail = await api(`/api/pr/${number}`, force ? { method: "POST" } : {});
    } catch (error) {
        detailError = error.message;
    }
    if (selectedNumber === number) renderDrawerBody();
}

function openDrawer(number) {
    const changed = selectedNumber !== number;
    selectedNumber = number;
    const item = currentItem();
    if (!item) return;

    el.drawer.classList.add("open");
    el.drawer.setAttribute("aria-hidden", "false");
    el.rereviewPanel.hidden = true;
    if (changed) {
        el.comment.value = item.review?.suggestedComment ?? "";
        detail = null;
        detailError = null;
    }
    renderDrawerHeader();
    renderDrawerBody();
    renderBoard();
    if (changed) loadDetail(number);
}

function closeDrawer() {
    selectedNumber = null;
    detail = null;
    detailError = null;
    pendingConfirm = null;
    el.drawer.classList.remove("open");
    el.drawer.setAttribute("aria-hidden", "true");
    renderBoard();
}

/* --------------------------------------------------------------- decisions */

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
    if (!item) return;
    if (!armConfirm(button, kind)) return;
    clearTimeout(pendingConfirm.timer);
    pendingConfirm = null;
    button.classList.remove("confirming");

    const result = await run(button, () =>
        api("/api/decision", { method: "POST", body: { number: item.number, kind, comment: el.comment.value } }),
    );
    button.textContent = DECISION_BUTTONS[kind];
    if (result) {
        if (result.warning) toast(result.warning, { error: true, url: result.url });
        else toast(`#${item.number}: ${result.status}.`, { url: result.url });
        if (currentItem()) loadDetail(item.number, { force: true });
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

el.review.addEventListener("click", (event) =>
    run(event.currentTarget, () => api("/api/review", { method: "POST", body: {} }), (result) => result.message ?? "Review requested."),
);

el.drawerClose.addEventListener("click", closeDrawer);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.drawer.classList.contains("open")) closeDrawer();
});

el.drawerColumn.addEventListener("change", async (event) => {
    const item = currentItem();
    if (!item) return;
    const column = event.target.value;
    if (column === item.column) return;
    try {
        await api("/api/move", { method: "POST", body: { number: item.number, column } });
    } catch (error) {
        toast(error.message, { error: true });
        event.target.value = item.column;
    }
});

for (const tab of el.drawer.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
        activeTab = tab.dataset.tab;
        renderDrawerBody();
        if (!detail && !detailError && selectedNumber !== null) loadDetail(selectedNumber);
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
    if (result) {
        el.rereviewGuidance.value = "";
        el.rereviewPanel.hidden = true;
    }
});

for (const button of el.drawer.querySelectorAll("[data-decision]")) {
    button.addEventListener("click", () => submitDecision(button, button.dataset.decision));
}

function applySnapshot(snapshot) {
    board = snapshot;
    renderBoard();
    if (selectedNumber !== null) {
        if (!currentItem()) closeDrawer();
        else {
            renderDrawerHeader();
            renderDrawerBody();
        }
    }
}

const events = new EventSource(`/events?token=${encodeURIComponent(TOKEN)}`);
events.addEventListener("board", (event) => applySnapshot(JSON.parse(event.data)));
events.addEventListener("error", () => {
    el.summary.textContent = "Connection lost — reopen the canvas to reconnect.";
});

api("/api/board").then(applySnapshot).catch((error) => toast(error.message, { error: true }));
