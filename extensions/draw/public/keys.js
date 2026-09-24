// Keyboard shortcuts and clipboard.
import { isShape } from "/lib/model.mjs";

export const TOOL_KEYS = { v: "select", h: "hand", r: "rect", o: "ellipse", d: "diamond", c: "cylinder", a: "arrow", t: "text", p: "pen" };
const DIRS = { ArrowRight: "right", ArrowLeft: "left", ArrowDown: "down", ArrowUp: "up" };

export function attachKeys(ed, ui) {
  const typing = (target) =>
    !!target && target !== ed.stage && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || !!target.closest?.(".popover"));
  // A focused button keeps its normal keys: Space and Enter press it, and Tab moves focus on.
  const control = (target) =>
    !!target && target !== ed.stage && !!target.closest?.("button, a[href], select, summary, [role='button']");

  window.addEventListener("keydown", (e) => {
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
      else if (ui.closePopover()) ed.stage.focus({ preventScroll: true });
      else if (ed.tool !== "select") ed.setTool("select");
      else ed.select([]);
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
      if (DIRS[key] && one && isShape(one)) { ed.addConnected(one.id, DIRS[key]); return done(); }
      return;
    }
    if (e.altKey && !DIRS[key]) return;
    if (key === "Delete" || key === "Backspace") { ed.deleteSelection(); return done(); }
    if ((key === "Enter" || key === "F2") && one && one.type !== "pen") { ed.labels.open(one.id); return done(); }
    // With a shape selected, Tab adds the next step. Otherwise it moves focus like it normally does.
    if (key === "Tab" && one && isShape(one)) {
      if (e.shiftKey) ed.addSibling(one.id);
      else ed.addConnected(one.id, ed.lastDirection || "right");
      return done();
    }
    if (DIRS[key]) {
      const step = e.altKey ? 1 : e.shiftKey ? 50 : 10;
      const [dx, dy] = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }[DIRS[key]];
      if (ed.selection.size) ed.nudge(dx * step, dy * step);
      else ed.panBy(dx * step * 4, dy * step * 4);
      return done();
    }
    if (key === "!" || (e.shiftKey && e.code === "Digit1")) { ed.fit({ maxZoom: 2 }); return done(); }
    if (key === "?") { ui.toggleHelp(); return done(); }
    if (!e.shiftKey && TOOL_KEYS[lower]) { ed.setTool(TOOL_KEYS[lower]); return done(); }
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
