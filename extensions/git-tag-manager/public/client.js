const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name="canvas-token"]').content;
const labels = { synced: "Synced", "local-only": "Local only", "remote-only": "Remote only", diverged: "Diverged" };
let state;
let busy = false;
let activePlan = null;
let lastSnapshot = "";
let lastResult = "";

function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
}

function notify(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
}

async function api(route, input) {
    const response = await fetch(`/api/${route}`, input === undefined ? {} : {
        method: "POST", headers: { "Content-Type": "application/json", "X-Canvas-Token": token },
        body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
    return data;
}

function setBusy(value) {
    busy = value;
    document.querySelectorAll("button").forEach(button => { button.disabled = value; });
    $("remote").disabled = value || !state?.snapshot.remotes.length;
    $("execute").disabled = value || !activePlan || $("confirmation").value !== activePlan.name;
    document.body.setAttribute("aria-busy", String(value));
}

async function task(work, message) {
    if (busy) return;
    setBusy(true);
    if (message) notify(message);
    try {
        await work();
        await sync();
    } catch (error) {
        try {
            await sync();
        } catch (syncError) {
            notify(`${error.message} Could not reload state: ${syncError.message}`, true);
            return;
        }
        notify(error.message, true);
        if ($("confirm").open) $("confirm-error").textContent = error.message;
    } finally {
        setBusy(false);
    }
}

function renderTags() {
    if (!state) return;
    const search = $("search").value.toLowerCase();
    const filter = $("filter").value;
    const tags = state.snapshot.tags.filter(tag => tag.name.toLowerCase().includes(search) && (filter === "all" || tag.status === filter));
    $("tags").replaceChildren();
    $("count").textContent = `${tags.length} / ${state.snapshot.tags.length}`;
    $("empty").hidden = tags.length > 0;
    $("empty").textContent = state.snapshot.tags.length ? "No matching tags. Try another search or status." : "No tags yet. Create a tag at a commit to get started.";
    for (const tag of tags) {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        name.append(text("span", tag.name, "tag-name"));
        if (tag.type === "tag") name.append(text("span", "annotated", "kind"));
        name.append(text("span", tag.localCommit ? `local ${tag.localCommit.slice(0, 8)}` : "not present locally", "commit"));
        if (tag.remoteCommit) name.append(text("span", `remote ${tag.remoteCommit.slice(0, 8)}`, "commit"));
        const status = document.createElement("td");
        status.append(text("span", labels[tag.status], `badge ${tag.status}`));
        const actions = document.createElement("td");
        const group = document.createElement("div");
        group.className = "row-actions";
        if (tag.status === "local-only" && state.snapshot.remote) {
            const push = text("button", "Push");
            push.type = "button";
            push.setAttribute("aria-label", `Preview pushing ${tag.name}`);
            push.addEventListener("click", () => prepare({ operation: "push", name: tag.name }));
            group.append(push);
        }
        const scope = document.createElement("select");
        scope.setAttribute("aria-label", `Deletion location for ${tag.name}`);
        for (const [value, label] of [["local", "Local"], ["remote", "Remote"], ["both", "Both"]]) {
            if ((value === "local" && !tag.localOid) || (value === "remote" && !tag.remoteOid) || (value === "both" && (!tag.localOid || !tag.remoteOid))) continue;
            const option = text("option", label);
            option.value = value;
            scope.append(option);
        }
        const remove = text("button", "Delete", "danger");
        remove.type = "button";
        remove.setAttribute("aria-label", `Preview deleting ${tag.name}`);
        remove.addEventListener("click", () => prepare({ operation: "delete", name: tag.name, scope: scope.value }));
        group.append(scope, remove);
        actions.append(group);
        row.append(name, status, actions);
        $("tags").append(row);
    }
}

function showPlan(plan) {
    if (activePlan?.id === plan?.id) return;
    activePlan = plan;
    if (!plan) {
        if ($("confirm").open) $("confirm").close();
        return;
    }
    $("confirm-title").textContent = plan.operation === "create" ? "Create tag" : plan.operation === "push" ? "Push tag" : "Delete tag";
    $("confirm-description").textContent = plan.operation === "create"
        ? `Create ${plan.message?.trim() ? "an annotated" : "a lightweight"} tag${plan.push ? " and push it" : " locally"}. This points at the resolved commit below, not uncommitted work.`
        : plan.operation === "push" ? "Publish only this tag to the selected remote. Existing remote tags will not be overwritten."
            : `Delete this tag from ${plan.scope === "both" ? "both local and remote locations" : `the ${plan.scope} location`}. This does not delete the underlying commit.`;
    $("plan-details").replaceChildren();
    for (const [label, value] of [["Tag", plan.name], ["Repository", plan.repository], ["Remote", plan.remoteChange ? plan.remote : "No remote changes"], ["Commit", plan.targetOid || plan.localOid || plan.remoteOid]]) {
        $("plan-details").append(text("dt", label), text("dd", value));
    }
    $("confirm-name").textContent = plan.name;
    $("confirmation").value = "";
    $("confirm-error").textContent = "";
    $("remote-warning").hidden = !plan.remoteChange;
    $("execute").textContent = plan.operation === "delete" ? "Delete tag" : plan.operation === "push" ? "Push tag" : plan.push ? "Create and push" : "Create tag";
    $("execute").disabled = true;
    if (!$("confirm").open) $("confirm").showModal();
    $("confirmation").focus();
}

async function sync() {
    state = await api("state");
    const key = JSON.stringify(state.snapshot);
    if (key !== lastSnapshot) {
        lastSnapshot = key;
        const snap = state.snapshot;
        $("repository").textContent = snap.repository;
        $("remote").replaceChildren();
        if (!snap.remotes.length) $("remote").append(text("option", "No remotes"));
        for (const remote of snap.remotes) {
            const option = text("option", remote);
            option.value = remote;
            $("remote").append(option);
        }
        $("remote").value = snap.remote;
        $("remote").disabled = busy || !snap.remotes.length;
        $("push-remote").textContent = snap.remote || "remote (not configured)";
        $("push-create").disabled = !snap.remote;
        if (!snap.remote) $("push-create").checked = false;
        $("updated").textContent = `Refreshed ${new Date(snap.gatheredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        renderTags();
    }
    $("remote").value = state.snapshot.remote;
    showPlan(state.pending);
    const resultKey = JSON.stringify(state.result);
    if (state.result && resultKey !== lastResult) {
        lastResult = resultKey;
        notify(state.result.message, !state.result.ok);
    }
}

function prepare(input) {
    return task(async () => { await api("prepare", input); }, "Preparing tag preview...");
}

$("refresh").addEventListener("click", () => task(async () => {
    await api("refresh", {});
    notify("Tags refreshed.");
}, "Reading local and remote tags..."));
$("remote").addEventListener("change", () => task(async () => {
    await api("remote", { remote: $("remote").value });
    notify("Remote selected.");
}, "Reading remote tags..."));
$("search").addEventListener("input", renderTags);
$("filter").addEventListener("change", renderTags);
$("create").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    prepare({ operation: "create", name: data.get("name"), target: data.get("target"), message: data.get("message"), push: data.get("push") === "on" });
});
$("confirmation").addEventListener("input", () => {
    $("execute").disabled = busy || $("confirmation").value !== activePlan?.name;
});
$("confirm-form").addEventListener("submit", event => {
    event.preventDefault();
    task(async () => {
        await api("execute", { id: activePlan.id, confirmation: $("confirmation").value });
    }, "Applying confirmed tag operation...");
});
function cancel() {
    return task(async () => { await api("cancel", { id: activePlan.id }); }, "Preview cancelled.");
}
$("cancel").addEventListener("click", cancel);
$("confirm").addEventListener("cancel", event => { event.preventDefault(); cancel(); });

sync().then(() => notify("Ready. Preview any change before confirming.")).catch(error => notify(error.message, true));
setInterval(() => {
    if (!busy) sync().catch(error => notify(`Cannot update the canvas: ${error.message}. Try Refresh tags.`, true));
}, 3000);
