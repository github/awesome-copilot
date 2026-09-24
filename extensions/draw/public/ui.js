// Tool rail, style bar, zoom controls, save status, toasts and popovers.
import { COLORS, SHAPE_TYPES, SIZE_KEYS, PEN_WIDTHS } from "/lib/model.mjs";
import { icon } from "./icons.js";
import { categoryOf, STYLE_KEYS } from "./editor.js";
import { esc, capitalize } from "./util.js";

const $ = (id) => document.getElementById(id);

const TOOLS = [
  ["select", "V", "Select"], ["hand", "H", "Pan"], null,
  ["rect", "R", "Rectangle"], ["ellipse", "O", "Ellipse"], ["diamond", "D", "Diamond (decision)"], ["cylinder", "C", "Database"], null,
  ["arrow", "A", "Arrow"], ["text", "T", "Text"], ["pen", "P", "Pen"],
];
const TYPE_LABELS = { rect: "Rectangle", ellipse: "Ellipse", diamond: "Diamond", cylinder: "Database" };
const SIZE_LABELS = { s: "Small", m: "Medium", l: "Large", xl: "Extra large" };
const FILL_OPTIONS = [["none", "No fill"], ["soft", "Light fill"], ["solid", "Solid fill"]];
const HEAD_OPTIONS = [["end", "Arrow at the end"], ["both", "Arrows at both ends"], ["none", "No arrowheads"]];
const ROUTE_OPTIONS = [["straight", "Straight"], ["curve", "Curved"], ["elbow", "Elbow"]];

const penSizeKey = (w) => SIZE_KEYS.reduce((best, k) => (Math.abs(PEN_WIDTHS[k] - w) < Math.abs(PEN_WIDTHS[best] - w) ? k : best), "m");

export class UI {
  constructor(ed) {
    this.ed = ed;
    this.sync = null;
    this.doc = null;
    this.drawings = [];
    this.folder = "";
    this.popover = null;
    this.statusTimer = 0;
    this.connected = true;
    this.sbHtml = "";
    this.sbRaf = 0;
    this.buildTools();
    this.buildButtons();
    this.bindEditor();
  }

  // ---------- tool rail and buttons ----------

  buildTools() {
    const nav = $("tools");
    nav.innerHTML = TOOLS.map((t) =>
      t
        ? `<button type="button" class="icon-btn tool" data-tool="${t[0]}" aria-pressed="false" title="${t[2]} (${t[1]})" aria-label="${t[2]}">${icon(t[0])}<span class="key" aria-hidden="true">${t[1]}</span></button>`
        : '<div class="rule" role="separator"></div>',
    ).join("");
    nav.addEventListener("mousedown", (e) => e.preventDefault());
    nav.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tool]");
      if (b) this.ed.setTool(b.dataset.tool);
    });
    this.syncTools();
  }

  syncTools() {
    for (const b of $("tools").querySelectorAll("[data-tool]")) b.setAttribute("aria-pressed", String(b.dataset.tool === this.ed.tool));
  }

  buildButtons() {
    const ed = this.ed;
    const icons = { undo: "undo", redo: "redo", "zoom-out": "minus", "zoom-in": "plus", "zoom-fit": "fit", "help-button": "help" };
    for (const [id, name] of Object.entries(icons)) $(id).innerHTML = icon(name);
    // These act on the canvas, so they should not take keyboard focus away from it.
    const run = (fn) => () => {
      if (ed.editing) ed.labels.commit();
      fn();
    };
    const actions = {
      undo: () => ed.undo(),
      redo: () => ed.redo(),
      "zoom-out": () => ed.zoomBy(0.8),
      "zoom-in": () => ed.zoomBy(1.25),
      "zoom-level": () => ed.zoomTo(1),
      "zoom-fit": () => ed.fit({ maxZoom: 2 }),
    };
    for (const [id, fn] of Object.entries(actions)) {
      $(id).addEventListener("mousedown", (e) => e.preventDefault());
      $(id).addEventListener("click", run(fn));
    }
    const sb = $("stylebar");
    sb.addEventListener("mousedown", (e) => e.preventDefault());
    sb.addEventListener("click", (e) => this.onStyleClick(e));
  }

  bindEditor() {
    const ed = this.ed;
    ed.on("tool", () => {
      this.syncTools();
      this.scheduleStylebar();
    });
    ed.on("selection", () => this.scheduleStylebar());
    ed.on("style", () => this.scheduleStylebar());
    ed.on("change", () => {
      this.scheduleStylebar();
      this.syncEmpty();
    });
    ed.on("editing", () => this.syncEmpty());
    ed.on("history", () => this.syncHistory());
    ed.on("view", () => this.syncZoom());
    ed.on("hint", (msg) => this.toast(msg));
  }

  setup(state) {
    this.folder = state.folder || "";
    this.setDoc(state.drawing);
    this.setDrawings(state.drawings || []);
    this.syncHistory();
    this.syncZoom();
    this.syncEmpty();
    this.renderStylebar();
  }

  setDoc(doc) {
    this.doc = { id: doc.id, name: doc.name };
    $("doc-name").textContent = doc.name;
    document.title = `${doc.name} - Draw`;
  }

  setDrawings(list) {
    this.drawings = list;
    const cur = this.doc && list.find((d) => d.id === this.doc.id);
    if (cur && cur.name !== this.doc.name) this.setDoc(cur);
  }

  refresh() {
    this.sbHtml = "";
    this.renderStylebar();
  }

  syncEmpty() {
    $("empty").hidden = this.ed.elements.length > 0 || !!this.ed.editing;
  }

  syncHistory() {
    $("undo").disabled = !this.ed.history.length;
    $("redo").disabled = !this.ed.future.length;
  }

  syncZoom() {
    $("zoom-level").textContent = `${Math.round(this.ed.view.zoom * 100)}%`;
  }

  // ---------- style bar ----------

  scheduleStylebar() {
    if (this.sbRaf) return;
    this.sbRaf = requestAnimationFrame(() => {
      this.sbRaf = 0;
      if (!this.ed.interaction) this.renderStylebar();
    });
  }

  renderStylebar() {
    const ed = this.ed;
    const bar = $("stylebar");
    const sel = ed.selected();
    let items;
    if (sel.length) {
      items = sel.map((el) => ({ cat: categoryOf(el), v: el }));
    } else {
      const cat = ed.toolCategory();
      items = cat ? [{ cat, v: ed.styles[cat] }] : [];
    }
    if (!items.length) {
      bar.hidden = true;
      return;
    }
    const cats = new Set(items.map((i) => i.cat));
    const common = (key) => {
      const vals = items.filter((i) => STYLE_KEYS[i.cat].includes(key)).map((i) => i.v[key]);
      return vals.length && vals.every((x) => x === vals[0]) ? vals[0] : undefined;
    };
    const sizes = items.map((i) => (i.cat === "pen" ? penSizeKey(i.v.width) : i.v.size));
    const size = sizes.every((x) => x === sizes[0]) ? sizes[0] : undefined;
    const btn = (k, v, pressed, title, inner, cls = "") =>
      `<button type="button" class="icon-btn ${cls}" data-k="${k}" data-v="${v}" aria-pressed="${pressed}" title="${title}" aria-label="${title}">${inner}</button>`;
    const act = (a, name, title) => `<button type="button" class="icon-btn" data-act="${a}" title="${title}" aria-label="${title}">${icon(name)}</button>`;
    const group = (label, html) => `<div class="style-group" role="group" aria-label="${label}">${html}</div>`;
    const options = (k, list, cur, iconPrefix) => list.map(([v, title]) => btn(k, v, v === cur, title, icon(iconPrefix + v))).join("");

    const color = common("color");
    const parts = [
      group("Color", COLORS.map((c) =>
        btn("color", c, c === color, capitalize(c), `<span class="dot" style="background:${ed.paint(c, "soft")};border-color:${ed.paint(c, "stroke")}"></span>`, "swatch"),
      ).join("")),
    ];
    if (cats.has("shape") && sel.length) {
      const type = common("type");
      parts.push(group("Shape", SHAPE_TYPES.map((t) => btn("type", t, t === type, TYPE_LABELS[t], icon(t))).join("")));
    }
    if (cats.has("shape")) parts.push(group("Fill", options("fill", FILL_OPTIONS, common("fill"), "fill-")));
    if (cats.has("shape") || cats.has("arrow")) {
      const dash = common("dash");
      parts.push(group("Line", btn("dash", "false", dash === false, "Solid line", icon("line-solid")) + btn("dash", "true", dash === true, "Dashed line", icon("line-dashed"))));
    }
    if (cats.has("arrow")) {
      parts.push(group("Arrowheads", options("head", HEAD_OPTIONS, common("head"), "head-")));
      parts.push(group("Route", options("route", ROUTE_OPTIONS, common("route"), "route-")));
    }
    const sizeTitle = cats.size === 1 && cats.has("pen") ? "Stroke" : "Text size";
    parts.push(group(sizeTitle, SIZE_KEYS.map((k) => btn("size", k, k === size, `${SIZE_LABELS[k]} ${sizeTitle.toLowerCase()}`, k.toUpperCase(), "size-btn")).join("")));
    if (sel.length) {
      // Arrows are always drawn on top, so only other elements can move between layers.
      const layered = sel.some((el) => el.type !== "arrow");
      parts.push(group("Arrange", [
        ...(layered ? [act("front", "front", "Bring to front (Ctrl+])"), act("back", "back", "Send to back (Ctrl+[)")] : []),
        act("duplicate", "duplicate", "Duplicate (Ctrl+D)"),
        act("delete", "trash", "Delete (Del)"),
      ].join("")));
    }
    const html = `<div class="stylebar-inner">${parts.join("")}</div>`;
    if (html !== this.sbHtml) {
      bar.innerHTML = html;
      this.sbHtml = html;
    }
    bar.hidden = false;
  }

  onStyleClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const ed = this.ed;
    if (ed.editing) ed.labels.commit();
    const a = b.dataset.act;
    if (a === "front") return ed.reorder(true);
    if (a === "back") return ed.reorder(false);
    if (a === "duplicate") return ed.duplicate();
    if (a === "delete") return ed.deleteSelection();
    const k = b.dataset.k;
    if (!k) return;
    const v = b.dataset.v;
    if (k === "dash") ed.applyStyle({ dash: v === "true" });
    else if (k === "size") ed.applyStyle({ size: v, width: PEN_WIDTHS[v] });
    else ed.applyStyle({ [k]: v });
  }

  // ---------- status and toasts ----------

  // Quiet by default: "Saving" only shows when a save is slow, and errors stay until it recovers.
  setStatus(kind, msg) {
    clearTimeout(this.statusTimer);
    const el = $("save-status");
    if (kind === "saving") {
      if (!el.classList.contains("is-error")) this.statusTimer = setTimeout(() => this.showStatus("Saving"), 600);
      return;
    }
    if (kind === "saved") {
      if (el.textContent) {
        this.showStatus("Saved");
        this.statusTimer = setTimeout(() => this.showStatus(""), 1500);
      }
      return;
    }
    this.showStatus(msg || "Not saved", true);
  }

  showStatus(text, error = false) {
    const el = $("save-status");
    el.textContent = text;
    // A long message gets cut off, so hovering shows all of it.
    el.title = text;
    el.classList.toggle("is-error", error);
  }

  setConnection(ok) {
    if (ok === this.connected) return;
    this.connected = ok;
    if (!ok) this.showStatus("Reconnecting", true);
    else if ($("save-status").textContent === "Reconnecting") this.showStatus("");
  }

  toast(msg, { error = false, action = null, timeout = 3200 } = {}) {
    const box = $("toasts");
    const el = document.createElement("div");
    el.className = `toast${error ? " is-error" : ""}`;
    el.setAttribute("role", error ? "alert" : "status");
    const text = document.createElement("span");
    text.textContent = msg;
    el.append(text);
    const remove = () => el.remove();
    if (action) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = action.label;
      b.addEventListener("click", () => {
        remove();
        action.run();
      });
      el.append(b);
    }
    box.append(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(remove, action ? Math.max(timeout, 6000) : error ? Math.max(timeout, 5000) : timeout);
  }

  fatal(message) {
    $("stage").innerHTML =
      `<div class="empty" style="pointer-events:auto"><p class="empty-title">This drawing could not load</p><p>${esc(message)}</p>` +
      '<p><button type="button" class="btn" id="reload">Try again</button></p></div>';
    $("reload").addEventListener("click", () => location.reload());
  }

  // ---------- popovers ----------

  openPopover(anchor, build, { className = "", placement = "below", align = "start", role = "dialog" } = {}) {
    this.closePopover();
    const pop = document.createElement("div");
    pop.className = `popover ${className}`;
    pop.setAttribute("role", role);
    $("popovers").append(pop);
    const close = () => this.closePopover();
    build(pop, close);
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(8, Math.min(align === "end" ? r.right - w : r.left, innerWidth - w - 8));
    let top = r.bottom + 6;
    if (placement === "above" || top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    anchor.setAttribute("aria-expanded", "true");
    const onDown = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        anchor.focus({ preventScroll: true });
        return;
      }
      if (role === "menu" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const list = [...pop.querySelectorAll(".menu-item")];
        const i = list.indexOf(document.activeElement);
        const next = list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
        next?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    pop.addEventListener("keydown", onKey);
    this.popover = {
      pop,
      anchor,
      cleanup: () => {
        document.removeEventListener("pointerdown", onDown, true);
        anchor.setAttribute("aria-expanded", "false");
        pop.remove();
      },
    };
    return pop;
  }

  togglePopover(anchor, build, opts) {
    if (this.popover && this.popover.anchor === anchor) {
      this.closePopover();
      return null;
    }
    return this.openPopover(anchor, build, opts);
  }

  closePopover() {
    if (!this.popover) return false;
    const p = this.popover;
    this.popover = null;
    const hadFocus = p.pop.contains(document.activeElement);
    p.cleanup();
    if (hadFocus) this.ed.stage.focus({ preventScroll: true });
    return true;
  }
}
