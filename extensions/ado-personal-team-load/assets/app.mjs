const $ = id => document.getElementById(id);
const key = document.querySelector('meta[name="canvas-key"]').content;
let state, busy = false, timer, lastAuto = 0;
const chosenPeople = new Set(), chosenProjects = new Set(), chosenRepositories = new Set();
const text = (tag, value, cls) => { const el = document.createElement(tag); el.textContent = value; if (cls) el.className = cls; return el; };
function error(message) { $("error").textContent = message; $("error").hidden = !message; }
async function action(name, input = {}, { renderPickers = false, quiet = false } = {}) {
    if (busy) { if (!quiet) error("Another canvas request is in progress. Wait for it to finish, then retry."); return; }
    busy = true;
    if (!quiet) document.querySelectorAll("button").forEach(b => b.disabled = true);
    if (!quiet) { $("status").textContent = name === "refresh" ? "Reading live Azure DevOps data..." : "Loading Azure DevOps scope..."; error(""); }
    try {
        const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json", "X-Canvas-Key": key }, body: JSON.stringify({ name, input }) });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message || `Canvas HTTP ${response.status}`);
        if (quiet && JSON.stringify(state) === JSON.stringify(data.result)) return state;
        const previousRevision = state?.revision;
        state = data.result;
        if (previousRevision && previousRevision !== state.revision) {
            chosenProjects.clear(); chosenRepositories.clear(); chosenPeople.clear();
            state.config.projects.forEach(id => chosenProjects.add(id));
            state.config.repositories.forEach(id => chosenRepositories.add(id));
            state.config.people.forEach(id => chosenPeople.add(id));
            $("tenant").value = state.config.tenant; $("threshold").value = state.config.threshold; $("interval").value = state.config.refreshSeconds;
            $("organisation-url").value = ""; $("organisation").value = state.config.organisation;
            renderPickers = true;
        }
        render();
        if (renderPickers || name === "refresh") renderCatalog();
        return state;
    } catch (e) { error(e.message); $("status").textContent = "Request failed. Any displayed data is from the previous refresh."; }
    finally { busy = false; if (!quiet) document.querySelectorAll("button").forEach(b => b.disabled = false); }
}
function currentOrg() { return $("organisation-url").value.trim() || $("organisation").value; }
function scopeInput() { return { organisation: currentOrg(), tenant: $("tenant").value.trim(), projects: [...chosenProjects] }; }
function choices(container, items, selected, keyOf, labelOf) {
    container.replaceChildren();
    if (!items.length) { container.append(text("p", "No accessible choices returned.")); return; }
    for (const item of items) {
        const id = keyOf(item), label = document.createElement("label"); label.className = "choice";
        const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.value = id; checkbox.checked = selected.has(id);
        checkbox.addEventListener("change", () => checkbox.checked ? selected.add(id) : selected.delete(id));
        const value = text("span", labelOf(item));
        if (item.uniqueName || item.descriptor) value.append(text("small", item.uniqueName || item.descriptor, "identity"));
        label.append(checkbox, value); container.append(label);
    }
}
function renderCatalog() {
    const previous = $("organisation").value, c = state.catalog;
    $("organisation").replaceChildren(new Option("Choose an organisation", ""));
    for (const org of c.organisations) $("organisation").add(new Option(org.name, org.url));
    const savedOrg = previous || state.config.organisation;
    if (savedOrg && !c.organisations.some(org => org.url === savedOrg)) $("organisation").add(new Option(savedOrg, savedOrg));
    $("organisation").value = previous || state.config.organisation;
    const projects = [...c.projects, ...[...chosenProjects].filter(id => !c.projects.some(p => p.id === id)).map(id => ({ id, name: `${id} (saved selection, load projects to verify)` }))];
    const repositories = [...c.repositories, ...[...chosenRepositories].filter(id => !c.repositories.some(r => r.id === id)).map(id => ({ id, name: `${id} (saved selection, load repositories to verify)` }))];
    choices($("projects"), projects, chosenProjects, p => p.id, p => p.name);
    choices($("repositories"), repositories, chosenRepositories, p => p.id, p => `${p.name}${p.disabled ? " (disabled)" : ""}`);
    renderPeople();
}
function renderPeople() {
    const search = $("people-search").value.toLowerCase();
    const identities = [...state.catalog.people];
    if (!state.catalog.organisation || state.catalog.organisation === state.config.organisation)
        for (const p of state.people) if (!identities.some(x => x.id === p.id || (x.descriptor && x.descriptor === p.descriptor))) identities.push(p);
    for (const id of chosenPeople) if (state.config.people.includes(id) && !identities.some(p => p.id === id))
        identities.push({ id, displayName: id, uniqueName: "Saved selection, load people to verify" });
    for (const p of identities) if (p.id && p.descriptor && chosenPeople.has(p.id)) { chosenPeople.delete(p.id); chosenPeople.add(p.descriptor); }
    const matches = identities.filter(p => `${p.displayName} ${p.uniqueName} ${p.id || p.descriptor}`.toLowerCase().includes(search));
    choices($("people"), matches.slice(0, 100),
        chosenPeople, p => p.descriptor || p.id, p => p.displayName || p.id);
    if (matches.length > 100) $("people").prepend(text("p", `Showing 100 of ${matches.length} matches. Search to find another person. Existing selections are kept.`, "hint"));
}
function workList(items, kind) {
    const list = document.createElement("ol"); list.className = "work-list";
    if (!items.length) return text("p", "None in the covered data.", "hint");
    for (const item of items) {
        const li = document.createElement("li"), link = text("a", `${kind} ${item.id}: ${item.title || "(untitled)"}`);
        const u = new URL(item.url);
        if (u.protocol === "https:" && u.hostname === "dev.azure.com") { link.href = u.href; link.target = "_blank"; link.rel = "noopener noreferrer"; }
        li.append(link, text("small", `${item.type || (item.draft ? "Draft PR" : "PR")} · ${item.state} · ${projectName(item.project)}${item.repository ? ` · ${repoName(item.repository)}` : ""}`, "identity"));
        if (item.reviewers?.length) {
            const details = document.createElement("details"); details.append(text("summary", "Reviewer status"));
            const votes = new Map([[10, "Approved"], [5, "Approved with suggestions"], [0, "No vote"], [-5, "Waiting for author"], [-10, "Rejected"]]);
            const reviewers = document.createElement("ol");
            for (const r of item.reviewers) reviewers.append(text("li", `${r.displayName || r.id} (${r.uniqueName || r.id}): ${r.hasDeclined ? "Declined" : votes.get(r.vote)}${r.isContainer ? ", group request, excluded from individual counts" : ""}`));
            details.append(reviewers); li.append(details);
        }
        list.append(li);
    }
    return list;
}
function projectName(id) { return state.catalog.projects.find(p => p.id === id)?.name || id; }
function repoName(id) { return state.catalog.repositories.find(r => r.id === id)?.name || id; }
function render() {
    const c = state.config;
    const messages = [...state.errors, ...state.catalog.errors].map(e => e.message);
    if (state.stale) messages.unshift("Stale data. Counts below are from the previous data refresh, not a successful current scan.");
    if (state.lastDataRefresh && !state.complete && !state.stale) messages.unshift("Partial coverage. Counts are lower bounds for the sources that succeeded.");
    error(messages.join("\n\n"));
    $("status").textContent = state.lastDataRefresh
        ? `Last data refresh: ${new Date(state.lastDataRefresh).toLocaleString()}. Last complete refresh: ${state.lastSuccessfulRefresh ? new Date(state.lastSuccessfulRefresh).toLocaleString() : "none"}.`
        : "No live refresh yet. Choose a scope, save it, then refresh.";
    $("coverage-summary").textContent = c.organisation
        ? `${c.organisation} · Projects: ${c.projects.map(projectName).join(", ") || "none"} · Repositories: ${c.repositories.length ? c.repositories.map(repoName).join(", ") : "all API-visible repositories"} · ${c.people.length} tracked people. Hidden or inaccessible resources are outside coverage.`
        : "Choose an organisation. Only API-visible resources are covered; no availability or hours are inferred.";
    const expanded = new Set([...$("roster").querySelectorAll("details[open]")].map(el => el.dataset.person));
    $("roster").replaceChildren();
    if (!state.people.length) $("roster").append(text("p", c.people.length ? "No data loaded for the selected people." : "Choose people in the scope picker. Untracked owners are never treated as unassigned.", "hint"));
    for (const person of state.people) {
        const detail = document.createElement("details"); detail.className = `person${person.total > c.threshold ? " over" : ""}`; detail.dataset.person = person.id; detail.open = expanded.has(person.id);
        const summary = document.createElement("summary"), name = text("span", person.displayName, "name");
        name.append(text("small", `${person.uniqueName ? `${person.uniqueName} · ` : ""}${person.id}`, "identity"));
        name.append(text("span", `${person.workItems.length} work items · ${person.prs.length} authored PRs · ${person.reviews.length} reviews`, "stats"));
        const load = document.createElement("span"); load.className = "load"; load.append(text("span", `${person.total} open work`, "total"));
        const meter = document.createElement("meter"); meter.min = 0; meter.max = c.threshold; meter.value = Math.min(person.total, c.threshold);
        meter.setAttribute("aria-label", `${person.total} open work, threshold ${c.threshold}`); load.append(meter, text("small", person.label, "identity"));
        summary.append(name, load); detail.append(summary);
        for (const [heading, items, kind] of [["Owned work items", person.workItems, "Work item"], ["Authored active PRs", person.prs, "PR"], ["Outstanding individual reviews", person.reviews, "PR"]])
            detail.append(text("h3", heading), workList(items, kind));
        $("roster").append(detail);
    }
    $("unassigned-count").textContent = state.lastDataRefresh ? `(${state.unassigned.length})` : "";
    $("unassigned").replaceChildren(state.lastDataRefresh ? workList(state.unassigned, "Work item") : text("p", "No live data loaded.", "hint"));
    const coverage = $("coverage-content"); coverage.replaceChildren();
    coverage.append(text("p", `Profile: ${state.profile}. Work item snapshots use WIQL ASOF. PR and reviewer endpoints are live reads and can change during a scan. Repository scope does not filter project work items.`));
    const list = document.createElement("ol"); list.className = "coverage-list";
    for (const source of state.coverage) list.append(text("li", `${source.project ? projectName(source.project) + ": " : ""}${source.repository ? repoName(source.repository) + ": " : ""}${source.kind}, ${source.status}${source.count !== undefined ? ` (${source.count})` : ""}${source.asOf ? `, snapshot ${source.asOf}` : ""}${source.note ? `. ${source.note}` : ""}`));
    coverage.append(list);
    if (state.sourceCounts) coverage.append(text("p", `Source totals: ${state.sourceCounts.openWorkItems} open work items, ${state.sourceCounts.activePRs} active PRs, ${state.sourceCounts.unassigned} unassigned work items.`));
    if (!timer) timer = setInterval(() => {
        const current = state.config;
        if (!document.hidden && $("auto").checked && !busy && current.projects.length && Date.now() - lastAuto >= current.refreshSeconds * 1000) {
            lastAuto = Date.now(); action("refresh");
        }
    }, 10000);
}
$("refresh").addEventListener("click", () => { lastAuto = Date.now(); action("refresh"); });
$("discover").addEventListener("click", () => action("discover", { tenant: $("tenant").value.trim() }, { renderPickers: true }));
$("load-projects").addEventListener("click", () => action("discover", { organisation: currentOrg(), tenant: $("tenant").value.trim(), projects: [] }, { renderPickers: true }));
$("load-choices").addEventListener("click", () => action("discover", scopeInput(), { renderPickers: true }));
$("organisation").addEventListener("change", () => { $("organisation-url").value = ""; chosenProjects.clear(); chosenRepositories.clear(); chosenPeople.clear(); });
$("organisation-url").addEventListener("change", () => { chosenProjects.clear(); chosenRepositories.clear(); chosenPeople.clear(); });
$("people-search").addEventListener("input", renderPeople);
function selectedIdentities() {
    return [...chosenPeople].map(key => state.catalog.people.find(p => p.id === key || p.descriptor === key) ||
        (state.config.people.includes(key) ? { id: key } : undefined));
}
$("config").addEventListener("submit", async event => {
    event.preventDefault();
    const selected = selectedIdentities();
    if (selected.some(p => !p)) { error("A selected identity is missing from the loaded directory. Load people again before saving."); return; }
    const unresolved = selected.filter(p => !p.id).map(p => p.descriptor);
    if (unresolved.length && !await action("resolve_people", { descriptors: unresolved })) return;
    const current = selectedIdentities();
    if (current.some(p => !p?.id)) { error("A selected identity could not be resolved. Load people again before saving."); return; }
    const people = [...new Set(current.map(p => p.id))], descriptors = Object.fromEntries(current.filter(p => p.descriptor).map(p => [p.id, p.descriptor]));
    const result = await action("set_tracking", {
        revision: state.revision, config: { ...scopeInput(), repositories: [...chosenRepositories], people,
            threshold: Number($("threshold").value), refreshSeconds: Number($("interval").value) }, descriptors,
    }, { renderPickers: true });
    if (result) { $("scope").open = false; lastAuto = Date.now(); await action("refresh"); }
});
const initial = await action("get_state");
if (initial) {
    for (const id of initial.config.projects) chosenProjects.add(id);
    for (const id of initial.config.repositories) chosenRepositories.add(id);
    for (const id of initial.config.people) chosenPeople.add(id);
    $("tenant").value = initial.config.tenant; $("threshold").value = initial.config.threshold; $("interval").value = initial.config.refreshSeconds;
    $("scope").open = !initial.config.projects.length;
    if (initial.config.organisation) $("organisation").add(new Option(initial.config.organisation, initial.config.organisation, true, true));
    renderCatalog();
    if (initial.config.projects.length && !initial.lastDataRefresh) { lastAuto = Date.now(); await action("refresh"); }
}
setInterval(() => { if (!document.hidden && !busy) action("get_state", {}, { quiet: true }); }, 5000);
