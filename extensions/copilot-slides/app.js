import { slideSvg, exportHtml, textLines } from "./render.mjs";
import { validateDeck, DEFAULT_THEME, isDefaultTheme } from "./model.mjs";
import { createPowerPoint, writePowerPoint } from "./export.mjs";
import { renderDataEditor } from "./data-editor.mjs";
import { readPowerPoint } from "./import.mjs";
import { buildSteps, navigateBuild, showBuild } from "./presentation.mjs";
import { contrastRatio, exportTheme, importTheme, themeFromPixels } from "./brand.mjs";
import { applyLocale, resolveLocale, t } from "./i18n.mjs";

const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1);
const viewParams = new URLSearchParams(location.search);
const locale = applyLocale(resolveLocale(viewParams.get("lang"), ...navigator.languages));
const presenterMode = viewParams.get("mode") === "presenter";
const presentWindow = viewParams.get("mode") === "present";
const channel = new BroadcastChannel(`copilot-slides-${token}`);
const openingViews = new Set();
let readyLaunchId;
let fullscreenExitedAt = -Infinity;
let deck, slideId, elementId, capabilities = { chat: false };
let dirty = false, saving = false, conflict = false, connected = true, sequence = 0, pending, timer, presenting = false;
let undo = [], redo = [];
let stageKey = "";
let build = 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const current = () => deck?.slides.find((s) => s.id === slideId);
const selected = () => current()?.elements.find((e) => e.id === elementId);
const clone = (value) => structuredClone(value);
const error = (message) => { $("error").textContent = message; $("error").hidden = !message; };
const field = (id, value) => { if (document.activeElement !== $(id)) $(id).value = value ?? ""; };
const api = (path) => `${path}?token=${encodeURIComponent(token)}`;
const themes = {
    digital: DEFAULT_THEME,
    paper: { background: "#ffffff", foreground: "#1f2328", accent: "#0969da" },
    night: { background: "#151b26", foreground: "#f0f3f6", accent: "#66b6ff" },
    forest: { background: "#f3f6ee", foreground: "#20372b", accent: "#31835b" },
};

function setupWorkspaceSplitter() {
    const splitter = $("workspace-splitter"), workspace = $("slide-workspace");
    const main = workspace.parentElement;
    let share = 50, resizing = null;
    const setShare = (value) => {
        share = Math.max(20, Math.min(80, value));
        main.style.setProperty("--workspace-row", `${share}fr`);
        main.style.setProperty("--inspector-row", `${100 - share}fr`);
        splitter.setAttribute("aria-valuenow", String(Math.round(share)));
        splitter.setAttribute("aria-valuetext", t("Slide {slide}%, settings {settings}%", { slide: Math.round(share), settings: 100 - Math.round(share) }));
    };
    const endResize = (event) => {
        if (!resizing || event.pointerId !== resizing.pointerId) return;
        resizing = null;
        splitter.classList.remove("dragging");
        if (splitter.hasPointerCapture(event.pointerId)) splitter.releasePointerCapture(event.pointerId);
    };
    splitter.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || resizing || !splitter.offsetHeight) return;
        const available = main.clientHeight - splitter.offsetHeight;
        if (available <= 0) return;
        resizing = { pointerId: event.pointerId, y: event.clientY, height: workspace.getBoundingClientRect().height, available };
        splitter.setPointerCapture(event.pointerId);
        splitter.focus({ preventScroll: true });
        splitter.classList.add("dragging");
        event.preventDefault();
    });
    splitter.addEventListener("pointermove", (event) => {
        if (!resizing || event.pointerId !== resizing.pointerId) return;
        setShare((resizing.height + event.clientY - resizing.y) / resizing.available * 100);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
        splitter.addEventListener(type, endResize);
    }
    splitter.addEventListener("keydown", (event) => {
        const value = { ArrowUp: share - 5, ArrowDown: share + 5, Home: 20, End: 80 }[event.key];
        if (value === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        setShare(value);
    });
    setShare(share);
}

async function request(path, body) {
    const response = await fetch(api(path), body ? {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    } : undefined);
    const data = await response.json();
    if (!response.ok) { const failure = new Error(data.error); failure.code = data.code; throw failure; }
    return data;
}
function status() {
    $("save-status").textContent = conflict ? t("Conflict · draft kept") : saving ? t("Saving…") : dirty ? t("Unsaved changes") :
        !connected ? t("Disconnected") : deck?.version ? t("Saved v{version}", { version: deck.version }) : t("New deck");
    $("conflict").hidden = !conflict;
    $("undo").disabled = !undo.length || conflict;
    $("redo").disabled = !redo.length || conflict;
}
function accept(value, resetHistory = false) {
    deck = value;
    if (!deck.slides.some((s) => s.id === slideId)) slideId = deck.slides[0]?.id;
    build = Math.min(build, buildSteps(current()).length);
    if (!current()?.elements.some((e) => e.id === elementId)) elementId = null;
    if (resetHistory) { undo = []; redo = []; }
    render();
}
async function flush() {
    clearTimeout(timer);
    if (drag) throw new Error(t("Finish moving or resizing before saving."));
    if (saving) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return flush();
    }
    if (conflict) throw new Error(t("Resolve the conflict with the latest version first. Your draft is preserved."));
    if (!dirty) return;
    saving = true;
    const sentSequence = sequence, draft = clone(deck);
    status();
    try {
        const saved = await request("/save", { expectedVersion: draft.version, deck: draft });
        if (sequence === sentSequence) { dirty = false; accept(saved); }
        else { deck.version = saved.version; deck.updatedAt = saved.updatedAt; }
        if (pending && pending.version > saved.version) {
            if (dirty) conflict = true;
            else accept(pending, true);
        }
        pending = null;
        error("");
    } catch (e) {
        if (e.code === "conflict") conflict = true;
        error(t("Couldn't save. {message} Your draft is preserved on this screen.", { message: e.message }));
        throw e;
    } finally { saving = false; status(); }
    if (dirty && !conflict) return flush();
}
function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { flush().catch((e) => error(e.message)); }, 600);
}
function mutate(change) {
    if (!deck || presenting) return;
    const before = clone(deck);
    try {
        change(deck);
        deck = validateDeck(deck, deck.id);
        undo.push(before);
        if (undo.length > 50) undo.shift();
        redo = [];
        sequence++;
        dirty = true;
        error("");
        render();
        if (!conflict) schedule();
    } catch (e) { deck = before; error(e.message); render(); }
}
function history(from, to) {
    if (!from.length || conflict) return;
    const previous = from.pop();
    to.push(clone(deck));
    previous.version = deck.version;
    previous.updatedAt = deck.updatedAt;
    sequence++;
    dirty = true;
    accept(previous);
    schedule();
}
function node(tag, text) { const element = document.createElement(tag); element.textContent = text; return element; }

function renderStage() {
    const slide = current();
    $("empty").hidden = Boolean(slide);
    $("slide").hidden = !slide;
    const key = JSON.stringify([slide, deck.theme, presenting]);
    const changed = key !== stageKey;
    if (changed) {
        $("slide").innerHTML = slide ? slideSvg(deck, slide, { interactive: !presenting }) : "";
        $("slide").getAnimations().forEach((animation) => animation.cancel());
        if (presenting && slide?.transition === "fade" && !reducedMotion.matches) {
            $("slide").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
        }
        stageKey = key;
    }
    if (presenting) showBuild($("slide"), build, !changed, reducedMotion.matches);
    const svg = $("slide").querySelector("svg");
    svg?.querySelectorAll("[data-selection]").forEach((item) => item.remove());
    const e = selected();
    if (svg && e && !presenting) {
        for (const attributes of [
            { x: e.x, y: e.y, width: e.w, height: e.h, fill: "none", stroke: "#0969da", "stroke-width": 3, "pointer-events": "none" },
            { x: e.x + e.w - 8, y: e.y + e.h - 8, width: 16, height: 16, fill: "#0969da", "data-resize": e.id },
        ]) {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("data-selection", "");
            for (const [name, value] of Object.entries(attributes)) rect.setAttribute(name, String(value));
            svg.append(rect);
        }
    }
    $("page-count").textContent = slide ? `${deck.slides.indexOf(slide) + 1} / ${deck.slides.length}${presenting && buildSteps(slide).length ? ` · ${t("Step {current}/{total}", { current: build, total: buildSteps(slide).length })}` : ""}` : "0 / 0";
}
function render() {
    if (!deck) return;
    if (presenterMode) return renderPresenter();
    if (presentWindow) document.title = t("Presentation · {title}", { title: deck.title });
    field("deck-title", deck.title);
    renderStage();
    const focusedThumb = document.activeElement?.dataset.slide;
    const thumbnails = deck.slides.map((slide, index) => {
        const button = node("button", "");
        button.className = `thumbnail${slide.id === slideId ? " active" : ""}${slide.skipped ? " skipped" : ""}`;
        button.dataset.slide = slide.id;
        const title = slide.title || t("Untitled");
        button.setAttribute("aria-label", t("Slide {n}: {title}", { n: index + 1, title }));
        button.setAttribute("aria-current", slide.id === slideId ? "true" : "false");
        const preview = document.createElement("div");
        preview.setAttribute("aria-hidden", "true");
        preview.innerHTML = slideSvg(deck, slide);
        button.append(preview, node("span", `${index + 1}. ${slide.skipped ? t("{title} (excluded)", { title }) : title}`));
        button.onclick = () => choose(slide.id);
        return button;
    });
    $("thumbnails").replaceChildren(...thumbnails);
    thumbnails.find((button) => button.dataset.slide === focusedThumb)?.focus({ preventScroll: true });
    const slide = current(), element = selected();
    for (const id of ["duplicate-slide", "delete-slide", "up", "down", "slide-title", "notes", "skipped", "slide-background", "add-comment"]) $(id).disabled = !slide;
    document.querySelectorAll("[data-add]").forEach((button) => { button.disabled = !slide; });
    $("image").disabled = !slide;
    $("present").disabled = $("presenter").disabled = !deck.slides.some((s) => !s.skipped);
    $("up").disabled ||= deck.slides.indexOf(slide) === 0;
    $("down").disabled ||= deck.slides.indexOf(slide) === deck.slides.length - 1;
    field("slide-title", slide?.title);
    field("notes", slide?.notes);
    field("slide-background", slide?.background || deck.theme.background);
    field("transition", slide?.transition || "none");
    $("transition").disabled = !slide;
    $("skipped").checked = slide?.skipped || false;
    $("open-questions").textContent = deck.openQuestions.length ? `${t("Open questions")}\n${deck.openQuestions.join("\n")}` : "";
    const picker = $("element-picker");
    picker.replaceChildren(new Option(t("No selection"), ""), ...(slide?.elements || []).map((e) => new Option(`${e.type}: ${(e.text || e.alt || e.id).slice(0, 25)}`, e.id)));
    picker.value = element?.id || "";
    $("element-fields").disabled = !element;
    $("edit-inline").disabled = !element || !["text", "shape"].includes(element.type);
    for (const id of ["x", "y", "w", "h"]) field(id, element?.[id]);
    field("element-text", element?.text);
    field("font-size", element?.fontSize ?? 32);
    field("color", element?.color ?? deck.theme.foreground);
    field("align", element?.align ?? "left");
    field("animation", element?.animation?.effect || "none");
    field("animation-step", element?.animation?.step || 1);
    $("animation-step-label").hidden = !element?.animation;
    field("alt", element?.alt);
    $("bold").checked = Boolean(element?.bold);
    $("alt-label").hidden = element?.type !== "image";
    $("data-label").hidden = !["table", "chart"].includes(element?.type);
    $("chart-type-label").hidden = element?.type !== "chart";
    field("chart-type", element?.chartType || "bar");
    renderDataEditor($("data-editor"), element, (change) => mutate(() => change(selected())));
    if (element?.type === "table") field("data", JSON.stringify(element.rows, null, 2));
    if (element?.type === "chart") field("data", JSON.stringify({ labels: element.labels, values: element.values }, null, 2));
    field("font-family", deck.theme.fontFamily);
    for (const name of ["background", "foreground", "accent"]) field(`theme-${name}`, deck.theme[name]);
    $("theme-contrast").textContent = contrastRatio(deck.theme.background, deck.theme.foreground) < 4.5
        ? t("Background and text colors have a contrast ratio below 4.5:1. Adjust the colors.") : "";
    field("theme", Object.keys(themes).find((key) => Object.entries(themes[key]).every(([name, value]) => deck.theme[name] === value)) || "");
    $("overflow").textContent = element && ["text", "shape"].includes(element.type) &&
        textLines(element.text, element.w - 12, element.fontSize, deck.theme.fontFamily, element.bold).length * element.fontSize * (element.lineHeight ?? 1.2) + 6 > element.h
        ? t("The text doesn't fit in the box. Increase the height or reduce the font size.") : "";
    $("comments").replaceChildren();
    for (const comment of deck.comments.filter((c) => c.slideId === slideId)) {
        const card = node("div", "");
        card.className = "comment";
        const labels = { draft: t("Not sent"), sending: t("Sending (do not resend)"), sent: t("Sent to Chat"), unknown: t("Send result unknown. Check Chat."), resolved: t("Resolved") };
        card.append(node("small", `${comment.elementId ? t("Element request") : t("Slide request")} · ${labels[comment.status]}`), node("p", comment.text));
        if (comment.reply) card.append(node("p", `Copilot: ${comment.reply}`));
        if (comment.status === "draft") {
            const button = node("button", t("Send to Copilot"));
            button.disabled = !capabilities.chat;
            button.onclick = () => sendComment(comment.id);
            card.append(button);
        }
        $("comments").append(card);
    }
    status();
}
function choose(id, broadcast = true, nextBuild = 0) {
    $("inline-text").hidden = true;
    slideId = id;
    build = Math.max(0, Math.min(buildSteps(current()).length, Number.isInteger(nextBuild) ? nextBuild : 0));
    elementId = null;
    render();
    if (broadcast) channel.postMessage({ slideId, build });
}
function move(delta) {
    if (presenting || presenterMode) {
        const next = navigateBuild(deck.slides, { slideId, build }, delta);
        choose(next.slideId, true, next.build);
        return;
    }
    const slides = presenting || presenterMode ? deck.slides.filter((s) => !s.skipped) : deck.slides;
    if (!slides.length) return;
    const index = Math.max(0, slides.findIndex((s) => s.id === slideId));
    choose(slides[Math.max(0, Math.min(slides.length - 1, index + delta))].id);
}
function baseElement(type, overrides = {}) {
    return { id: uid("element"), type, x: isDefaultTheme(deck.theme) ? 64 : 80, y: 180, w: 600, h: 160, text: "",
        color: deck.theme.foreground, fontSize: 32, bold: false, align: "left", ...overrides };
}
function addSlide() {
    const id = uid("slide");
    const layout = $("layout").value;
    mutate((d) => {
        const digital = isDefaultTheme(d.theme);
        const elements = layout === "blank" ? [] : [baseElement("text", {
            y: digital ? (layout === "title" ? 208 : 64) : (layout === "title" ? 220 : 60),
            h: digital ? 192 : 140, w: digital ? 1152 : 1120,
            fontSize: digital ? (layout === "title" ? 64 : 48) : 56, bold: true, text: t("Enter a title"),
        })];
        if (layout === "content") elements.push(baseElement("text", { y: digital ? 272 : 230, w: digital ? 1152 : 1120, h: digital ? 384 : 380, text: t("Enter body text") }));
        d.slides.push({ id, title: t("New slide"), notes: "", skipped: false, background: d.theme.background, elements });
        slideId = id; elementId = null;
    });
}
$("add-slide").onclick = addSlide;
$("deck-title").onchange = () => mutate((d) => { d.title = $("deck-title").value; });
$("slide-title").oninput = () => mutate(() => { current().title = $("slide-title").value; });
$("notes").oninput = () => mutate(() => { current().notes = $("notes").value; });
$("skipped").onchange = () => mutate(() => { current().skipped = $("skipped").checked; });
$("slide-background").oninput = () => mutate(() => { current().background = $("slide-background").value; });
$("transition").onchange = () => mutate(() => { current().transition = $("transition").value; });
$("element-picker").onchange = () => { elementId = $("element-picker").value; render(); };
$("duplicate-slide").onclick = () => mutate((d) => {
    const slide = clone(current()); slide.id = uid("slide"); slide.title = t("{title} (copy)", { title: slide.title });
    d.slides.splice(d.slides.indexOf(current()) + 1, 0, slide); slideId = slide.id; elementId = null;
});
$("delete-slide").onclick = () => {
    if (!confirm(t("Delete this slide and its comments? You can undo this."))) return;
    mutate((d) => { d.slides = d.slides.filter((s) => s.id !== slideId); d.comments = d.comments.filter((c) => c.slideId !== slideId); slideId = d.slides[0]?.id; elementId = null; });
};
for (const [id, delta] of [["up", -1], ["down", 1]]) $(id).onclick = () => mutate((d) => {
    const index = d.slides.findIndex((s) => s.id === slideId);
    const [slide] = d.slides.splice(index, 1); d.slides.splice(index + delta, 0, slide);
});
document.querySelectorAll("[data-add]").forEach((button) => {
    button.onclick = () => mutate(() => {
        const type = button.dataset.add;
        const e = type === "text" ? baseElement("text", { text: t("Enter text") }) :
            ["rect", "ellipse"].includes(type) ? baseElement("shape", { shape: type, w: 240, color: deck.theme.accent }) :
            type === "table" ? baseElement("table", { w: 800, h: 240, fontSize: 24, rows: [[t("Item"), t("Details")], [t("Item 1"), t("Not entered")]] }) :
            baseElement("chart", { w: 800, h: 380, color: deck.theme.accent, labels: [t("Item 1"), t("Item 2")], values: [0, 0] });
        current().elements.push(e); elementId = e.id;
    });
});
$("image").onchange = async () => {
    const file = $("image").files[0];
    if (!file) return;
    try {
        if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 4000000) throw new Error(t("Choose a PNG or JPEG image of 4 MB or less."));
        const src = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(t("Couldn't read the image."))); reader.readAsDataURL(file);
        });
        const image = new Image(); image.src = src; await image.decode();
        const w = Math.min(800, image.naturalWidth), h = Math.min(480, w * image.naturalHeight / image.naturalWidth);
        mutate(() => { const e = baseElement("image", { w: h * image.naturalWidth / image.naturalHeight, h, src, alt: file.name }); current().elements.push(e); elementId = e.id; });
    } catch (e) { error(e.message); }
    $("image").value = "";
};
for (const id of ["x", "y", "w", "h", "font-size", "color", "align", "alt", "bold", "element-text"]) {
    const key = ({ "font-size": "fontSize", "element-text": "text" })[id] || id;
    $(id).addEventListener(["element-text", "color"].includes(id) ? "input" : "change", () => mutate(() => {
        selected()[key] = id === "bold" ? $(id).checked : ["x", "y", "w", "h", "font-size"].includes(id) ? Number($(id).value) : $(id).value;
    }));
}
$("data").onchange = () => {
    try {
        const data = JSON.parse($("data").value);
        mutate(() => { if (selected().type === "table") selected().rows = data; else { selected().labels = data.labels; selected().values = data.values; } });
    } catch (e) { error(t("Couldn't update the data. Check the JSON. {message}", { message: e.message })); }
};
$("chart-type").onchange = () => mutate(() => { selected().chartType = $("chart-type").value; });
$("animation").onchange = () => mutate(() => {
    const element = selected(), effect = $("animation").value;
    if (effect === "none") delete element.animation;
    else element.animation = { effect, step: element.animation?.step || Math.min(80, Math.max(0, ...buildSteps(current())) + 1) };
});
$("animation-step").onchange = () => {
    const input = $("animation-step");
    input.setAttribute("aria-invalid", String(!input.checkValidity()));
    if (!input.reportValidity()) return;
    mutate(() => { selected().animation.step = Number(input.value); });
};
$("duplicate-element").onclick = () => mutate(() => {
    const e = clone(selected()); e.id = uid("element"); e.x = Math.min(1280 - e.w, e.x + 20); e.y = Math.min(720 - e.h, e.y + 20);
    current().elements.push(e); elementId = e.id;
});
$("delete-element").onclick = () => mutate((d) => {
    current().elements = current().elements.filter((e) => e.id !== elementId);
    d.comments = d.comments.filter((c) => c.slideId !== slideId || c.elementId !== elementId); elementId = null;
});
for (const [id, front] of [["element-front", true], ["element-back", false]]) $(id).onclick = () => mutate(() => {
    const elements = current().elements, index = elements.findIndex((e) => e.id === elementId);
    const [e] = elements.splice(index, 1); if (front) elements.push(e); else elements.unshift(e);
});
let drag;
$("slide").addEventListener("pointerdown", (event) => {
    if (presenting || conflict || saving || event.button !== 0) return;
    const target = event.target.closest("[data-element],[data-resize]");
    if (!target) { elementId = null; render(); return; }
    elementId = target.dataset.element || target.dataset.resize;
    clearTimeout(timer);
    const original = clone(selected()), rect = $("slide").getBoundingClientRect();
    drag = { startX: event.clientX, startY: event.clientY, scale: 1280 / rect.width, original, resize: Boolean(target.dataset.resize), changed: false };
    $("slide").setPointerCapture(event.pointerId);
    render();
    event.preventDefault();
});
$("slide").addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = Math.round((event.clientX - drag.startX) * drag.scale), dy = Math.round((event.clientY - drag.startY) * drag.scale);
    const e = selected(), o = drag.original;
    if (drag.resize) { e.w = Math.max(20, Math.min(1280 - e.x, o.w + dx)); e.h = Math.max(20, Math.min(720 - e.y, o.h + dy)); }
    else { e.x = Math.max(0, Math.min(1280 - e.w, o.x + dx)); e.y = Math.max(0, Math.min(720 - e.h, o.y + dy)); }
    drag.changed = Boolean(dx || dy);
    renderStage();
});
function endDrag(cancel = false) {
    if (!drag) return;
    const value = clone(selected()), original = drag.original, changed = drag.changed;
    Object.assign(selected(), original); drag = null;
    if (changed && !cancel) mutate(() => Object.assign(selected(), value));
    else { render(); if (dirty) schedule(); }
    if (pending && pending.version > deck.version) {
        if (dirty) { conflict = true; clearTimeout(timer); status(); }
        else accept(pending, true);
        pending = null;
    }
}
$("slide").addEventListener("pointerup", () => endDrag());
$("slide").addEventListener("pointercancel", () => endDrag(true));
function editInline() {
    const e = selected();
    if (!e || presenting || !["text", "shape"].includes(e.type)) return;
    const editor = $("inline-text"), scale = $("slide").getBoundingClientRect().width / 1280;
    editor.value = e.text; editor.hidden = false;
    Object.assign(editor.style, { left: `${e.x / 12.8}%`, top: `${e.y / 7.2}%`, width: `${e.w / 12.8}%`, height: `${e.h / 7.2}%`,
        fontFamily: deck.theme.fontFamily, fontSize: `${e.fontSize * scale}px`, fontWeight: e.bold ? "700" : "400",
        lineHeight: String(e.lineHeight ?? 1.2),
        textAlign: e.align, color: e.type === "shape" ? deck.theme.foreground : e.color,
        backgroundColor: e.type === "shape" ? e.color : current().background });
    editor.focus(); editor.select();
}
$("edit-inline").onclick = editInline;
$("inline-text").oninput = () => mutate(() => { selected().text = $("inline-text").value; });
$("inline-text").onblur = () => { $("inline-text").hidden = true; };
$("inline-text").onkeydown = (event) => {
    if (event.key === "Escape" || (event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault(); $("inline-text").hidden = true; $("slide").focus();
    }
};
$("slide").addEventListener("dblclick", () => { if (!presenting && selected()) editInline(); });
$("slide").addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-element]");
    if (!target || presenting) return;
    if (event.key === "Enter") { elementId = target.dataset.element; render(); editInline(); event.preventDefault(); }
});
$("font-family").onchange = () => mutate((d) => { d.theme.fontFamily = $("font-family").value; });
function applyTheme(theme) {
    mutate((d) => {
        const old = clone(d.theme);
        Object.assign(d.theme, theme);
        for (const s of d.slides) {
            if (s.background === old.background) s.background = d.theme.background;
            for (const e of s.elements) {
                if (e.color === old.foreground) e.color = d.theme.foreground;
                else if (e.color === old.accent) e.color = d.theme.accent;
            }
        }
    });
}
$("theme").onchange = () => { const theme = themes[$("theme").value]; if (theme) applyTheme(theme); };
for (const name of ["background", "foreground", "accent"]) $(`theme-${name}`).onchange = () => applyTheme({ [name]: $(`theme-${name}`).value });
$("save-theme").onclick = () => download(new Blob([exportTheme(deck.theme)], { type: "application/json" }), `${deck.id}-theme.json`);
function confirmTheme(theme, explanation) {
    return confirm(t("{explanation}\nBackground {background}\nText {foreground}\nAccent {accent}\nFont {fontFamily}\nContent and layout are kept.",
        { explanation, background: theme.background, foreground: theme.foreground, accent: theme.accent, fontFamily: theme.fontFamily }));
}
for (const id of ["import-theme", "import-logo"]) $(id).onchange = async () => {
    const file = $(id).files[0]; if (!file) return;
    try {
        const revision = sequence, version = deck.version;
        let theme;
        if (id === "import-theme") {
            if (file.size > 4000) throw new Error(t("Theme JSON must be 4 KB or smaller."));
            theme = importTheme(await file.text());
        } else {
            if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 4000000) throw new Error(t("Choose a PNG or JPEG logo of 4 MB or less."));
            const url = URL.createObjectURL(file);
            try {
                const image = new Image(); image.src = url; await image.decode();
                const canvas = document.createElement("canvas");
                const scale = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext("2d", { willReadFrequently: true });
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                theme = themeFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, deck.theme.fontFamily);
            } finally { URL.revokeObjectURL(url); }
        }
        if (sequence !== revision || deck.version !== version) throw new Error(t("The deck changed while the file was loading. Choose the file again."));
        const explanation = id === "import-logo"
            ? t("Apply a theme from the logo's dominant colors?\nColors are adjusted to stay readable on a white background. The font isn't guessed; your current setting is kept.")
            : t("Apply the saved theme?");
        if (confirmTheme(theme, explanation)) applyTheme(theme);
    } catch (e) { error(t("Couldn't load the theme. {message}", { message: e.message })); }
    finally { $(id).value = ""; }
};
$("add-comment").onclick = () => {
    const text = $("comment-text").value.trim();
    if (!text) { error(t("Enter a comment.")); return; }
    mutate((d) => d.comments.push({ id: uid("comment"), slideId, elementId: elementId || null, text, reply: "", status: "draft" }));
    $("comment-text").value = "";
};
async function sendComment(commentId) {
    try {
        await flush();
        $("save-status").textContent = t("Sending to Chat…");
        document.querySelector("main").inert = true;
        document.querySelector("header").inert = true;
        saving = true;
        const result = await request("/request", { expectedVersion: deck.version, commentId });
        accept(result, true);
        if (result.comments.find((c) => c.id === commentId)?.status === "unknown") error(t("Couldn't confirm delivery. Check Chat instead of resending."));
    } catch (e) { error(t("Couldn't confirm the result of sending to Chat. Check Chat before resending. {message}", { message: e.message })); }
    finally {
        saving = false; document.querySelector("main").inert = false; document.querySelector("header").inert = false;
        if (pending && pending.version > deck.version) accept(pending, true);
        pending = null; status();
    }
}
function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const jsonDownload = () => download(new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" }), `${deck.id}.json`);
$("draft-download").onclick = jsonDownload;
$("reload").onclick = async () => {
    if (!confirm(t("Discard the unsaved draft on this screen? Save the draft first if you need it."))) return;
    try { const latest = await request("/state"); clearTimeout(timer); dirty = false; conflict = false; pending = null; error(""); accept(latest, true); }
    catch (e) { error(e.message); }
};
$("import").onchange = async () => {
    const file = $("import").files[0]; if (!file) return;
    try {
        if (file.size > 22000000) throw new Error(t("The file must be 22 MB or smaller."));
        const revision = sequence, version = deck.version;
        const input = JSON.parse(await file.text());
        if (sequence !== revision || deck.version !== version) throw new Error(t("The deck changed while the file was loading. Choose the file again."));
        const replacement = validateDeck({ ...input, id: deck.id, version: deck.version }, deck.id);
        if (deck.slides.length && !confirm(t("Replace the current deck with the imported content?"))) return;
        mutate((d) => Object.assign(d, replacement));
        choose(deck.slides[0]?.id);
    } catch (e) { error(t("Couldn't import the JSON file. {message}", { message: e.message })); }
    finally { $("import").value = ""; }
};
for (const id of ["import-pptx", "import-brand"]) $(id).onchange = async () => {
    const file = $(id).files[0]; if (!file) return;
    try {
        if (!window.JSZip) throw new Error(t("Couldn't load the ZIP library. Reload the canvas."));
        if (file.size > 22000000) throw new Error(t("The file must be 22 MB or smaller."));
        const revision = sequence, version = deck.version;
        const result = await readPowerPoint(await file.arrayBuffer(), window.JSZip);
        if (sequence !== revision || deck.version !== version) throw new Error(t("The deck changed while the file was loading. Choose the file again."));
        if (id === "import-brand") {
            if (!result.brandAvailable) throw new Error(t("The PPTX has no theme to extract."));
            if (!confirmTheme(result.brand, t("Apply the theme extracted from the PPTX?"))) return;
            applyTheme(result.brand);
        } else {
            const issues = result.warnings.length ? `\n\n${t("Things that couldn't be reproduced (total: {count}):\n{list}\nAll items are saved to the open questions.", { count: result.warnings.length, list: result.warnings.slice(0, 8).join("\n") })}` : "";
            if (!confirm(t("Replace the current deck with the imported presentation?\nSlides: {count}\nCompatibility is not complete. The original PPTX is not modified.{issues}", { count: result.deck.slides.length, issues }))) return;
            mutate((d) => Object.assign(d, result.deck, { id: d.id, version: d.version, title: file.name.replace(/\.pptx$/i, "").slice(0, 120) || t("Imported deck") }));
            choose(deck.slides[0]?.id);
        }
    } catch (e) { error(t("Couldn't import the PPTX. {message}", { message: e.message })); }
    finally { $(id).value = ""; }
};
document.querySelectorAll("[data-export]").forEach((button) => {
    button.onclick = async () => {
        try {
            await flush();
            const type = button.dataset.export;
            if (type === "json") return jsonDownload();
            if (!deck.slides.some((s) => !s.skipped)) throw new Error(t("There are no slides to export."));
            if (type === "html") return download(new Blob([exportHtml(deck)], { type: "text/html" }), `${deck.id}.html`);
            if (type === "pdf") {
                const url = URL.createObjectURL(new Blob([exportHtml(deck, { print: true })], { type: "text/html" }));
                const opened = window.open(url, "_blank");
                if (!opened) { URL.revokeObjectURL(url); throw new Error(t("Couldn't open the print view. Allow pop-ups.")); }
                // Blob documents inherit the editor's CSP; bind here rather than allowing inline scripts.
                opened.addEventListener("load", () => {
                    const button = opened.document.getElementById("print");
                    if (button) button.onclick = () => opened.print();
                    else error(t("Couldn't prepare the print button. Use Ctrl+P / Cmd+P in the print view."));
                }, { once: true });
                opened.opener = null; setTimeout(() => URL.revokeObjectURL(url), 60000); return;
            }
            if (type === "png") {
                const url = URL.createObjectURL(new Blob([slideSvg(deck, current())], { type: "image/svg+xml" }));
                try {
                    const image = new Image(); image.src = url; await image.decode();
                    const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
                    canvas.getContext("2d").drawImage(image, 0, 0);
                    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
                    if (!blob) throw new Error(t("Couldn't generate the PNG."));
                    download(blob, `${deck.id}-${deck.slides.indexOf(current()) + 1}.png`);
                } finally { URL.revokeObjectURL(url); }
                return;
            }
            if (!window.PptxGenJS) throw new Error(t("Couldn't load the PowerPoint library. Reload the canvas."));
            const pptx = createPowerPoint(deck, window.PptxGenJS, type === "pptx-basic");
            const blob = new Blob([await writePowerPoint(deck, pptx, window.JSZip)], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
            download(blob, `${deck.id}.pptx`);
        } catch (e) { error(t("Couldn't export. {message}", { message: e.message })); }
    };
});
$("undo").onclick = () => history(undo, redo);
$("redo").onclick = () => history(redo, undo);
$("save").onclick = () => flush().catch((e) => error(e.message));
$("previous").onclick = () => move(-1);
$("next").onclick = () => move(1);
async function stopPresenting() {
    if (presentWindow) {
        window.close();
        setTimeout(() => error(t("To end the presentation, close this window.")), 200);
        return;
    }
    presenting = false; build = 0; document.body.classList.remove("presenting"); $("exit-present").hidden = true; render(); $("present").focus();
    channel.postMessage({ slideId, build });
    if (document.fullscreenElement) try { await document.exitFullscreen(); } catch (e) { error(e.message); }
}
async function startInlinePresentation() {
    try {
        await flush();
        const start = current() && !current().skipped ? slideId : deck.slides.find((s) => !s.skipped).id;
        error("");
        presenting = true; elementId = null; build = 0; slideId = start;
        document.body.classList.add("presenting"); $("exit-present").hidden = false;
        renderStage(); $("slide").focus(); channel.postMessage({ slideId, build });
        try { await document.documentElement.requestFullscreen(); }
        catch { error(t("Fullscreen isn't allowed, so presenting inside this panel.")); }
    } catch (e) { error(e.message); }
}
async function openView(mode) {
    if (openingViews.has(mode)) return;
    openingViews.add(mode);
    $(mode).setAttribute("aria-busy", "true");
    try {
        await flush();
        const start = current() && !current().skipped ? slideId : deck.slides.find((s) => !s.skipped).id;
        const launchId = uid("window");
        const url = `${location.origin}/?mode=${mode}&slide=${encodeURIComponent(start)}&launch=${launchId}&lang=${locale}#${token}`;
        const features = mode === "present" ? `popup,left=0,top=0,width=${screen.availWidth},height=${screen.availHeight}` : "";
        error("");
        const opened = window.open(url, "_blank", features);
        if (opened) { opened.opener = null; return; }
        // Native hosts can open the system browser without returning a WindowProxy.
        // Confirm through loopback HTTP, not BroadcastChannel (which cannot cross browser profiles).
        const deadline = performance.now() + 8000;
        do {
            if ((await request(`/window-status/${launchId}`)).opened) return;
            await new Promise((resolve) => setTimeout(resolve, 250));
        } while (performance.now() < deadline);
        error(mode === "present"
            ? t("Couldn't confirm that the presentation window opened. If it is already showing in your browser, you can keep using it. If it isn't open: ")
            : t("Couldn't confirm that the presenter view opened. If it is already showing in your browser, you can keep using it. If it isn't open: "));
        const link = document.createElement("a");
        link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = t("Open in browser");
        $("error").append(link);
        if (mode === "present") {
            const inline = document.createElement("button");
            inline.id = "present-inline"; inline.textContent = t("Present in this panel");
            inline.onclick = startInlinePresentation;
            $("error").append(" ", inline);
        }
    } catch (e) { error(t("Couldn't confirm that the window opened. {message}", { message: e.message })); }
    finally { openingViews.delete(mode); $(mode).removeAttribute("aria-busy"); }
}
$("present").onclick = () => openView("present");
$("exit-present").onclick = stopPresenting;
$("present-fullscreen").onclick = async () => {
    try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
    } catch { error(t("Couldn't toggle fullscreen. Use your browser's fullscreen (F11).")); }
};
document.addEventListener("fullscreenchange", () => {
    if (presentWindow) {
        $("present-fullscreen").textContent = document.fullscreenElement ? t("Exit fullscreen") : t("Fullscreen");
        if (!document.fullscreenElement) fullscreenExitedAt = performance.now();
    } else if (!document.fullscreenElement && presenting) stopPresenting();
});
document.querySelector(".slide-list").addEventListener("keydown", (event) => {
    const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (!step || !deck || presenting || presenterMode || event.defaultPrevented || event.altKey || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.target.closest("input,textarea,select")) return;
    event.preventDefault();
    const thumbnail = event.target.closest(".thumbnail");
    const next = deck.slides[deck.slides.findIndex((s) => s.id === (thumbnail?.dataset.slide ?? slideId)) + step];
    if (next) choose(next.id);
    const active = $("thumbnails").querySelector(".thumbnail.active");
    if (thumbnail) active?.focus({ preventScroll: true });
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
});
document.addEventListener("keydown", (event) => {
    const control = event.target.closest("input,textarea,select,button,[contenteditable=true],[role=separator]");
    const presentationArrow = (presenting || presenterMode) && ["ArrowRight", "ArrowLeft"].includes(event.key) &&
        !event.target.closest("input,textarea,select,[contenteditable=true]");
    if ((!control || presentationArrow) && ["ArrowRight", "ArrowLeft", " "].includes(event.key)) { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
    if (event.key === "Escape" && presenting) {
        // In the dedicated window, Escape first leaves fullscreen; only a later Escape closes the window.
        if (!presentWindow) stopPresenting();
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (performance.now() - fullscreenExitedAt > 500) stopPresenting();
    }
    if (!control && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault(); if (event.shiftKey) history(redo, undo); else history(undo, redo);
    }
});
$("presenter").onclick = () => openView("presenter");
function renderPresenter() {
    const slides = deck.slides.filter((s) => !s.skipped);
    let index = slides.findIndex((s) => s.id === slideId); if (index < 0) index = 0;
    slideId = slides[index]?.id;
    document.title = t("Presenter view · {title}", { title: deck.title });
    $("presenter-current").innerHTML = slides[index] ? slideSvg(deck, slides[index]) : "";
    showBuild($("presenter-current"), build, false, reducedMotion.matches);
    $("presenter-next").innerHTML = slides[index + 1] ? slideSvg(deck, slides[index + 1]) : "";
    $("presenter-notes").textContent = slides[index]?.notes || t("No speaker notes.");
    $("presenter-title").textContent = `${deck.title} · ${slides.length ? index + 1 : 0} / ${slides.length}${buildSteps(slides[index]).length ? ` · ${t("Step {current}/{total}", { current: build, total: buildSteps(slides[index]).length })}` : ""}`;
}
channel.onmessage = ({ data }) => {
    if (data.request) { channel.postMessage({ slideId, build }); return; }
    if (deck?.slides.some((s) => s.id === data.slideId)) choose(data.slideId, false, data.build);
};
reducedMotion.addEventListener("change", () => {
    $("slide").getAnimations().forEach((animation) => animation.cancel());
    if (presenting) showBuild($("slide"), build, false, reducedMotion.matches);
});
if (presenterMode) {
    slideId = viewParams.get("slide") || undefined;
    document.body.classList.add("presenter-mode"); $("presenter-view").hidden = false;
    $("presenter-prev").onclick = () => move(-1); $("presenter-next-button").onclick = () => move(1);
    const started = Date.now();
    setInterval(() => { $("clock").textContent = t("Elapsed {minutes}m {seconds}s", { minutes: Math.floor((Date.now() - started) / 60000), seconds: Math.floor((Date.now() - started) / 1000) % 60 }); }, 1000);
}
if (presentWindow) {
    presenting = true;
    slideId = viewParams.get("slide") || undefined;
    document.body.classList.add("presenting"); $("exit-present").hidden = false;
    $("present-fullscreen").hidden = !document.fullscreenEnabled;
}
setupWorkspaceSplitter();
window.addEventListener("beforeunload", (event) => { if (dirty || saving) { event.preventDefault(); event.returnValue = ""; } });
try {
    [deck, capabilities] = await Promise.all([request("/state"), request("/capabilities")]);
    if (!deck.version && deck.title === "Untitled presentation") deck.title = t("Untitled presentation");
    accept(deck);
    $("chat-hint").textContent = capabilities.chat ? t("Only requests you send with the button go to Chat.") : t("Browser preview mode. Sending to Chat is available only inside Copilot.");
    if (presenterMode) channel.postMessage({ request: true });
    if (presentWindow) {
        const start = current() && !current().skipped ? slideId : deck.slides.find((s) => !s.skipped)?.id;
        if (start) choose(start);
    }
    if (presentWindow || presenterMode) readyLaunchId = viewParams.get("launch");
} catch (e) { error(t("Couldn't load the deck. {message}", { message: e.message })); }
const events = new EventSource(api("/events") + (readyLaunchId ? `&launch=${encodeURIComponent(readyLaunchId)}` : ""));
events.onmessage = (event) => {
    try {
        connected = true;
        const latest = JSON.parse(event.data);
        if (!deck || latest.version > deck.version) {
            if (saving || drag) pending = latest;
            else if (dirty || document.activeElement?.matches("textarea,input:not([type=file]):not(:disabled)")) { pending = latest; conflict = true; }
            else accept(latest, true);
        }
        status();
    } catch (e) { error(t("Couldn't read the update. {message}", { message: e.message })); }
};
events.addEventListener("storage-error", (event) => { error(JSON.parse(event.data).error); });
events.onerror = () => { connected = false; status(); };
