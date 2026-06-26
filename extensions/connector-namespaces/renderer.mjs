// Renderers for the connector namespace picker and connector catalog pages.
// Styled to match the reference connector extension UI.

// Official Azure Connector Namespace mark — a gray viewfinder frame wrapping
// two interlocking blue-gradient chain links. Path + gradient data is lifted
// verbatim from the portal's ConnectorNamespaceIcon brand asset. idSuffix keeps
// the gradient element IDs unique when the mark renders more than once per page.
export function brandMark(size = 28, idSuffix = "m") {
    const g0 = `cn-g0-${idSuffix}`;
    const g1 = `cn-g1-${idSuffix}`;
    return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
        + `<defs>`
        + `<linearGradient id="${g0}" x1="-609.66" y1="-210.47" x2="-609.66" y2="-216.53" gradientTransform="translate(617.13 -205.76) scale(1 -1)" gradientUnits="userSpaceOnUse">`
        + `<stop offset=".23" stop-color="#5ea0ef"/><stop offset=".32" stop-color="#5b9fee"/><stop offset=".48" stop-color="#509aeb"/><stop offset=".57" stop-color="#3f92e6"/><stop offset=".75" stop-color="#2688df"/><stop offset=".93" stop-color="#127fd9"/>`
        + `</linearGradient>`
        + `<linearGradient id="${g1}" x1="-606.62" y1="-212.99" x2="-606.62" y2="-219.05" gradientTransform="translate(617.13 -205.76) scale(1 -1)" gradientUnits="userSpaceOnUse">`
        + `<stop offset=".02" stop-color="#5ea0ef"/><stop offset=".14" stop-color="#5b9fee"/><stop offset=".23" stop-color="#5b9fee"/><stop offset=".34" stop-color="#509aeb"/><stop offset=".44" stop-color="#3f92e6"/><stop offset=".63" stop-color="#2688df"/><stop offset=".93" stop-color="#127fd9"/>`
        + `</linearGradient>`
        + `</defs>`
        + `<path d="M1.07,1.43h1.29v3.6c0,.16-.13.29-.29.29H.79c-.16,0-.28-.12-.29-.28V2c0-.31.26-.57.57-.57Z" fill="#999"/>`
        + `<path d="M1.07,1.43h1.29v3.6c0,.16-.13.29-.29.29H.79c-.16,0-.28-.12-.29-.28V2c0-.31.26-.57.57-.57Z" fill="#999" opacity=".5"/>`
        + `<path d="M15.64,1.43h1.29c.32,0,.57.25.57.57v3.03c0,.16-.13.29-.29.29h-1.29c-.16,0-.29-.13-.29-.29V1.43Z" fill="#999"/>`
        + `<path d="M15.64,1.43h1.29c.32,0,.57.25.57.57v3.03c0,.16-.13.29-.29.29h-1.29c-.16,0-.29-.13-.29-.29V1.43Z" fill="#999" opacity=".5"/>`
        + `<path d="M17.5,2v1.25H.5v-1.25c0-.31.25-.57.57-.57h15.87c.31,0,.56.25.56.57Z" fill="#949494"/>`
        + `<path d="M.79,12.68h1.29c.16,0,.29.13.29.29v3.6h-1.29c-.31,0-.57-.25-.57-.56v-3.03c0-.16.13-.29.29-.29Z" fill="#999"/>`
        + `<path d="M.79,12.68h1.29c.16,0,.29.13.29.29v3.6h-1.29c-.31,0-.57-.25-.57-.56v-3.03c0-.16.13-.29.29-.29Z" fill="#999" opacity=".5"/>`
        + `<path d="M15.92,12.68h1.29c.16,0,.29.13.29.29v3.03c0,.32-.26.57-.57.57h-1.29v-3.6c0-.16.12-.29.28-.29h0Z" fill="#999"/>`
        + `<path d="M15.92,12.68h1.29c.16,0,.29.13.29.29v3.03c0,.32-.26.57-.57.57h-1.29v-3.6c0-.16.12-.29.28-.29h0Z" fill="#999" opacity=".5"/>`
        + `<path d="M.5,16v-1.25h17v1.25c0,.31-.25.57-.57.57H1.07c-.31,0-.57-.25-.57-.57Z" fill="#949494"/>`
        + `<path d="M8.7,4.71h-2.42c-1.67,0-3.02,1.37-3.01,3.04,0,1.48,1.08,2.73,2.54,2.97-.06-.37-.05-.76.03-1.12-1.03-.23-1.68-1.25-1.45-2.29.2-.88.99-1.51,1.89-1.49h2.42c1.06,0,1.92.86,1.92,1.92,0,1.06-.86,1.92-1.92,1.92h-.67c-.09.19-.14.4-.14.61,0,.17.03.34.1.51h.72c1.67-.03,3-1.41,2.97-3.09-.03-1.63-1.34-2.94-2.97-2.97h0Z" fill="url(#${g0})"/>`
        + `<path d="M12.2,7.28c.02.15.03.31.04.46,0,.22-.02.44-.07.66,1.03.23,1.69,1.24,1.46,2.27-.19.89-.99,1.52-1.9,1.51h-2.42c-1.06,0-1.92-.86-1.92-1.92,0-1.06.86-1.92,1.92-1.92h.67c.17-.35.19-.75.05-1.11h-.71c-1.67,0-3.03,1.36-3.03,3.03s1.36,3.03,3.03,3.03h2.42c1.67-.01,3.02-1.38,3.01-3.05-.01-1.48-1.09-2.73-2.54-2.97h0Z" fill="url(#${g1})"/>`
        + `</svg>`;
}

export function baseStyles() {
    return `<style>
:root {
    color-scheme: light dark;
    --fg: #1b1b1b;
    --fg-muted: #616161;
    --fg-subtle: #8a8a8a;
    --bg: #ffffff;
    --bg-hover: #f5f5f5;
    --bg-pill: #eef4fb;
    --border: #e1e1e1;
    --border-strong: #c8c8c8;
    --accent: #0f6cbd;
    --accent-hover: #0a5494;
    --success: #107c10;
    --success-bg: #dff6dd;
    --warning: #ca5010;
    --warning-bg: #fff4ce;
    --danger: #c50f1f;
}
@media (prefers-color-scheme: dark) {
    :root {
        --fg: #f0f0f0;
        --fg-muted: #b0b0b0;
        --fg-subtle: #8a8a8a;
        --bg: #1f1f1f;
        --bg-hover: #2a2a2a;
        --bg-pill: #1d2b3a;
        --border: #383838;
        --border-strong: #4a4a4a;
        --accent: #2899f5;
        --accent-hover: #4cb1ff;
        --success: #6ccb5f;
        --success-bg: #143b16;
        --warning: #f7b676;
        --warning-bg: #4a2c0a;
        --danger: #f1707b;
    }
}
* { box-sizing: border-box; }
body {
    font-family: "Segoe UI Variable", "Segoe UI", -apple-system, system-ui, sans-serif;
    margin: 0;
    padding: 1.5rem 2rem 4rem;
    max-width: 1100px;
    color: var(--fg);
    background: var(--bg);
    font-size: 14px;
    line-height: 1.4;
}
.header { margin-bottom: 1.25rem; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
h1 { font-size: 1.4rem; font-weight: 600; margin: 0; }
.lede { color: var(--fg); font-size: .9rem; margin: .35rem 0 .15rem; }
.sub { color: var(--fg-subtle); font-size: .76rem; }
.sub code { font-family: inherit; font-weight: 600; color: var(--fg-muted); }

.search-wrap {
    position: relative;
    margin: 1rem 0 .75rem;
}
.search-wrap input {
    width: 100%;
    padding: .55rem .75rem .55rem 2.1rem;
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    font-size: .9rem;
    font-family: inherit;
}
.search-wrap input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
}
.search-wrap .icon {
    position: absolute;
    left: .7rem;
    top: 50%;
    transform: translateY(-50%);
    width: 16px; height: 16px;
    color: var(--fg-subtle);
    pointer-events: none;
}

.section { margin-top: 1.5rem; }
.section-title {
    display: flex; align-items: center; gap: 1rem;
    color: var(--fg-muted); font-size: .82rem; font-weight: 600;
    text-transform: none; margin: 0 0 .65rem;
}
.section-title::before, .section-title::after {
    content: ""; flex: 1; height: 1px; background: var(--border);
}

.grid { display: grid; grid-template-columns: 1fr; gap: .25rem .5rem; }
.item {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    gap: .75rem; align-items: center;
    padding: .55rem .65rem; border-radius: 4px;
    cursor: default; border: 1px solid transparent;
    transition: background-color 80ms, border-color 80ms;
}
.item:hover { background: var(--bg-hover); border-color: var(--border); }

.item-icon {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; overflow: hidden;
    background: var(--bg-pill); color: var(--accent);
    font-weight: 600; font-size: 1rem; flex-shrink: 0;
}
.item-icon img { width: 32px; height: 32px; object-fit: contain; }

.item-body { min-width: 0; }
.item-name {
    font-weight: 600; color: var(--fg);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-desc {
    font-size: .75rem; color: var(--fg-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: .1rem;
}

.item-add {
    padding: .25rem .65rem; border-radius: 3px;
    border: 1px solid var(--border-strong);
    background: var(--bg); color: var(--fg);
    font-size: .78rem; font-family: inherit; cursor: pointer;
    transition: opacity 80ms; white-space: nowrap;
    min-width: 72px; text-align: center;
}
.item-add:hover { border-color: var(--accent); color: var(--accent); }
/* Quiet at rest so a long catalog isn't a wall of identical blue CTAs; the
   active row promotes its Connect button to filled accent on hover or focus. */
.item-add.primary { background: transparent; border-color: var(--accent); color: var(--accent); }
.item:hover .item-add.primary, .item:focus-within .item-add.primary, .item-add.primary:hover, .item-add.primary:focus-visible { background: var(--accent); border-color: var(--accent); color: #fff; }
.item-add.added { color: var(--success); border-color: var(--success-bg); background: var(--success-bg); cursor: default; }
.item-add.added:hover { border-color: var(--success-bg); color: var(--success); }

.change-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: .3rem .6rem; border-radius: 4px;
    border: 1px solid var(--border-strong);
    background: transparent; color: var(--fg-muted);
    font-size: .75rem; cursor: pointer; font-family: inherit;
}
.change-btn:hover { border-color: var(--accent); color: var(--accent); }

.gw-actions { display: flex; gap: .5rem; margin-top: .6rem; flex-wrap: wrap; }
.gw-action svg { width: 13px; height: 13px; flex: none; }
#gw-toast {
    position: fixed; left: 50%; bottom: 1rem;
    transform: translateX(-50%) translateY(.5rem);
    max-width: 90%; padding: .5rem .8rem; border-radius: 6px;
    background: var(--bg-hover); color: var(--fg);
    border: 1px solid var(--border-strong);
    font-size: .76rem; box-shadow: 0 4px 16px rgba(0,0,0,.35);
    opacity: 0; pointer-events: none; z-index: 1000;
    transition: opacity .15s ease, transform .15s ease;
    overflow-wrap: anywhere;
}
#gw-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
#gw-toast.err { border-color: var(--danger); color: var(--danger); }

.empty {
    color: var(--fg-subtle); font-size: .85rem;
    padding: .75rem .65rem; border: 1px dashed var(--border);
    border-radius: 4px; text-align: center;
}

/* Setup page */
.setup-card {
    display: flex; align-items: center; gap: 12px;
    padding: .65rem .75rem; border-radius: 4px;
    border: 1px solid var(--border); cursor: pointer;
    transition: background-color 80ms, border-color 80ms;
    margin-bottom: .35rem;
}
.setup-card:hover { background: var(--bg-hover); border-color: var(--accent); }
.setup-card-name { font-weight: 600; font-size: .9rem; }
.setup-card-meta { font-size: .75rem; color: var(--fg-muted); }
.loading { text-align: center; padding: 2rem; color: var(--fg-muted); font-size: .85rem; }
select {
    width: 100%; padding: .5rem .75rem; border-radius: 4px;
    border: 1px solid var(--border-strong);
    background: var(--bg); color: var(--fg);
    font-size: .9rem; font-family: inherit;
}
select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
label { font-size: .82rem; font-weight: 600; display: block; margin-bottom: .3rem; color: var(--fg-muted); }
.brand-head h1 { display: flex; align-items: center; gap: .55rem; }
.brand-mark { flex: none; display: block; }
@keyframes brandPulse { 0%, 100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1); } }
.brand-loading { display: inline-flex; animation: brandPulse 1.1s ease-in-out infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
button:focus-visible, a:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--color-focus-outline, var(--accent)); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
    /* Only tame transitions and scrolling under reduced motion. Every CSS
       animation in this canvas is a FUNCTIONAL loading indicator: the
       .brand-loading nav overlay (shown while changing namespace), the
       .si-spin sign-in/install spinner, and the .skeleton loading cards.
       Freezing any of them mid-loop reads as a broken/stuck UI, not a calmer
       one — the "Change namespace" overlay logo froze for exactly this
       reason. The in-app webview reports prefers-reduced-motion: reduce, so
       anything disabled here is disabled in the real product. Do NOT add
       animation:none (or pause/iteration-count) for any loader here. */
    *, *::before, *::after { transition-duration: .001ms !important; scroll-behavior: auto !important; }
}
</style>`;
}

// ---------------------------------------------------------------------------
// Setup / Namespace Picker
// ---------------------------------------------------------------------------

export function renderSetupHtml(subscriptions) {
    const subOptions = subscriptions.map((s) =>
        `<option value="${s.id}">${esc(s.name)} (${s.id.slice(0, 8)}\u2026)</option>`
    ).join("");

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Select Connector Namespace</title>${baseStyles()}
<style>
.skeleton { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .8; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.skeleton-card {
    height: 52px; border-radius: 4px; margin-bottom: .35rem;
    background: var(--bg-hover); border: 1px solid var(--border);
}
#gw-filter {
    width: 100%; padding: .45rem .75rem; border-radius: 4px;
    border: 1px solid var(--border-strong); background: var(--bg);
    color: var(--fg); font-size: .85rem; font-family: inherit;
    margin-bottom: .6rem; display: none;
}
#gw-filter:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.create-row { margin: 0 0 1rem; }
.create-link {
    display: flex; align-items: center; justify-content: center; gap: .45rem;
    width: 100%; box-sizing: border-box;
    appearance: none; font: inherit; font-size: .82rem; font-weight: 600; cursor: pointer;
    padding: .55rem .75rem; border-radius: 6px;
    border: 1px solid var(--accent); background: transparent; color: var(--accent);
}
.create-link:hover { background: var(--accent); color: #fff; }
.create-link .plus { font-size: 1.05rem; line-height: 1; font-weight: 700; }
</style></head><body>
<div class="header brand-head">
    <h1>${brandMark(30, "setup")}<span>Select a Connector Namespace</span></h1>
    <div class="sub">Choose which connector namespace to browse. This choice is saved for future sessions.</div>
</div>
<div class="create-row">
    <button id="create-ns-btn" class="create-link" type="button"><span class="plus">+</span><span>New connector namespace</span></button>
</div>
<div style="margin-bottom: 1rem;">
    <label>Subscription</label>
    <select id="sub-select">
        <option value="">-- Select subscription --</option>
        ${subOptions}
    </select>
</div>
<input id="gw-filter" type="text" placeholder="Filter namespaces by name\u2026" autocomplete="off" spellcheck="false">
<div id="gateway-list">
    <div class="empty">Select a subscription to see available connector namespaces.</div>
</div>
<script>
const subSelect = document.getElementById("sub-select");
const gatewayList = document.getElementById("gateway-list");
const gwFilter = document.getElementById("gw-filter");
document.getElementById("create-ns-btn").addEventListener("click", () => {
    window.location.href = "/create" + (subSelect.value ? "?subscriptionId=" + encodeURIComponent(subSelect.value) : "");
});
let allGateways = [];
let hasMoreGateways = false;
let loadedAll = false;

subSelect.addEventListener("change", async () => {
    const subId = subSelect.value;
    allGateways = [];
    gwFilter.style.display = "none";
    gwFilter.value = "";
    hasMoreGateways = false;
    loadedAll = false;
    if (!subId) { gatewayList.innerHTML = '<div class="empty">Select a subscription to see available connector namespaces.</div>'; return; }
    // Show skeleton
    gatewayList.innerHTML = Array(3).fill('<div class="skeleton-card skeleton"></div>').join("");
    try {
        const res = await fetch("/api/gateways?subscriptionId=" + encodeURIComponent(subId));
        const data = await res.json();
        if (data.error) { gatewayList.innerHTML = '<div class="empty" style="color:var(--danger);">' + escH(data.error) + '</div>'; return; }
        if (!data.gateways || data.gateways.length === 0) {
            gatewayList.innerHTML = '<div class="empty">No connector namespaces found in this subscription.</div>';
            return;
        }
        allGateways = data.gateways.map(gw => {
            const parts = gw.id.split("/");
            return {
                subscriptionId: subId,
                resourceGroup: parts[parts.indexOf("resourceGroups") + 1] || "",
                name: gw.name || parts[parts.length - 1],
                location: gw.location || "",
            };
        });
        gwFilter.style.display = "block";
        hasMoreGateways = !!data.hasMore;
        loadedAll = !data.hasMore;
        renderGateways("", data.hasMore);
    } catch (err) {
        gatewayList.innerHTML = '<div class="empty" style="color:var(--danger);">Error: ' + escH(err.message) + '</div>';
    }
});

let filterTimer = null;
gwFilter.addEventListener("input", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(async () => {
        const q = gwFilter.value.trim();
        // If user is typing and we only have partial results, load everything first
        if (q && hasMoreGateways && !loadedAll) {
            await loadAll();
        }
        renderGateways(gwFilter.value, hasMoreGateways && !loadedAll);
    }, 200);
});

function renderGateways(filter, hasMore) {
    const q = filter.toLowerCase().trim();
    const visible = q ? allGateways.filter(g => g.name.toLowerCase().includes(q) || g.resourceGroup.toLowerCase().includes(q)) : allGateways;
    if (!visible.length) {
        gatewayList.innerHTML = '<div class="empty">No namespaces match \u201c' + escH(filter) + '\u201d.</div>';
        return;
    }
    let html = visible.map(gw =>
        '<div class="setup-card" data-sub="' + escH(gw.subscriptionId) + '" data-rg="' + escH(gw.resourceGroup) + '" data-name="' + escH(gw.name) + '">' +
        '<div><div class="setup-card-name">' + escH(gw.name) + '</div>' +
        '<div class="setup-card-meta">' + escH(gw.resourceGroup) + ' \u2022 ' + escH(gw.location) + '</div></div></div>'
    ).join("");
    if (hasMore) {
        html += '<button id="load-more" style="margin-top:.5rem;width:100%;padding:.5rem;border-radius:4px;border:1px solid var(--border-strong);background:var(--bg);color:var(--fg-muted);font-size:.82rem;cursor:pointer;font-family:inherit;">Load all namespaces\u2026</button>';
    }
    gatewayList.innerHTML = html;
    gatewayList.querySelectorAll(".setup-card").forEach(el => {
        el.onclick = () => selectGateway(el.dataset.sub, el.dataset.rg, el.dataset.name);
    });
    if (hasMore) {
        document.getElementById("load-more").onclick = loadAll;
    }
}

async function loadAll() {
    const subId = subSelect.value;
    const btn = document.getElementById("load-more");
    if (btn) { btn.disabled = true; btn.textContent = "Loading\u2026"; }
    try {
        const res = await fetch("/api/gateways?subscriptionId=" + encodeURIComponent(subId) + "&all=true");
        const data = await res.json();
        if (data.gateways) {
            allGateways = data.gateways.map(gw => {
                const parts = gw.id.split("/");
                return {
                    subscriptionId: subId,
                    resourceGroup: parts[parts.indexOf("resourceGroups") + 1] || "",
                    name: gw.name || parts[parts.length - 1],
                    location: gw.location || "",
                };
            });
            renderGateways(gwFilter.value, false);
            loadedAll = true;
        }
    } catch (err) {
        if (btn) { btn.textContent = "Failed \u2014 try again"; btn.disabled = false; }
    }
}

function escH(s) { return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

async function selectGateway(subscriptionId, resourceGroup, gatewayName) {
    gatewayList.innerHTML = '<div class="loading">Connecting\u2026</div>';
    const res = await fetch("/api/select-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, resourceGroup, gatewayName })
    });
    const data = await res.json();
    if (data.ok) { window.location.href = "/"; }
    else { gatewayList.innerHTML = '<div class="empty" style="color:var(--danger);">Failed to save.</div>'; }
}
</script></body></html>`;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export function renderCatalogHtml(instanceId, catalog, { filter, category, source, config }) {
    const byCategory = new Map();
    for (const c of catalog) {
        if (!byCategory.has(c.category)) byCategory.set(c.category, []);
        byCategory.get(c.category).push(c);
    }
    const sortedCats = [...byCategory.keys()].sort();

    let sectionsHtml = "";
    for (const cat of sortedCats) {
        const rows = byCategory.get(cat).sort((a, b) => a.displayName.localeCompare(b.displayName));
        const rowsHtml = rows.map((c) => {
            const icon = c.iconUri
                ? `<div class="item-icon"${c.brandColor ? ` style="background:${esc(c.brandColor)}22"` : ""}><img src="${esc(c.iconUri)}" alt=""></div>`
                : `<div class="item-icon">${esc(c.displayName.charAt(0))}</div>`;
            // Button state is hydrated client-side from /api/state on load.
            const btn = `<button class="item-add primary" data-api="${esc(c.apiName)}" data-name="${esc(c.displayName)}">Connect</button>`;
            const haystack = esc((c.displayName + " " + (c.description || "")).toLowerCase());
            return `<div class="item" data-api-item="${esc(c.apiName)}" data-search="${haystack}">${icon}<div class="item-body"><div class="item-name">${esc(c.displayName)}</div><div class="item-desc">${esc(c.description)}</div></div>${btn}</div>`;
        }).join("");
        sectionsHtml += `<div class="section"><div class="section-title">${esc(cat)}</div><div class="grid">${rowsHtml}</div></div>`;
    }

    if (!catalog.length) {
        sectionsHtml = `<div class="empty">No connectors available.</div>`;
    }

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connectors</title>${baseStyles()}<style>
.filter-bar { margin: 0 0 1.1rem; display:flex; gap:.5rem; }
.filter-pill { appearance:none; font:inherit; font-size:.8rem; padding:.3rem .75rem; border-radius:999px; border:1px solid var(--border-strong); background:var(--bg); color:var(--fg-muted); cursor:pointer; display:inline-flex; align-items:center; gap:.35rem; }
.filter-pill svg { width:12px; height:12px; }
.filter-pill:hover { border-color:var(--accent); color:var(--accent); }
.filter-pill[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fff; }
.si-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(2px); }
.si-card { background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:10px; padding:1.5rem 1.5rem 1.3rem; max-width:380px; width:88%; box-shadow:0 14px 44px rgba(0,0,0,.32); text-align:center; }
.si-spin { width:30px; height:30px; border:3px solid var(--bg-pill); border-top-color:var(--accent); border-radius:50%; margin:0 auto; animation:spin .8s linear infinite; }
.si-check { width:30px; height:30px; margin:0 auto; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; }
.si-title { font-size:1rem; font-weight:600; margin:.85rem 0 .35rem; }
.si-sub { font-size:.83rem; color:var(--fg-muted); line-height:1.5; }
.si-meta { font-size:.74rem; color:var(--fg-muted); margin-top:.75rem; min-height:1em; }
.si-actions { display:flex; gap:.5rem; justify-content:center; margin-top:1.15rem; }
.si-btn { appearance:none; font:inherit; font-size:.82rem; padding:.4rem .85rem; border-radius:6px; cursor:pointer; border:1px solid var(--border-strong); background:var(--bg); color:var(--fg); }
.si-btn:hover { background:var(--bg-hover); }
.si-btn.ghost { color:var(--fg-muted); border-color:transparent; }
.si-btn.ghost:hover { color:var(--danger); background:transparent; }
.restart-banner { display:flex; align-items:flex-start; gap:.6rem; margin:0 0 1.1rem; padding:.6rem .75rem; border-radius:6px; background:var(--bg-pill); border:1px solid var(--accent); color:var(--fg); font-size:.82rem; line-height:1.5; }
.restart-banner .rb-ico { flex:none; width:16px; height:16px; color:var(--accent); margin-top:.15rem; }
.restart-banner .rb-body { flex:1; min-width:0; }
.restart-banner .rb-body strong { font-weight:600; }
.restart-banner .rb-dismiss { flex:none; appearance:none; border:0; background:transparent; color:var(--fg-muted); font:inherit; font-size:.78rem; cursor:pointer; padding:.1rem .35rem; border-radius:4px; }
.restart-banner .rb-dismiss:hover { color:var(--accent); background:var(--bg-hover); }
.is-hidden { display:none !important; }
/* The [hidden] attribute must always win. A class rule like .restart-banner{display:flex}
   has the same (0,1,0) specificity as the UA [hidden]{display:none} rule and, being an
   author rule, overrides it -- so setting el.hidden=true does nothing and dismiss silently
   breaks. This reset restores the attribute's authority for every element. */
[hidden] { display:none !important; }
</style></head><body>
<div id="nav-overlay" style="display:none;position:fixed;inset:0;z-index:999;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;background:var(--bg);">
    <div class="brand-loading">${brandMark(46, "ovl")}</div>
</div>
<div class="header brand-head">
    <div class="head-row">
        <h1>${brandMark(24, "cat")}<span>Connectors</span></h1>
        <button class="change-btn" onclick="document.getElementById('nav-overlay').style.display='flex';window.location.href='/setup';" aria-label="Change connector namespace">Change namespace</button>
    </div>
    <div class="lede">Add Microsoft and partner tools to this Copilot session.</div>
    <div class="sub">Namespace <code>${esc(config.gatewayName)}</code> \u00b7 RG <code>${esc(config.resourceGroup)}</code></div>
    <div class="gw-actions">
        <button type="button" id="open-portal" class="change-btn gw-action" data-url="${esc("https://connectors.azure.com/" + encodeURIComponent(config.subscriptionId || "") + "/" + encodeURIComponent(config.resourceGroup || "") + "/" + encodeURIComponent(config.gatewayName || "") + "/overview")}" aria-label="Open this connector gateway in the Azure portal">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6.5 3.5H3.5v9h9v-3"/><path d="M9.5 3.5h3v3"/><path d="M12.5 3.5 7.5 8.5"/></svg>
            Open in portal
        </button>
        <button type="button" id="open-config" class="change-btn gw-action" aria-label="Open the MCP config file this session writes to">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3.5C4.5 3.5 4.5 5 4.5 6.2 4.5 7.4 3.5 8 3 8c.5 0 1.5.6 1.5 1.8 0 1.2 0 2.7 1.5 2.7"/><path d="M10 3.5c1.5 0 1.5 1.5 1.5 2.7 0 1.2 1 1.8 1.5 1.8-.5 0-1.5.6-1.5 1.8 0 1.2 0 2.7-1.5 2.7"/></svg>
            Open config file
        </button>
    </div>
</div>
<div class="search-wrap">
    <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>
    </svg>
    <input id="search" type="search" placeholder="Search connectors" autocomplete="off" spellcheck="false" value="${esc(filter)}">
</div>
<div id="filter-bar" class="filter-bar" hidden>
    <button id="filter-added" class="filter-pill" type="button" aria-pressed="false">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>
        Added (<span id="added-count">0</span>)
    </button>
</div>
<div id="restart-banner" class="restart-banner" role="status" hidden>
    <svg class="rb-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8"/><path d="M13.6 2.2v3h-3"/></svg>
    <div class="rb-body"><strong>Restart your Copilot session to use newly added tools.</strong><br>Connectors are saved to your MCP config now, but their tools only load when a session starts.</div>
    <button class="rb-dismiss" type="button" aria-label="Dismiss this message">Dismiss</button>
</div>
${sectionsHtml}
<div id="no-match" class="empty is-hidden"></div>
<script>
const input = document.getElementById("search");
const noMatch = document.getElementById("no-match");

// Gateway header actions: open the connector gateway in the Azure portal, and
// open the MCP config file this session writes connections into. Both shell out
// on the host side (loopback /api routes); the iframe only fires the fetch.
function gwToast(msg, isErr) {
    var t = document.getElementById("gw-toast");
    if (!t) { t = document.createElement("div"); t.id = "gw-toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = isErr ? "err show" : "show";
    clearTimeout(gwToast._h);
    gwToast._h = setTimeout(function () { t.classList.remove("show"); }, 4500);
}
var openPortalBtn = document.getElementById("open-portal");
if (openPortalBtn) {
    openPortalBtn.addEventListener("click", function () {
        var url = openPortalBtn.dataset.url;
        if (!url) return;
        fetch("/api/open-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url }) })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (d) { if (!d || !d.ok) gwToast("Couldn't open the portal link", true); })
            .catch(function () { gwToast("Couldn't open the portal link", true); });
    });
}
var openConfigBtn = document.getElementById("open-config");
if (openConfigBtn) {
    openConfigBtn.addEventListener("click", function () {
        openConfigBtn.disabled = true;
        fetch("/api/open-config", { method: "POST" })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (d) {
                if (d && d.ok) gwToast("Opening " + (d.path || "config file"));
                else if (d && d.path) gwToast("Open it manually: " + d.path, true);
                else gwToast("Couldn't open the config file", true);
            })
            .catch(function () { gwToast("Couldn't open the config file", true); })
            .finally(function () { openConfigBtn.disabled = false; });
    });
}
// "Added (N)" filter pill — appears once the user has at least one added
// connector. The count is driven by hydrateState, which marks installed
// items with data-connected. The pill only narrows the grid, never reorders
// it, so there's no post-hydrate layout shift in the card list.
const filterBar = document.getElementById("filter-bar");
const filterAdded = document.getElementById("filter-added");
const addedCount = document.getElementById("added-count");
let addedOnly = false;
function applyFilters() {
    const q = input.value.trim().toLowerCase();
    let anyVisible = false;
    document.querySelectorAll(".section").forEach((sec) => {
        let shown = 0;
        sec.querySelectorAll(".item").forEach((it) => {
            const hay = it.getAttribute("data-search") || "";
            const searchMatch = !q || hay.indexOf(q) !== -1;
            const addedMatch = !addedOnly || it.dataset.connected === "1";
            const match = searchMatch && addedMatch;
            it.classList.toggle("is-hidden", !match);
            if (match) shown++;
        });
        sec.classList.toggle("is-hidden", shown === 0);
        if (shown > 0) anyVisible = true;
    });
    if (noMatch) {
        const noResults = !anyVisible && (q.length > 0 || addedOnly);
        noMatch.classList.toggle("is-hidden", !noResults);
        if (noResults) {
            noMatch.textContent = addedOnly && !q
                ? "No added connectors yet."
                : 'No connectors match \u201c' + input.value.trim() + '\u201d.';
        }
    }
}
input.addEventListener("input", applyFilters);
if (filterAdded) filterAdded.addEventListener("click", () => {
    addedOnly = !addedOnly;
    filterAdded.setAttribute("aria-pressed", addedOnly ? "true" : "false");
    applyFilters();
});
// Recount added connectors and show/hide the pill. Called at the end of every
// hydrateState so connect/remove keeps the pill and its count in sync, and an
// active filter that drops to zero resets itself instead of stranding the user
// on an empty list.
function refreshAddedFilter() {
    const n = document.querySelectorAll('.item[data-connected="1"]').length;
    if (addedCount) addedCount.textContent = String(n);
    if (filterBar) filterBar.hidden = n === 0;
    if (n === 0 && addedOnly) {
        addedOnly = false;
        if (filterAdded) filterAdded.setAttribute("aria-pressed", "false");
    }
    applyFilters();
}
if (input.value) applyFilters();

// Installs always go to your profile (~/.copilot). Workspace scope is disabled
// for now because it writes a plaintext API key into a git-tracked .mcp.json.
const installScope = "profile";

// --- Restart-required banner (tools load at session start) ---
// Visibility is driven by the server's in-process pendingRestart flag via
// /api/state, not local storage — a real session restart spawns a fresh
// extension process and clears it, so the banner can't go stale.
const restartBanner = document.getElementById("restart-banner");
// Once the user dismisses the banner, a late/racing hydrateState (its
// /api/state read is ARM-bound and resolves after the click) must not flip
// it back on. This client flag is authoritative until the next connect
// re-arms the banner via showRestartBanner().
let restartDismissed = false;
function showRestartBanner() {
    restartDismissed = false;
    if (restartBanner) restartBanner.hidden = false;
}
if (restartBanner) {
    const rbDismiss = restartBanner.querySelector(".rb-dismiss");
    if (rbDismiss) rbDismiss.addEventListener("click", () => {
        restartDismissed = true;
        restartBanner.hidden = true;
        fetch("/api/ack-restart", { method: "POST" }).catch(() => {});
    });
}

function toast(msg, isError) {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;bottom:1rem;right:1rem;padding:.65rem 1rem;border-radius:4px;font-size:.85rem;max-width:420px;box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:100;color:white;background:" + (isError ? "var(--danger,#c50f1f)" : "#1b1b1b") + ";";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), isError ? 8000 : 4000);
}

document.querySelectorAll(".item-add.primary").forEach(btn => {
    btn.addEventListener("click", () => onConnect(btn));
});

// Persistent sign-in modal — keeps the user oriented during the OAuth wait so
// it never looks frozen. Owns its own elapsed timer and "reopen tab" action.
function openSignInModal(displayName, consentUrl) {
    const prevFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "si-overlay";
    overlay.innerHTML =
        '<div class="si-card" role="dialog" aria-modal="true" aria-labelledby="si-title" aria-describedby="si-sub" tabindex="-1">' +
        '<div class="si-icon"><div class="si-spin"></div></div>' +
        '<div class="si-title" id="si-title"></div>' +
        '<div class="si-sub" id="si-sub">A browser tab opened for Microsoft sign-in. Complete it there, then come back \u2014 this updates on its own.</div>' +
        '<div class="si-meta"></div>' +
        '<div class="si-actions">' +
        '<button class="si-btn" data-act="reopen" type="button">Reopen sign-in tab</button>' +
        '<button class="si-btn ghost" data-act="cancel" type="button">Cancel</button>' +
        '</div></div>';
    document.body.appendChild(overlay);

    const meta = overlay.querySelector(".si-meta");
    const icon = overlay.querySelector(".si-icon");
    const title = overlay.querySelector(".si-title");
    const sub = overlay.querySelector(".si-sub");
    const actions = overlay.querySelector(".si-actions");
    const card = overlay.querySelector(".si-card");
    // Untrusted catalog displayName -> textContent, never innerHTML.
    title.textContent = "Finish signing in to " + displayName;
    const started = Date.now();
    const tick = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        meta.textContent = "Waiting for sign-in\u2026 " + s + "s";
    }, 1000);
    meta.textContent = "Waiting for sign-in\u2026 0s";

    let onCancel = null;
    let closed = false;
    let cancellable = true;
    overlay.querySelector('[data-act="reopen"]').onclick = () => {
        fetch("/api/open-url", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url: consentUrl }) });
    };
    const doClose = () => {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        overlay.remove();
        if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
    };
    const cancel = () => { doClose(); if (onCancel) onCancel(); };
    overlay.querySelector('[data-act="cancel"]').onclick = cancel;

    // Keep keyboard focus inside the dialog; Esc cancels while still cancellable.
    overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && cancellable) { e.preventDefault(); cancel(); return; }
        if (e.key !== "Tab") return;
        const f = Array.from(overlay.querySelectorAll("button")).filter((el) => !el.disabled && el.offsetParent !== null);
        if (f.length === 0) { e.preventDefault(); card.focus(); return; }
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    });
    card.focus();

    return {
        onCancel(fn) { onCancel = fn; },
        finishing() {
            clearInterval(tick);
            cancellable = false;
            meta.textContent = "Almost done\u2014setting up the connector.";
            title.textContent = "Finishing up";
            sub.textContent = "Adding " + displayName + " to your tools.";
            actions.remove();
            card.focus();
        },
        success() {
            clearInterval(tick);
            cancellable = false;
            icon.innerHTML = '<div class="si-check">\u2713</div>';
            title.textContent = "Connected";
            sub.textContent = displayName + " is configured. Restart your Copilot session to load its tools.";
            meta.textContent = "";
        },
        close() { doClose(); },
    };
}

async function onConnect(btn) {
    const apiName = btn.dataset.api;
    const displayName = btn.dataset.name;
    const item = btn.closest(".item");
    if (item) item.style.opacity = "0.65";
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-right:.35rem;vertical-align:-2px;"></span>Connecting\u2026';

    let modal = null;
    let pendingConn = null;
    try {
        const res = await fetch("/api/install", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiName, displayName, scope: installScope })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.needsConsent) {
            pendingConn = data.connName;
            modal = openSignInModal(displayName, data.consentUrl);
            await fetch("/api/open-url", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url: data.consentUrl }) });
            await waitForOAuth(data.connName, 180000, modal);
            modal.finishing();
            const finish = await fetch("/api/finish-install", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiName, displayName, connName: data.connName, location: data.location, scope: installScope })
            });
            const finishData = await finish.json();
            if (finishData.error) throw new Error(finishData.error);
            pendingConn = null;
            modal.success();
            await new Promise((r) => setTimeout(r, 1600));
        }

        if (modal) modal.close();
        toast('Connected "' + displayName + '". Restart your session to use its tools.');
        showRestartBanner();
        if (item) item.style.opacity = "1";
        await hydrateState();
    } catch (err) {
        if (modal) modal.close();
        const cancelled = err && err.message === "cancelled";
        if (!cancelled) toast("Connect failed: " + err.message, true);
        if (cancelled && pendingConn) {
            await fetch("/api/rollback-connection", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ connName: pendingConn }) }).catch(() => {});
        }
        btn.disabled = false;
        btn.textContent = "Connect";
        if (item) item.style.opacity = "1";
        if (cancelled) await hydrateState();
    }
}

// Hydrate each connector tile from the connector namespace's true install state.
async function hydrateState() {
    let state = {};
    try {
        const r = await fetch("/api/state");
        const d = await r.json();
        if (d.error) return;
        state = d.state || {};
        if (restartBanner) restartBanner.hidden = restartDismissed || !d.pendingRestart;
    } catch { return; }

    document.querySelectorAll(".item[data-api-item]").forEach(item => {
        const apiName = item.dataset.apiItem;
        const st = state[apiName];
        if (st && st.installed) item.dataset.connected = "1";
        else item.removeAttribute("data-connected");
        // Tear down any prior action nodes (wrapped pair or a bare button) and
        // rebuild from scratch — reusing the old button breaks on re-hydrate
        // because it gets detached along with its wrapper.
        item.querySelector(".item-actions")?.remove();
        item.querySelector(".item-add")?.remove();

        const btn = document.createElement("button");

        if (!st || !st.installed) {
            btn.className = "item-add primary";
            btn.textContent = "Connect";
            btn.dataset.api = apiName;
            btn.dataset.name = item.querySelector(".item-name")?.textContent ?? apiName;
            btn.onclick = () => onConnect(btn);
            item.appendChild(btn);
            return;
        }

        const connected = st.connectionStatus === "Connected";
        if (connected && st.inCli) {
            btn.className = "item-add added";
            btn.textContent = "\u2713 Added";
            btn.title = st.cliPath ? st.cliPath : "Added to " + (st.cliScope === "workspace" ? "this workspace (.mcp.json)" : "your profile (~/.copilot)");
            btn.disabled = true;
        } else {
            // Installed but not Connected (or not in CLI) — let the user re-auth.
            btn.className = "item-add primary";
            btn.textContent = "Re-authenticate";
            btn.dataset.api = apiName;
            btn.dataset.name = item.querySelector(".item-name")?.textContent ?? apiName;
            btn.onclick = () => onConnect(btn);
        }

        const remove = document.createElement("button");
        remove.className = "item-add";
        remove.title = "Remove connector";
        remove.textContent = "Remove";
        remove.onclick = () => onRemove(item, apiName);

        const wrap = document.createElement("div");
        wrap.className = "item-actions";
        wrap.style.cssText = "display:flex;align-items:center;gap:.4rem;";
        wrap.appendChild(btn);
        wrap.appendChild(remove);
        item.appendChild(wrap);
    });

    refreshAddedFilter();
}

async function onRemove(item, apiName) {
    const wrap = item.querySelector(".item-actions");
    const removeBtn = [...item.querySelectorAll("button")].find((b) => b.textContent.trim() === "Remove");
    if (removeBtn) { removeBtn.disabled = true; removeBtn.textContent = "Removing\u2026"; }
    if (wrap) wrap.style.opacity = "0.6";
    try {
        const r = await fetch("/api/uninstall", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiName })
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        toast("Removed connector.");
        await hydrateState();
    } catch (err) {
        toast("Remove failed: " + err.message, true);
        if (wrap) wrap.style.opacity = "1";
        if (removeBtn) { removeBtn.disabled = false; removeBtn.textContent = "Remove"; }
    }
}

function waitForOAuth(connName, timeoutMs, modal) {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        if (modal) modal.onCancel(() => { clearInterval(poll); reject(new Error("cancelled")); });
        const poll = setInterval(async () => {
            try {
                const r = await fetch("/oauth-status?connectionName=" + encodeURIComponent(connName));
                const d = await r.json();
                if (d.done) { clearInterval(poll); resolve(); return; }
            } catch {}
            if (Date.now() - started > timeoutMs) {
                clearInterval(poll);
                reject(new Error("Timed out waiting for sign-in."));
            }
        }, 1500);
    });
}

hydrateState();
</script></body></html>`;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export function renderErrorHtml(message) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Error</title>${baseStyles()}</head><body>
<div class="header"><h1 style="color:var(--danger);">Error</h1></div>
<div class="empty" style="white-space:pre-wrap;text-align:left;font-family:ui-monospace,Consolas,monospace;font-size:.8rem;">${esc(message)}</div>
</body></html>`;
}

// ---------------------------------------------------------------------------
function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
