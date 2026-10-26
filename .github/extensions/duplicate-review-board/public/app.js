const $ = (id) => document.getElementById(id);
const token = document.querySelector('meta[name="board-token"]').content;
let board = { items: [], reports: [], columns: [], selected: null, snapshotSequence: 0 };
let discovered = [];
let opened;
let preview;
let dirty = false;
let publishing = false;
let viewing;
let dialogOpener;
const contents = new Map();

function loadResource(item, file) {
    const key = `${board.selected}:${item.id}:${file}`;
    if (!contents.has(key)) {
        const request = api("resource", { number: board.selected, id: item.id, path: file });
        request.then(() => contents.delete(key), () => contents.delete(key));
        contents.set(key, request);
    }
    return contents.get(key);
}

function renderViewer(item) {
    if (!editorItem()) return;
    const split = $("side-by-side").checked;
    $("viewer-tabs").hidden = split;
    $("viewer-panes").classList.toggle("split", split);
    $("viewer-tabs").replaceChildren(...item.resources.map((resource, index) => {
        const tab = element("button", resource.path.split("/").at(-1) === "SKILL.md" ? resource.path.split("/").at(-2) : resource.path.split("/").at(-1));
        tab.type = "button";
        tab.id = `viewer-tab-${index}`;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(resource.path === viewing));
        tab.setAttribute("aria-controls", `viewer-panel-${index}`);
        tab.tabIndex = resource.path === viewing ? 0 : -1;
        tab.title = resource.path;
        const activate = () => {
            if (!editorItem()) return;
            viewing = resource.path;
            renderViewer(item);
            [...$("viewer-tabs").children].find((node) => node.getAttribute("aria-selected") === "true")?.focus({ preventScroll: true });
        };
        tab.addEventListener("click", activate);
        tab.addEventListener("keydown", (event) => {
            const tabs = [...$("viewer-tabs").children];
            const current = tabs.indexOf(tab);
            const next = {
                ArrowRight: (current + 1) % tabs.length,
                ArrowLeft: (current - 1 + tabs.length) % tabs.length,
                Home: 0,
                End: tabs.length - 1,
            }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            tabs[next]?.click();
        });
        return tab;
    }));
    $("viewer-panes").replaceChildren(...item.resources.map((resource, index) => {
        const pane = element("article", undefined, "pane");
        pane.id = `viewer-panel-${index}`;
        pane.hidden = !split && resource.path !== viewing;
        const heading = element("h4", resource.path);
        heading.id = `viewer-heading-${index}`;
        pane.setAttribute("role", split ? "region" : "tabpanel");
        pane.setAttribute("aria-labelledby", split ? heading.id : `viewer-tab-${index}`);
        if (!split) pane.tabIndex = 0;
        const body = element("pre", pane.hidden ? "Select this resource to load its contents." : "Loading...");
        pane.append(heading, body);
        if (!pane.hidden) {
            loadResource(item, resource.path).then((result) => {
                body.textContent = result.content + (result.truncated ? "\n\n[Truncated. Open on GitHub for the full file.]" : "");
            }).catch((error) => {
                body.textContent = `Could not load: ${error.message}`;
                body.classList.add("error");
            });
        }
        return pane;
    }));
}

async function api(name, body) {
    const response = await fetch(`/api/${name}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "x-board-token": token, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    return result;
}

function message(text, error = false, target = "message") {
    $(target).textContent = text;
    $(target).classList.toggle("error", error);
}

async function run(button, work, target = "message") {
    button.disabled = true;
    try { await work(); }
    catch (error) { message(error.message, true, target); }
    finally {
        button.disabled = false;
        if (opened && $("detail").open) {
            refreshReview(editorItem());
            renderConflict();
        }
    }
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function safeLink(link, url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") throw new Error("Invalid GitHub link");
        link.href = parsed.href;
    } catch { link.removeAttribute("href"); }
}

function columns(select, value) {
    select.replaceChildren(...board.columns.map((column) => {
        const option = element("option", column.label);
        option.value = column.id;
        return option;
    }));
    select.value = value;
}

function activeFocus() {
    const active = document.activeElement;
    if (!active) return null;
    if (active.id) return { id: active.id, element: active };
    if (active.dataset?.focusRole) return { role: active.dataset.focusRole, itemId: active.dataset.itemId, element: active };
    return null;
}

function focusBoardControl(focus) {
    let target = focus?.id ? $(focus.id) : null;
    if (!target && focus?.role) {
        target = [...document.querySelectorAll("[data-focus-role]")].find((node) =>
            node.dataset.focusRole === focus.role && node.dataset.itemId === focus.itemId);
    }
    if (!target || !target.isConnected || target.hidden || target.disabled) {
        target = [...document.querySelectorAll('[data-focus-role="title"]')].find((node) =>
            node.isConnected && !node.hidden && !node.disabled) || $("search");
    }
    target?.focus({ preventScroll: true });
}

function restoreDialogFocus() {
    focusBoardControl(dialogOpener);
    dialogOpener = null;
}

function render() {
    const focus = activeFocus();
    const chosen = $("reports").value;
    const selected = board.reports.some((report) => String(report.number) === chosen)
        ? String(board.selected ?? "") : chosen || String(board.selected ?? "");
    const reports = new Map([...discovered, ...board.reports].map((report) => [report.number, report]));
    $("reports").replaceChildren(...[...reports.values()].sort((a, b) => b.number - a.number).map((report) => {
        const option = element("option", `#${report.number} ${report.title} (${report.state})`);
        option.value = report.number;
        return option;
    }));
    if (reports.has(Number(selected))) $("reports").value = selected;
    const query = $("search").value.toLowerCase();
    const visible = board.items.filter((item) =>
        (!$("hide-published").checked || item.publication?.status !== "published") &&
        `${item.title} ${item.resources.map((resource) => resource.path).join(" ")}`.toLowerCase().includes(query));
    $("board").replaceChildren(...board.columns.map((column) => {
        const container = element("section", undefined, "column");
        const items = visible.filter((item) => item.column === column.id);
        const total = board.items.filter((item) => item.column === column.id).length;
        container.append(element("h2", `${column.label} (${items.length}/${total})`));
        container.addEventListener("dragover", (event) => event.preventDefault());
        container.addEventListener("drop", (event) => {
            event.preventDefault();
            const item = board.items.find((entry) => entry.id === event.dataTransfer.getData("text/plain"));
            if (item && !item.publication) run($("import"), () => move(item, column.id));
        });
        for (const item of items) {
            const card = element("article", undefined, "card");
            card.draggable = !item.publication;
            card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", item.id));
            const title = element("button", `Group ${item.number}: ${item.title}`);
            title.dataset.focusRole = "title";
            title.dataset.itemId = item.id;
            title.addEventListener("click", () => show(item.id));
            card.append(title, element("p", item.resources.map((resource) => resource.path).join("\n"), "prewrap"));
            for (const badge of [
                item.accepted && "Accepted on source", item.changed && "Source changed",
                item.removed && "Removed from report — recovery only",
                item.queueId && "Background review queued", item.review && `AI: ${item.review.recommendation}`,
                item.reviewError && "Review failed / cancelled",
                item.publication && `Publication: ${item.publication.status}`,
            ].filter(Boolean)) card.append(element("span", badge, "badge"));
            const select = element("select");
            select.dataset.focusRole = "local-decision";
            select.dataset.itemId = item.id;
            select.setAttribute("aria-label", `Local decision for group ${item.number}`);
            columns(select, item.column);
            select.disabled = Boolean(item.publication);
            select.addEventListener("change", () => run(select, () => move(item, select.value)));
            card.append(select);
            container.append(card);
        }
        if (!items.length) container.append(element("small", total ? "No groups match the filters." : "No groups."));
        return container;
    }));
    if (!board.selected) $("board").append(element("p", "Find reports, then import one to begin. No remote actions happen automatically."));
    if (opened && $("detail").open) {
        const item = editorItem();
        if (item) syncEditor(item);
        else refreshReview();
        renderConflict();
    }
    if (focus && !focus.element.isConnected) focusBoardControl(focus);
}

function receive(snapshot) {
    if (!Number.isSafeInteger(snapshot.snapshotSequence) || snapshot.snapshotSequence < 0) return;
    const snapshotSequence = snapshot.snapshotSequence;
    if (snapshotSequence < board.snapshotSequence) return;
    board = snapshot;
    render();
}

async function move(item, column) {
    const current = board.items.find((entry) => entry.id === item.id);
    if (!current) return;
    if (current.column === column) {
        message("Group is already in this column. No changes made.");
        return;
    }
    receive(await api("update", {
        number: board.selected, id: current.id, expectedRevision: current.revision,
        column, note: current.note, draft: current.draft,
    }));
    message("Local decision saved. GitHub is unchanged.");
}

function refreshReview(item) {
    const suspended = !item;
    $("editor-suspended").hidden = !suspended;
    for (const id of ["review", "cancel-review", "column", "note", "draft-title", "draft-body", "preview", "reconcile", "save", "side-by-side"]) {
        $(id).disabled = suspended;
    }
    if (suspended) return;
    $("review-result").textContent = item.queueId ? "Queued for a background agent. You can keep triaging." :
        item.reviewError || (item.review ? `${item.review.recommendation}\n\n${item.review.rationale}` : "No comparison yet.");
    $("review").disabled = Boolean(item.queueId || item.publication);
    $("cancel-review").disabled = !item.queueId;
    $("receipt").replaceChildren();
    if (item.publication) {
        $("receipt").append(element("p", `GitHub publication: ${item.publication.status} (${item.publication.kind})`));
        if (item.publication.url) {
            const link = element("a", "Open published result");
            link.target = "_blank"; link.rel = "noopener noreferrer";
            safeLink(link, item.publication.url);
            $("receipt").append(link);
        }
    }
    for (const id of ["column", "note", "draft-title", "draft-body", "preview"]) {
        $(id).disabled = Boolean(item.publication);
    }
    $("save").disabled = Boolean(item.publication || opened?.conflict);
}

function editorValues() {
    return {
        column: $("column").value,
        note: $("note").value,
        draft: { title: $("draft-title").value, body: $("draft-body").value },
    };
}

function sameValues(left, right) {
    return left.column === right.column && left.note === right.note &&
        left.draft.title === right.draft.title && left.draft.body === right.draft.body;
}

function itemValues(item) {
    return { column: item.column, note: item.note, draft: item.draft };
}

function editorItem() {
    return opened && board.selected === opened.number
        ? board.items.find((entry) => entry.id === opened.id) : null;
}

function requireEditorItem() {
    const item = editorItem();
    if (!item) throw new Error("This editor is paused. Select its source report again to continue; your edits are preserved.");
    return item;
}

function loadEditor(item) {
    $("column").value = item.column;
    $("note").value = item.note;
    $("draft-title").value = item.draft.title;
    $("draft-body").value = item.draft.body;
    $("draft").hidden = item.column !== "consolidate";
}

function renderConflict() {
    $("edit-conflict").hidden = !opened?.conflict;
    const item = editorItem();
    $("save").disabled = Boolean(!item || opened?.conflict || item.publication);
    $("reload-latest").disabled = !item;
    $("keep-mine").disabled = !item;
}

function renderEvidence(item) {
    $("detail-title").textContent = `Group ${item.number}: ${item.title}`;
    $("flags").textContent = [
        item.accepted && "Already accepted in the source report.",
        item.changed && "Source evidence changed since an earlier import. Review this group again; private notes were preserved.",
        item.removed && "This group was removed from the source report. Only publication recovery is available.",
    ].filter(Boolean).join(" ");
    $("reason").textContent = item.reason;
    $("resources").replaceChildren(...item.resources.map((resource) => {
        const li = element("li");
        const view = element("button", resource.path);
        view.type = "button";
        view.addEventListener("click", () => {
            if (!editorItem()) return;
            viewing = resource.path;
            renderViewer(item);
        });
        const link = element("a", "GitHub");
        const file = resource.path.startsWith("skills/") && !resource.path.endsWith("/SKILL.md") ? `${resource.path}/SKILL.md` : resource.path;
        safeLink(link, `https://github.com/${board.repo}/blob/main/${file.split("/").map(encodeURIComponent).join("/")}`);
        link.target = "_blank"; link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Open ${resource.path} on GitHub`);
        li.append(view, document.createTextNode(` - ${resource.description} (`), link, document.createTextNode(")"));
        return li;
    }));
    if (!item.resources.some((resource) => resource.path === viewing)) viewing = item.resources[0]?.path;
    renderViewer(item);
}

function syncEditor(item) {
    refreshReview(item);
    if (item.revision === opened.revision) return;
    renderEvidence(item);
    const currentSave = savingEdit && savingEdit.number === opened.number && savingEdit.id === opened.id &&
        savingEdit.revision === opened.revision &&
        (savingEdit.responseRevision === item.revision || sameValues(itemValues(item), savingEdit.values));
    if (currentSave) {
        opened.revision = item.revision;
        opened.conflict = false;
        dirty = !sameValues(editorValues(), savingEdit.values);
        renderConflict();
        return;
    }
    if (dirty) {
        opened.conflict = true;
        renderConflict();
        return;
    }
    opened.revision = item.revision;
    opened.conflict = false;
    loadEditor(item);
    renderConflict();
}

function show(id) {
    const item = board.items.find((entry) => entry.id === id);
    dialogOpener = { role: "title", itemId: id };
    opened = { number: board.selected, id, revision: item.revision, conflict: false };
    dirty = false;
    safeLink($("source"), board.reports.find((report) => report.number === opened.number)?.url);
    viewing = item.resources[0]?.path;
    renderEvidence(item);
    columns($("column"), item.column);
    loadEditor(item);
    $("guidance").value = "";
    $("draft").hidden = item.column !== "consolidate";
    message("", false, "detail-message");
    refreshReview(item);
    renderConflict();
    $("detail").showModal();
}

let savingEdit;

async function save() {
    requireEditorItem();
    const edit = { number: opened.number, id: opened.id, revision: opened.revision };
    const values = editorValues();
    savingEdit = { ...edit, values };
    try {
        const snapshot = await api("update", { ...edit, expectedRevision: edit.revision, ...values });
        const updated = snapshot.selected === edit.number && snapshot.items.find((item) => item.id === edit.id);
        if (updated) savingEdit.responseRevision = updated.revision;
        receive(snapshot);
        if (board.selected === edit.number && opened?.number === edit.number && opened.id === edit.id) {
            message(dirty ? "Saved submitted changes. Newer typing is still unsaved." :
                "Saved locally. GitHub is unchanged.", false, "detail-message");
        }
    } catch (error) {
        const latest = await api("board").catch(() => null);
        if (latest) receive(latest);
        if (opened?.number === edit.number && opened.id === edit.id) {
            const current = editorItem();
            if (current && current.revision !== edit.revision) {
                opened.conflict = true;
                renderConflict();
                message("This group changed while saving. Resolve the conflict before saving again.", true, "detail-message");
            }
        }
        throw error;
    } finally {
        if (savingEdit?.number === edit.number && savingEdit.id === edit.id &&
            savingEdit.revision === edit.revision) savingEdit = null;
    }
}

$("discover").addEventListener("click", () => run($("discover"), async () => {
    discovered = await api("reports", {});
    render();
    message(`Found ${discovered.length} reports (up to 100 most recent). Select one and import it.`);
}));
$("import").addEventListener("click", () => run($("import"), async () => {
    const number = Number($("reports").value);
    if (!number) throw new Error("Find and select a report first.");
    receive(await api("import", { number }));
    message(`Imported report #${number}. Unchanged local decisions were preserved.`);
}));
$("reports").addEventListener("change", () => {
    const number = Number($("reports").value);
    if (board.reports.some((report) => report.number === number)) {
        run($("import"), async () => receive(await api("select", { number })));
    }
});
$("search").addEventListener("input", render);
$("hide-published").addEventListener("change", render);
$("side-by-side").addEventListener("change", () => {
    const item = editorItem();
    if (item) renderViewer(item);
});
$("column").addEventListener("change", () => { $("draft").hidden = $("column").value !== "consolidate"; });
$("editor").addEventListener("input", (event) => {
    if (["column", "note", "draft-title", "draft-body"].includes(event.target.id)) dirty = true;
});
$("editor").addEventListener("change", (event) => { if (event.target.id === "column") dirty = true; });
$("editor").addEventListener("submit", (event) => {
    event.preventDefault();
    run($("save"), save, "detail-message");
});
function closeDetail(event) {
    if (dirty && !window.confirm("Discard unsaved local edits?")) { event?.preventDefault(); return; }
    if (event?.type !== "cancel") $("detail").close();
}
$("close").addEventListener("click", closeDetail);
$("detail").addEventListener("cancel", closeDetail);
$("detail").addEventListener("close", () => {
    opened = null;
    dirty = false;
    restoreDialogFocus();
});
$("reload-latest").addEventListener("click", () => {
    const item = editorItem();
    if (!item) return;
    renderEvidence(item);
    loadEditor(item);
    opened.revision = item.revision;
    opened.conflict = false;
    dirty = false;
    renderConflict();
});
$("keep-mine").addEventListener("click", () => {
    const item = editorItem();
    if (!item) return;
    opened.revision = item.revision;
    opened.conflict = false;
    dirty = true;
    renderConflict();
    $("note").focus({ preventScroll: true });
});
$("resume-report").addEventListener("click", () => run($("resume-report"), async () => {
    if (!opened) return;
    const number = opened.number;
    receive(await api("select", { number }));
    if (opened?.number === number) {
        if (board.selected !== number) throw new Error("The source report could not be selected. Your edits are preserved; try resuming again.");
        message("Source report restored. Your local edits are preserved.", false, "detail-message");
    }
}, "detail-message"));
$("review").addEventListener("click", () => run($("review"), async () => {
    requireEditorItem();
    if (dirty) throw new Error("Save local edits before asking for a comparison.");
    await api("review", { ...opened, guidance: $("guidance").value });
    message("Comparison queued for a background agent.", false, "detail-message");
}, "detail-message"));
$("cancel-review").addEventListener("click", () => run($("cancel-review"), async () => {
    requireEditorItem();
    receive(await api("cancel", opened));
}, "detail-message"));
$("preview").addEventListener("click", () => run($("preview"), async () => {
    requireEditorItem();
    if (dirty) throw new Error("Save local edits before previewing.");
    preview = await api("preview", opened);
    $("target").textContent = `Target: ${preview.target}`;
    $("publish-title").textContent = preview.title;
    $("publish-body").textContent = preview.body;
    message("", false, "publish-message");
    $("confirmation").showModal();
}, "detail-message"));
$("back").addEventListener("click", () => { if (!publishing) $("confirmation").close(); });
$("confirmation").addEventListener("cancel", (event) => { if (publishing) event.preventDefault(); });
$("confirm").addEventListener("click", () => run($("confirm"), async () => {
    publishing = true;
    $("back").disabled = true;
    message("Checking GitHub and publishing the confirmed payload. Do not retry if the response is lost.", false, "publish-message");
    try {
        receive(await api("publish", { token: preview.token }));
        $("confirmation").close();
        message("Published. The receipt is saved locally.", false, "detail-message");
    } finally { publishing = false; $("back").disabled = false; }
}, "publish-message"));
$("reconcile").addEventListener("click", () => run($("reconcile"), async () => {
    requireEditorItem();
    receive(await api("reconcile", opened));
    message("GitHub result verified; local receipt updated.", false, "detail-message");
}, "detail-message"));

const events = new EventSource(`/events?token=${encodeURIComponent(token)}`);
events.addEventListener("board", (event) => receive(JSON.parse(event.data)));
events.addEventListener("error", () => message("Connection interrupted. Local state is saved; reconnecting...", true));
events.addEventListener("open", () => message("Connected. Triage is local until you confirm a GitHub action."));
api("board").then(receive).catch((error) => message(error.message, true));
