// Top bar menus: drawings, theme, export, Ask Copilot, and the shortcuts help.
import { icon } from "./icons.js";
import { esc, blobToBase64, fileName } from "./util.js";

const $ = (id) => document.getElementById(id);

const CHIPS = ["Tidy up the layout", "What is missing?", "Explain this diagram", "Suggest improvements"];

const THEME_CHOICES = [
  ["app", "contrast", "Match app"],
  ["light", "sun", "Light"],
  ["dark", "moon", "Dark"],
];

const HELP = [
  [["V", "H"], "Select, pan"],
  [["R", "O", "D", "C"], "Rectangle, ellipse, diamond, database"],
  [["A", "T", "P"], "Arrow, text, pen"],
  [["N"], "Select the next element (Shift+N goes back)"],
  [["Enter"], "Edit the label (or double-click it)"],
  [["Enter"], "With a shape or text tool: add one in the middle"],
  [["Enter"], "With the arrow tool: start an arrow at the selected shape, then again to end it at the next one you select"],
  ["Click +", "Add the next connected shape"],
  ["Drag +", "Connect to a shape, or drop to add one"],
  [["Tab"], "While typing a shape's label: add the next step (Shift+Tab adds a sibling)"],
  ["Double-click", "Empty space adds text"],
  [["Ctrl+Arrow"], "Add a shape in that direction"],
  [["Arrows"], "Nudge (Alt: 1px, Shift: 50px)"],
  [["Ctrl+Shift+Arrow"], "Resize the selected shape"],
  ["Shift+drag", "Keep proportions or lock the axis"],
  ["Alt+drag", "Turn off snapping"],
  ["Space+drag", "Pan (scrolling pans too)"],
  ["Ctrl+scroll", "Zoom"],
  [["Shift+1"], "Fit the drawing"],
  [["Ctrl+Z"], "Undo (Ctrl+Shift+Z redoes)"],
  [["Ctrl+C", "Ctrl+V", "Ctrl+D"], "Copy, paste, duplicate"],
  [["Del"], "Delete the selection"],
  [["Esc"], "Cancel, or go back to the canvas from a toolbar"],
];

const menuItem = (act, iconName, label, cls = "") =>
  `<button type="button" class="menu-item ${cls}" role="menuitem" data-act="${act}">${icon(iconName)}<span class="grow">${label}</span></button>`;

export function attachMenus(ui) {
  const ed = ui.ed;

  // Runs a drawings menu command. Commands that show another drawing first make sure the edits
  // on screen are saved, since switching would lose them, unless the user chose to discard them.
  async function drawingsAction(body, { discard = false } = {}) {
    try {
      const switches = body.action === "new" || body.action === "open" || body.action === "duplicate";
      // Discarded edits are not worth sending.
      if (!discard && !(await ui.sync.flush(true)) && switches) {
        ui.warnUnsaved(() => drawingsAction(body, { discard: true }));
        return null;
      }
      const res = await ui.sync.post("drawings", body);
      ui.setDrawings(res.drawings);
      // A new name never moves the panel, even if it has moved to another drawing meanwhile.
      if (body.action === "rename") return res;
      if (res.drawing.id !== ui.sync.drawingId) {
        if (!(await ui.sync.switchTo(res.drawing, { discard }))) return null;
      } else ui.setDoc(res.drawing);
      return res;
    } catch (err) {
      ui.toast(err.message, { error: true });
      return null;
    }
  }
  ui.drawingsAction = drawingsAction;

  async function reveal(path) {
    try {
      await ui.sync.post("reveal", { path });
    } catch (err) {
      ui.toast(err.message, { error: true });
    }
  }

  function openDrawingsMenu() {
    ui.togglePopover($("doc-button"), (pop, close) => {
      const cur = ui.doc && ui.doc.id;
      const list = ui.drawings.map((d) => {
        const count = d.id === cur ? ed.elements.length : d.count;
        return `<button type="button" class="menu-item${d.id === cur ? " is-current" : ""}" role="menuitem" data-open="${esc(d.id)}">` +
          `<span class="grow">${esc(d.name)}</span><span class="meta">${count} item${count === 1 ? "" : "s"}</span></button>`;
      }).join("");
      const render = () => {
        pop.innerHTML =
          `<div class="menu-label">Drawings in this session</div>${list}<div class="menu-rule" role="separator"></div>` +
          menuItem("new", "plus", "New drawing") + menuItem("rename", "edit", "Rename") +
          menuItem("duplicate", "duplicate", "Duplicate") + menuItem("reveal", "folder", "Show in folder") +
          `<div class="menu-rule" role="separator"></div>${menuItem("delete", "trash", "Delete drawing", "danger")}`;
      };
      render();
      pop.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.open) {
          close();
          if (b.dataset.open !== cur) drawingsAction({ action: "open", id: b.dataset.open });
          return;
        }
        const act = b.dataset.act;
        if (act === "new") {
          close();
          drawingsAction({ action: "new" });
        } else if (act === "rename") {
          close();
          startRename();
        } else if (act === "duplicate") {
          close();
          const res = await drawingsAction({ action: "duplicate", id: cur });
          if (res) ui.toast(`Made a copy: ${res.drawing.name}`);
        } else if (act === "reveal") {
          close();
          reveal(`${ui.folder}/${cur}.json`);
        } else if (act === "delete") {
          // The confirmation is a small dialog, not a menu.
          pop.setAttribute("role", "alertdialog");
          pop.setAttribute("aria-label", "Delete drawing");
          pop.setAttribute("aria-describedby", "delete-note");
          pop.innerHTML =
            `<div class="menu-note" id="delete-note">Delete "${esc(ui.doc.name)}"? This cannot be undone.</div>` +
            '<div class="menu-actions"><button type="button" class="btn" data-act="cancel">Cancel</button>' +
            '<button type="button" class="btn btn-danger" data-act="confirm-delete">Delete</button></div>';
          pop.querySelector("[data-act=cancel]").focus();
        } else if (act === "cancel") {
          close();
        } else if (act === "confirm-delete") {
          const name = ui.doc.name;
          close();
          const res = await drawingsAction({ action: "delete", id: cur });
          if (res) ui.toast(`Deleted "${name}".`);
        }
      });
      pop.querySelector(".is-current, .menu-item")?.focus();
    }, { className: "menu", role: "menu", label: "Drawings" });
  }

  function startRename() {
    const button = $("doc-button");
    const input = $("doc-rename");
    // The panel can move to another drawing before the new name is in (the agent can open one),
    // and the name belongs to the drawing it was typed for.
    const doc = ui.doc;
    input.value = doc ? doc.name : "";
    button.hidden = true;
    input.hidden = false;
    input.focus();
    input.select();
    let finished = false;
    const finish = async (save) => {
      if (finished) return;
      finished = true;
      ui.cancelRename = null;
      input.hidden = true;
      button.hidden = false;
      const name = input.value.trim();
      if (save && name && doc && doc.id === ui.doc?.id && name !== doc.name) await drawingsAction({ action: "rename", id: doc.id, name });
      ed.focusCanvas();
    };
    ui.cancelRename = () => finish(false);
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    };
    input.onblur = () => finish(true);
  }

  function openExportMenu() {
    ui.togglePopover($("export-button"), (pop, close) => {
      pop.innerHTML =
        menuItem("copy", "copy", "Copy as image") + menuItem("png", "download", "Save as PNG") + menuItem("svg", "download", "Save as SVG") +
        '<div class="menu-rule" role="separator"></div><div class="menu-note">Files go in this session\'s drawings folder.</div>';
      pop.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-act]");
        if (!b) return;
        close();
        exportAs(b.dataset.act);
      });
      pop.querySelector(".menu-item").focus();
    }, { className: "menu", role: "menu", align: "end", label: "Export" });
  }

  async function exportAs(kind) {
    if (!ed.elements.length) {
      ui.toast("Draw something first.");
      return;
    }
    let note = "Saved";
    if (kind === "copy") {
      try {
        if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === "undefined") throw new Error("unsupported");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": ed.exportPNG() })]);
        ui.toast("Copied the drawing as an image.");
        return;
      } catch {
        kind = "png";
        note = "Copying images is blocked here, so it was saved";
      }
    }
    try {
      // The picture shows the drawing on screen right now, so it is saved under that drawing
      // even if another one opens while the picture is being made.
      const drawingId = ui.doc.id;
      const data = kind === "svg" ? ed.exportSVG() : await blobToBase64(await ed.exportPNG());
      const res = await ui.sync.post("export", { drawingId, format: kind, data });
      ui.toast(`${note} as ${fileName(res.path)}`, { action: { label: "Show in folder", run: () => reveal(res.path) } });
    } catch (err) {
      ui.toast(`Export failed: ${err.message}`, { error: true });
    }
  }

  function openAsk() {
    ui.togglePopover($("ask-button"), (pop, close) => {
      pop.innerHTML =
        '<p class="ask-title">Ask Copilot about this drawing</p>' +
        '<p class="ask-sub">Copilot gets a picture of the drawing and can change it for you.</p>' +
        '<textarea rows="3" aria-label="Your question" placeholder="For example: add a cache between the API and the database"></textarea>' +
        `<div class="chips">${CHIPS.map((c) => `<button type="button" class="chip">${esc(c)}</button>`).join("")}</div>` +
        '<div class="ask-foot"><span class="ask-hint">Ctrl+Enter to send</span><button type="button" class="btn btn-primary" data-send>Send</button></div>';
      const ta = pop.querySelector("textarea");
      const send = pop.querySelector("[data-send]");
      ta.value = ui.askDraft || "";
      ta.addEventListener("input", () => {
        ui.askDraft = ta.value;
      });
      pop.querySelector(".chips").addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        ta.value = chip.textContent;
        ui.askDraft = ta.value;
        ta.focus();
      });
      const submit = async () => {
        const text = ta.value.trim();
        if (!text) {
          ta.focus();
          return;
        }
        // The question is about the drawing on screen now. If another one opens before it goes
        // out, Copilot would get the wrong drawing, so it does not go out.
        const drawingId = ui.doc.id;
        const checkSameDrawing = () => {
          if (ui.doc.id !== drawingId) throw new Error("Another drawing opened, so your question was not sent. It is still in Ask, so you can send it about this one.");
        };
        send.disabled = true;
        send.textContent = "Sending";
        try {
          const saved = await ui.sync.flush(true);
          checkSameDrawing();
          if (!saved) {
            throw new Error("Your latest changes are not saved yet, so Copilot would not see them. Send again once the drawing is saved.");
          }
          const png = ed.elements.length ? await blobToBase64(await ed.exportPNG(2, 2000)) : "";
          checkSameDrawing();
          await ui.sync.post("ask", { drawingId, text, png });
          ui.askDraft = "";
          close();
          ui.toast("Sent to Copilot. The answer shows up in the chat.");
        } catch (err) {
          send.disabled = false;
          send.textContent = "Send";
          ui.toast(err.message, { error: true });
        }
      };
      send.addEventListener("click", submit);
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submit();
        }
      });
      setTimeout(() => ta.focus(), 0);
    }, { className: "ask", align: "end", label: "Ask Copilot about this drawing" });
  }

  function openThemeMenu() {
    ui.togglePopover($("theme-button"), (pop, close) => {
      const cur = ui.themeMode();
      pop.innerHTML = '<div class="menu-label">Theme</div>' + THEME_CHOICES.map(([mode, iconName, label]) =>
        `<button type="button" class="menu-item" role="menuitemradio" aria-checked="${mode === cur}" data-mode="${mode}">` +
        `${icon(iconName)}<span class="grow">${label}</span><span class="tick">${mode === cur ? icon("check") : ""}</span></button>`,
      ).join("");
      pop.addEventListener("click", (e) => {
        const b = e.target.closest("[data-mode]");
        if (!b) return;
        close();
        ui.setThemeMode(b.dataset.mode);
      });
      pop.querySelector('[aria-checked="true"]')?.focus();
    }, { className: "menu", role: "menu", align: "end", label: "Theme" });
  }

  function syncThemeButton() {
    const [, iconName, label] = THEME_CHOICES.find(([mode]) => mode === ui.themeMode()) || THEME_CHOICES[0];
    const b = $("theme-button");
    b.innerHTML = icon(iconName);
    b.title = `Theme: ${label}`;
    b.setAttribute("aria-label", `Theme: ${label}`);
  }

  function toggleHelp() {
    ui.togglePopover($("help-button"), (pop) => {
      const keys = (k) => (Array.isArray(k) ? k.map((s) => `<kbd>${esc(s)}</kbd>`).join(" ") : esc(k));
      pop.innerHTML = `<h2>Shortcuts</h2><dl>${HELP.map(([k, d]) => `<dt>${keys(k)}</dt><dd>${esc(d)}</dd>`).join("")}</dl>`;
    }, { className: "help", placement: "above", label: "Keyboard shortcuts" });
  }

  $("doc-button").addEventListener("click", openDrawingsMenu);
  $("theme-button").addEventListener("click", openThemeMenu);
  $("export-button").addEventListener("click", openExportMenu);
  $("ask-button").addEventListener("click", openAsk);
  $("help-button").addEventListener("click", toggleHelp);
  ui.toggleHelp = toggleHelp;
  ui.startRename = startRename;
  ui.syncThemeButton = syncThemeButton;
}
