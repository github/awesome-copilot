const $ = (id) => document.getElementById(id);
const token = document.querySelector('meta[name="board-token"]').content;
const hints = {
    unreviewed: "Not reviewed yet", "in-review": "No AI reviews running", keep: "Renew for another six months",
    "needs-changes": "Follow-up needed", remove: "Request marketplace removal",
};
const labels = { keep: "Keep", "needs-changes": "Needs changes", remove: "Remove" };
let board = { reports: [], items: [], columns: [], selected: null, snapshotSequence: -1 };
let discovered = [];
let opened;
let preview;
let activeTab = "review";
let dirty = false;
let publishing = false;
let busy = false;
let loaded = false;
const drafts = new Map();
const draftKey = (number, id) => `${number}:${id}`;
const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};
function link(node, url) {
    if (/^https:\/\/github\.com\/github\/awesome-copilot\/issues\/\d+(?:#issuecomment-\d+)?$/.test(url ?? "")) node.href = url;
    else node.removeAttribute("href");
}
function message(text, target = "message", error = false) {
    $(target).textContent = text;
    $(target).classList.toggle("error", error);
    $(target).toggleAttribute("data-agent-error", error);
    if (text && target === "message") {
        const toast = element("div", text, error ? "toast error" : "toast");
        toast.toggleAttribute("data-agent-error", error);
        $("toasts").append(toast);
        setTimeout(() => toast.remove(), error ? 9000 : 5000);
    }
}
async function api(name, body) {
    const response = await fetch(`/api/${name}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json", "x-board-token": token },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    return result;
}
async function run(button, work, target = "message") {
    if (busy) return;
    busy = true;
    const label = button.textContent;
    button.textContent = "Working...";
    controls();
    try { await work(); }
    catch (error) { message(error.message, target, true); }
    finally {
        button.textContent = label;
        busy = false;
        controls();
    }
}
function options(select, columns, selected) {
    select.replaceChildren(...columns.filter((column) => !column.readOnly).map((column) => {
        const option = element("option", column.label);
        option.value = column.id;
        return option;
    }));
    select.value = selected;
}
function current() {
    return board.selected === opened?.number ? board.items.find((item) => item.id === opened.id) : null;
}
function conflict() {
    return Boolean(opened && (!current() || current().revision !== opened.revision));
}
function pendingItems() {
    return board.items.filter((item) => !item.removed && !item.publication && !item.queueId &&
        !item.review && !item.evidence.reasons.length);
}
function effectiveColumn(item) {
    if (item.queueId) return "in-review";
    return item.column === "unreviewed" && labels[item.review?.recommendation]
        ? item.review.recommendation : item.column;
}
function controls() {
    for (const id of ["find", "import", "select", "report-toggle"]) $(id).disabled = busy || publishing;
    $("refresh").disabled = busy || !board.selected;
    $("review-pending").disabled = busy || !pendingItems().length;
    $("review-pending").title = "Review all eligible plugins without an AI review, including cards hidden by the filter.";
    $("board").setAttribute("aria-busy", String(busy));
    if (!$("detail").open) return;
    const item = current();
    const stale = conflict();
    const locked = !item || item.removed || Boolean(item.publication);
    renderUpstreamRequest(item, stale);
    $("conflict").hidden = !stale;
    for (const id of ["decision", "note", "reason"]) $(id).disabled = busy || stale || locked;
    $("save").disabled = busy || stale || locked || !dirty;
    for (const id of ["review-toggle", "review-start"]) {
        $(id).disabled = busy || stale || locked || dirty || Boolean(item?.queueId) || Boolean(item?.evidence.reasons.length);
    }
    $("review-cancel").hidden = !item?.queueId;
    $("review-cancel").disabled = busy || stale || !item?.queueId;
    $("preview").disabled = busy || stale || locked || dirty || Boolean(item?.queueId) ||
        Boolean(item?.evidence.reasons.length) || !labels[item?.column];
    $("reconcile").hidden = !item?.publication;
    $("reconcile").disabled = busy || stale || !item?.publication;
    $("followup").hidden = item?.publication?.status !== "posted" || item?.publication?.kind !== "needs-changes";
    $("followup").disabled = busy || stale;
    $("reload-card").hidden = !stale;
    $("reload-card").disabled = busy || !item;
    $("close").disabled = busy || publishing;
    $("draft-status").textContent = dirty ? "Unsaved local changes" : locked
        ? "Local editing locked. Inspect Activity for recovery or follow-up."
        : item.column === "unreviewed" && item.review
            ? `AI suggests ${labels[item.review.recommendation]}. Choose and save a decision before previewing a GitHub action.`
            : "Saved locally. No GitHub action taken.";
}
function setReportPanel(open) {
    $("report-panel").hidden = !open;
    $("report-toggle").setAttribute("aria-expanded", String(open));
}
function pill(text, kind) {
    return element("span", text, `pill${kind ? ` pill-${kind}` : ""}`);
}
function statusPills(item) {
    const result = [pill(`v${item.evidence.plugin?.version ?? item.version}`)];
    if (item.removed) result.push(pill("Removed from report", "warn"));
    if (item.changed) result.push(pill("Evidence changed", "warn"));
    if (item.evidence.reasons.length) result.push(pill("Blocked", "warn"));
    if (item.queueId) result.push(pill("Reviewing", "ai"));
    else if (item.reviewError) result.push(pill("Review failed", "danger"));
    if (item.review) result.push(pill(`AI: ${labels[item.review.recommendation]}`, "ai"));
    const upstream = item.evidence.upstream;
    if (upstream?.errors?.length) result.push(pill("Upstream check incomplete", "warn"));
    if ([upstream?.stable, upstream?.head].some((entry) => entry?.manifest?.matchesPlugin &&
        entry.manifest.version !== item.evidence.plugin?.version)) result.push(pill("Upstream version differs", "info"));
    if (item.publication) result.push(pill(`Command ${item.publication.status}`, item.publication.status === "posted" ? "info" : "warn"));
    return result;
}
function renderCard(item) {
    const card = element("article", undefined, `card${opened?.id === item.id && opened.number === board.selected ? " selected" : ""}`);
    card.tabIndex = 0;
    card.dataset.focus = `open-${item.id}`;
    card.dataset.id = item.id;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `#${item.id} ${item.name}`);
    card.draggable = !item.removed && !item.publication;
    card.addEventListener("click", () => show(item));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            show(item);
        }
    });
    card.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", String(item.id));
        event.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    const top = element("div", undefined, "card-top");
    top.append(element("span", `#${item.id}`, "card-number"), element("span", `Closed ${item.closedDate}`, "card-byline"));
    const pills = element("div", undefined, "pills");
    pills.append(...statusPills(item));
    card.append(top, element("p", item.name, "card-title"), element("p", item.repo, "card-repo"), pills);
    if (item.review?.rationale) card.append(element("p", item.review.rationale, "card-rationale"));
    return card;
}
function render() {
    const active = document.activeElement;
    const focus = active?.dataset?.focus;
    const selected = $("reports").value;
    const reports = new Map([...discovered, ...board.reports].map((report) => [report.number, report]));
    $("reports").replaceChildren(...[...reports.values()].sort((a, b) => b.number - a.number).map((report) => {
        const option = element("option", `#${report.number} ${report.title}`);
        option.value = report.number;
        return option;
    }));
    $("reports").value = reports.has(Number(selected)) ? selected : String(board.selected ?? "");
    const query = $("search").value.toLowerCase();
    const scroll = new Map([...$("board").querySelectorAll(".column-cards")].map((list) => [list.dataset.column, list.scrollTop]));
    $("board-summary").textContent = board.selected
        ? `${board.repo} · Report #${board.selected} · ${board.items.length} plugins`
        : "Six-month maintenance decisions";
    $("review-status").textContent = board.selected
        ? `${pendingItems().length} ready for AI review · ${board.items.filter((item) => item.queueId).length} reviewing · ${board.items.filter((item) => item.evidence.reasons.length).length} blocked. Decisions stay local until you preview and confirm.`
        : "Choose Reports to find a queue or import it by issue number.";
    $("board").replaceChildren(...board.columns.map((column) => {
        const section = element("section", undefined, "column");
        section.dataset.column = column.id;
        const items = board.items.filter((item) => effectiveColumn(item) === column.id &&
            `${item.name} ${item.repo} ${item.id}`.toLowerCase().includes(query))
            .sort((a, b) => a.closedDate.localeCompare(b.closedDate) || a.id - b.id);
        const header = element("header", undefined, "column-header");
        header.append(element("h2", column.label, "column-name"), element("span", String(items.length), "count"));
        const list = element("div", undefined, "column-cards");
        list.dataset.column = column.id;
        list.append(...(items.length ? items.map(renderCard) : [element("p", query ? "No matching plugins" : hints[column.id], "empty")]));
        list.addEventListener("dragover", (event) => {
            if (column.readOnly) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            section.classList.add("drop-target");
        });
        list.addEventListener("dragleave", () => section.classList.remove("drop-target"));
        list.addEventListener("drop", (event) => {
            event.preventDefault();
            section.classList.remove("drop-target");
            const item = board.items.find((entry) => entry.id === Number(event.dataTransfer.getData("text/plain")));
            if (!column.readOnly && item && !item.removed && !item.publication &&
                (item.column !== column.id || effectiveColumn(item) !== column.id)) {
                run($("refresh"), () => move(item, column.id));
            }
        });
        section.append(header, list);
        return section;
    }));
    for (const list of $("board").querySelectorAll(".column-cards")) list.scrollTop = scroll.get(list.dataset.column) ?? 0;
    if (focus && !active.isConnected) [...document.querySelectorAll("[data-focus]")].find((node) => node.dataset.focus === focus)?.focus({ preventScroll: true });
    if ($("detail").open) renderLive();
    controls();
}
function adopt(snapshot) {
    if (!Number.isSafeInteger(snapshot.snapshotSequence) || snapshot.snapshotSequence < board.snapshotSequence) return;
    board = snapshot;
    if (!loaded) {
        loaded = true;
        setReportPanel(!board.selected);
    }
    render();
}
async function move(item, column) {
    adopt(await api("update", {
        number: board.selected, id: item.id, expectedRevision: item.revision,
        column, note: item.note, reason: item.reason,
    }));
}
function renderLive() {
    const item = current();
    if (!item) return;
    const review = $("review");
    review.replaceChildren();
    review.className = item.review ? "review-content" : "notice";
    if (item.queueId) {
        review.append(element("p", `Reviewing in background: ${item.agentId ?? "dispatching"}`));
    } else if (item.reviewError) {
        review.append(element("p", item.reviewError, "error"));
    } else if (!item.review) {
        review.append(element("p", "No AI review yet. Use Review in background to inspect the current listing and original approval context."));
    }
    if (item.review) {
        const heading = element("div", undefined, "review-heading pills");
        heading.append(pill(labels[item.review.recommendation], "ai"));
        review.append(heading, element("div", item.review.rationale, "prose"));
    }
    $("drawer-labels").replaceChildren(...statusPills(item));
    $("receipt").textContent = item.publication
        ? `Command ${item.publication.status}. ${item.publication.at}\nPosting is not proof that the workflow completed. Inspect the original issue for its result.`
        : "No command posted from this board.";
    $("receipt-link").hidden = !item.publication?.url;
    link($("receipt-link"), item.publication?.url);
}
function selectTab(name, focus = false) {
    activeTab = name;
    for (const tab of document.querySelectorAll(".tab")) {
        const selected = tab.dataset.tab === name;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        $(`panel-${tab.dataset.tab}`).hidden = !selected;
        if (selected && focus) tab.focus();
    }
    $("drawer-body").scrollTop = 0;
}
function rememberDraft() {
    if (!opened) return;
    const key = draftKey(opened.number, opened.id);
    if (!dirty && !$("guidance").value) { drafts.delete(key); return; }
    drafts.set(key, {
        revision: opened.revision, dirty, column: $("decision").value,
        note: $("note").value, reason: $("reason").value, guidance: $("guidance").value,
    });
}
function renderPlugin(plugin) {
    const summary = $("plugin-summary");
    summary.replaceChildren();
    if (!plugin) { summary.append(element("dd", "No unique current catalog entry.")); return; }
    const fields = [
        ["Name", plugin.name], ["Version", plugin.version], ["Description", plugin.description],
        ["Repository", plugin.source?.repo], ["Pinned ref", plugin.source?.ref],
        ["SHA", plugin.source?.sha], ["Path", plugin.source?.path ?? "Repository root"],
        ["License", plugin.license],
    ];
    for (const [label, value] of fields) {
        if (value) summary.append(element("dt", label), element("dd", value));
    }
}
function renderUpstream(upstream) {
    const summary = $("upstream-summary");
    summary.replaceChildren();
    if (!upstream) {
        summary.append(element("p", "Not inspected yet. Refresh this report to fetch upstream release and manifest evidence.", "notice"));
        return;
    }
    const sourceLink = (text, url) => {
        const node = element("a", text);
        if (/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/(?:blob|compare|releases\/tag)\/\S+$/.test(url ?? "")) node.href = url;
        node.target = "_blank";
        node.rel = "noopener noreferrer";
        return node;
    };
    const fields = element("dl", undefined, "review-grid");
    const field = (label, text, url) => {
        const value = element("dd");
        value.append(url ? sourceLink(text, url) : element("span", text));
        fields.append(element("dt", label), value);
    };
    field("API check", upstream.status);
    field("Latest stable release", upstream.release
        ? `${upstream.release.tag} · ${upstream.release.publishedAt ?? "date unknown"}`
        : upstream.errors?.length ? "Unknown; see API errors below" : "No published stable release",
    upstream.release?.url);
    for (const [label, entry] of [["Release manifest", upstream.stable], ["Default branch (may be unreleased)", upstream.head]]) {
        const manifest = entry?.manifest;
        field(label, manifest
            ? `${manifest.name} v${manifest.version}${manifest.matchesPlugin ? "" : " — identity mismatch"} · ${manifest.path}`
            : "Unavailable", manifest?.url);
    }
    summary.append(fields);
    if (upstream.release?.notes) {
        const details = element("details");
        details.append(element("summary", `Release notes${upstream.release.notesTruncated ? " (truncated)" : ""}`),
            element("div", upstream.release.notes, "prose"));
        summary.append(details);
    }
    for (const comparison of upstream.comparisons ?? []) {
        const details = element("details");
        details.append(element("summary", `${comparison.label}: ${comparison.status}, ${comparison.aheadBy} ahead / ${comparison.behindBy} behind`),
            sourceLink("Inspect comparison on GitHub", comparison.url),
            element("p", comparison.files.length ? "Changed files at this plugin path:" : "No plugin-path changes in the returned file list.", "meta"),
            element("pre", comparison.files.map((file) => `${file.status}: ${file.path}${file.previousPath ? ` (from ${file.previousPath})` : ""}`).join("\n")));
        if (comparison.filesTruncated) details.append(element("p", "File list is incomplete. Inspect the full comparison before drawing conclusions.", "notice notice-warn"));
        summary.append(details);
    }
    if (upstream.errors?.length) summary.append(element("p", upstream.errors.join("\n"), "notice notice-warn"));
    summary.append(element("p", "A different upstream version is context, not an automatic change decision. GitHub release tags can apply to the whole repository.", "meta"));
}
function renderUpstreamRequest(item, stale) {
    const plugin = item?.evidence.plugin;
    const repo = plugin?.source?.repo;
    const valid = item && !stale && !item.removed && !item.evidence.reasons.length &&
        typeof repo === "string" && /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repo) &&
        ![".", ".."].includes(repo.split("/")[1]) && repo.toLowerCase() === item.repo.toLowerCase() &&
        plugin.name?.toLowerCase() === item.name.toLowerCase();
    for (const id of ["upstream-request", "upstream-requests"]) {
        $(id).hidden = !valid;
        $(id).removeAttribute("href");
    }
    if (!valid) {
        $("upstream-request-hint").textContent = stale
            ? "Reload the current card before preparing an upstream request."
            : "Upstream requests require a verified current listing. Refresh the report and resolve any evidence blocks first.";
        return;
    }
    const text = (value) => String(value ?? "unknown").slice(0, 200).replace(/\s+/g, " ").replace(/[\\`*_[\]<>|]/g, "\\$&");
    const upstream = item.evidence.upstream;
    const manifestLine = (label, entry) => {
        const manifest = entry?.manifest;
        return manifest
            ? `- ${label}: ${text(manifest.name)} ${text(manifest.version)} at ${text(manifest.path)}${manifest.matchesPlugin ? "" : " (identity differs; please verify)"}. Source: https://github.com/${repo}/blob/${encodeURIComponent(entry.sha)}/${String(manifest.path).split("/").map(encodeURIComponent).join("/")}`
            : `- ${label}: not available in this snapshot.`;
    };
    const body = [
        "## Request",
        `Could you submit a pull request to update the ${text(item.name)} listing in [Awesome Copilot](https://github.com/github/awesome-copilot) to the latest suitable supported plugin version?`,
        "",
        "## Currently listed",
        `- Plugin: ${text(item.name)}`,
        `- Version: ${text(plugin.version)}`,
        `- Source pin: ${text(plugin.source.sha || plugin.source.ref)}`,
        `- Plugin root: ${text(plugin.source.path ?? "/")}`,
        `- Original submission: https://github.com/github/awesome-copilot/issues/${item.id}`,
        "- Catalog: https://github.com/github/awesome-copilot/blob/main/plugins/external.json",
        "",
        "## Upstream evidence",
        upstream?.release ? `- Latest stable release: https://github.com/${repo}/releases/tag/${encodeURIComponent(upstream.release.tag)}` : "- Latest stable release: unknown or not published; please verify.",
        manifestLine("Manifest at the release", upstream?.stable),
        manifestLine("Manifest at default-branch HEAD (may be unreleased)", upstream?.head),
        ...(upstream?.errors?.length ? ["- The upstream API inspection was incomplete; please verify these snapshots."] : []),
        "",
        "Repository-wide release tags are not necessarily plugin versions, and a different version string alone does not establish that it is newer. Please choose an appropriate supported update; the HEAD snapshot may include unreleased changes.",
        "",
        "## Submitting the update",
        "Please follow [Updating listed external plugins via PR](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#updating-listed-external-plugins-via-pr).",
        "Update the existing catalog entry's version and immutable source ref/SHA to match the chosen plugin manifest. Automated quality gates run on the pull request.",
        "",
        "Thank you!",
    ].join("\n");
    $("upstream-request").href = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(`Update the Awesome Copilot listing for ${item.name}`)}&body=${encodeURIComponent(body)}`;
    $("upstream-requests").href = `https://github.com/${repo}/issues?q=${encodeURIComponent('is:issue "Awesome Copilot"')}`;
    $("upstream-request-hint").textContent = "Opens an editable issue draft on GitHub. Check existing requests before submitting. Private notes and AI reviews are not included; nothing is posted from this board.";
}
function show(item) {
    const opener = opened?.opener ?? document.activeElement;
    const draft = drafts.get(draftKey(board.selected, item.id));
    const triage = draft?.dirty ? draft : null;
    opened = { id: item.id, number: board.selected, revision: draft?.dirty ? draft.revision : item.revision, item, opener };
    dirty = Boolean(draft?.dirty);
    preview = null;
    message("", "detail-message");
    $("detail-title").textContent = item.name;
    $("drawer-kicker").textContent = `Original submission #${item.id}`;
    $("drawer-meta").textContent = `${item.repo} · ${item.days} days past threshold`;
    link($("submission"), item.url);
    $("flags").textContent = [
        ...item.evidence.reasons, item.changed ? "Evidence changed since the prior import; the recommendation and local decision were reset." : "",
        item.removed ? "Removed from this report. Only command recovery is available." : "",
    ].filter(Boolean).join("\n");
    $("flags").hidden = !$("flags").textContent;
    options($("decision"), board.columns, triage?.column ?? item.column);
    $("note").value = triage?.note ?? item.note;
    $("reason").value = triage?.reason ?? item.reason;
    $("guidance").value = draft?.guidance ?? "";
    $("rereview-panel").hidden = true;
    $("review-toggle").setAttribute("aria-expanded", "false");
    renderPlugin(item.evidence.plugin);
    renderUpstream(item.evidence.upstream);
    $("catalog").textContent = item.evidence.plugin ? JSON.stringify(item.evidence.plugin, null, 2) : "No unique current catalog entry.";
    $("issue-title").textContent = item.evidence.issue.title;
    $("issue-body").textContent = item.evidence.issue.body;
    $("history").textContent = JSON.stringify(item.history ?? [], null, 2);
    $("comments").replaceChildren(...item.evidence.comments.map((comment) => {
        const article = element("article", undefined, "comment");
        const header = element("div", undefined, "comment-header");
        const heading = element("a", comment.author || "Unknown author");
        heading.target = "_blank";
        heading.rel = "noopener noreferrer";
        link(heading, comment.url);
        header.append(heading);
        article.append(header, element("div", comment.body, "comment-body"));
        return article;
    }));
    if (!item.evidence.comments.length) $("comments").append(element("p", "No comments on this submission.", "notice"));
    selectTab(activeTab);
    if (!$("detail").open) $("detail").showModal();
    render();
    $("close").focus();
}
function identity() {
    if (!opened || conflict()) throw new Error("Card changed. Reload the current card before continuing.");
    return { number: opened.number, id: opened.id };
}
async function refreshReport(number) {
    adopt(await api("import", { number }));
    message(`Refreshed report #${number}. Evidence is a snapshot; preview rechecks GitHub before posting.`);
}
async function reviewPending() {
    const number = board.selected;
    const failures = [];
    let queued = 0;
    for (const item of pendingItems()) {
        try {
            await api("review", { number, id: item.id });
            queued++;
        } catch (error) {
            failures.push(`#${item.id}: ${error.message}`);
        }
    }
    adopt(await api("board"));
    message(`${queued} background reviews queued.${failures.length ? ` Failed: ${failures.join("; ")}` : ""}`, "message", Boolean(failures.length));
}
for (const id of ["decision", "note", "reason"]) $(id).addEventListener("input", () => {
    dirty = $("decision").value !== opened.item.column || $("note").value !== opened.item.note || $("reason").value !== opened.item.reason;
    rememberDraft();
    controls();
});
$("guidance").addEventListener("input", rememberDraft);
$("report-toggle").addEventListener("click", () => setReportPanel($("report-panel").hidden));
$("find").addEventListener("click", (event) => run(event.currentTarget, async () => {
    discovered = await api("reports", {});
    render();
    message(discovered.length ? `Found ${discovered.length} reports (up to 100 recent open due issues searched).` : "No open six-month review reports found.");
}));
$("reports").addEventListener("change", () => { $("number").value = $("reports").value; });
$("import").addEventListener("click", (event) => run(event.currentTarget, async () => {
    await refreshReport(Number($("number").value || $("reports").value));
    setReportPanel(false);
}));
$("refresh").addEventListener("click", (event) => run(event.currentTarget, () => refreshReport(board.selected)));
$("select").addEventListener("click", (event) => run(event.currentTarget, async () => {
    adopt(await api("select", { number: Number($("reports").value) }));
    setReportPanel(false);
}));
$("review-pending").addEventListener("click", (event) => run(event.currentTarget, reviewPending));
$("search").addEventListener("input", render);
$("save").addEventListener("click", (event) => run(event.currentTarget, async () => {
    const result = await api("update", {
        ...identity(), expectedRevision: opened.revision,
        column: $("decision").value, note: $("note").value, reason: $("reason").value,
    });
    const saved = result.items.find((item) => item.id === opened.id);
    if (saved) { opened.revision = saved.revision; opened.item = saved; }
    dirty = false;
    drafts.delete(draftKey(opened.number, opened.id));
    adopt(result);
    message("Saved locally.", "detail-message");
}, "detail-message"));
$("review-toggle").addEventListener("click", () => {
    $("rereview-panel").hidden = !$("rereview-panel").hidden;
    $("review-toggle").setAttribute("aria-expanded", String(!$("rereview-panel").hidden));
    if (!$("rereview-panel").hidden) $("guidance").focus();
});
$("review-hide").addEventListener("click", () => {
    $("rereview-panel").hidden = true;
    $("review-toggle").setAttribute("aria-expanded", "false");
    $("review-toggle").focus();
});
$("review-start").addEventListener("click", (event) => run(event.currentTarget, async () => {
    await api("review", { ...identity(), guidance: $("guidance").value });
    adopt(await api("board"));
    $("rereview-panel").hidden = true;
    $("review-toggle").setAttribute("aria-expanded", "false");
    selectTab("review");
    $("tab-review").focus();
    message("Background review dispatched. You can close the card while it runs.", "detail-message");
}, "detail-message"));
$("review-cancel").addEventListener("click", (event) => run(event.currentTarget, async () => {
    adopt(await api("cancel", identity()));
    $("tab-review").focus();
}, "detail-message"));
$("preview").addEventListener("click", (event) => run(event.currentTarget, async () => {
    preview = await api("preview", identity());
    link($("target"), preview.target);
    $("target").textContent = preview.target;
    $("payload").textContent = preview.body;
    message("", "publish-message");
    $("confirm").disabled = false;
    $("confirmation").showModal();
    $("dismiss").focus();
}, "detail-message"));
$("confirm").addEventListener("click", (event) => run(event.currentTarget, async () => {
    publishing = true;
    $("confirm").disabled = true;
    $("dismiss").disabled = true;
    try {
        adopt(await api("publish", { token: preview?.token }));
        message("Command posted. Check the original issue for the automation result.", "detail-message");
        $("confirmation").close();
        selectTab("activity");
        $("tab-activity").focus();
    } finally {
        // A preview is single-use, even after errors. Recovery uses Reconcile, not a second click.
        preview = null;
        publishing = false;
        $("dismiss").disabled = false;
        adopt(await api("board"));
        if (current()) opened.revision = current().revision;
    }
}, "publish-message"));
$("dismiss").addEventListener("click", () => { if (!publishing) { preview = null; $("confirmation").close(); } });
$("confirmation").addEventListener("cancel", (event) => { if (publishing) event.preventDefault(); else preview = null; });
$("reconcile").addEventListener("click", (event) => run(event.currentTarget, async () => {
    adopt(await api("reconcile", identity()));
    if (current()) opened.revision = current().revision;
    message("Verified the command comment. No GitHub write was made.", "detail-message");
}, "detail-message"));
$("followup").addEventListener("click", (event) => run(event.currentTarget, async () => {
    adopt(await api("followup", identity()));
    drafts.delete(draftKey(opened.number, opened.id));
    if (current()) show(current());
}, "detail-message"));
$("reload-card").addEventListener("click", () => {
    const item = current();
    if (!item) return;
    drafts.delete(draftKey(opened.number, opened.id));
    show(item);
});
for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
        const tabs = [...document.querySelectorAll(".tab")];
        const index = tabs.indexOf(tab);
        const next = {
            ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length,
            Home: 0, End: tabs.length - 1,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        selectTab(tabs[next].dataset.tab, true);
    });
}
$("close").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", (event) => {
    const rect = $("detail").getBoundingClientRect();
    if (event.target === $("detail") && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) && !busy && !publishing) $("detail").close();
});
$("detail").addEventListener("cancel", (event) => { if (busy || publishing) event.preventDefault(); });
$("detail").addEventListener("close", () => {
    if ($("detail").open) return;
    rememberDraft();
    const opener = opened?.opener;
    const id = opened?.id;
    opened = null;
    dirty = false;
    render();
    if (opener?.isConnected) opener.focus();
    else ([...document.querySelectorAll("[data-focus]")].find((node) => node.dataset.focus === `open-${id}`) ?? $("search")).focus();
});
const events = new EventSource(`/events?token=${encodeURIComponent(token)}`);
events.addEventListener("board", (event) => adopt(JSON.parse(event.data)));
events.addEventListener("error", () => message("Live updates disconnected; reconnecting. Refresh before acting if this persists.", "message", true));
api("board").then(adopt).catch((error) => message(error.message, "message", true));
