// Renderers for the connector namespace picker and connector catalog pages.
// Styled to match the reference connector extension UI.

import { CATEGORY } from "./categories.mjs";
import { buildSandboxUrl } from "./sandbox.mjs";

const CONNECT_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v3M10 2v3M4 5h8v1a4 4 0 0 1-4 4v4M6 14h4"/></svg>';

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
    --btn-radius: 8px;
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
.section-head {
    display: flex; align-items: center; gap: .6rem;
    width: 100%; margin: 0 0 .65rem; padding: .2rem 0;
    background: none; border: 0; cursor: pointer; text-align: left;
    color: var(--fg-muted); font: inherit; font-size: .82rem; font-weight: 600;
}
.section-head:hover { color: var(--accent); }
.section-head:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
.section-head .caret {
    width: 12px; height: 12px; flex: none;
    color: var(--fg-subtle); transition: transform .15s ease;
}
.section:not(.collapsed) .section-head .caret,
.section.force-open .section-head .caret { transform: rotate(90deg); }
.section-head:hover .caret { color: var(--accent); }
.section-title-text { flex: none; }
.section-count {
    flex: none; font-size: .72rem; font-weight: 600;
    background: var(--bg-pill);
    padding: .05rem .4rem; border-radius: 999px;
}
.section-rule { flex: 1; height: 1px; background: var(--border); }
.section.collapsed .grid { display: none; }
/* Search override — must follow the .collapsed rule so it wins on a specificity
   tie and expands a matching group without disturbing its stored collapse state. */
.section.force-open .grid { display: grid; }

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
.item-name-row { display: flex; align-items: center; gap: .4rem; min-width: 0; }
.item-name {
    font-weight: 600; color: var(--fg);
    flex: 0 1 auto; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-desc {
    font-size: .75rem; color: var(--fg-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: .1rem;
}

.item-add {
    padding: .25rem .65rem; border-radius: var(--btn-radius);
    border: 1px solid var(--border-strong);
    background: var(--bg); color: var(--fg);
    font-size: .78rem; font-family: inherit; cursor: pointer;
    transition: opacity 80ms; white-space: nowrap;
    min-width: 72px; text-align: center;
}
.item-add:hover { border-color: var(--accent); color: var(--accent); }
.item-icon-action { min-width: 0; padding: .25rem .5rem; display: inline-flex; align-items: center; justify-content: center; }
.item-icon-action svg { width: 13px; height: 13px; flex: none; }
/* Quiet at rest so a long catalog isn't a wall of identical blue CTAs; the
   active row promotes its Connect button to filled accent on hover or focus. */
.item-add.primary {
    min-width: 62px; padding: .2rem .5rem; font-size: .72rem;
    display: inline-flex; align-items: center; justify-content: center; gap: .3rem;
    background: transparent; border-color: var(--accent); color: var(--accent);
}
.item-add.primary svg { width: 11px; height: 11px; flex: none; }
.item:hover .item-add.primary, .item:focus-within .item-add.primary, .item-add.primary:hover, .item-add.primary:focus-visible { background: var(--accent); border-color: var(--accent); color: #fff; }
/* Connected isn't an action — render it as a compact status tag, not a fake
   disabled button. Borderless success fill, pill radius, hugs its content. */
.item-tag {
    display: inline-flex; align-items: center; gap: .25rem;
    padding: .1rem .4rem; border-radius: 999px;
    font-size: .68rem; font-weight: 600; line-height: 1;
    white-space: nowrap; user-select: none; flex: none;
    color: var(--success); background: var(--success-bg);
}

.change-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: .3rem .6rem; border-radius: var(--btn-radius);
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
    width: 100%; appearance: none; text-align: left; font: inherit;
    background: transparent; color: inherit;
    padding: .65rem .75rem; border-radius: 4px;
    border: 1px solid var(--border); cursor: pointer;
    transition: background-color 80ms, border-color 80ms;
    margin-bottom: .35rem;
}
.setup-card:hover { background: var(--bg-hover); border-color: var(--accent); }
.setup-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
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
@media (max-width: 520px) {
    .item {
        grid-template-columns: 40px minmax(0, 1fr);
        align-items: start;
    }
    .item-icon { grid-column: 1; grid-row: 1 / span 2; }
    .item-body { grid-column: 2; grid-row: 1; }
    .item > .item-add, .item > .item-actions {
        grid-column: 2;
        grid-row: 2;
        justify-self: start;
    }
    .item-actions { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: .001ms !important; scroll-behavior: auto !important; }
    .brand-loading, .skeleton, .si-spin, .spin, [style*="animation:spin"] {
        animation: none !important;
    }
    .brand-loading, .skeleton { opacity: 1; transform: none; }
    .si-spin, .spin, [style*="animation:spin"] { border-top-color: currentColor !important; }
}
</style>`;
}

// ---------------------------------------------------------------------------
// Setup / Namespace Picker
// ---------------------------------------------------------------------------

export function renderSetupHtml(subscriptions, notice = "", capabilityToken = "") {
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
    padding: .55rem .75rem; border-radius: var(--btn-radius);
    border: 1px solid var(--accent); background: transparent; color: var(--accent);
}
.create-link:hover { background: var(--accent); color: #fff; }
.create-link .plus { font-size: 1.05rem; line-height: 1; font-weight: 700; }
.setup-notice {
    margin: 0 0 1rem; padding: .55rem .7rem; border-radius: 6px;
    background: var(--bg-pill); border: 1px solid var(--accent);
    color: var(--fg); font-size: .82rem; line-height: 1.5;
}
</style></head><body>
<div class="header brand-head">
    <h1>${brandMark(30, "setup")}<span>Select a Connector Namespace</span></h1>
    <div class="sub">Choose which connector namespace to browse. This choice is saved for future sessions.</div>
</div>
${notice ? `<div class="setup-notice">${esc(notice)}</div>` : ""}
<div class="create-row">
    <button id="create-ns-btn" class="create-link" type="button"><span class="plus">+</span><span>New connector namespace</span></button>
</div>
<div style="margin-bottom: 1rem;">
    <label for="sub-select">Subscription</label>
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
const gatewayList = document.getElementById("gateway-list");
const gwFilter = document.getElementById("gw-filter");
document.getElementById("create-ns-btn").addEventListener("click", () => {
    window.location.href = "/create" + (subSelect.value ? "?subscriptionId=" + encodeURIComponent(subSelect.value) : "");
});
let allGateways = [];
let hasMoreGateways = false;
let loadedAll = false;
let gatewayRequestSeq = 0;

subSelect.addEventListener("change", async () => {
    const requestSeq = ++gatewayRequestSeq;
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
        if (requestSeq !== gatewayRequestSeq || subId !== subSelect.value) return;
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
        if (requestSeq !== gatewayRequestSeq) return;
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
            if (!await loadAll()) return;
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
        '<button type="button" class="setup-card" data-sub="' + escH(gw.subscriptionId) + '" data-rg="' + escH(gw.resourceGroup) + '" data-name="' + escH(gw.name) + '">' +
        '<div><div class="setup-card-name">' + escH(gw.name) + '</div>' +
        '<div class="setup-card-meta">' + escH(gw.resourceGroup) + ' \u2022 ' + escH(gw.location) + '</div></div></button>'
    ).join("");
    if (hasMore) {
        html += '<button id="load-more" style="margin-top:.5rem;width:100%;padding:.5rem;border-radius:var(--btn-radius);border:1px solid var(--border-strong);background:var(--bg);color:var(--fg-muted);font-size:.82rem;cursor:pointer;font-family:inherit;">Load all namespaces\u2026</button>';
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
    const requestSeq = gatewayRequestSeq;
    const btn = document.getElementById("load-more");
    if (btn) { btn.disabled = true; btn.textContent = "Loading\u2026"; }
    try {
        const res = await fetch("/api/gateways?subscriptionId=" + encodeURIComponent(subId) + "&all=true");
        const data = await res.json();
        if (requestSeq !== gatewayRequestSeq || subId !== subSelect.value) return false;
        if (data.error) throw new Error(data.error);
        if (!Array.isArray(data.gateways)) throw new Error("Invalid gateway response.");
        allGateways = data.gateways.map(gw => {
            const parts = gw.id.split("/");
            return {
                subscriptionId: subId,
                resourceGroup: parts[parts.indexOf("resourceGroups") + 1] || "",
                name: gw.name || parts[parts.length - 1],
                location: gw.location || "",
            };
        });
        loadedAll = true;
        hasMoreGateways = false;
        renderGateways(gwFilter.value, false);
        return true;
    } catch (err) {
        if (requestSeq !== gatewayRequestSeq) return false;
        if (btn) { btn.textContent = "Failed \u2014 try again"; btn.disabled = false; }
        return false;
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

const CSS_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function iconBackgroundStyle(brandColor) {
    const color = String(brandColor || "").trim();
    return CSS_HEX_COLOR.test(color) ? ` style="background:${color}22"` : "";
}

export function renderCatalogHtml(instanceId, catalog, { filter, category, source, config }, capabilityToken = "") {
    const renderItem = (c) => {
        // Items carry their home grid so hydrateState can move them into
        // "My MCPs" when added and back to Microsoft/Partner on remove.
        const home = c.category === CATEGORY.microsoft ? "microsoft" : "partner";
        const icon = c.iconUri
            ? `<div class="item-icon"${iconBackgroundStyle(c.brandColor)}><img src="${esc(c.iconUri)}" alt=""></div>`
            : `<div class="item-icon">${esc(c.displayName.charAt(0))}</div>`;
        // Button state is hydrated client-side from /api/state on load.
        const btn = `<button class="item-add primary" data-api="${esc(c.apiName)}" data-name="${esc(c.displayName)}">${CONNECT_ICON}<span>Create and connect</span></button>`;
        const haystack = esc((c.displayName + " " + (c.description || "")).toLowerCase());
        const sandboxUrl = esc(buildSandboxUrl(config, c.apiName));
        return `<div class="item" data-api-item="${esc(c.apiName)}" data-home-grid="${home}" data-search="${haystack}" data-sandbox-url="${sandboxUrl}">${icon}<div class="item-body"><div class="item-name-row"><div class="item-name">${esc(c.displayName)}</div></div><div class="item-desc">${esc(c.description)}</div></div>${btn}</div>`;
    };

    const byName = (a, b) => a.displayName.localeCompare(b.displayName);
    const microsoft = catalog.filter((c) => c.category === CATEGORY.microsoft).sort(byName);
    const partner = catalog.filter((c) => c.category !== CATEGORY.microsoft).sort(byName);

    const section = (key, title, rows, { collapsed, hidden }) => {
        const cls = ["section", "collapsible"];
        if (collapsed) cls.push("collapsed");
        if (hidden) cls.push("is-hidden");
        const n = rows.length;
        return `<div class="${cls.join(" ")}" id="sec-${key}" data-section="${key}">`
            + `<button class="section-head" type="button" aria-expanded="${collapsed ? "false" : "true"}" aria-controls="grid-${key}">`
            + `<svg class="caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>`
            + `<span class="section-title-text">${esc(title)}</span>`
            + `<span class="section-count"${n ? "" : " hidden"} data-count aria-hidden="true">${n}</span>`
            + `<span class="section-rule" aria-hidden="true"></span>`
            + `</button>`
            + `<div class="grid" id="grid-${key}" role="region" aria-label="${esc(title)}">${rows.map(renderItem).join("")}</div>`
            + `</div>`;
    };

    // Server paints the first-run layout: My MCPs hidden+empty (filled by
    // hydrateState), Microsoft expanded so there's something to browse, Partner
    // collapsed. updateSections() flips to the steady layout on the first hydrate
    // if anything is already added.
    let sectionsHtml =
        section("mine", "My MCPs", [], { collapsed: false, hidden: true }) +
        section("microsoft", "Microsoft", microsoft, { collapsed: false, hidden: microsoft.length === 0 }) +
        section("partner", "Partners", partner, { collapsed: true, hidden: partner.length === 0 });

    if (!catalog.length) {
        sectionsHtml = `<div class="empty">No connectors available.</div>`;
    }

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connectors</title>${baseStyles()}<style>
.sub .cn-name { color: var(--fg); }
.si-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(2px); }
.si-card { background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:10px; padding:1.5rem 1.5rem 1.3rem; max-width:380px; width:88%; box-shadow:0 14px 44px rgba(0,0,0,.32); text-align:center; }
.si-spin { width:30px; height:30px; border:3px solid var(--bg-pill); border-top-color:var(--accent); border-radius:50%; margin:0 auto; animation:spin .8s linear infinite; }
.si-check { width:30px; height:30px; margin:0 auto; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; }
.si-title { font-size:1rem; font-weight:600; margin:.85rem 0 .35rem; }
.si-sub { font-size:.83rem; color:var(--fg-muted); line-height:1.5; }
.si-meta { font-size:.74rem; color:var(--fg-muted); margin-top:.75rem; min-height:1em; }
.si-actions { display:flex; gap:.5rem; justify-content:center; margin-top:1.15rem; }
.si-btn { appearance:none; font:inherit; font-size:.82rem; padding:.4rem .85rem; border-radius:var(--btn-radius); cursor:pointer; border:1px solid var(--border-strong); background:var(--bg); color:var(--fg); }
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

/* ---- split "remove" control + its popover menu + delete-confirm dialog ---- */
/* main + caret read as one pill; the shared 1px border between them is the
   divider (caret overlaps main by -1px so borders don't double). */
.split-remove { display:inline-flex; align-items:stretch; }
.split-remove .split-main { border-top-right-radius:0; border-bottom-right-radius:0; color:var(--danger); }
.split-remove .split-main:hover { border-color:var(--danger); color:var(--danger); }
.split-remove .split-caret {
    min-width:0; padding:.2rem .3rem; margin-left:-1px;
    border-top-left-radius:0; border-bottom-left-radius:0;
    display:inline-flex; align-items:center; justify-content:center; line-height:1;
}
.split-remove .split-caret svg { display:block; width:8px; height:8px; }

/* the menu is a native popover -> promoted to the top layer, so the scrolling
   catalog can't clip it. it's positioned under the caret in JS on toggle. */
.rm-menu {
    border:1px solid var(--border-strong); border-radius:8px; background:var(--bg);
    padding:.15rem; min-width:0; width:max-content; box-shadow:0 4px 14px rgba(0,0,0,.16);
    transition:opacity 90ms ease-out;
}
.rm-menu-item {
    display:block; width:100%; text-align:left; white-space:nowrap;
    padding:.28rem .5rem; border:none; border-radius:5px; background:transparent;
    color:var(--fg); font:inherit; font-size:.75rem; line-height:1.2; cursor:pointer;
}
.rm-menu-item:hover, .rm-menu-item:focus-visible { background:var(--bg-hover); outline:none; }
.rm-menu-item.danger { color:var(--danger); }
.rm-menu-item.danger:hover, .rm-menu-item.danger:focus-visible {
    background:color-mix(in srgb, var(--danger) 12%, transparent);
}

.cn-dialog {
    border:1px solid var(--border-strong); border-radius:10px; padding:0;
    max-width:420px; width:calc(100vw - 2rem);
    background:var(--bg); color:var(--fg); box-shadow:0 20px 60px rgba(0,0,0,.35);
}
.cn-dialog::backdrop { background:rgba(0,0,0,.45); }
.cn-dialog-form { margin:0; padding:1.25rem; display:flex; flex-direction:column; gap:.75rem; }
.cn-dialog-title { margin:0; font-size:1rem; font-weight:600; }
.cn-dialog-body { margin:0; font-size:.85rem; line-height:1.5; color:var(--fg); }
.cn-dialog-note { margin:0; font-size:.78rem; line-height:1.45; color:var(--fg-muted); }
.cn-dialog-actions { display:flex; justify-content:flex-end; gap:.5rem; margin-top:.25rem; }
.cn-btn {
    padding:.4rem .8rem; border-radius:var(--btn-radius); font:inherit; font-size:.82rem; cursor:pointer;
    border:1px solid var(--border-strong); background:var(--bg); color:var(--fg);
}
.cn-btn-cancel:hover, .cn-btn-cancel:focus-visible { border-color:var(--accent); color:var(--accent); }
.cn-btn-danger { border-color:var(--danger); background:var(--danger); color:#fff; }
.cn-btn-danger:hover, .cn-btn-danger:focus-visible { filter:brightness(1.07); }

.cn-dialog[open] { animation:cn-dialog-in 140ms cubic-bezier(0.22,1,0.36,1); }
.cn-dialog[open]::backdrop { animation:cn-backdrop-in 140ms ease-out; }
@keyframes cn-dialog-in { from { opacity:0; transform:translateY(6px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes cn-backdrop-in { from { opacity:0; } to { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
    .cn-dialog[open], .cn-dialog[open]::backdrop { animation:none; }
    .rm-menu { transition:none; }
}
</style></head><body>
<div id="nav-overlay" style="display:none;position:fixed;inset:0;z-index:999;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;background:var(--bg);">
    <div class="brand-loading">${brandMark(46, "ovl")}</div>
</div>
<div class="header brand-head">
    <div class="head-row">
        <h1>${brandMark(24, "cat")}<span>Connectors</span></h1>
    </div>
    <div class="sub">Namespace <code class="cn-name">${esc(config.gatewayName)}</code> &middot; RG <code>${esc(config.resourceGroup)}</code></div>
    <div class="gw-actions">
        <button type="button" id="switch-ns" class="change-btn gw-action" onclick="document.getElementById('nav-overlay').style.display='flex';window.location.href='/setup';" aria-label="Switch namespace. current namespace: ${esc(config.gatewayName)}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 5.5h9l-2.2-2.2"/><path d="M13.5 10.5h-9l2.2 2.2"/></svg>
            Switch namespace
        </button>
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
<div id="restart-banner" class="restart-banner" role="status" hidden>
    <svg class="rb-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8"/><path d="M13.6 2.2v3h-3"/></svg>
    <div class="rb-body"><strong>Restart your Copilot session to use newly added tools.</strong><br>Connectors are saved to your MCP config now, but their tools only load when a session starts.</div>
    <button class="rb-dismiss" type="button" aria-label="Dismiss this message">Dismiss</button>
</div>
${sectionsHtml}
<div id="no-match" class="empty is-hidden"></div>
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

const input = document.getElementById("search");
const noMatch = document.getElementById("no-match");
const connectIcon = ${JSON.stringify(CONNECT_ICON)};
const disconnectIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 2.5v3M9.5 2.5v3M3.5 5.5h8v1a4 4 0 0 1-4 4v3M5.5 13.5h4"/><path d="m2 2 12 12"/></svg>';

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
// Collapsible sections. Each .section-head toggles its own grid; search auto-
// expands any section with matches (via a transient force-open) and restores the
// stored collapse state when the query clears. "My MCPs" is populated
// client-side by updateSections, which moves added tiles out of Microsoft/Partner.
function toggleSection(head) {
    const sec = head.closest(".section");
    if (!sec) return;
    // While searching, a matched section carries a transient force-open that
    // overrides .collapsed in CSS. A plain toggle here would flip .collapsed
    // underneath that override, so the grid and caret wouldn't move — a dead
    // click. Treat a click on a force-open section as "collapse it now": drop
    // the override and collapse. The next keystroke re-applies force-open if the
    // section still has matches.
    let collapsed;
    if (sec.classList.contains("force-open")) {
        sec.classList.remove("force-open");
        sec.classList.add("collapsed");
        collapsed = true;
    } else {
        collapsed = sec.classList.toggle("collapsed");
    }
    const open = sec.classList.contains("force-open") || !collapsed;
    head.setAttribute("aria-expanded", open ? "true" : "false");
}
document.querySelectorAll(".section-head").forEach((h) => {
    h.addEventListener("click", () => toggleSection(h));
});

function applyFilters() {
    const q = input.value.trim().toLowerCase();
    const searching = q.length > 0;
    let anyVisible = false;
    document.querySelectorAll(".section").forEach((sec) => {
        const items = sec.querySelectorAll(".item");
        let shown = 0;
        items.forEach((it) => {
            const hay = it.getAttribute("data-search") || "";
            const match = !q || hay.indexOf(q) !== -1;
            it.classList.toggle("is-hidden", !match);
            if (match) shown++;
        });
        // An empty section (no tiles, e.g. My MCP servers before anything is
        // added) stays hidden. While searching, a section with no matches hides
        // too; a section with matches force-opens so results aren't buried in a
        // collapsed group.
        const empty = items.length === 0;
        sec.classList.toggle("is-hidden", empty || (searching && shown === 0));
        sec.classList.toggle("force-open", searching && shown > 0);
        // Keep the head in step with what's actually on screen: a force-open
        // section shows its grid even while stored-collapsed, so the caret + aria
        // must read open. Falls back to the stored state once the search clears.
        const open = sec.classList.contains("force-open") || !sec.classList.contains("collapsed");
        sec.querySelector(".section-head")?.setAttribute("aria-expanded", open ? "true" : "false");
        if (shown > 0) anyVisible = true;
    });
    if (noMatch) {
        const noResults = searching && !anyVisible;
        noMatch.classList.toggle("is-hidden", !noResults);
        if (noResults) noMatch.textContent = 'No connectors match \u201c' + input.value.trim() + '\u201d.';
    }
}
input.addEventListener("input", applyFilters);

// Move added tiles into "My MCPs" and non-added back to their home grid. My MCPs
// puts fully connected entries first, then sorts each group alphabetically; the
// catalog grids remain alphabetical.
let sectionsInit = false;
function updateSections() {
    const mineGrid = document.getElementById("grid-mine");
    if (mineGrid) {
        document.querySelectorAll(".item[data-api-item]").forEach((it) => {
            const home = it.dataset.homeGrid || "partner";
            const target = it.dataset.connected === "1" ? mineGrid : document.getElementById("grid-" + home);
            if (target && it.parentElement !== target) target.appendChild(it);
        });
    }
    // Re-sort each grid (appends from moves land out of order).
    document.querySelectorAll(".grid").forEach((grid) => {
        [...grid.querySelectorAll(".item")].sort((a, b) => {
            if (grid.id === "grid-mine") {
                const readyOrder = Number(b.dataset.connectionReady === "1") - Number(a.dataset.connectionReady === "1");
                if (readyOrder) return readyOrder;
            }
            const an = (a.querySelector(".item-name")?.textContent || "").toLowerCase();
            const bn = (b.querySelector(".item-name")?.textContent || "").toLowerCase();
            return an.localeCompare(bn);
        }).forEach((t) => grid.appendChild(t));
    });
    // Counts.
    document.querySelectorAll(".section").forEach((sec) => {
        const n = sec.querySelectorAll(".item").length;
        const c = sec.querySelector(".section-count");
        if (c) { c.textContent = String(n); c.hidden = n === 0; }
    });
    // First hydrate picks the layout: if anything is already added, go steady
    // (only My MCPs open); otherwise first-run (Microsoft open to browse).
    if (!sectionsInit) {
        sectionsInit = true;
        const setOpen = (key, open) => {
            const sec = document.getElementById("sec-" + key);
            if (!sec) return;
            sec.classList.toggle("collapsed", !open);
            sec.querySelector(".section-head")?.setAttribute("aria-expanded", open ? "true" : "false");
        };
        const mineCount = document.querySelectorAll("#grid-mine .item").length;
        if (mineCount > 0) { setOpen("mine", true); setOpen("microsoft", false); setOpen("partner", false); }
        else { setOpen("microsoft", true); setOpen("partner", false); }
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

async function showConnectionSuccess(modal, item, message) {
    if (modal) {
        modal.success();
        await new Promise((resolve) => setTimeout(resolve, 1600));
        modal.close();
    }
    toast(message);
    showRestartBanner();
    if (item) item.style.opacity = "1";
    await hydrateState();
}

async function rollbackFreshConnection(connName) {
    const response = await fetch("/api/rollback-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connName })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
}

async function reconcileFinishedInstall(apiName, connName) {
    const response = await fetch("/api/state");
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const state = data.state && data.state[apiName];
    if (
        state &&
        state.installed &&
        state.inCli &&
        state.connectionName === connName &&
        state.connectionStatus === "Connected"
    ) return true;
    // ARM list results are eventually consistent. Once finish has started, a
    // negative state read cannot prove the connection is orphaned, so leave it
    // intact and report the ambiguous result instead of risking data loss.
    return false;
}

async function recoverConnectorFailure(error, apiName, connName, freshConnection, finishStarted, finishResponseReceived, canReconcileFinish) {
    if (finishStarted && canReconcileFinish) {
        try {
            const complete = await reconcileFinishedInstall(apiName, connName);
            // A parsed server error is definitive. Reconciliation is only allowed
            // to recover success when the transport or response was ambiguous.
            return { complete: !finishResponseReceived && complete, error };
        } catch (verificationError) {
            return {
                complete: false,
                error: new Error(error.message + " Unable to verify the final state: " + verificationError.message)
            };
        }
    }
    if (freshConnection && connName) {
        try {
            await rollbackFreshConnection(connName);
        } catch (cleanupError) {
            return {
                complete: false,
                error: new Error(error.message + " Cleanup also failed: " + cleanupError.message)
            };
        }
    }
    return { complete: false, error };
}

function createRequestId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function postIdempotentMutation(url, body) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
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
            sub.textContent = "Connecting " + displayName + " to your tools.";
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
    let freshConnection = false;
    let finishStarted = false;
    let finishResponseReceived = false;
    try {
        const data = await postIdempotentMutation("/api/install", {
            apiName,
            displayName,
            scope: installScope,
            requestId: createRequestId(),
        });
        if (data.error) throw new Error(data.error);

        if (data.needsConsent) {
            pendingConn = data.connName;
            freshConnection = data.freshConnection === true;
            modal = openSignInModal(displayName, data.consentUrl);
            await fetch("/api/open-url", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url: data.consentUrl }) });
            await waitForOAuth(data.connName, 180000, modal);
            modal.finishing();
            finishStarted = true;
            const finish = await fetch("/api/finish-install", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiName, displayName, connName: data.connName, location: data.location, scope: installScope })
            });
            const finishData = await finish.json();
            finishResponseReceived = true;
            if (finishData.error) throw new Error(finishData.error);
            pendingConn = null;
        }

        await showConnectionSuccess(modal, item, 'Connected "' + displayName + '". Restart your session to use its tools.');
    } catch (err) {
        const recovery = await recoverConnectorFailure(
            err,
            apiName,
            pendingConn,
            freshConnection,
            finishStarted,
            finishResponseReceived,
            true
        );
        if (recovery.complete) {
            await showConnectionSuccess(modal, item, 'Connected "' + displayName + '". Restart your session to use its tools.');
            return;
        }
        if (modal) modal.close();
        const cancelled = recovery.error === err && err && err.message === "cancelled";
        if (!cancelled) toast("Connect failed: " + recovery.error.message, true);
        if (cancelled && pendingConn) {
            await fetch("/api/rollback-connection", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ connName: pendingConn }) }).catch(() => {});
        }
        btn.disabled = false;
        btn.textContent = "Create and connect";
        if (item) item.style.opacity = "1";
        await hydrateState();
        // hydrateState() tears down this tile's button and builds a fresh
        // one, so the original btn is now detached. The modal also dropped
        // focus to the body when it tried to restore to the (then-disabled)
        // trigger. Re-focus the rebuilt Connect button so keyboard users
        // keep their place after cancelling.
        if (cancelled && document.activeElement === document.body) {
            const sel = window.CSS && CSS.escape ? CSS.escape(apiName) : apiName;
            try {
                document.querySelector('.item[data-api-item="' + sel + '"] .item-add.primary')?.focus();
            } catch { /* odd apiName -> invalid selector; cancel stays safe */ }
        }
    }
}

// Re-authenticate an already-installed connector. Mirrors onConnect's consent
// round-trip but hits /api/reauth, which reuses the existing connection + config
// instead of minting new ones. The finish step branches: if the server returned a
// configName we rebind that exact config (/api/finish-reauth); if it didn't, the
// stored connection was gone and reauth fell back to a fresh install, so we finish
// via the normal install path. Only that explicitly marked fresh fallback can be
// rolled back; a pre-existing reauth connection is never deleted.
async function onReauth(btn) {
    const apiName = btn.dataset.api;
    const displayName = btn.dataset.name;
    // This handler backs two labels: "Connect" (case A — adopt an existing
    // namespace resource not yet wired into Copilot) and "Re-authenticate"
    // (case B — local auth went stale). Capture which one before the spinner
    // innerHTML wipes the button text, so every message uses the right verb.
    const isConnect = btn.textContent.trim() === "Connect";
    const verb = isConnect ? "Connect" : "Re-authenticate";
    const item = btn.closest(".item");
    if (item) item.style.opacity = "0.65";
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-right:.35rem;vertical-align:-2px;"></span>' + (isConnect ? "Connecting" : "Re-authenticating") + "\u2026";

    let modal = null;
    let pendingConn = null;
    let freshConnection = false;
    let finishStarted = false;
    let finishResponseReceived = false;
    try {
        const data = await postIdempotentMutation("/api/reauth", {
            apiName,
            displayName,
            scope: installScope,
            requestId: createRequestId(),
        });
        if (data.error) throw new Error(data.error);

        if (data.needsConsent) {
            pendingConn = data.connName;
            freshConnection = data.freshConnection === true;
            modal = openSignInModal(displayName, data.consentUrl);
            await fetch("/api/open-url", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url: data.consentUrl }) });
            await waitForOAuth(data.connName, 180000, modal);
            modal.finishing();
            finishStarted = true;
            // configName present → rebind that config; absent → reauth fell back to
            // a fresh install (stored connection was gone), finish the install path.
            const finishUrl = data.configName ? "/api/finish-reauth" : "/api/finish-install";
            const finishBody = data.configName
                ? { apiName, displayName, connName: data.connName, configName: data.configName, location: data.location, scope: installScope }
                : { apiName, displayName, connName: data.connName, location: data.location, scope: installScope };
            const finish = await fetch(finishUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finishBody)
            });
            const finishData = await finish.json();
            finishResponseReceived = true;
            if (finishData.error) throw new Error(finishData.error);
            pendingConn = null;
        }

        await showConnectionSuccess(
            modal,
            item,
            (isConnect ? 'Connected "' : 'Re-authenticated "') + displayName + '". Restart your session to use its tools.'
        );
    } catch (err) {
        const recovery = await recoverConnectorFailure(
            err,
            apiName,
            pendingConn,
            freshConnection,
            finishStarted,
            finishResponseReceived,
            freshConnection
        );
        if (recovery.complete) {
            await showConnectionSuccess(
                modal,
                item,
                (isConnect ? 'Connected "' : 'Re-authenticated "') + displayName + '". Restart your session to use its tools.'
            );
            return;
        }
        if (modal) modal.close();
        const cancelled = recovery.error === err && err && err.message === "cancelled";
        if (!cancelled) toast(verb + " failed: " + recovery.error.message, true);
        btn.disabled = false;
        btn.textContent = verb;
        if (item) item.style.opacity = "1";
        await hydrateState();
        if (cancelled && document.activeElement === document.body) {
            const sel = window.CSS && CSS.escape ? CSS.escape(apiName) : apiName;
            try {
                document.querySelector('.item[data-api-item="' + sel + '"] .item-add.primary')?.focus();
            } catch { /* odd apiName -> invalid selector; cancel stays safe */ }
        }
    }
}

// Hydrate each connector tile from the connector namespace's true install state.
async function hydrateState() {
    // The static catalog buttons are only placeholders until the namespace's
    // installed state is known. Keep every mutating action fail-closed.
    document.querySelectorAll(".item-add").forEach(button => { button.disabled = true; });
    let state = {};
    try {
        const r = await fetch("/api/state");
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        state = d.state || {};
        if (restartBanner) restartBanner.hidden = restartDismissed || !d.pendingRestart;
    } catch (err) {
        toast("Couldn't load connector state: " + err.message, true);
        return false;
    }

    document.querySelectorAll(".item[data-api-item]").forEach(item => {
        const apiName = item.dataset.apiItem;
        const st = state[apiName];
        if (st && st.installed) {
            item.dataset.connected = "1";
            item.dataset.connectionReady = st.connectionStatus === "Connected" && st.inCli ? "1" : "0";
        } else {
            item.removeAttribute("data-connected");
            item.removeAttribute("data-connection-ready");
        }
        // Tear down any prior action nodes (wrapped pair or a bare button) and
        // rebuild from scratch — reusing the old button breaks on re-hydrate
        // because it gets detached along with its wrapper.
        item.querySelector(".item-actions")?.remove();
        item.querySelector(".item-add")?.remove();
        item.querySelector(".item-name-row .item-tag")?.remove();

        const btn = document.createElement("button");

        if (!st || !st.installed) {
            btn.className = "item-add primary";
            btn.innerHTML = connectIcon + "<span>Create and connect</span>";
            btn.title = "Create a new connection on your namespace and wire it into Copilot.";
            btn.dataset.api = apiName;
            btn.dataset.name = item.querySelector(".item-name")?.textContent ?? apiName;
            btn.onclick = () => onConnect(btn);
            item.appendChild(btn);
            return;
        }

        // Installed: pair a status element with Remove. Connected is a state, not
        // an action, so show it as a compact tag; otherwise offer a re-auth button.
        let statusEl;
        const connected = st.connectionStatus === "Connected";
        if (connected && st.inCli) {
            statusEl = document.createElement("span");
            statusEl.className = "item-tag";
            statusEl.textContent = "Connected";
            statusEl.title = st.cliPath ? st.cliPath : "Connected to " + (st.cliScope === "workspace" ? "this workspace (.mcp.json)" : "your profile (~/.copilot)");
        } else {
            // Installed but not fully Connected. Two distinct situations, split
            // by inCli so the label matches what the click actually does:
            //  - !inCli: resource exists on the namespace but isn't wired into
            //    local Copilot yet (portal-created, or after a local-only
            //    remove). Label "Connect" — onReauth adopts it (no duplicate).
            //  - inCli && !connected: it was wired locally but auth went stale.
            //    Label "Re-authenticate".
            btn.className = "item-add primary";
            btn.innerHTML = st.inCli ? "Re-authenticate" : connectIcon + "<span>Connect</span>";
            btn.title = st.inCli
                ? "Your session for this connector expired. Re-authenticate to keep using it."
                : "This connector exists on your namespace but isn't wired into Copilot yet. Connect to add it.";
            btn.dataset.api = apiName;
            btn.dataset.name = item.querySelector(".item-name")?.textContent ?? apiName;
            btn.onclick = () => onReauth(btn);
            statusEl = btn;
        }

        const displayName = item.querySelector(".item-name")?.textContent ?? apiName;

        const sandbox = document.createElement("button");
        sandbox.type = "button";
        sandbox.className = "item-add sandbox-btn item-icon-action";
        sandbox.title = "Open this MCP in Connector Namespace playground";
        sandbox.setAttribute("aria-label", "Open " + displayName + " in Connector Sandbox");
        sandbox.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 2.5h4M7 2.5v4l-3.5 5.8a.8.8 0 0 0 .7 1.2h7.6a.8.8 0 0 0 .7-1.2L9 6.5v-4"/><path d="M5.4 10h5.2"/></svg>';
        sandbox.onclick = async () => {
            const url = item.dataset.sandboxUrl;
            if (!url) { gwToast("Couldn't build the Sandbox link", true); return; }
            sandbox.disabled = true;
            try {
                const response = await fetch("/api/open-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                });
                const result = await response.json().catch(() => ({}));
                if (!result.ok) throw new Error("open_failed");
            } catch {
                gwToast("Couldn't open Connector Sandbox", true);
            } finally {
                sandbox.disabled = false;
            }
        };

        // Main action disconnects Copilot only; the namespace resource remains.
        let remove = null;
        if (st.inCli) {
            remove = document.createElement("button");
            remove.className = "item-add split-main item-icon-action";
            remove.title = "Disconnect from Copilot. Keeps the resource on your namespace.";
            remove.setAttribute("aria-label", "Disconnect " + displayName + " from Copilot");
            remove.innerHTML = disconnectIcon;
            remove.onclick = () => onRemoveLocal(item, apiName);
        }

        // caret opens a popover menu holding the destructive namespace delete.
        const menuId = "rm-menu-" + (++rmMenuSeq);
        const caret = document.createElement("button");
        caret.type = "button";
        caret.className = st.inCli ? "item-add split-caret" : "item-add item-icon-action";
        caret.setAttribute("aria-haspopup", "menu");
        caret.setAttribute("aria-expanded", "false");
        caret.setAttribute("aria-label", "More remove options");
        caret.setAttribute("popovertarget", menuId);
        caret.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        const menu = document.createElement("div");
        menu.id = menuId;
        menu.className = "rm-menu";
        menu.setAttribute("popover", "auto");
        menu.setAttribute("role", "menu");
        const delItem = document.createElement("button");
        delItem.type = "button";
        delItem.className = "rm-menu-item danger";
        delItem.setAttribute("role", "menuitem");
        delItem.textContent = "Delete from namespace\u2026";
        delItem.onclick = () => { menu.hidePopover(); onDeleteResource(apiName, displayName, item); };
        menu.appendChild(delItem);

        // A bare popover UA-centers on screen; anchor it under the caret. Inline
        // styles beat the UA [popover]:popover-open rule (higher specificity).
        menu.addEventListener("toggle", (e) => {
            const open = e.newState === "open";
            caret.setAttribute("aria-expanded", open ? "true" : "false");
            if (!open) return;
            const r = caret.getBoundingClientRect();
            menu.style.margin = "0";
            menu.style.inset = "auto";
            menu.style.position = "fixed";
            const mw = menu.offsetWidth, mh = menu.offsetHeight;
            let top = r.bottom + 4;
            if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
            menu.style.top = top + "px";
            menu.style.left = Math.max(8, r.right - mw) + "px";
        });

        const splitWrap = document.createElement("div");
        splitWrap.className = "split-remove";
        if (remove) splitWrap.appendChild(remove);
        splitWrap.appendChild(caret);
        splitWrap.appendChild(menu);

        const wrap = document.createElement("div");
        wrap.className = "item-actions";
        wrap.style.cssText = "display:flex;align-items:center;gap:.4rem;";
        // Connected is a state of the connector, so its tag rides inline next
        // to the name; only actionable controls (Connect / Re-authenticate,
        // Sandbox, local unlink, namespace delete) sit in the actions cluster.
        if (connected && st.inCli) {
            item.querySelector(".item-name-row")?.appendChild(statusEl);
        } else {
            wrap.appendChild(statusEl);
        }
        wrap.appendChild(sandbox);
        wrap.appendChild(splitWrap);
        item.appendChild(wrap);
    });

    updateSections();
    return true;
}

let rmMenuSeq = 0;
let pendingDelete = null;

// Local-only remove: unlink from Copilot, leave the namespace resource intact.
async function onRemoveLocal(item, apiName) {
    const wrap = item.querySelector(".item-actions");
    const mainBtn = wrap?.querySelector(".split-main");
    if (mainBtn) { mainBtn.disabled = true; mainBtn.textContent = "Disconnecting\u2026"; }
    if (wrap) wrap.style.opacity = "0.6";
    try {
        const r = await fetch("/api/remove-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiName })
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        toast("Disconnected from Copilot.");
        await hydrateState();
    } catch (err) {
        toast("Disconnect failed: " + err.message, true);
        await hydrateState();
    }
}

// One shared confirm dialog for the destructive namespace delete. Built lazily
// and appended to body (native <dialog> promotes to the top layer, so the
// scrolling catalog can't clip it).
function ensureDeleteDialog() {
    let dlg = document.getElementById("cn-del-dialog");
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "cn-del-dialog";
    dlg.className = "cn-dialog";
    dlg.innerHTML =
        '<form method="dialog" class="cn-dialog-form">' +
          '<h2 class="cn-dialog-title">Delete from namespace?</h2>' +
          '<p class="cn-dialog-body">This deletes the actual <strong id="cn-del-name">connector</strong> ' +
            "resource from your namespace on Azure. Everyone who uses this namespace loses it, and it can't be undone.</p>" +
          '<p class="cn-dialog-note">This is different from the unlink button, which only removes the connector from ' +
            'Copilot and leaves the namespace resource in place.</p>' +
          '<div class="cn-dialog-actions">' +
            '<button value="cancel" class="cn-btn cn-btn-cancel">Cancel</button>' +
            '<button value="confirm" class="cn-btn cn-btn-danger">Delete</button>' +
          '</div>' +
        '</form>';
    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => {
        const pd = pendingDelete;
        pendingDelete = null;
        if (dlg.returnValue === "confirm" && pd) performNamespaceDelete(pd);
    });
    return dlg;
}

function onDeleteResource(apiName, displayName, item) {
    const dlg = ensureDeleteDialog();
    pendingDelete = { apiName, displayName, item };
    const nameEl = dlg.querySelector("#cn-del-name");
    if (nameEl) nameEl.textContent = displayName || apiName;
    dlg.returnValue = "";
    dlg.showModal();
}

// Full delete: drops the local entry AND the namespace resources (existing
// /api/uninstall). Slower (polls ARM), so re-hydrate only after it converges.
async function performNamespaceDelete({ apiName, item }) {
    const wrap = item.querySelector(".item-actions");
    const btns = wrap ? [...wrap.querySelectorAll("button")] : [];
    const mainBtn = wrap?.querySelector(".split-main");
    btns.forEach((b) => { b.disabled = true; });
    if (mainBtn) mainBtn.textContent = "Deleting\u2026";
    if (wrap) wrap.style.opacity = "0.6";
    try {
        const r = await fetch("/api/uninstall", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiName })
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        toast("Deleted from namespace.");
        await hydrateState();
    } catch (err) {
        toast("Delete failed: " + err.message, true);
        await hydrateState();
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
