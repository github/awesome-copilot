"use strict";

// ---- tiny helpers -------------------------------------------------------
const $ = (id) => document.getElementById(id);
const nonce = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// The server mints a per-session access token and passes it in this iframe's
// URL. Attach it to every data request so other local origins that guess the
// port cannot read state or drive mutations.
const ACCESS_KEY = new URLSearchParams(location.search).get("k") || "";
function withKey(path) {
    const u = new URL(path, location.origin);
    if (ACCESS_KEY) u.searchParams.set("k", ACCESS_KEY);
    return u.pathname + u.search;
}

async function api(path, body) {
    const res = await fetch(withKey(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

function toast(msg, ms = 2600) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), ms);
}

function clampSize(w, h, max = 1024) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const longer = Math.max(w, h);
    if (longer > max) {
        const s = max / longer;
        w = Math.max(1, Math.round(w * s));
        h = Math.max(1, Math.round(h * s));
    }
    return { w, h };
}

// ---- state --------------------------------------------------------------
let state = { name: "animation", width: 256, height: 256, loops: 0, hiddenFirst: false, frames: [] };
let assetNonce = nonce();

function defaultDelay() {
    const v = parseInt($("in-delay-all").value, 10);
    return Number.isFinite(v) && v >= 0 ? v : 120;
}

async function refreshState() {
    const res = await fetch(withKey("/state"));
    state = await res.json();
    assetNonce = nonce();
    render();
}

// ---- rendering ----------------------------------------------------------
function render() {
    renderPreview();
    renderMeta();
    renderSettings();
    renderFrames();
    syncDrawStage();
}

function renderPreview() {
    const img = $("preview");
    const empty = $("empty-preview");
    const has = state.frames.length > 0;
    empty.hidden = has;
    if (has) {
        img.src = withKey(`/preview.png?n=${assetNonce}`);
        img.hidden = false;
        img.classList.toggle("pixelated", Math.max(state.width, state.height) < 96);
    } else {
        img.hidden = true;
    }
}

function renderMeta() {
    const n = state.frames.length;
    const hidden = state.hiddenFirst && n >= 2;
    const animated = hidden ? state.frames.slice(1) : state.frames;
    const totalMs = Math.round(
        animated.reduce((a, f) => a + (f.delayNum || 0) / (f.delayDen || 1000), 0) * 1000
    );
    $("meta-frames").textContent = `${n} frame${n === 1 ? "" : "s"}${hidden ? " · 1 static" : ""}`;
    $("meta-duration").textContent = `${(totalMs / 1000).toFixed(1)}s`;
    $("meta-loops").textContent = state.loops === 0 ? "loops ∞" : `loops ${state.loops}`;
    const busy = n === 0;
    $("btn-export").disabled = busy;
    $("btn-download").disabled = busy;
    $("btn-restart").disabled = busy;
    $("btn-share").disabled = busy;
}

function renderSettings() {
    const n = state.frames.length;
    const hasFrames = n > 0;
    const w = $("in-width"),
        h = $("in-height"),
        l = $("in-loops");
    if (document.activeElement !== w) w.value = state.width;
    if (document.activeElement !== h) h.value = state.height;
    if (document.activeElement !== l) l.value = state.loops;
    w.disabled = hasFrames;
    h.disabled = hasFrames;
    $("dim-hint").style.display = hasFrames ? "block" : "none";

    const hf = $("in-hidden-first");
    hf.checked = !!state.hiddenFirst;
    hf.disabled = n < 2;
    $("hidden-first-label").classList.toggle("disabled", n < 2);
    $("hidden-first-hint").hidden = !(state.hiddenFirst && n >= 2);

    for (const id of ["btn-delay-all", "btn-fps", "btn-ops-all"]) $(id).disabled = !hasFrames;
}

function renderFrames() {
    const strip = $("frame-strip");
    const empty = $("empty-frames");
    strip.innerHTML = "";
    empty.hidden = state.frames.length > 0;
    const hidden = state.hiddenFirst && state.frames.length >= 2;
    state.frames.forEach((f, i) => {
        const isStatic = hidden && i === 0;
        const card = document.createElement("div");
        card.className = "frame-card" + (isStatic ? " is-static" : "");

        const thumbWrap = document.createElement("div");
        thumbWrap.className = "checker frame-thumb-wrap";
        const thumb = document.createElement("img");
        thumb.className = "frame-thumb";
        thumb.alt = `Frame ${i + 1}`;
        thumb.src = withKey(`/frame?id=${encodeURIComponent(f.id)}&n=${assetNonce}`);
        thumbWrap.appendChild(thumb);
        if (isStatic) {
            const badge = document.createElement("span");
            badge.className = "static-badge";
            badge.textContent = "STATIC";
            thumbWrap.appendChild(badge);
        }

        const body = document.createElement("div");
        body.className = "frame-body";

        const idx = document.createElement("div");
        idx.className = "frame-index";
        idx.textContent = isStatic ? `#${i + 1} · fallback` : `#${i + 1}`;

        // Inputs (declared first so the shared commit closure can read them).
        const numIn = numberInput(f.delayNum, 0, 65535, "Delay numerator");
        const denIn = numberInput(f.delayDen, 1, 65535, "Delay denominator");
        const disposeSel = selectEl(
            [[0, "None"], [1, "Background"], [2, "Previous"]],
            f.disposeOp,
            "Dispose op — what to do with the canvas after this frame"
        );
        const blendSel = selectEl(
            [[0, "Source"], [1, "Over"]],
            f.blendOp,
            "Blend op — how this frame is drawn onto the canvas"
        );
        const msHint = document.createElement("span");
        msHint.className = "ms-hint muted";

        const updateHint = () => {
            const num = parseInt(numIn.value, 10) || 0;
            const den = parseInt(denIn.value, 10) || 1000;
            const ms = Math.round((num / den) * 1000);
            const fps = num > 0 ? den / num : 0;
            const fpsTxt = fps ? ` · ${Number.isInteger(fps) ? fps : fps.toFixed(1)} fps` : "";
            msHint.textContent = `= ${ms} ms${fpsTxt}`;
        };
        updateHint();
        const commit = () =>
            api("/frames/props", {
                id: f.id,
                delayNum: parseInt(numIn.value, 10) || 0,
                delayDen: parseInt(denIn.value, 10) || 1000,
                disposeOp: parseInt(disposeSel.value, 10) || 0,
                blendOp: parseInt(blendSel.value, 10) || 0,
            }).catch((e) => toast("Error: " + e.message));

        numIn.addEventListener("input", updateHint);
        denIn.addEventListener("input", updateHint);
        numIn.addEventListener("change", commit);
        denIn.addEventListener("change", commit);
        disposeSel.addEventListener("change", commit);
        blendSel.addEventListener("change", commit);

        const delayRow = document.createElement("div");
        delayRow.className = "frame-field";
        delayRow.append(fieldLabel("delay"), numIn, slash(), denIn, msHint);

        const opsRow = document.createElement("div");
        opsRow.className = "frame-field";
        opsRow.append(fieldLabel("dispose"), disposeSel);
        const blendRow = document.createElement("div");
        blendRow.className = "frame-field";
        blendRow.append(fieldLabel("blend"), blendSel);

        const actions = document.createElement("div");
        actions.className = "frame-actions";
        actions.append(
            iconBtn("◀", "Move left", i === 0, () => api("/frames/move", { id: f.id, delta: -1 })),
            iconBtn("▶", "Move right", i === state.frames.length - 1, () =>
                api("/frames/move", { id: f.id, delta: 1 })
            ),
            iconBtn("⧉", "Duplicate", false, () => api("/frames/duplicate", { id: f.id })),
            iconBtn("✕", "Delete", false, () => api("/frames/delete", { id: f.id }), true)
        );

        if (isStatic) {
            [numIn, denIn, disposeSel, blendSel].forEach((el) => (el.disabled = true));
            msHint.textContent = "not animated";
        }

        body.append(idx, delayRow, opsRow, blendRow, actions);
        card.append(thumbWrap, body);
        strip.appendChild(card);
    });
}

function numberInput(value, min, max, title) {
    const el = document.createElement("input");
    el.type = "number";
    el.className = "num-in";
    el.min = String(min);
    el.max = String(max);
    el.step = "1";
    el.value = value;
    el.title = title;
    return el;
}

function selectEl(options, value, title) {
    const s = document.createElement("select");
    s.className = "frame-select";
    s.title = title;
    for (const [val, text] of options) {
        const o = document.createElement("option");
        o.value = String(val);
        o.textContent = text;
        s.appendChild(o);
    }
    s.value = String(value);
    return s;
}

function fieldLabel(text) {
    const s = document.createElement("span");
    s.className = "frame-label muted";
    s.textContent = text;
    return s;
}

function slash() {
    const s = document.createElement("span");
    s.className = "slash muted";
    s.textContent = "/";
    return s;
}

function iconBtn(label, title, disabled, onClick, danger) {
    const b = document.createElement("button");
    b.className = "icon-btn" + (danger ? " danger" : "");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.disabled = !!disabled;
    b.addEventListener("click", async () => {
        try {
            await onClick();
        } catch (e) {
            toast("Error: " + e.message);
        }
    });
    return b;
}

// ---- settings handlers --------------------------------------------------
async function commitLoops() {
    await api("/settings", { loops: parseInt($("in-loops").value, 10) || 0 });
}
async function commitDim() {
    if (state.frames.length > 0) return;
    const w = parseInt($("in-width").value, 10);
    const h = parseInt($("in-height").value, 10);
    const { w: cw, h: ch } = clampSize(w || state.width, h || state.height);
    await api("/settings", { width: cw, height: ch });
}
function debounce(fn, ms) {
    let t = null;
    return () => {
        clearTimeout(t);
        t = setTimeout(fn, ms);
    };
}
// Commit on `input` (fires for stepper buttons and arrow keys in every engine,
// including the host WebKit view where `change` is unreliable for steppers) as
// well as `change` (final blur/Enter). The `input` path is debounced so holding
// an arrow or typing a value doesn't spam the server.
const commitDimSoon = debounce(commitDim, 300);
const commitLoopsSoon = debounce(commitLoops, 300);
for (const id of ["in-width", "in-height"]) {
    $(id).addEventListener("input", commitDimSoon);
    $(id).addEventListener("change", commitDim);
}
$("in-loops").addEventListener("input", commitLoopsSoon);
$("in-loops").addEventListener("change", commitLoops);
$("in-hidden-first").addEventListener("change", async (e) => {
    await api("/settings", { hiddenFirst: e.target.checked });
});
$("btn-delay-all").addEventListener("click", async () => {
    const ms = defaultDelay();
    await api("/frames/props-all", { delayMs: ms });
    toast(`All delays set to ${ms} ms`);
});
$("btn-fps").addEventListener("click", async () => {
    const fps = Math.max(1, Math.min(120, parseInt($("in-fps").value, 10) || 12));
    await api("/frames/props-all", { fps });
    toast(`All frames set to ${fps} fps`);
});
$("btn-ops-all").addEventListener("click", async () => {
    await api("/frames/props-all", {
        disposeOp: parseInt($("in-dispose-all").value, 10) || 0,
        blendOp: parseInt($("in-blend-all").value, 10) || 0,
    });
    toast("Applied dispose & blend to all frames");
});
$("btn-clear").addEventListener("click", async () => {
    if (!state.frames.length) return;
    if (!confirm("Remove all frames?")) return;
    await api("/frames/clear", {});
});

// ---- export / download --------------------------------------------------
$("btn-export").addEventListener("click", async () => {
    try {
        const r = await api("/export", {});
        $("saved-path").hidden = false;
        $("saved-path").textContent = "Saved: " + r.path;
        toast("Exported " + r.name);
    } catch (e) {
        toast("Export failed: " + e.message);
    }
});
$("btn-download").addEventListener("click", async () => {
    const res = await fetch(withKey(`/preview.png?n=${nonce()}`));
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (state.name || "animation").replace(/[^\w.-]+/g, "_") + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
$("btn-restart").addEventListener("click", () => {
    // Re-assigning an identical src is a no-op, so bump the nonce to force a
    // fresh fetch and restart the animation from the first frame.
    assetNonce = nonce();
    renderPreview();
});

// ---- send to phone ------------------------------------------------------
let shareCountdown = null;

$("btn-share").addEventListener("click", async () => {
    const btn = $("btn-share");
    btn.disabled = true;
    try {
        const info = await api("/share/start", {});
        openSharePanel(info);
    } catch (e) {
        toast("Couldn't start sharing: " + e.message);
    } finally {
        btn.disabled = state.frames.length === 0;
    }
});

$("btn-share-stop").addEventListener("click", stopSharing);

function openSharePanel(info) {
    $("share-panel").hidden = false;
    // Cache-bust the QR so a new token's code is fetched each time.
    $("share-qr-img").src = withKey(`/share/qr.png?ts=${Date.now()}`);
    const link = $("share-url");
    link.href = info.url;
    link.textContent = info.url.replace(/^https?:\/\//, "");
    startShareCountdown(info.expiresAt);
}

function startShareCountdown(expiresAt) {
    clearInterval(shareCountdown);
    const tick = () => {
        const ms = expiresAt - Date.now();
        if (ms <= 0) {
            clearInterval(shareCountdown);
            $("share-panel").hidden = true;
            toast("Phone link expired");
            api("/share/stop", {}).catch(() => {});
            return;
        }
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        $("share-expiry").textContent = `Expires in ${m}:${String(s).padStart(2, "0")}`;
    };
    tick();
    shareCountdown = setInterval(tick, 1000);
}

async function stopSharing() {
    clearInterval(shareCountdown);
    $("share-panel").hidden = true;
    try {
        await api("/share/stop", {});
    } catch (_) {
        /* server may have already expired the share */
    }
}

// ---- upload -------------------------------------------------------------
$("btn-upload").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (files.length) await addFiles(files);
});

async function addFiles(files) {
    try {
        toast(`Adding ${files.length} image${files.length === 1 ? "" : "s"}…`);
        if (state.frames.length === 0) {
            const first = await createImageBitmap(files[0]);
            const { w, h } = clampSize(first.width, first.height);
            await api("/settings", { width: w, height: h });
            await refreshState();
        }
        for (const f of files) await addImageFile(f);
        toast("Frames added");
    } catch (e) {
        toast("Upload error: " + e.message);
    }
}

async function addImageFile(file) {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = state.width;
    c.height = state.height;
    drawContain(c.getContext("2d"), bmp, state.width, state.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    await postFrame(blob, defaultDelay());
}

function drawContain(ctx, img, W, H) {
    const s = Math.min(W / img.width, H / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

async function postFrame(blob, delayMs) {
    const res = await fetch(withKey(`/frames?delayMs=${delayMs || 0}`), { method: "POST", body: blob });
    if (!res.ok) throw new Error(await res.text());
}

// ---- drawing ------------------------------------------------------------
const drawCanvas = $("draw-canvas");
const dctx = drawCanvas.getContext("2d");
let drawTool = "pen";
let drawing = false;
let lastPt = null;

$("btn-toggle-draw").addEventListener("click", () => {
    const panel = $("draw-panel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) initDrawCanvas();
});
$("btn-cancel-draw").addEventListener("click", () => ($("draw-panel").hidden = true));
$("tool-pen").addEventListener("click", () => setTool("pen"));
$("tool-eraser").addEventListener("click", () => setTool("eraser"));
function setTool(t) {
    drawTool = t;
    $("tool-pen").classList.toggle("active", t === "pen");
    $("tool-eraser").classList.toggle("active", t === "eraser");
    $("tool-pen").setAttribute("aria-pressed", String(t === "pen"));
    $("tool-eraser").setAttribute("aria-pressed", String(t === "eraser"));
}
$("btn-clear-draw").addEventListener("click", () => {
    dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
});
$("btn-fill").addEventListener("click", () => {
    dctx.save();
    dctx.globalCompositeOperation = "source-over";
    dctx.fillStyle = $("draw-color").value;
    dctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    dctx.restore();
});
$("opt-onion").addEventListener("change", syncOnion);
$("opt-from-last").addEventListener("change", initDrawCanvas);

function syncDrawStage() {
    // Size the drawing surface to the project dimensions and scale for display.
    if (drawCanvas.width !== state.width || drawCanvas.height !== state.height) {
        drawCanvas.width = state.width;
        drawCanvas.height = state.height;
    }
    const longer = Math.max(state.width, state.height) || 1;
    const scale = Math.min(360, Math.max(200, longer)) / longer;
    const dispW = Math.max(1, Math.round(state.width * scale));
    const dispH = Math.max(1, Math.round(state.height * scale));
    drawCanvas.style.width = dispW + "px";
    drawCanvas.style.height = dispH + "px";
    drawCanvas.style.imageRendering = scale > 1.4 ? "pixelated" : "auto";
    const onion = $("onion-img");
    onion.style.width = dispW + "px";
    onion.style.height = dispH + "px";
    if (!$("draw-panel").hidden) syncOnion();
}

function lastFrame() {
    return state.frames.length ? state.frames[state.frames.length - 1] : null;
}

function syncOnion() {
    const onion = $("onion-img");
    const lf = lastFrame();
    if ($("opt-onion").checked && lf) {
        onion.src = withKey(`/frame?id=${encodeURIComponent(lf.id)}&n=${assetNonce}`);
        onion.hidden = false;
    } else {
        onion.hidden = true;
    }
}

function initDrawCanvas() {
    syncDrawStage();
    dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const lf = lastFrame();
    if ($("opt-from-last").checked && lf) {
        const img = new Image();
        img.onload = () => dctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
        img.src = withKey(`/frame?id=${encodeURIComponent(lf.id)}&n=${assetNonce}`);
    }
    syncOnion();
}

function canvasPoint(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (drawCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (drawCanvas.height / rect.height),
    };
}
function strokeTo(pt) {
    dctx.globalCompositeOperation = drawTool === "eraser" ? "destination-out" : "source-over";
    dctx.strokeStyle = $("draw-color").value;
    dctx.fillStyle = $("draw-color").value;
    dctx.lineWidth = parseInt($("draw-size").value, 10) || 6;
    dctx.lineCap = "round";
    dctx.lineJoin = "round";
    if (lastPt) {
        dctx.beginPath();
        dctx.moveTo(lastPt.x, lastPt.y);
        dctx.lineTo(pt.x, pt.y);
        dctx.stroke();
    } else {
        dctx.beginPath();
        dctx.arc(pt.x, pt.y, dctx.lineWidth / 2, 0, Math.PI * 2);
        dctx.fill();
    }
    lastPt = pt;
}
drawCanvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    lastPt = null;
    drawCanvas.setPointerCapture(e.pointerId);
    strokeTo(canvasPoint(e));
});
drawCanvas.addEventListener("pointermove", (e) => {
    if (drawing) strokeTo(canvasPoint(e));
});
function endStroke() {
    drawing = false;
    lastPt = null;
}
drawCanvas.addEventListener("pointerup", endStroke);
drawCanvas.addEventListener("pointerleave", endStroke);
drawCanvas.addEventListener("pointercancel", endStroke);

$("btn-add-drawing").addEventListener("click", async () => {
    const blob = await new Promise((r) => drawCanvas.toBlob(r, "image/png"));
    await postFrame(blob, defaultDelay());
    toast("Frame added");
    if ($("opt-from-last").checked) {
        // Pull the just-added frame into state before re-seeding the canvas, so
        // "start from last frame" copies it instead of the previous frame (or a
        // blank canvas on the first add), which the async SSE update may not
        // have delivered yet.
        await refreshState();
        initDrawCanvas();
    }
});

// ---- live updates -------------------------------------------------------
let eventSource = null;
function connectEvents() {
    try {
        if (eventSource) eventSource.close();
        eventSource = new EventSource(withKey("/events"));
        eventSource.onmessage = () => refreshState();
    } catch (_) {
        eventSource = null; /* SSE unavailable; manual reload still works */
    }
}

$("btn-reload").addEventListener("click", async () => {
    const btn = $("btn-reload");
    const glyph = $("reload-glyph");
    btn.disabled = true;
    glyph.classList.add("spinning");
    try {
        // Recover a dropped live-update stream, then pull the latest state and
        // rebuild the preview + thumbnails against a fresh cache-busting nonce.
        if (!eventSource || eventSource.readyState === 2) connectEvents();
        await refreshState();
        toast("Reloaded");
    } catch (e) {
        toast("Reload failed: " + e.message);
    } finally {
        glyph.classList.remove("spinning");
        btn.disabled = false;
    }
});

connectEvents();
refreshState();
