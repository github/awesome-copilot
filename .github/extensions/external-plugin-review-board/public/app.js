const token = document.querySelector('meta[name="board-token"]').content;

const RECOMMENDATION_LABELS = {
    "straight-reject": "Straight reject",
    "probably-reject": "Probably reject",
    "needs-review": "Needs review",
    accept: "Accept",
};

const ui = {
    board: document.getElementById("board"),
    meta: document.getElementById("meta"),
    search: document.getElementById("search"),
    refresh: document.getElementById("refresh"),
    review: document.getElementById("review"),
    drawer: document.getElementById("drawer"),
    drawerKicker: document.getElementById("drawer-kicker"),
    drawerTitle: document.getElementById("drawer-title"),
    drawerMeta: document.getElementById("drawer-meta"),
    drawerClose: document.getElementById("drawer-close"),
    drawerMove: document.getElementById("drawer-move"),
    drawerRereview: document.getElementById("drawer-rereview"),
    rereviewPanel: document.getElementById("rereview-panel"),
    rereviewGuidance: document.getElementById("rereview-guidance"),
    rereviewCancel: document.getElementById("rereview-cancel"),
    rereviewStart: document.getElementById("rereview-start"),
    drawerLink: document.getElementById("drawer-link"),
    drawerBody: document.getElementById("drawer-body"),
    drawerFooter: document.getElementById("drawer-footer"),
    tabs: [...document.querySelectorAll(".tab")],
    comment: document.getElementById("decision-comment"),
    preview: document.getElementById("decision-preview"),
    approve: document.getElementById("decision-approve"),
    reject: document.getElementById("decision-reject"),
    toasts: document.getElementById("toasts"),
};

let board = null;
let filter = "";
let selected = null;
let activeTab = "review";
const details = new Map();
const pendingConfirm = { kind: null, timer: null };

// ---------- helpers ----------

function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === "class") el.className = value;
        else if (key === "dataset") Object.assign(el.dataset, value);
        else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Board-Token": token },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
}

function toast(message, { error = false, link } = {}) {
    const el = h("div", { class: `toast${error ? " error" : ""}`, role: error ? "alert" : "status" }, message);
    if (link) el.append(" ", h("a", { href: link, target: "_blank", rel: "noopener noreferrer" }, "View ↗"));
    ui.toasts.append(el);
    setTimeout(() => el.remove(), error ? 8000 : 5000);
}

function relativeTime(iso) {
    if (!iso) return "never";
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const units = [
        ["year", 31536000],
        ["month", 2592000],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.round(seconds / size), unit);
        }
    }
    return "just now";
}

function cleanTitle(title) {
    return String(title ?? "")
        .replace(/^\[External Plugin\]\s*:?\s*/i, "")
        .trim();
}

function itemName(item) {
    return item.review?.pluginName || cleanTitle(item.title) || `#${item.number}`;
}

function signalPills(item) {
    const pills = [];
    for (const label of item.labels ?? []) {
        const match = label.match(/^needs-review:(HIGH|MEDIUM|LOW)$/i);
        if (match) {
            const level = match[1].toUpperCase();
            pills.push(h("span", { class: `pill pill-${level.toLowerCase()}`, title: "AGT contributor risk" }, `AGT ${level}`));
        } else if (label === "external-plugin-canvas") {
            pills.push(h("span", { class: "pill" }, "canvas"));
        }
    }
    if (item.decision) {
        pills.push(h("span", { class: `pill pill-${item.decision.kind}` }, item.decision.kind === "approve" ? "Approved" : "Rejected"));
    } else if (item.pendingDecision) {
        pills.push(h("span", { class: "pill pill-queued" }, `${item.pendingDecision.kind === "approve" ? "Approve" : "Reject"} pending`));
    } else if (item.reviewStatus === "queued") {
        pills.push(h("span", { class: "pill pill-queued" }, "Queued for AI"));
    }
    if (item.manualColumn && item.review?.recommendation) {
        pills.push(h("span", { class: "pill pill-ai", title: "AI recommendation (you moved this card)" }, `AI: ${RECOMMENDATION_LABELS[item.review.recommendation]}`));
    }
    return pills;
}

function matchesFilter(item) {
    if (!filter) return true;
    const haystack = [item.number, item.title, item.author, item.review?.pluginName, item.review?.repository]
        .join(" ")
        .toLowerCase();
    return haystack.includes(filter);
}

function findItem(number) {
    return board?.items.find((item) => item.number === number) ?? null;
}

function pendingReviewCount() {
    return board
        ? board.items.filter((item) => !item.decision && item.reviewStatus !== "reviewed" && item.reviewStatus !== "queued").length
        : 0;
}

// ---------- board ----------

function renderBoard() {
    if (!board) return;
    const open = board.items.filter((item) => !item.decision).length;
    ui.meta.textContent = `${board.repo} · ${open} open · refreshed ${relativeTime(board.lastRefreshedAt)}`;
    const pending = pendingReviewCount();
    ui.review.textContent = pending ? `Perform review (${pending})` : "Perform review";
    ui.review.disabled = pending === 0;

    const scrollPositions = new Map(
        [...ui.board.querySelectorAll(".column")].map((col) => [col.dataset.column, col.querySelector(".column-cards").scrollTop]),
    );

    const columns = board.columns.map((column) => {
        const items = board.items.filter((item) => item.column === column.id && matchesFilter(item));
        const cards = h(
            "div",
            { class: "column-cards" },
            items.length ? items.map(renderCard) : h("p", { class: "empty" }, filter ? "No matches" : "Empty"),
        );
        const col = h(
            "section",
            { class: "column", dataset: { column: column.id }, "aria-label": column.title },
            h("div", { class: "column-header" }, h("span", { class: "column-name" }, column.title), h("span", { class: "count" }, items.length)),
            cards,
        );
        if (column.droppable) wireDropTarget(col, column.id);
        return col;
    });
    ui.board.replaceChildren(...columns);

    for (const col of ui.board.querySelectorAll(".column")) {
        col.querySelector(".column-cards").scrollTop = scrollPositions.get(col.dataset.column) ?? 0;
    }
}

function renderCard(item) {
    const draggable = !item.decision;
    const card = h(
        "article",
        {
            class: `card${selected === item.number ? " selected" : ""}`,
            tabindex: "0",
            draggable: draggable ? "true" : "false",
            dataset: { number: item.number },
            "aria-label": `#${item.number} ${itemName(item)}`,
            onclick: () => openDrawer(item.number),
            onkeydown: (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDrawer(item.number);
                }
            },
        },
        h("div", { class: "card-top" }, h("span", { class: "card-number" }, `#${item.number}`), h("span", { class: "card-byline" }, `@${item.author} · ${relativeTime(item.createdAt)}`)),
        h("p", { class: "card-title" }, itemName(item)),
        item.review?.rationale ? h("p", { class: "card-rationale" }, item.review.rationale) : null,
    );
    const pills = signalPills(item);
    if (pills.length) card.append(h("div", { class: "pills" }, pills));
    if (draggable) {
        card.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", String(item.number));
            event.dataTransfer.effectAllowed = "move";
            card.classList.add("dragging");
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
    }
    return card;
}

function wireDropTarget(col, columnId) {
    let depth = 0;
    col.addEventListener("dragenter", (event) => {
        event.preventDefault();
        depth += 1;
        col.classList.add("drop-target");
    });
    col.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    });
    col.addEventListener("dragleave", () => {
        depth -= 1;
        if (depth <= 0) {
            depth = 0;
            col.classList.remove("drop-target");
        }
    });
    col.addEventListener("drop", (event) => {
        event.preventDefault();
        depth = 0;
        col.classList.remove("drop-target");
        const number = Number(event.dataTransfer.getData("text/plain"));
        const item = findItem(number);
        if (item && item.column !== columnId) moveItem(number, columnId);
    });
}

async function moveItem(number, column) {
    const hadReview = column === "unreviewed" && Boolean(findItem(number)?.review);
    try {
        await api("POST", "/api/move", { number, column });
        if (hadReview) toast(`Cleared the AI review for #${number}; it will be included in the next review.`);
    } catch (error) {
        toast(error.message, { error: true });
        renderBoard();
    }
}

// ---------- drawer ----------

function openDrawer(number) {
    selected = number;
    resetConfirm();
    hideRereview();
    const item = findItem(number);
    ui.comment.value = defaultComment(item);
    ui.drawer.classList.add("open");
    ui.drawer.setAttribute("aria-hidden", "false");
    renderDrawer();
    renderBoard();
    ui.drawerClose.focus({ preventScroll: true });
    if (activeTab !== "review") loadDetail(number);
}

function closeDrawer() {
    const previous = selected;
    selected = null;
    resetConfirm();
    hideRereview();
    ui.drawer.classList.remove("open");
    ui.drawer.setAttribute("aria-hidden", "true");
    renderBoard();
    ui.board.querySelector(`.card[data-number="${previous}"]`)?.focus({ preventScroll: true });
}

function defaultComment(item) {
    const suggested = item?.review?.suggestedComment ?? "";
    return suggested.replace(/^\s*\/(approve|reject)\b\s*/i, "").trim();
}

function renderDrawer() {
    const item = findItem(selected);
    if (!item) {
        if (selected != null) closeDrawer();
        return;
    }
    ui.drawerKicker.textContent = `#${item.number} · @${item.author}`;
    ui.drawerTitle.textContent = itemName(item);
    ui.drawerMeta.textContent = `Submitted ${relativeTime(item.createdAt)} · ${item.labels.join(", ")}`;
    ui.drawerLink.href = item.url;

    const options = board.columns
        .filter((column) => column.droppable || column.id === item.column)
        .map((column) => h("option", { value: column.id, selected: column.id === item.column }, column.title));
    ui.drawerMove.replaceChildren(...options);
    ui.drawerMove.disabled = Boolean(item.decision);
    ui.drawerRereview.disabled = Boolean(item.decision) || item.reviewStatus === "queued";
    if (ui.drawerRereview.disabled) hideRereview();

    for (const tab of ui.tabs) {
        tab.setAttribute("aria-selected", String(tab.dataset.tab === activeTab));
        if (tab.dataset.tab === "comments") {
            const count = details.get(item.number)?.comments.length;
            tab.textContent = count != null ? `Comments (${count})` : "Comments";
        }
    }

    ui.drawerFooter.hidden = Boolean(item.decision);
    updatePreview();
    renderTab(item);
}

function renderTab(item) {
    if (activeTab === "review") {
        ui.drawerBody.replaceChildren(renderReview(item));
        return;
    }
    const detail = details.get(item.number);
    if (!detail) {
        ui.drawerBody.replaceChildren(h("p", { class: "notice" }, "Loading issue from GitHub…"));
        return;
    }
    if (detail.error) {
        ui.drawerBody.replaceChildren(h("p", { class: "notice" }, `Couldn't load issue: ${detail.error}`));
        return;
    }
    if (activeTab === "issue") {
        ui.drawerBody.replaceChildren(markdownBlock(detail.bodyHtml));
    } else {
        ui.drawerBody.replaceChildren(
            ...(detail.comments.length ? detail.comments.map(renderComment) : [h("p", { class: "notice" }, "No comments yet.")]),
        );
    }
}

function renderReview(item) {
    const wrapper = h("div");
    if (item.decision) {
        const label = item.decision.kind === "approve" ? "Approved" : "Rejected";
        const suffix = item.decision.external ? " on GitHub" : "";
        const parts = [`${label}${suffix} ${relativeTime(item.decision.at)}`];
        if (item.decision.body) parts.push(": ", h("code", {}, item.decision.body));
        if (item.decision.commentUrl) {
            parts.push(" ", h("a", { href: item.decision.commentUrl, target: "_blank", rel: "noopener noreferrer" }, "comment ↗"));
        }
        wrapper.append(h("p", { class: "notice" }, parts));
    }
    if (item.pendingDecision && !item.decision) {
        wrapper.append(
            h(
                "p",
                { class: "notice" },
                `${item.pendingDecision.kind === "approve" ? "Approve" : "Reject"} command posted ${relativeTime(item.pendingDecision.at)}; waiting for GitHub Actions to close and label the issue. You can retry if the issue stays ready for review.`,
                " ",
                item.pendingDecision.commentUrl
                    ? h("a", { href: item.pendingDecision.commentUrl, target: "_blank", rel: "noopener noreferrer" }, "comment ↗")
                    : null,
            ),
        );
    }
    const review = item.review;
    if (item.reviewStatus === "queued" && review) {
        wrapper.append(h("p", { class: "notice" }, `Re-review in progress (started ${relativeTime(item.queuedAt)}). The result below will be replaced when it finishes.`));
    }
    if (item.reviewStatus === "queued" && item.rereviewGuidance) {
        wrapper.append(h("blockquote", { class: "guidance" }, h("strong", {}, "Your guidance: "), item.rereviewGuidance));
    }
    if (!review) {
        wrapper.append(
            h(
                "p",
                { class: "notice" },
                item.reviewStatus === "queued"
                    ? `Queued for AI review ${relativeTime(item.queuedAt)}. Results appear here when the agent records them.`
                    : "No AI review yet. Use “Perform review” or “Re-review” to have the agent assess it.",
            ),
        );
        return wrapper;
    }
    const rows = [
        ["Recommendation", RECOMMENDATION_LABELS[review.recommendation] + (item.manualColumn ? ` (you moved it to ${RECOMMENDATION_LABELS[item.manualColumn]})` : "")],
        ["Plugin", review.pluginName],
        ["Repository", review.repository ? h("a", { href: `https://github.com/${review.repository}`, target: "_blank", rel: "noopener noreferrer" }, review.repository) : null],
        ["Repo facts", review.repoFacts],
        ["Signals", review.signals],
        ["Contents", review.contents],
        ["Commercial", review.commercial],
        ["Rationale", review.rationale],
        ["Check next", review.checkNext],
        ["Suggested", review.suggestedComment ? h("code", {}, review.suggestedComment) : null],
        ["Re-review focus", review.rereviewGuidance],
        ["Reviewed", relativeTime(review.reviewedAt)],
    ].filter(([, value]) => value);
    wrapper.append(h("dl", { class: "review-grid" }, rows.flatMap(([label, value]) => [h("dt", {}, label), h("dd", {}, value)])));
    return wrapper;
}

function markdownBlock(html) {
    const block = h("div", { class: "markdown" });
    block.innerHTML = html || "<p><em>No description.</em></p>";
    for (const link of block.querySelectorAll("a[href]")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }
    return block;
}

function renderComment(comment) {
    const isBot = comment.authorType === "Bot" || /\[bot\]$/.test(comment.author ?? "") || comment.author === "github-actions";
    const body = markdownBlock(comment.bodyHtml);
    const el = h(
        "article",
        { class: `comment${isBot ? " collapsed" : ""}` },
        h(
            "div",
            { class: "comment-header" },
            h("strong", {}, comment.author ?? "unknown"),
            comment.association && comment.association !== "NONE" ? h("span", { class: "pill" }, comment.association.toLowerCase()) : null,
            isBot ? h("span", { class: "pill" }, "bot") : null,
            h("a", { href: comment.url, target: "_blank", rel: "noopener noreferrer" }, relativeTime(comment.createdAt)),
        ),
        body,
    );
    if (isBot) {
        const toggle = h("button", { type: "button", class: "btn btn-small comment-toggle" }, "Expand");
        toggle.addEventListener("click", () => {
            const collapsed = el.classList.toggle("collapsed");
            toggle.textContent = collapsed ? "Expand" : "Collapse";
        });
        el.querySelector(".comment-header").append(toggle);
    }
    return el;
}

async function loadDetail(number, { force = false } = {}) {
    if (!force && details.has(number) && !details.get(number).error) return;
    details.delete(number);
    if (selected === number) renderDrawer();
    try {
        const data = await api(force ? "POST" : "GET", `/api/issue/${number}`);
        details.set(number, data);
    } catch (error) {
        details.set(number, { error: error.message });
    }
    if (selected === number) renderDrawer();
}

// ---------- decisions ----------

function commentBody(kind) {
    const text = ui.comment.value.trim().replace(/^\/(approve|reject)\b\s*/i, "");
    if (kind === "approve") return text ? `/approve\n\n${text}` : "/approve";
    return text ? `/reject ${text}` : "/reject <reason required>";
}

function updatePreview() {
    const kind = pendingConfirm.kind;
    ui.preview.textContent = kind
        ? `Will post:\n${commentBody(kind)}`
        : `Reject posts: ${commentBody("reject")}\nApprove posts: ${commentBody("approve").replace(/\n+/g, " ⏎ ")}`;
    ui.reject.disabled = !ui.comment.value.trim().replace(/^\/(approve|reject)\b\s*/i, "");
    ui.reject.title = ui.reject.disabled ? "Reject requires a reason." : "";
}

function resetConfirm() {
    clearTimeout(pendingConfirm.timer);
    pendingConfirm.kind = null;
    ui.approve.textContent = "Approve";
    ui.reject.textContent = "Reject";
    ui.approve.classList.remove("confirming");
    ui.reject.classList.remove("confirming");
    ui.approve.disabled = false;
    ui.reject.disabled = false;
    updatePreview();
}

async function decide(kind) {
    const item = findItem(selected);
    if (!item) return;
    if (kind === "reject" && !ui.comment.value.trim().replace(/^\/(approve|reject)\b\s*/i, "")) {
        toast("Reject decisions require a reason.", { error: true });
        updatePreview();
        return;
    }
    if (pendingConfirm.kind !== kind) {
        resetConfirm();
        pendingConfirm.kind = kind;
        const button = kind === "approve" ? ui.approve : ui.reject;
        button.textContent = kind === "approve" ? "Confirm approve" : "Confirm reject";
        button.classList.add("confirming");
        updatePreview();
        pendingConfirm.timer = setTimeout(resetConfirm, 6000);
        return;
    }
    clearTimeout(pendingConfirm.timer);
    ui.approve.disabled = true;
    ui.reject.disabled = true;
    try {
        const result = await api("POST", "/api/decision", { number: item.number, kind, comment: ui.comment.value });
        toast(
            result.pending
                ? `Posted ${result.body.split("\n")[0]} on #${item.number}; waiting for workflow confirmation.`
                : `Posted ${result.body.split("\n")[0]} on #${item.number}`,
            { link: result.commentUrl },
        );
    } catch (error) {
        toast(error.message, { error: true });
    } finally {
        resetConfirm();
    }
}

// ---------- toolbar ----------

async function withBusy(button, label, fn) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = label;
    try {
        return await fn();
    } finally {
        button.textContent = original;
        button.disabled = false;
        renderBoard();
    }
}

ui.refresh.addEventListener("click", () =>
    withBusy(ui.refresh, "Refreshing…", async () => {
        try {
            const result = await api("POST", "/api/refresh");
            details.clear();
            const parts = [`${result.total} open`];
            if (result.added.length) parts.push(`${result.added.length} new`);
            if (result.removed.length) parts.push(`${result.removed.length} removed`);
            toast(`Refreshed: ${parts.join(", ")}`);
            if (selected != null && activeTab !== "review") loadDetail(selected, { force: true });
        } catch (error) {
            toast(error.message, { error: true });
        }
    }),
);

ui.review.addEventListener("click", () =>
    withBusy(ui.review, "Starting…", async () => {
        try {
            const result = await api("POST", "/api/review", {});
            toast(result.message);
        } catch (error) {
            toast(error.message, { error: true });
        }
    }),
);

ui.search.addEventListener("input", () => {
    filter = ui.search.value.trim().toLowerCase();
    renderBoard();
});

ui.drawerClose.addEventListener("click", closeDrawer);
ui.drawerMove.addEventListener("change", () => moveItem(selected, ui.drawerMove.value));
function hideRereview() {
    ui.rereviewPanel.hidden = true;
    ui.rereviewGuidance.value = "";
    ui.drawerRereview.setAttribute("aria-expanded", "false");
}

ui.drawerRereview.setAttribute("aria-controls", "rereview-panel");
ui.drawerRereview.addEventListener("click", () => {
    if (!ui.rereviewPanel.hidden) {
        hideRereview();
        return;
    }
    ui.rereviewPanel.hidden = false;
    ui.drawerRereview.setAttribute("aria-expanded", "true");
    ui.rereviewGuidance.focus();
});
ui.rereviewCancel.addEventListener("click", () => {
    hideRereview();
    ui.drawerRereview.focus();
});
ui.rereviewGuidance.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        ui.rereviewPanel.requestSubmit();
    } else if (event.key === "Escape") {
        event.stopPropagation();
        hideRereview();
        ui.drawerRereview.focus();
    }
});
ui.rereviewPanel.addEventListener("submit", async (event) => {
    event.preventDefault();
    const number = selected;
    if (number == null) return;
    ui.rereviewStart.disabled = true;
    try {
        const result = await api("POST", "/api/rereview", { number, guidance: ui.rereviewGuidance.value });
        toast(result.message);
        hideRereview();
    } catch (error) {
        toast(error.message, { error: true });
    } finally {
        ui.rereviewStart.disabled = false;
    }
});

for (const tab of ui.tabs) {
    tab.addEventListener("click", () => {
        activeTab = tab.dataset.tab;
        renderDrawer();
        if (activeTab !== "review" && selected != null) loadDetail(selected);
    });
}

ui.comment.addEventListener("input", () => {
    if (pendingConfirm.kind) resetConfirm();
    else updatePreview();
});
ui.approve.addEventListener("click", () => decide("approve"));
ui.reject.addEventListener("click", () => decide("reject"));

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selected != null) {
        if (pendingConfirm.kind) resetConfirm();
        else closeDrawer();
    }
});

// ---------- live updates ----------

function connect() {
    const events = new EventSource(`/events?token=${encodeURIComponent(token)}`);
    events.addEventListener("board", (event) => {
        board = JSON.parse(event.data);
        renderBoard();
        if (selected != null) renderDrawer();
    });
    events.addEventListener("error", () => {
        ui.meta.textContent = "Reconnecting…";
    });
}

connect();
setInterval(() => board && renderBoard(), 60000);
