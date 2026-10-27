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
    reviewStatus: document.getElementById("review-status"),
    drawer: document.getElementById("drawer"),
    drawerKicker: document.getElementById("drawer-kicker"),
    drawerTitle: document.getElementById("drawer-title"),
    drawerMeta: document.getElementById("drawer-meta"),
    drawerClose: document.getElementById("drawer-close"),
    drawerMove: document.getElementById("drawer-move"),
    drawerRereview: document.getElementById("drawer-rereview"),
    drawerBlocked: document.getElementById("drawer-blocked"),
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
    commentPost: document.getElementById("decision-comment-post"),
    requestFixes: document.getElementById("decision-request-fixes"),
    approve: document.getElementById("decision-approve"),
    reject: document.getElementById("decision-reject"),
    toasts: document.getElementById("toasts"),
};

let board = null;
let filter = "";
let selected = null;
let activeTab = "review";
const details = new Map();
let detailGeneration = 0;
const detailRequests = new Map();
const pendingConfirm = { kind: null, timer: null };
const stagedComments = new Map();
let bulkBusy = false;
let decisionBusy = false;

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
    if (!item.reviewEligible && !item.decision) {
        pills.push(h("span", { class: "pill pill-blocked", title: item.reviewBlockedReason }, "Blocked by intake"));
    }
    for (const label of item.labels ?? []) {
        const match = label.match(/^needs-review:(HIGH|MEDIUM|LOW)$/i);
        if (match) {
            const level = match[1].toUpperCase();
            pills.push(h("span", { class: `pill pill-${level.toLowerCase()}`, title: "AGT contributor risk" }, `AGT ${level}`));
        } else if (label === "external-plugin-canvas") {
            pills.push(h("span", { class: "pill" }, "canvas"));
        } else if (label === "first party") {
            pills.push(h("span", { class: "pill pill-first-party", title: "Repository owned by a Microsoft/GitHub organization" }, "First party"));
        } else if (label === "third party") {
            pills.push(h("span", { class: "pill pill-third-party", title: "Repository owned by a third-party organization" }, "Third party"));
        }
    }
    if (item.review?.fastTracked && !item.decision) {
        pills.push(h("span", { class: "pill pill-approve", title: "First-party submission fast-tracked to approval" }, "Fast-tracked"));
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
        ? board.items.filter(
              (item) =>
                  item.reviewEligible &&
                  !item.decision &&
                  !item.pendingDecision &&
                  item.reviewStatus !== "reviewed" &&
                  item.reviewStatus !== "queued",
          ).length
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
    const blocked = board.items.filter((item) => !item.decision && !item.reviewEligible).length;
    ui.reviewStatus.textContent = `${pending ? `${pending} submission(s) ready to queue for AI review.` : "No submissions can be queued for AI review."}${
        blocked ? ` ${blocked} blocked by intake; check the issue feedback and refresh after intake completes.` : ""
    }`;
    ui.review.title = ui.reviewStatus.textContent;

    const scrollPositions = new Map(
        [...ui.board.querySelectorAll(".column")].map((col) => [col.dataset.column, col.querySelector(".column-cards").scrollTop]),
    );

    const columns = board.columns.map((column) => {
        const items = board.items
            .filter((item) => item.column === column.id && matchesFilter(item))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.number - b.number);
        const cards = h(
            "div",
            { class: "column-cards" },
            items.length ? items.map(renderCard) : h("p", { class: "empty" }, filter ? "No matches" : "Empty"),
        );
        const col = h(
            "section",
            { class: "column", dataset: { column: column.id }, "aria-label": column.title },
            h("div", { class: "column-header" }, h("span", { class: "column-name" }, column.title), h("span", { class: "count" }, items.length)),
            column.droppable ? renderColumnActions(column) : null,
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

function columnItems(columnId, kind) {
    return board.items.filter((item) => item.column === columnId && !item.decision &&
        !item.pendingDecision && item.reviewStatus !== "queued" &&
        (kind === "reject" || item.reviewEligible));
}

function stagedComment(item) {
    return (stagedComments.get(item.number) ?? defaultComment(item))
        .trim().replace(/^\/(approve|reject)\b\s*/i, "").trim();
}

function renderColumnActions(column) {
    return h("div", { class: "column-actions", role: "group", "aria-label": `${column.title} bulk actions` },
        ["approve", "reject", "rereview"].map((kind) => {
            const count = columnItems(column.id, kind).length;
            return h("button", {
                type: "button", class: "btn btn-small", disabled: bulkBusy || !count,
                title: count
                    ? `Apply to all ${count} eligible items in this column, including hidden search results`
                    : kind === "reject"
                        ? "No items available to reject in this column"
                        : "No eligible items in this column; AI review and approval require completed intake",
                onclick: () => bulkAction(column.id, kind),
            }, `${kind === "rereview" ? "Re-review" : kind === "approve" ? "Approve" : "Reject"} all`);
        }));
}

async function bulkAction(columnId, kind) {
    if (bulkBusy) return;
    const items = columnItems(columnId, kind).map((item) => ({
        number: item.number, comment: stagedComment(item),
    }));
    if (!items.length) return;
    if (kind === "reject") {
        const missing = items.filter((item) => !item.comment.trim().replace(/^\/(approve|reject)\b\s*/i, "").trim());
        if (missing.length) {
            toast(`Stage a rejection reason for ${missing.map((item) => `#${item.number}`).join(", ")} before rejecting this column.`, { error: true });
            return;
        }
    }
    const preview = items.map((item) => `#${item.number}${kind === "rereview" ? "" : `: ${
        kind === "approve" ? "/approve" : "/reject"} ${item.comment}`}`).join("\n\n");
    const label = kind === "rereview" ? "Re-review" : kind === "approve" ? "Approve" : "Reject";
    if (!confirm(`${label} all ${items.length} items in this column (including hidden search results)?\n${
        kind === "rereview" ? "Queues AI reviews; GitHub is not changed." : "Posts each item's staged comment to GitHub."}\n\n${preview}`)) return;
    bulkBusy = true;
    renderBoard();
    renderDrawer();
    let completed = 0;
    const failures = [];
    try {
        if (kind === "rereview") {
            const result = await api("POST", "/api/review", { numbers: items.map((item) => item.number) });
            toast(result.message);
            return;
        }
        for (const item of items) {
            try {
                if (!columnItems(columnId, kind).some((current) => current.number === item.number)) {
                    throw new Error("Item moved, was queued, or was already actioned; review it again.");
                }
                await api("POST", "/api/decision", { ...item, kind });
                completed++;
                if (selected === item.number) closeDrawer();
            } catch (error) {
                failures.push(`#${item.number}: ${error.message}`);
            }
        }
        toast(`${label}: ${completed}/${items.length} commands posted.${failures.length ? ` Failed: ${failures.join(" ")}` : ""}`,
            { error: failures.length > 0 });
    } catch (error) {
        toast(error.message, { error: true });
    } finally {
        bulkBusy = false;
        renderBoard();
        renderDrawer();
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
        !item.reviewEligible && !item.decision
            ? h("p", { class: "card-blocked" }, item.reviewBlockedReason)
            : null,
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
        if (selected === number) closeDrawer();
        if (hadReview) toast(findItem(number)?.reviewEligible
            ? `Cleared the AI review for #${number}; it will be included in the next review.`
            : `Cleared the AI review for #${number}; intake must complete before it can be reviewed again.`);
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
    ui.comment.value = stagedComment(item);
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
    ui.drawerRereview.disabled = !item.reviewEligible || Boolean(item.decision) ||
        Boolean(item.pendingDecision) || item.reviewStatus === "queued";
    ui.drawerBlocked.hidden = item.reviewEligible || Boolean(item.decision);
    ui.drawerBlocked.textContent = ui.drawerBlocked.hidden ? "" : `Blocked by intake: ${item.reviewBlockedReason}`;
    ui.drawerRereview.title = !item.reviewEligible ? item.reviewBlockedReason : "";
    ui.approve.title = !item.reviewEligible ? item.reviewBlockedReason : "";
    if (ui.drawerRereview.disabled) hideRereview();

    for (const tab of ui.tabs) {
        tab.setAttribute("aria-selected", String(tab.dataset.tab === activeTab));
        if (tab.dataset.tab === "comments") {
            const count = details.get(item.number)?.comments?.length;
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
                    : !item.reviewEligible
                        ? "No AI review yet. Review is blocked until intake completes."
                        : "No AI review yet. Use “Perform review” or “Re-review” to have the agent assess it.",
            ),
        );
        return wrapper;
    }
    const rows = [
        ["Recommendation", RECOMMENDATION_LABELS[review.recommendation] + (review.fastTracked ? " (first-party fast-track, no AI review)" : "") + (item.manualColumn ? ` (you moved it to ${RECOMMENDATION_LABELS[item.manualColumn]})` : "")],
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
    const generation = detailGeneration;
    const request = {};
    detailRequests.set(number, request);
    details.delete(number);
    if (selected === number) renderDrawer();
    try {
        const data = await api(force ? "POST" : "GET", `/api/issue/${number}`);
        if (generation !== detailGeneration || detailRequests.get(number) !== request) return;
        details.set(number, data);
    } catch (error) {
        if (generation !== detailGeneration || detailRequests.get(number) !== request) return;
        details.set(number, { error: error.message });
    } finally {
        if (detailRequests.get(number) === request) detailRequests.delete(number);
    }
    if (selected === number) renderDrawer();
}

// ---------- decisions ----------

function commentBody(kind) {
    if (kind === "comment") return ui.comment.value.trim();
    const text = reasonText(kind);
    if (kind === "approve") return text ? `/approve\n\n${text}` : "/approve";
    if (kind === "request-fixes") return text ? `/request-fixes ${text}` : "/request-fixes <fixes required>";
    return text ? `/reject ${text}` : "/reject <reason required>";
}

function reasonText(kind) {
    return ui.comment.value.trim()
        .replace(new RegExp(`^/${kind}(?![\\w-])\\s*`, "i"), "")
        .trim();
}

// Free-form comments are posted as written, so they must not look like a slash command to the
// external plugin command router.
function freeformCommentError(text) {
    if (!text) return "Write a comment before posting.";
    if (text.startsWith("/")) {
        return "Comments starting with “/” could trigger issue automation. Use Request fixes, Reject, or Approve instead, or reword the comment.";
    }
    return null;
}

function updatePreview() {
    const kind = pendingConfirm.kind;
    ui.preview.textContent = kind
        ? `Will post:\n${commentBody(kind)}`
        : [
            `Request fixes posts: ${commentBody("request-fixes")}`,
            `Reject posts: ${commentBody("reject")}`,
            `Approve posts: ${commentBody("approve")}`,
        ].map((line) => line.replace(/\n+/g, " ⏎ ")).join("\n");
    const item = findItem(selected);
    const busy = bulkBusy || decisionBusy;
    const pendingDecision = Boolean(item?.pendingDecision);
    const pendingFixesRequest = Boolean(item?.pendingFixesRequest);
    const hasReason = Boolean(reasonText("reject"));
    ui.reject.disabled = busy || pendingDecision || pendingFixesRequest || !hasReason;
    ui.reject.title = hasReason ? "" : "Reject requires a reason.";
    const hasFixes = Boolean(reasonText("request-fixes"));
    const awaitingFixes = item?.labels?.includes("requires-submitter-fixes");
    ui.requestFixes.disabled = busy || pendingDecision || pendingFixesRequest || awaitingFixes || !hasFixes;
    ui.requestFixes.title = awaitingFixes
        ? "Already waiting on submitter fixes."
        : pendingFixesRequest
            ? "A fixes request is awaiting workflow confirmation."
            : hasFixes ? "" : "Request fixes requires a description of what to change.";
    ui.approve.disabled = busy || pendingDecision || pendingFixesRequest || !item?.reviewEligible;
    const commentProblem = freeformCommentError(ui.comment.value.trim());
    ui.commentPost.disabled = busy || Boolean(commentProblem);
    ui.commentPost.title = commentProblem ?? "";
}

function resetConfirm() {
    clearTimeout(pendingConfirm.timer);
    pendingConfirm.kind = null;
    for (const [button, label] of [
        [ui.commentPost, "Comment"],
        [ui.requestFixes, "Request fixes"],
        [ui.reject, "Reject"],
        [ui.approve, "Approve"],
    ]) {
        button.textContent = label;
        button.classList.remove("confirming");
        button.disabled = false;
    }
    updatePreview();
    const item = findItem(selected);
    if (bulkBusy || item?.pendingDecision) {
        ui.approve.disabled = true;
        ui.reject.disabled = true;
        ui.requestFixes.disabled = true;
    }
    if (bulkBusy) ui.commentPost.disabled = true;
    if (!item?.reviewEligible) ui.approve.disabled = true;
    if (item?.labels?.includes("requires-submitter-fixes")) ui.requestFixes.disabled = true;
}

async function decide(kind) {
    const item = findItem(selected);
    if (!item || bulkBusy || decisionBusy || (kind !== "comment" && item.pendingDecision)) return;
    const problem = kind === "comment"
        ? freeformCommentError(ui.comment.value.trim())
        : kind === "reject" && !reasonText("reject")
            ? "Reject decisions require a reason."
            : kind === "request-fixes" && !reasonText("request-fixes")
                ? "Request fixes needs a description of what the submitter must change."
                : null;
    if (problem) {
        toast(problem, { error: true });
        updatePreview();
        return;
    }
    const buttons = { comment: ui.commentPost, "request-fixes": ui.requestFixes, reject: ui.reject, approve: ui.approve };
    if (pendingConfirm.kind !== kind) {
        resetConfirm();
        pendingConfirm.kind = kind;
        buttons[kind].textContent = {
            comment: "Confirm comment",
            "request-fixes": "Confirm request fixes",
            reject: "Confirm reject",
            approve: "Confirm approve",
        }[kind];
        buttons[kind].classList.add("confirming");
        updatePreview();
        pendingConfirm.timer = setTimeout(resetConfirm, 6000);
        return;
    }
    clearTimeout(pendingConfirm.timer);
    decisionBusy = true;
    updatePreview();
    const number = item.number;
    const submittedDraft = ui.comment.value;
    try {
        if (kind === "comment") {
            const result = await api("POST", "/api/comment", { number, body: submittedDraft.trim() });
            toast(`Posted comment on #${number}`, { link: result.commentUrl });
            clearSubmittedDraft(number, submittedDraft, "");
            if (selected === number) {
                activeTab = "comments";
                renderDrawer();
            }
            await loadDetail(number, { force: true });
        } else if (kind === "request-fixes") {
            const result = await api("POST", "/api/request-fixes", { number, comment: submittedDraft });
            toast(
                result.pending
                    ? `Posted /request-fixes on #${number}; waiting for the workflow to update labels.`
                    : `Requested fixes on #${number}`,
                { link: result.commentUrl },
            );
            clearSubmittedDraft(number, submittedDraft);
            if (selected === number) closeDrawer();
        } else {
            const result = await api("POST", "/api/decision", { number, kind, comment: ui.comment.value });
            toast(
                result.pending
                    ? `Posted ${result.body.split("\n")[0]} on #${number}; waiting for workflow confirmation.`
                    : `Posted ${result.body.split("\n")[0]} on #${number}`,
                { link: result.commentUrl },
            );
            if (selected === number) closeDrawer();
        }
    } catch (error) {
        toast(error.message, { error: true });
    } finally {
        decisionBusy = false;
        if (selected === number) resetConfirm();
        else updatePreview();
    }
}

function clearSubmittedDraft(number, submittedDraft, replacement) {
    const item = board.items.find((candidate) => candidate.number === number);
    const currentDraft = selected === number
        ? ui.comment.value
        : stagedComments.has(number)
            ? stagedComments.get(number)
            : defaultComment(item);
    if (currentDraft !== submittedDraft) return false;

    if (replacement === undefined) stagedComments.delete(number);
    else stagedComments.set(number, replacement);
    if (selected === number && ui.comment.value === submittedDraft) {
        ui.comment.value = replacement ?? defaultComment(item);
    }
    return true;
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
            ++detailGeneration;
            details.clear();
            const parts = [`${result.total} open`];
            if (result.added.length) parts.push(`${result.added.length} new`);
            if (result.removed.length) parts.push(`${result.removed.length} removed`);
            if (result.fastTracked?.length) parts.push(`${result.fastTracked.length} first-party fast-tracked`);
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
document.addEventListener("pointerdown", (event) => {
    if (selected !== null && !ui.drawer.contains(event.target)) closeDrawer();
}, true);
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
        if (selected === number) closeDrawer();
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
    if (selected != null) stagedComments.set(selected, ui.comment.value);
    if (pendingConfirm.kind) resetConfirm();
    else updatePreview();
});
ui.approve.addEventListener("click", () => decide("approve"));
ui.reject.addEventListener("click", () => decide("reject"));
ui.requestFixes.addEventListener("click", () => decide("request-fixes"));
ui.commentPost.addEventListener("click", () => decide("comment"));

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
        const snapshot = JSON.parse(event.data);
        const refreshed = board?.lastRefreshedAt !== snapshot.lastRefreshedAt;
        board = snapshot;
        if (refreshed) {
            ++detailGeneration;
            details.clear();
        }
        renderBoard();
        if (selected != null) renderDrawer();
        if (refreshed && selected != null && activeTab !== "review") loadDetail(selected, { force: true });
    });
    events.addEventListener("refresh-error", (event) => toast(JSON.parse(event.data).error, { error: true }));
    events.addEventListener("error", () => {
        ui.meta.textContent = "Reconnecting…";
    });
}

connect();
setInterval(() => board && renderBoard(), 60000);
