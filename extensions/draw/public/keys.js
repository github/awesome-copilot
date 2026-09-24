// Keyboard shortcuts and clipboard.
import { isShape, SHAPE_TYPES } from "/lib/model.mjs";
import { describeElement } from "./announce.js";

export const TOOL_KEYS = { v: "select", h: "hand", r: "rect", o: "ellipse", d: "diamond", c: "cylinder", a: "arrow", t: "text", p: "pen" };
const DIRS = { ArrowRight: "right", ArrowLeft: "left", ArrowDown: "down", ArrowUp: "up" };
const STEPS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };

export function attachKeys(ed, ui) {
  const typing = (target) =>
    !!target && target !== ed.svg && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || !!target.closest?.(".popover"));
  // A focused button keeps its normal keys: Space and Enter press it, and Tab moves focus on.
  const control = (target) =>
    !!target && target !== ed.svg && !!target.closest?.("button, a[href], select, summary, [role='button']");
  // N and Shift+N reach every element in turn, and say which one is selected.
  const selectStep = (delta) => {
    const hit = ed.selectStep(delta);
    ui.announce(hit ? `${describeElement(hit.el, ed.byId)}, ${hit.index + 1} of ${hit.total}` : "The drawing is empty.");
  };

  // The canvas takes focus on every click and after every label edit, so it only shows a focus ring
  // while the keyboard is in use: a click hides the ring, and Tab brings it back.
  ed.svg.classList.add("pointer-used");
  window.addEventListener("pointerdown", () => ed.svg.classList.add("pointer-used"), true);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab") ed.svg.classList.remove("pointer-used");
    if (e.defaultPrevented || e.isComposing || typing(e.target)) return;
    const key = e.key;
    if ((key === " " || key === "Enter" || key === "Tab") && control(e.target)) return;
    const lower = key.length === 1 ? key.toLowerCase() : key;
    const mod = e.ctrlKey || e.metaKey;
    const one = ed.single();
    const done = () => e.preventDefault();

    if (key === " ") {
      done();
      if (!e.repeat && !ed.spaceDown) {
        ed.spaceDown = true;
        ed.refreshCursor?.();
      }
      return;
    }
    if (key === "Escape") {
      if (ed.pointerActive?.()) ed.cancelPointer();
      else if (ui.closePopover()) ed.focusCanvas();
      // From the tools, the style bar or the zoom buttons, Esc goes back to the canvas.
      else if (e.target !== ed.svg && ed.stage.contains(e.target)) ed.focusCanvas();
      else if (ed.tool !== "select") {
        ed.setTool("select");
        ui.announceTool("select");
      } else ed.select([]);
      return done();
    }
    if (mod) {
      if (lower === "z") {
        if (e.shiftKey) ed.redo();
        else ed.undo();
        return done();
      }
      if (lower === "y") { ed.redo(); return done(); }
      if (lower === "a") { ed.selectAll(); return done(); }
      if (lower === "d") { ed.duplicate(); return done(); }
      if (lower === "s") { ui.toast("Drawings save automatically."); return done(); }
      if (key === "0") { ed.zoomTo(1); return done(); }
      if (key === "=" || key === "+") { ed.zoomBy(1.25); return done(); }
      if (key === "-" || key === "_") { ed.zoomBy(0.8); return done(); }
      if (key === "]") { ed.reorder(true); return done(); }
      if (key === "[") { ed.reorder(false); return done(); }
      if (DIRS[key] && e.shiftKey) {
        const [dx, dy] = STEPS[DIRS[key]];
        if (!ed.interaction) ed.resizeBy(dx * 10, dy * 10);
        return done();
      }
      if (DIRS[key] && one && isShape(one)) { ed.addConnected(one.id, DIRS[key]); return done(); }
      return;
    }
    if (e.altKey && !DIRS[key]) return;
    if (key === "Delete" || key === "Backspace") {
      const gone = ed.selected();
      const what = gone.length === 1 ? describeElement(gone[0], ed.byId) : `${gone.length} elements`;
      ed.deleteSelection();
      if (gone.length) ui.announce(`Deleted ${what}.`);
      return done();
    }
    // With a shape or text tool, Enter adds one. With the arrow tool, it starts or ends an arrow.
    if (key === "Enter" && !ed.interaction && (SHAPE_TYPES.includes(ed.tool) || ed.tool === "text")) {
      ed.addAtCenter(ed.tool);
      return done();
    }
    if (key === "Enter" && !ed.interaction && ed.tool === "arrow") { ed.linkStep(); return done(); }
    if ((key === "Enter" || key === "F2") && one && one.type !== "pen") { ed.labels.open(one.id); return done(); }
    if (lower === "n") {
      if (!ed.interaction) selectStep(e.shiftKey ? -1 : 1);
      return done();
    }
    if (DIRS[key]) {
      const px = e.altKey ? 1 : e.shiftKey ? 50 : 10;
      const [dx, dy] = STEPS[DIRS[key]];
      if (ed.selection.size) ed.nudge(dx * px, dy * px);
      else ed.panBy(dx * px * 4, dy * px * 4);
      return done();
    }
    if (key === "!" || (e.shiftKey && e.code === "Digit1")) { ed.fit({ maxZoom: 2 }); return done(); }
    if (key === "?") { ui.toggleHelp(); return done(); }
    if (!e.shiftKey && TOOL_KEYS[lower]) {
      ed.setTool(TOOL_KEYS[lower]);
      ui.announceTool(TOOL_KEYS[lower]);
      return done();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === " " && ed.spaceDown) {
      ed.spaceDown = false;
      ed.refreshCursor?.();
    }
  });
  window.addEventListener("blur", () => {
    if (ed.spaceDown) {
      ed.spaceDown = false;
      ed.refreshCursor?.();
    }
  });

  document.addEventListener("copy", (e) => {
    if (typing(e.target) || !ed.selection.size) return;
    const text = ed.copyText();
    if (!text) return;
    e.clipboardData.setData("text/plain", text);
    e.preventDefault();
  });
  document.addEventListener("cut", (e) => {
    if (typing(e.target) || !ed.selection.size) return;
    const text = ed.copyText();
    if (!text) return;
    e.clipboardData.setData("text/plain", text);
    ed.deleteSelection();
    e.preventDefault();
  });
  document.addEventListener("paste", (e) => {
    if (typing(e.target)) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    ed.paste(text);
    e.preventDefault();
  });
}
