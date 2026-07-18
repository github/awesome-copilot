// Renderer for the "Create connector namespace" wizard page. Mirrors the
// portal's CreateConnectorGatewayPage: subscription -> resource group
// (existing or new) -> region -> name (live availability) -> managed identity
// (system + user-assigned) -> real ARM provisioning.

import { baseStyles, brandMark } from "./renderer.mjs";

function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Connector namespace regions — kept in sync with the portal's
// CONNECTOR_NAMESPACE_REGIONS list (constants.ts).
const REGIONS = [
    ["australiaeast", "Australia East"], ["brazilsouth", "Brazil South"],
    ["canadacentral", "Canada Central"], ["canadaeast", "Canada East"],
    ["centralindia", "Central India"], ["centralus", "Central US"],
    ["eastasia", "East Asia"], ["eastus", "East US"], ["eastus2", "East US 2"],
    ["francecentral", "France Central"], ["germanywestcentral", "Germany West Central"],
    ["italynorth", "Italy North"], ["japaneast", "Japan East"],
    ["koreacentral", "Korea Central"], ["northcentralus", "North Central US"],
    ["northeurope", "North Europe"], ["norwayeast", "Norway East"],
    ["polandcentral", "Poland Central"], ["southafricanorth", "South Africa North"],
    ["southcentralus", "South Central US"], ["southindia", "South India"],
    ["southeastasia", "Southeast Asia"], ["spaincentral", "Spain Central"],
    ["swedencentral", "Sweden Central"], ["switzerlandnorth", "Switzerland North"],
    ["uaenorth", "UAE North"], ["uksouth", "UK South"],
    ["westcentralus", "West Central US"], ["westus2", "West US 2"],
    ["westus3", "West US 3"],
];

const DEFAULT_REGION = "eastus";

export function renderCreateNamespaceHtml(subscriptions, preselectedSub = "", capabilityToken = "") {
    const subOptions = subscriptions.map((s) =>
        `<option value="${esc(s.id)}"${s.id === preselectedSub ? " selected" : ""}>${esc(s.name)} (${esc(s.id.slice(0, 8))}\u2026)</option>`
    ).join("");

    const regionOptions = REGIONS.map(([v, l]) =>
        `<option value="${v}"${v === DEFAULT_REGION ? " selected" : ""}>${l}</option>`
    ).join("");

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Create Connector Namespace</title>${baseStyles()}
<style>
.crt-back { display:inline-flex; align-items:center; gap:.35rem; background:none; border:0; color:var(--fg-muted); font:inherit; font-size:.8rem; cursor:pointer; padding:0; margin-bottom:.65rem; }
.crt-back:hover { color:var(--accent); }
.field { margin-bottom: 1rem; }
.field > label { display:block; font-size:.8rem; font-weight:600; margin-bottom:.3rem; }
.field .hint { font-size:.72rem; color:var(--fg-muted); margin-top:.25rem; }
.crt-input { width:100%; padding:.45rem .65rem; border-radius:4px; border:1px solid var(--border-strong); background:var(--bg); color:var(--fg); font-size:.85rem; font-family:inherit; box-sizing:border-box; }
.crt-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
.seg { display:inline-flex; border:1px solid var(--border-strong); border-radius:6px; overflow:hidden; margin-bottom:.4rem; }
.seg button { appearance:none; border:0; background:var(--bg); color:var(--fg-muted); font:inherit; font-size:.78rem; padding:.32rem .7rem; cursor:pointer; }
.seg button.active { background:var(--accent); color:#fff; }
.name-status { font-size:.74rem; margin-top:.3rem; min-height:1rem; }
.name-status.ok { color:var(--accent); }
.name-status.bad { color:var(--danger); }
.name-status.checking { color:var(--fg-muted); }
.idn-row { display:flex; align-items:center; gap:.5rem; padding:.35rem .15rem; }
.idn-row label { font-size:.82rem; }
.uami-box { border:1px solid var(--border); border-radius:6px; padding:.4rem .55rem; max-height:160px; overflow-y:auto; }
.uami-item { display:flex; align-items:center; gap:.55rem; padding:.3rem .15rem; font-size:.8rem; }
.uami-item .meta { color:var(--fg-muted); font-size:.72rem; }
.uami-empty { font-size:.78rem; color:var(--fg-muted); padding:.3rem .15rem; }
.crt-actions { display:flex; gap:.6rem; justify-content:flex-end; align-items:center; margin-top:1.4rem; }
.btn { appearance:none; font:inherit; font-size:.83rem; padding:.5rem 1rem; border-radius:6px; cursor:pointer; border:1px solid var(--border-strong); background:var(--bg); color:var(--fg); }
.btn:hover { border-color:var(--accent); }
.btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.btn.primary:hover { background:var(--accent-hover); border-color:var(--accent-hover); }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn.primary:disabled:hover { background:var(--accent); border-color:var(--accent); }
.progress { display:none; margin-top:1rem; padding:.7rem .85rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-hover); font-size:.82rem; }
.progress .spin { display:inline-block; width:14px; height:14px; border:2px solid var(--bg-pill); border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; vertical-align:-2px; margin-right:.5rem; }
.progress.error { border-color:var(--danger); color:var(--danger); }
.progress.success { border-color:var(--accent); }
@keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
</style></head><body>
<button class="crt-back" id="back-btn" type="button">\u2190 Back to namespaces</button>
<div class="header brand-head">
    <h1>${brandMark(28, "create")}<span>Create connector namespace</span></h1>
    <div class="sub">Provisions a real Azure connector namespace (Microsoft.Web/connectorGateways) in your subscription.</div>
</div>

<div class="field">
    <label for="sub-select">Subscription</label>
    <select id="sub-select" class="crt-input">
        <option value="">-- Select subscription --</option>
        ${subOptions}
    </select>
</div>

<div class="field">
    <label>Resource group</label>
    <div class="seg" id="rg-mode">
        <button type="button" data-mode="existing" class="active">Use existing</button>
        <button type="button" data-mode="new">Create new</button>
    </div>
    <select id="rg-select" class="crt-input"><option value="">-- Select subscription first --</option></select>
    <input id="rg-new" class="crt-input" type="text" placeholder="New resource group name" autocomplete="off" spellcheck="false" style="display:none;">
    <div class="hint" id="rg-hint">Pick the resource group the namespace will live in.</div>
</div>

<div class="field">
    <label for="region-select">Region</label>
    <select id="region-select" class="crt-input">${regionOptions}</select>
</div>

<div class="field">
    <label for="name-input">Name</label>
    <input id="name-input" class="crt-input" type="text" placeholder="my-connector-namespace" autocomplete="off" spellcheck="false">
    <div class="name-status" id="name-status"></div>
</div>

<div class="field">
    <label>Managed identity</label>
    <div class="idn-row">
        <input type="checkbox" id="sys-identity">
        <label for="sys-identity">System-assigned</label>
    </div>
    <div class="idn-row">
        <input type="checkbox" id="uami-toggle">
        <label for="uami-toggle">User-assigned</label>
    </div>
    <div class="uami-box" id="uami-box" style="display:none;"><div class="uami-empty">Select a subscription to list identities.</div></div>
</div>

<div class="crt-actions">
    <button class="btn" id="cancel-btn" type="button">Cancel</button>
    <button class="btn primary" id="create-btn" type="button" disabled>Create</button>
</div>

<div class="progress" id="progress"></div>

<script>
const connectorNamespaceToken = ${JSON.stringify(capabilityToken)};
const rawFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input && input.url;
    if (url && (url.startsWith("/api/") || url.startsWith("/oauth-status"))) {
        const next = { ...init };
        const headers = new Headers(next.headers || (typeof input !== "string" ? input.headers : undefined));
        headers.set("x-connector-namespace-token", connectorNamespaceToken);
        next.headers = headers;
        return rawFetch(input, next);
    }
    return rawFetch(input, init);
};

const subSelect = document.getElementById("sub-select");
const rgModeWrap = document.getElementById("rg-mode");
const rgSelect = document.getElementById("rg-select");
const rgNew = document.getElementById("rg-new");
const rgHint = document.getElementById("rg-hint");
const regionSelect = document.getElementById("region-select");
const nameInput = document.getElementById("name-input");
const nameStatus = document.getElementById("name-status");
const sysIdentity = document.getElementById("sys-identity");
const uamiBox = document.getElementById("uami-box");
const uamiToggle = document.getElementById("uami-toggle");
const createBtn = document.getElementById("create-btn");
const backBtn = document.getElementById("back-btn");
const cancelBtn = document.getElementById("cancel-btn");
const progress = document.getElementById("progress");

let rgMode = "existing";
let nameCheck = "idle"; // idle | checking | available | taken | error
let creating = false;
let nameTimer = null;
let checkSeq = 0;
let resourceGroupsSeq = 0;
let identitiesSeq = 0;

backBtn.onclick = () => { if (!creating) window.location.href = "/setup"; };
cancelBtn.onclick = () => { if (!creating) window.location.href = "/setup"; };

function setFormLocked(locked) {
    for (const control of document.querySelectorAll("button, input, select")) {
        if (locked) {
            if (control.dataset.preCreateDisabled === undefined) {
                control.dataset.preCreateDisabled = control.disabled ? "1" : "0";
            }
            control.disabled = true;
        } else {
            control.disabled = control.dataset.preCreateDisabled === "1";
            delete control.dataset.preCreateDisabled;
        }
    }
    document.body.setAttribute("aria-busy", locked ? "true" : "false");
}

function escH(s) { return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function effectiveRg() {
    return rgMode === "new" ? rgNew.value.trim() : rgSelect.value;
}

function nameError() {
    const v = nameInput.value.trim();
    if (!v) return "Name is required";
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(v)) return "Start with a letter/number; letters, numbers and hyphens only";
    if (v.length > 64) return "Max 64 characters";
    return "";
}

function refreshButton() {
    const ok = !!subSelect.value && !!effectiveRg() && !!regionSelect.value &&
        !nameError() && nameCheck === "available" && !creating;
    createBtn.disabled = !ok;
}

// --- Resource group mode toggle ---
rgModeWrap.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
        rgMode = b.dataset.mode;
        rgModeWrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
        rgSelect.style.display = rgMode === "existing" ? "block" : "none";
        rgNew.style.display = rgMode === "new" ? "block" : "none";
        rgHint.textContent = rgMode === "new"
            ? "A new resource group is created in the selected region."
            : "Pick the resource group the namespace will live in.";
        scheduleNameCheck();
        refreshButton();
    };
});

uamiToggle.addEventListener("change", () => {
    if (uamiToggle.checked) {
        uamiBox.style.display = "";
        loadIdentities();
    } else {
        uamiBox.style.display = "none";
    }
});

// --- Subscription change: load resource groups + identities ---
subSelect.addEventListener("change", () => {
    loadResourceGroups();
    if (uamiToggle.checked) loadIdentities();
    scheduleNameCheck();
    refreshButton();
});

async function loadResourceGroups() {
    const seq = ++resourceGroupsSeq;
    const sub = subSelect.value;
    if (!sub) { rgSelect.innerHTML = '<option value="">-- Select subscription first --</option>'; return; }
    rgSelect.innerHTML = '<option value="">Loading\u2026</option>';
    try {
        const res = await fetch("/api/resource-groups?subscriptionId=" + encodeURIComponent(sub));
        const data = await res.json();
        if (seq !== resourceGroupsSeq || sub !== subSelect.value) return;
        if (data.error) { rgSelect.innerHTML = '<option value="">Error loading groups</option>'; return; }
        const opts = (data.resourceGroups || []).map((g) =>
            '<option value="' + escH(g.name) + '">' + escH(g.name) + ' (' + escH(g.location) + ')</option>'
        ).join("");
        rgSelect.innerHTML = '<option value="">-- Select resource group --</option>' + opts;
    } catch (e) {
        if (seq !== resourceGroupsSeq) return;
        rgSelect.innerHTML = '<option value="">Error loading groups</option>';
    }
}

async function loadIdentities() {
    const seq = ++identitiesSeq;
    const sub = subSelect.value;
    if (!sub) { uamiBox.innerHTML = '<div class="uami-empty">Select a subscription to list identities.</div>'; return; }
    uamiBox.innerHTML = '<div class="uami-empty">Loading identities\u2026</div>';
    try {
        const res = await fetch("/api/identities?subscriptionId=" + encodeURIComponent(sub));
        const data = await res.json();
        if (seq !== identitiesSeq || sub !== subSelect.value) return;
        if (data.error) { uamiBox.innerHTML = '<div class="uami-empty">Error loading identities</div>'; return; }
        const ids = data.identities || [];
        if (!ids.length) { uamiBox.innerHTML = '<div class="uami-empty">No user-assigned identities in this subscription.</div>'; return; }
        uamiBox.innerHTML = ids.map((id, index) =>
            '<div class="uami-item"><input type="checkbox" class="uami-cb" value="' + escH(id.id) + '" id="uami-' + index + '">' +
            '<label for="uami-' + index + '">' + escH(id.name) +
            ' <span class="meta">' + escH(id.resourceGroup) + ' \u2022 ' + escH(id.location) + '</span></label></div>'
        ).join("");
    } catch (e) {
        if (seq !== identitiesSeq) return;
        uamiBox.innerHTML = '<div class="uami-empty">Error loading identities</div>';
    } finally {
        if (creating) setFormLocked(true);
    }
}

function selectedUserAssignedIds() {
    if (!uamiToggle.checked) return [];
    return [...uamiBox.querySelectorAll(".uami-cb:checked")].map((c) => c.value);
}

// --- Name availability check (debounced) ---
nameInput.addEventListener("input", () => { scheduleNameCheck(); });
rgSelect.addEventListener("change", () => { scheduleNameCheck(); refreshButton(); });
rgNew.addEventListener("input", () => { scheduleNameCheck(); refreshButton(); });
regionSelect.addEventListener("change", refreshButton);

function scheduleNameCheck() {
    clearTimeout(nameTimer);
    checkSeq++;
    const err = nameError();
    if (err) {
        nameCheck = "idle";
        nameStatus.className = "name-status bad";
        nameStatus.textContent = nameInput.value.trim() ? err : "";
        refreshButton();
        return;
    }
    if (!subSelect.value || !effectiveRg()) {
        nameCheck = "idle";
        nameStatus.className = "name-status";
        nameStatus.textContent = "Select a subscription and resource group to check availability.";
        refreshButton();
        return;
    }
    nameCheck = "checking";
    nameStatus.className = "name-status checking";
    nameStatus.textContent = "Checking availability\u2026";
    refreshButton();
    nameTimer = setTimeout(runNameCheck, 450);
}

async function runNameCheck() {
    const seq = checkSeq;
    const sub = subSelect.value, rg = effectiveRg(), name = nameInput.value.trim();
    try {
        const res = await fetch("/api/check-name?subscriptionId=" + encodeURIComponent(sub) +
            "&resourceGroup=" + encodeURIComponent(rg) + "&name=" + encodeURIComponent(name));
        const data = await res.json();
        if (seq !== checkSeq) return; // stale
        if (data.error) {
            nameCheck = "error";
            nameStatus.className = "name-status bad";
            nameStatus.textContent = "Could not check availability";
        } else if (data.available) {
            nameCheck = "available";
            nameStatus.className = "name-status ok";
            nameStatus.textContent = "\u2713 Available";
        } else {
            nameCheck = "taken";
            nameStatus.className = "name-status bad";
            nameStatus.textContent = "\u2717 Name already in use in this resource group";
        }
    } catch (e) {
        if (seq !== checkSeq) return;
        nameCheck = "error";
        nameStatus.className = "name-status bad";
        nameStatus.textContent = "Could not check availability";
    }
    refreshButton();
}

// --- Create ---
createBtn.onclick = async () => {
    if (createBtn.disabled) return;
    const request = {
        subscriptionId: subSelect.value,
        resourceGroup: effectiveRg(),
        createNewResourceGroup: rgMode === "new",
        region: regionSelect.value,
        name: nameInput.value.trim(),
        enableSystemIdentity: sysIdentity.checked,
        userAssignedIds: selectedUserAssignedIds(),
    };
    creating = true;
    setFormLocked(true);
    createBtn.textContent = "Creating\u2026";
    progress.className = "progress";
    progress.style.display = "block";
    progress.innerHTML = '<span class="spin"></span>' + (rgMode === "new" ? "Creating resource group and namespace\u2026" : "Creating connector namespace\u2026");
    try {
        const res = await fetch("/api/create-namespace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        const data = await res.json();
        if (data.ok) {
            progress.className = "progress success";
            progress.textContent = "\u2713 Created \u201c" + request.name + "\u201d. Opening\u2026";
            window.location.href = "/";
            return;
        }
        progress.className = "progress error";
        progress.textContent = data.error || "Failed to create connector namespace.";
    } catch (e) {
        progress.className = "progress error";
        progress.textContent = "Failed to create connector namespace.";
    }
    creating = false;
    setFormLocked(false);
    createBtn.textContent = "Create";
    refreshButton();
};

// --- Init (subscription may be preselected from the setup page) ---
if (subSelect.value) { loadResourceGroups(); if (uamiToggle.checked) loadIdentities(); }
scheduleNameCheck();
</script></body></html>`;
}
