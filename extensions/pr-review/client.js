/* All provider and model text is rendered as text, never HTML. */
const $ = (id) => document.getElementById(id);
const token = location.pathname.split("/")[1];
let state = null;
let selection = null;
let selectedGroup = null;
let renderedKey = "";
let renderedAnswers = "";
let renderedGroups = "";
let activeRequests = 0;
let connectionError = "";
let fileGeneration = 0;
let localError = "";
let refreshing = false;
let selectedDiffLines = null;

function captureDiffSelection() {
    selectedDiffLines = null;
    const highlighted = window.getSelection();
    if (highlighted && !highlighted.isCollapsed && highlighted.rangeCount === 1) {
        const range = highlighted.getRangeAt(0);
        const parent = (node) => node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const diff = parent(range.startContainer)?.closest(".diff");
        if (diff && diff === parent(range.endContainer)?.closest(".diff")) {
            const rows = [...diff.querySelectorAll(".diff-line")].filter((row) =>
                range.intersectsNode(row.querySelector(".code")));
            if (rows.length) selectedDiffLines = {
                filename: diff.dataset.filename,
                hunkIndex: Number(diff.dataset.hunkIndex),
                startLine: Number(rows[0].dataset.hunkLine),
                endLine: Number(rows.at(-1).dataset.hunkLine),
                lines: rows.map((row) =>
                    `old ${row.dataset.oldLine || "-"}, new ${row.dataset.newLine || "-"}: ${row.querySelector(".code").textContent}`),
            };
        }
    }
    for (const control of document.querySelectorAll(".add-selected-lines")) {
        control.disabled = !selectedDiffLines || control.dataset.filename !== selectedDiffLines.filename ||
            Number(control.dataset.hunkIndex) !== selectedDiffLines.hunkIndex;
    }
}

function addSelectedLines(filename, hunkIndex) {
    const highlighted = selectedDiffLines;
    if (!highlighted || highlighted.filename !== filename || highlighted.hunkIndex !== hunkIndex) {
        throw new Error("Highlight lines within this diff hunk first.");
    }
    select({
        kind: "lines", filename, hunkIndex,
        startLine: highlighted.startLine, endLine: highlighted.endLine,
    }, true, highlighted.lines.join("\n"));
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function button(text, handler, className) {
    const node = element("button", text, className);
    node.type = "button";
    node.addEventListener("click", () => run(handler));
    return node;
}

async function api(route, input) {
    const options = input === undefined ? {} : {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PR-Review": token },
        body: JSON.stringify(input),
    };
    const response = await fetch(route, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}

async function run(handler) {
    activeRequests++;
    localError = "";
    updateStatus();
    try {
        await handler();
        await refresh();
    } catch (error) {
        localError = error.message;
    } finally {
        activeRequests--;
        updateStatus();
    }
}

function updateStatus() {
    const pending = state?.pending;
    const busy = Boolean(pending || activeRequests);
    $("load-button").disabled = busy;
    $("ask-button").disabled = busy || !selection;
    $("pr-url").disabled = busy;
    $("stop-button").hidden = !pending;
    $("stop-button").disabled = false;
    $("load-button").textContent = state?.snapshot ? "Load / refresh PR" : "Load PR";
    const error = connectionError || localError || state?.error;
    $("error").hidden = !error;
    $("error").textContent = error || "";
    if (pending) {
        const staged = pending.kind === "load" && state.expectedFileCount !== undefined
            ? ` ${state.stagedFileCount}/${state.expectedFileCount} files received.` : "";
        $("status").textContent = pending.kind === "load"
            ? `Loading the full PR diff and grouping changes.${staged} Check chat for permission requests.`
            : "Waiting for Copilot to answer. Check chat for permission requests.";
        if (state.snapshot && pending.kind === "load") $("status").textContent += " The previous snapshot remains visible.";
    } else {
        $("status").textContent = state?.snapshot
            ? `Snapshot from ${new Date(state.snapshot.loadedAt).toLocaleString()}. Not live; reload to detect new commits.`
            : "Paste a PR link to begin.";
    }
}

function selectionLabel(value) {
    if (!value) return "Select a group, file, or lines.";
    if (value.kind === "group") {
        return `Group: ${state.snapshot.groups.find((group) => group.id === value.groupId)?.title || value.groupId}`;
    }
    if (value.kind === "lines") return `Selected lines: ${value.filename} (hunk ${value.hunkIndex + 1}, diff rows ${value.startLine}-${value.endLine})`;
    return `${value.kind === "hunk" ? `Hunk ${value.hunkIndex + 1}` : "File"}: ${value.filename}`;
}

function select(value, focus = true, preview = "") {
    selection = value;
    $("selection-label").textContent = selectionLabel(value);
    $("selected-lines").textContent = preview;
    $("selected-lines").hidden = !preview;
    updateStatus();
    if (focus) {
        $("questions").scrollIntoView({ behavior: "smooth", block: "nearest" });
        $("question").focus({ preventScroll: true });
    }
}

function sourceLink(label, url) {
    const node = element("a", label);
    node.href = url;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
}

function renderOverview() {
    const snapshot = state.snapshot;
    const meta = snapshot.metadata;
    const title = element("h2");
    title.append(sourceLink(meta.title, state.url));
    const info = element("p", `${meta.author} | ${snapshot.files.length} files | ${snapshot.groups.length} groups`, "subtle");
    const revision = element("p", `Base ${meta.baseSha.slice(0, 12)} / Head ${meta.headSha.slice(0, 12)}`, "subtle");
    $("overview").replaceChildren(title, info, revision, element("p", snapshot.summary, "summary"));
}

function renderGroups() {
    const key = JSON.stringify([state.url, selectedGroup, state.snapshot.groups]);
    if (key === renderedGroups) return;
    renderedGroups = key;
    $("groups").replaceChildren();
    for (const group of state.snapshot.groups) {
        const node = button("", async () => {
            selectedGroup = group.id;
            renderGroups();
            renderChanges();
            select({ kind: "group", groupId: group.id }, false);
        }, `group-button${group.id === selectedGroup ? " active" : ""}`);
        node.setAttribute("aria-pressed", String(group.id === selectedGroup));
        node.append(element("span", group.title, "group-title"),
            element("span", `${group.files.length} files${group.reviewed ? " | Reviewed locally" : ""}`, "group-count"));
        $("groups").append(node);
    }
}

function renderChanges() {
    selectedDiffLines = null;
    fileGeneration++;
    const generation = fileGeneration;
    const group = state.snapshot.groups.find((item) => item.id === selectedGroup);
    $("changes").replaceChildren();
    if (!group) {
        $("changes").append(element("p", "This PR has no changed files."));
        return;
    }
    const header = element("div", undefined, "card");
    const heading = element("div", undefined, "group-heading");
    heading.append(element("h2", group.title),
        button("Ask about group", async () => select({ kind: "group", groupId: group.id })));
    const marked = element("label", undefined, "reviewed-control");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = group.reviewed;
    checkbox.addEventListener("change", () => run(async () => {
        try {
            await api("mark", { groupId: group.id, reviewed: checkbox.checked, headSha: state.snapshot.metadata.headSha });
        } catch (error) {
            checkbox.checked = !checkbox.checked;
            throw error;
        }
    }));
    marked.append(checkbox, element("span", "Reviewed locally"));
    header.append(heading, element("p", group.rationale, "rationale"), marked);
    $("changes").append(header);

    const files = new Map(state.snapshot.files.map((file) => [file.filename, file]));
    for (const name of group.files) {
        const file = files.get(name);
        const details = element("details", undefined, "file");
        const summary = element("summary", name);
        summary.append(element("span", `${file.status}  +${file.additions} -${file.deletions}`, "stats"));
        const tools = element("div", undefined, "file-heading");
        tools.append(button("Ask about file", async () => select({ kind: "file", filename: name })));
        if (file.status !== "removed") {
            const parsed = new URL(state.url);
            const repo = parsed.pathname.split("/").slice(0, 3).join("/");
            const path = name.split("/").map(encodeURIComponent).join("/");
            tools.append(sourceLink("View pinned source", `${parsed.origin}${repo}/blob/${state.snapshot.metadata.headSha}/${path}`));
        }
        const content = element("div");
        details.append(summary, tools, element("p", file.patchNote, "file-note"), content);
        if (file.previousFilename) details.append(element("p", `Renamed from ${file.previousFilename}`, "file-note"));
        let loaded = false;
        let inflight = false;
        details.addEventListener("toggle", async () => {
            if (!details.open || loaded || inflight) return;
            inflight = true;
            content.replaceChildren(element("p", "Loading patch...", "file-note"));
            try {
                const data = await api(`file?name=${encodeURIComponent(name)}&head=${state.snapshot.metadata.headSha}`);
                if (generation !== fileGeneration) return;
                renderDiff(content, data);
                loaded = true;
            } catch (error) {
                content.replaceChildren(element("p", `${error.message} Close and reopen this file to retry.`, "answer-error"));
            } finally {
                inflight = false;
            }
        });
        $("changes").append(details);
    }
}

function renderDiff(container, file) {
    container.replaceChildren();
    if (!file.patch) {
        container.append(element("p", "No text patch is available. Ask Copilot for source evidence if needed.", "file-note"));
        return;
    }
    const hunks = [];
    for (const line of file.patch.split("\n")) {
        if (line.startsWith("@@ ") || !hunks.length) hunks.push([]);
        hunks.at(-1).push(line);
    }
    hunks.forEach((lines, hunkIndex) => {
        const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(lines[0]);
        if (!match) return;
        const hunk = element("section", undefined, "hunk");
        const header = element("div", undefined, "hunk-header");
        const addLines = button("Add selected lines", async () => addSelectedLines(file.filename, hunkIndex), "add-selected-lines");
        addLines.disabled = true;
        addLines.dataset.filename = file.filename;
        addLines.dataset.hunkIndex = String(hunkIndex);
        addLines.addEventListener("mousedown", (event) => event.preventDefault());
        header.append(element("code", lines[0]), addLines);
        const diff = element("div", undefined, "diff");
        diff.dataset.filename = file.filename;
        diff.dataset.hunkIndex = String(hunkIndex);
        let oldLine = Number(match[1]);
        let newLine = Number(match[2]);
        for (const line of lines.slice(1)) {
            const add = line.startsWith("+");
            const remove = line.startsWith("-");
            const context = line.startsWith(" ");
            const row = element("div", undefined, `diff-line${add ? " addition" : remove ? " deletion" : ""}`);
            const oldNumber = (remove || context) && oldLine !== null ? String(oldLine++) : "";
            const newNumber = (add || context) && newLine !== null ? String(newLine++) : "";
            row.dataset.oldLine = oldNumber;
            row.dataset.newLine = newNumber;
            row.dataset.hunkLine = String(diff.children.length + 1);
            row.append(element("span", oldNumber, "line-number"),
                element("span", newNumber, "line-number"), element("span", line, "code"));
            diff.append(row);
        }
        hunk.append(header, diff);
        container.append(hunk);
    });
}

function renderAnswers() {
    const key = JSON.stringify(state.questions);
    if (key === renderedAnswers) return;
    renderedAnswers = key;
    $("answers").replaceChildren();
    for (const item of [...state.questions].reverse()) {
        const card = element("article", undefined, "answer");
        card.append(element("h3", item.question),
            element("p", `${selectionLabel(item.selection)} | Head ${item.headSha?.slice(0, 12)}`, "answer-context"),
            element("div", item.answer || item.error || "Waiting for Copilot...", item.error ? "answer-error" : "answer-body"));
        if (item.headSha !== state.snapshot.metadata.headSha) card.append(element("p", "This answer refers to an older snapshot.", "answer-context"));
        $("answers").append(card);
    }
}

async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        const next = await api("state");
        connectionError = "";
        const previousUrl = state?.url;
        state = next;
        if (state.url && document.activeElement !== $("pr-url")) $("pr-url").value = state.url;
        $("empty").hidden = Boolean(state.snapshot);
        $("review").hidden = !state.snapshot;
        if (state.snapshot) {
            const key = `${state.url}:${state.snapshot.loadedAt}`;
            if (key !== renderedKey) {
                renderedKey = key;
                renderedAnswers = "";
                selectedGroup = state.snapshot.groups[0]?.id ?? null;
                selection = selectedGroup ? { kind: "group", groupId: selectedGroup } : null;
                renderOverview();
                renderChanges();
                select(selection, false);
            }
            const checkbox = $("changes").querySelector('input[type="checkbox"]');
            const group = state.snapshot.groups.find((item) => item.id === selectedGroup);
            if (checkbox && group && activeRequests === 0) checkbox.checked = group.reviewed;
            renderGroups();
            renderAnswers();
        } else if (previousUrl !== state.url) {
            renderedKey = "";
            selection = null;
        }
    } catch (error) {
        connectionError = `Cannot reach PR Review: ${error.message}. If extensions were reloaded, reopen this canvas.`;
    } finally {
        refreshing = false;
        updateStatus();
    }
}

$("load-form").addEventListener("submit", (event) => {
    event.preventDefault();
    run(() => api("load", { url: $("pr-url").value }));
});
$("ask-form").addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
        await api("ask", { question: $("question").value, selection, headSha: state.snapshot.metadata.headSha });
        $("question").value = "";
    });
});
$("stop-button").addEventListener("click", () => run(() => api("stop", { requestId: state.pending.id })));

const themeObserver = new MutationObserver(() => {
    const mode = document.documentElement.getAttribute("data-color-mode");
    if (mode === "dark" || mode === "light") document.documentElement.setAttribute("data-theme", mode);
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-mode"] });
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 2000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
document.addEventListener("selectionchange", captureDiffSelection);
