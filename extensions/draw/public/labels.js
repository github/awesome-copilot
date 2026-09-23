// In-place label editing with a textarea laid over the element.
import { isShape, normalizeElement, LABEL_WEIGHT, TEXT_WEIGHT } from "/lib/model.mjs";
import {
  labelMaxWidth, labelCenterY, lineHeight, fontSizeOf, textLayout, neededHeight, arrowGeometry,
} from "/lib/geometry.mjs";
import { autoSize } from "/lib/layout.mjs";

export class LabelEditor {
  constructor(ed) {
    this.ed = ed;
    this.ta = null;
    ed.labels = this;
    ed.on("render", () => this.position());
  }

  // fresh: the shape was just created, so it may widen to fit the text.
  // before: elements to use as the undo point (when the element was created just for this edit).
  open(id, { fresh = false, before = null } = {}) {
    const ed = this.ed;
    if (ed.editing) this.commit();
    const el = ed.byId.get(id);
    if (!el || el.type === "pen") return;
    const ta = document.createElement("textarea");
    ta.className = "label-editor";
    ta.setAttribute("aria-label", el.type === "arrow" ? "Arrow label" : "Label");
    ta.spellcheck = true;
    ta.value = el.text || "";
    ed.layer.append(ta);
    this.ta = ta;
    ed.editing = { id, fresh, before: before || ed.elements, start: { x: el.x, y: el.y, w: el.w, h: el.h } };
    ed.contentDirty = true;
    ta.addEventListener("input", () => this.input());
    ta.addEventListener("keydown", (e) => this.keydown(e));
    ta.addEventListener("blur", () => {
      if (this.ta === ta) this.commit({ refocus: false });
    });
    ed.requestRender();
    this.position();
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ed.emit("editing", true);
  }

  input() {
    const ed = this.ed;
    const st = ed.editing;
    const el = st && ed.byId.get(st.id);
    if (!el) return this.close();
    let next = { ...el, text: this.ta.value };
    if (isShape(el)) next = this.grow(next, st);
    ed.replaceElement(normalizeElement(next) || next, { record: false, emit: false });
  }

  // Grows the shape to fit its label (never below its size when editing started), keeping the center.
  grow(el, st) {
    const measure = this.ed.measure;
    let w = st.start.w;
    if (st.fresh) w = Math.max(w, autoSize(el.text, el.type, measure, el.size).w);
    const h = Math.max(st.start.h, Math.ceil(neededHeight({ ...el, w }, measure) / 10) * 10);
    const cx = st.start.x + st.start.w / 2;
    const cy = st.start.y + st.start.h / 2;
    return { ...el, w, h, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
  }

  keydown(e) {
    e.stopPropagation();
    if (e.isComposing || e.keyCode === 229) return;
    const ed = this.ed;
    if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      this.commit();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const id = ed.editing.id;
      this.commit();
      const el = ed.byId.get(id);
      if (el && isShape(el)) {
        if (e.shiftKey) ed.addSibling(id);
        else ed.addConnected(id, ed.lastDirection || "right");
      }
    }
  }

  position() {
    const ed = this.ed;
    const st = ed.editing;
    const ta = this.ta;
    const el = st && ta && ed.byId.get(st.id);
    if (!el) return;
    const z = ed.view.zoom;
    const text = ta.value || " ";
    let fs;
    let weight;
    let left;
    let width;
    let cy = null;
    let top = null;
    let align = "center";
    let wrap = true;
    let color;
    let background = "transparent";
    if (isShape(el)) {
      fs = fontSizeOf(el);
      weight = LABEL_WEIGHT;
      width = labelMaxWidth(el);
      left = el.x + el.w / 2 - width / 2;
      cy = labelCenterY(el);
      color = el.fill === "solid" ? ed.paint(el.color, "onSolid") : ed.paint("gray", "ink");
    } else if (el.type === "text") {
      const l = textLayout({ ...el, text }, ed.measure);
      fs = l.fs;
      weight = TEXT_WEIGHT;
      width = l.w + fs;
      left = el.x;
      top = el.y;
      align = "left";
      wrap = false;
      color = ed.paint(el.color, "ink");
    } else {
      const g = arrowGeometry(el, ed.byId);
      if (!g) return;
      fs = fontSizeOf(el);
      weight = TEXT_WEIGHT;
      const widest = Math.max(...text.split("\n").map((s) => ed.measure(s, fs, weight)));
      width = widest + fs * 2;
      left = g.mid.x - width / 2;
      cy = g.mid.y;
      wrap = false;
      color = ed.paint(el.color, "ink");
      background = ed.theme.bg;
    }
    const lh = lineHeight(fs);
    Object.assign(ta.style, {
      width: `${width * z}px`,
      font: `${weight} ${fs * z}px/${lh * z}px ${ed.theme.font}`,
      textAlign: align,
      color,
      background,
      height: "0px",
    });
    ta.classList.toggle("no-wrap", !wrap);
    const h = Math.max(ta.scrollHeight, lh * z);
    ta.style.height = `${h}px`;
    const s = ed.toScreen(left, top ?? cy);
    ta.style.left = `${s.x}px`;
    ta.style.top = `${top !== null ? s.y : s.y - h / 2}px`;
  }

  // Ends editing and records one undo step. Empty text elements are removed.
  commit({ refocus = true } = {}) {
    const ed = this.ed;
    const st = ed.editing;
    if (!st) return;
    const ta = this.ta;
    this.ta = null;
    ed.editing = null;
    ta.remove();
    const el = ed.byId.get(st.id);
    if (el) {
      const text = String(el.text || "").replace(/\s+$/, "");
      if (el.type === "text" && !text.trim()) ed.setElements(ed.elements.filter((e) => e.id !== el.id), { record: false, emit: false });
      else if (text !== el.text) ed.replaceElement({ ...el, text }, { record: false, emit: false });
    }
    if (ed.elements !== st.before && JSON.stringify(ed.elements) !== JSON.stringify(st.before)) ed.pushHistory(st.before);
    ed.contentDirty = true;
    ed.requestRender();
    ed.emit("editing", false);
    ed.emit("change");
    ed.emit("idle");
    if (refocus) ed.stage.focus({ preventScroll: true });
  }

  // Drops the editor without recording anything (used when a different drawing is loaded).
  close() {
    const ed = this.ed;
    if (this.ta) this.ta.remove();
    this.ta = null;
    ed.editing = null;
    ed.contentDirty = true;
    ed.requestRender();
    ed.emit("editing", false);
  }
}
