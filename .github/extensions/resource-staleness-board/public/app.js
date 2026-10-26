const token = document.querySelector('meta[name="board-token"]').content;
const MAX_REVIEW_BATCH_SIZE = 10;
const CONNECTION_ERROR = "Live updates disconnected. Reconnecting automatically; no work is retried.";
const $ = (id) => document.getElementById(id);
let board = { items: [], counts: {} };
let boardVersion = 0;
let selected = null;
let busy = false;
let confirmation = null;
let displayedSyncError = null;
const reviewSelection = new Set();
const fileChoice = new Map();
const previews = new Map();
let previewGeneration = null;

function defaultFile(item) {
    return item.files.find((file) => /(^|\/)(SKILL|README)\.md$/i.test(file))
        ?? item.files.find((file) => file.endsWith(".md")) ?? item.files[0];
}

function previewKey(item, file, scanGeneration = board.scanGeneration ?? 0) {
    return `${item.id}\0${file}\0${item.fingerprint}\0${scanGeneration}`;
}

async function loadPreview(item, file) {
    const scanGeneration = board.scanGeneration ?? 0;
    const key = previewKey(item, file, scanGeneration);
    if (previews.has(key)) return;
    previews.set(key, { loading: true });
    try {
        const data = await api("read_file", { id: item.id, file });
        if ((board.scanGeneration ?? 0) === scanGeneration) previews.set(key, { data });
    } catch (error) {
        if ((board.scanGeneration ?? 0) === scanGeneration) previews.set(key, { error: error.message });
    }
    if (selected === item.id) renderDetail();
}

function renderContents(detail, item) {
    if (!item.files.length) return;
    let file = fileChoice.get(item.id);
    if (!item.files.includes(file)) file = defaultFile(item);
    const heading = element("div", "", "contents-header");
    heading.append(element("h3", "Contents"));
    if (item.files.length > 1) {
        const picker = document.createElement("select");
        picker.setAttribute("aria-label", "File to view");
        picker.setAttribute("data-focus-key", "file-picker");
        for (const name of item.files) {
            const option = element("option", name);
            option.value = name;
            option.selected = name === file;
            picker.append(option);
        }
        picker.addEventListener("change", () => { fileChoice.set(item.id, picker.value); renderDetail(); });
        heading.append(picker);
    } else {
        heading.append(element("code", file));
    }
    detail.append(heading);
    const state = previews.get(previewKey(item, file));
    if (!state) {
        loadPreview(item, file);
        detail.append(element("p", "Loading..."));
    } else if (state.loading) {
        detail.append(element("p", "Loading..."));
    } else if (state.error) {
        detail.append(element("p", state.error, "warning"));
    } else if (state.data.binary) {
        detail.append(element("p", `Binary file (${state.data.size.toLocaleString()} bytes); no text preview.`));
    } else {
        const pre = element("pre", state.data.content, "file-contents");
        pre.tabIndex = 0;
        pre.setAttribute("data-scroll-key", previewKey(item, file));
        pre.setAttribute("data-focus-key", `file-preview-${encodeURIComponent(file)}`);
        pre.setAttribute("aria-label", `Contents of ${file}`);
        detail.append(pre);
        if (state.data.truncated) detail.append(element("p", `Showing the first ${state.data.content.length.toLocaleString()} characters of ${state.data.size.toLocaleString()} bytes.`, "warning"));
    }
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
}

async function api(action, input) {
    const requestedBoardVersion = action === "get_board" ? boardVersion : null;
    const response = await fetch(`/api/${action}`, {
        method: input === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", "X-Board-Token": token },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    if (action === "get_board") {
        if (requestedBoardVersion !== boardVersion) return board;
        board = result;
        boardVersion++;
        return board;
    }
    return result;
}

async function run(operation, refreshBoard = true) {
    const focusKey = document.activeElement?.getAttribute?.("data-focus-key");
    busy = true;
    $("error").hidden = true;
    render();
    try {
        await operation();
        if (refreshBoard) await api("get_board");
    } catch (error) {
        $("error").textContent = error.message;
        $("error").hidden = false;
    } finally {
        busy = false;
        render(focusKey);
    }
}

function addAction(container, label, handler, disabled = false) {
    const button = element("button", label);
    button.setAttribute("data-focus-key", `action-${encodeURIComponent(label)}`);
    button.disabled = busy || disabled;
    button.addEventListener("click", handler);
    container.append(button);
}

function work(item, kind, confirmed = false) {
    return run(() => api("request_work", {
        id: item.id, kind, confirmed, ...(kind === "publish" ? { diffHash: item.prepared.diffHash } : {}),
    }));
}

function matchingItems() {
    const search = $("search").value.toLowerCase();
    const age = $("age").value;
    const type = $("type").value;
    const recommendation = $("recommendation").value;
    return board.items.filter((item) => {
        const ageMatch = age === "all" || (age === "attention" ? item.ageBand !== "fresh" : item.ageBand === age);
        return ageMatch && (type === "all" || type === item.type) &&
            (recommendation === "all" || recommendation === (item.review?.recommendation ?? "unreviewed")) &&
            `${item.id} ${item.review?.rationale ?? ""} ${item.review?.improvements ?? ""}`.toLowerCase().includes(search);
    });
}

function oldestUnreviewed() {
    return matchingItems().filter((item) => !item.pending && !item.publication && !item.review && Number.isFinite(item.age))
        .sort((a, b) => b.age - a.age || a.id.localeCompare(b.id));
}

function renderBatch(items) {
    const available = new Set(board.items.filter((item) => !item.pending && !item.publication).map((item) => item.id));
    for (const id of reviewSelection) if (!available.has(id)) reviewSelection.delete(id);
    const visible = new Set(items.map((item) => item.id));
    const hidden = [...reviewSelection].filter((id) => !visible.has(id)).length;
    $("batch-selection").textContent = `${reviewSelection.size} selected${hidden ? ` (${hidden} hidden by filters)` : ""}. Selection is retained when filters change. Each batch sends at most ${MAX_REVIEW_BATCH_SIZE}; any remaining selection waits for your next explicit batch.`;
    $("review-selected").textContent = `Review selected (${reviewSelection.size})`;
    $("review-selected").disabled = busy || Boolean(board.progress) || !reviewSelection.size;
    $("clear-selection").disabled = busy || !reviewSelection.size;
    $("select-matching").disabled = busy || Boolean(board.progress) || !items.some((item) => !item.pending && !item.publication && !reviewSelection.has(item.id));
    const count = Number($("oldest-count").value);
    const valid = Number.isSafeInteger(count) && count > 0;
    const eligible = oldestUnreviewed().length;
    $("review-oldest").textContent = valid ? `Review ${Math.min(count, eligible, MAX_REVIEW_BATCH_SIZE)} oldest` : "Review oldest";
    $("review-oldest").disabled = busy || Boolean(board.progress) || !valid || !eligible;
    $("oldest-count").disabled = busy;
    const pending = board.items.filter((item) => item.pending?.kind === "review").length;
    const reviewed = board.items.filter((item) => item.review).length;
    const blocked = board.items.filter((item) => item.error).length;
    $("review-progress").textContent = `${reviewed} with saved reviews | ${pending} background reviews queued or running | ${blocked} items needing attention.`;
}

function reviewItems(ids) {
    return run(async () => {
        if (!ids.length) throw new Error("Select resources or choose a positive oldest count with eligible items.");
        const batch = ids.slice(0, MAX_REVIEW_BATCH_SIZE);
        await api("request_reviews", { ids: batch });
        for (const id of batch) reviewSelection.delete(id);
    });
}

function section(title, text) {
    $("detail").append(element("h3", title), element("p", text, "evidence"));
}

function renderDetail() {
    const detail = $("detail");
    const scrolled = detail.querySelector("[data-scroll-key]");
    const scroll = scrolled ? { key: scrolled.getAttribute("data-scroll-key"), top: scrolled.scrollTop } : null;
    const focusKey = document.activeElement?.getAttribute?.("data-focus-key");
    renderDetailContent(detail);
    const restored = scroll && [...detail.querySelectorAll("[data-scroll-key]")].find((node) => node.getAttribute("data-scroll-key") === scroll.key);
    if (restored) restored.scrollTop = scroll.top;
    if (focusKey && !detail.contains(document.activeElement)) {
        const control = detail.querySelector(`[data-focus-key="${focusKey}"]`);
        if (control && !control.disabled) control.focus();
    }
}

function renderDetailContent(detail) {
    detail.replaceChildren();
    const item = board.items.find((entry) => entry.id === selected);
    if (!item) {
        detail.append(element("p", "Select a resource to review its evidence and next action."));
        return;
    }
    detail.append(element("h2", item.id));
    detail.append(element("p", `${item.ageBand} | ${item.age ?? "?"} days since meaningful change | ${item.files.length} file(s)`));
    if (item.lastChange) detail.append(element("code", `${item.lastChange.date.slice(0, 10)} / ${item.lastChange.sha.slice(0, 12)}`));
    if (item.error) detail.append(element("p", item.error, "warning"));
    if (item.pending) detail.append(element("p", `Waiting for child: ${item.pending.kind}. Queued ${item.pending.at}.`, "badge"));
    if (item.childSessionId) section("Retained child session", item.childSessionId);
    if (item.review) {
        section(`Recommendation: ${item.review.recommendation}`, item.review.rationale);
        if (item.review.stalenessAssessment) section("Staleness assessment", item.review.stalenessAssessment);
        section("Concrete ways to freshen it", item.review.improvements);
        section("Native capability comparison and uncertainty", item.review.capabilityEvidence);
    } else {
        section("Not reviewed", "Old does not mean obsolete. Review the content before deciding whether to refresh or remove it.");
    }
    if (item.prepared) {
        section("Prepared locally in the child session", item.prepared.summary);
        section("Prepared diff fingerprint", `${item.prepared.baseSha}\n${item.prepared.diffHash}`);
    }
    if (item.publication) {
        detail.append(element("p", "Published work is retained for inspection. Further review and preparation are disabled; inspect the linked PR and child session.", "badge"));
        const link = element("a", "View published pull request");
        const url = new URL(item.publication.url);
        if (url.protocol === "https:") {
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("data-focus-key", "published-pr-link");
            detail.append(link);
        }
    }
    const actions = element("div", "", "actions");
    const pending = Boolean(item.pending);
    const blocked = pending || Boolean(item.publication);
    addAction(actions, item.review ? "Re-review in child" : "Review in child", () => work(item, "review"), blocked);
    addAction(actions, "Prepare refresh locally", () => work(item, "prepare-refresh"), blocked || !item.review);
    addAction(actions, "Prepare removal locally", () => work(item, "prepare-removal"), blocked || !item.review);
    addAction(actions, "Publish PR...", () => {
        confirmation = { id: item.id, diffHash: item.prepared.diffHash };
        $("publish-preview").textContent = `${item.id}\nChild: ${item.childSessionId}\n\n${item.prepared.summary}\n\nStaged diff SHA-256:\n${item.prepared.diffHash}`;
        $("confirm").showModal();
    }, pending || !item.prepared || Boolean(item.publication));
    if (pending) {
        addAction(actions, "Cancel local wait", () => run(() => api("cancel_work", { id: item.id, token: item.pending.token })));
        detail.append(element("p", "Cancelling only rejects the result locally; it does not stop the child or undo remote work."));
    }
    detail.append(actions);
    renderContents(detail, item);
    if (item.files.length > 1) section("Files included", item.files.join("\n"));
}

function render(restoreFocusKey) {
    const focusKey = typeof restoreFocusKey === "string" ? restoreFocusKey : document.activeElement?.getAttribute?.("data-focus-key");
    const generation = board.scanGeneration ?? 0;
    if (previewGeneration !== generation) {
        previews.clear();
        previewGeneration = generation;
    }
    $("scan").disabled = busy || Boolean(board.progress);
    $("notice").setAttribute("aria-busy", String(Boolean(board.progress)));
    $("notice").textContent = board.progress
        ? `Scanning local history: ${board.progress.completed}/${board.progress.total ?? "?"} resources...`
        : `${board.updatedAt ? `Last scan ${new Date(board.updatedAt).toLocaleString()}.` : "Scan to build the inventory."} No network reads or writes during scanning or review.${board.warning ? ` ${board.warning}` : ""}`;
    if (displayedSyncError && !board.syncError && $("error").textContent === displayedSyncError) {
        $("error").hidden = true;
    }
    displayedSyncError = board.syncError ?? null;
    if (board.syncError) {
        $("error").textContent = board.syncError;
        $("error").hidden = false;
    }
    $("counts").replaceChildren(...["stale", "aging", "fresh", "unknown"].map((key) =>
        element("span", `${board.counts[key] ?? 0} ${key}`, `count ${key}`)));
    const items = matchingItems();
    renderBatch(items);
    $("matching").textContent = `${items.length} matching resources, oldest first. The first 10 stale items are the workflow's deep-review candidates.`;
    const oldest = new Set(board.items.filter((item) => item.ageBand === "stale").slice(0, 10).map((item) => item.id));
    $("resources").replaceChildren(...items.map((item) => {
        const row = element("div", "", "resource-row");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = reviewSelection.has(item.id);
        checkbox.disabled = busy || Boolean(board.progress) || Boolean(item.pending) || Boolean(item.publication);
        checkbox.setAttribute("aria-label", `Select ${item.id} for AI review`);
        checkbox.setAttribute("data-focus-key", `select-${encodeURIComponent(item.id)}`);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) reviewSelection.add(item.id);
            else reviewSelection.delete(item.id);
            render();
        });
        const button = element("button", "", "resource");
        button.setAttribute("data-focus-key", `resource-${encodeURIComponent(item.id)}`);
        button.setAttribute("aria-current", String(item.id === selected));
        button.append(element("strong", item.id));
        button.append(element("small", `${item.age ?? "?"} days | ${item.ageBand}${oldest.has(item.id) ? " | oldest 10" : ""}`, item.ageBand));
        button.append(element("small", item.pending ? `In child: ${item.pending.kind}` : item.review?.recommendation ?? "Not reviewed"));
        button.addEventListener("click", () => { selected = item.id; render(); });
        row.append(checkbox, button);
        return row;
    }));
    if (!items.length) $("resources").append(element("p", board.updatedAt ? "No resources match these filters." : "No scan yet."));
    renderDetail();
    if (typeof focusKey === "string") {
        const control = document.querySelector(`[data-focus-key="${focusKey}"]`);
        const fallback = document.querySelector(`[data-focus-key="resource-${encodeURIComponent(selected)}"]`);
        if (control && !control.disabled) control.focus();
        else fallback?.focus();
    }
}

$("scan").addEventListener("click", () => run(() => api("scan", {})));
$("select-matching").addEventListener("click", () => {
    for (const item of matchingItems()) if (!item.pending && !item.publication) reviewSelection.add(item.id);
    render();
});
$("clear-selection").addEventListener("click", () => { reviewSelection.clear(); render(); });
$("review-selected").addEventListener("click", () => reviewItems([...reviewSelection]));
$("oldest-count").addEventListener("input", () => renderBatch(matchingItems()));
$("review-oldest").addEventListener("click", () => {
    const count = Number($("oldest-count").value);
    return reviewItems(Number.isSafeInteger(count) && count > 0
        ? oldestUnreviewed().slice(0, Math.min(count, MAX_REVIEW_BATCH_SIZE)).map((item) => item.id) : []);
});
for (const id of ["search", "age", "type", "recommendation"]) $(id).addEventListener("input", render);
$("dismiss").addEventListener("click", () => $("confirm").close());
$("publish-confirm").addEventListener("click", () => {
    const item = board.items.find((entry) => entry.id === confirmation?.id);
    $("confirm").close();
    if (!item || item.prepared?.diffHash !== confirmation.diffHash) {
        $("error").textContent = "Prepared changes changed while confirmation was open. Inspect the latest diff first.";
        $("error").hidden = false;
        return;
    }
    work(item, "publish", true);
});
const events = new EventSource(`/events?token=${encodeURIComponent(token)}`);
events.addEventListener("board", (event) => {
    board = JSON.parse(event.data);
    boardVersion++;
    if ($("error").textContent === CONNECTION_ERROR) $("error").hidden = true;
    render();
});
events.onerror = () => {
    if ($("error").hidden) {
        $("error").textContent = CONNECTION_ERROR;
        $("error").hidden = false;
    }
};
run(() => api("get_board"), false);
