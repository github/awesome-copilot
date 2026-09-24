// Boots the Draw canvas: theme, editor, input, UI and sync with the extension.
import { Editor } from "./editor.js";
import { LabelEditor } from "./labels.js";
import { attachPointer } from "./pointer.js";
import { attachKeys } from "./keys.js";
import { UI } from "./ui.js";
import { attachMenus } from "./menus.js";
import { Sync } from "./sync.js";
import { blobToBase64 } from "./util.js";
import { readTheme, applyThemeVars, watchTheme, setMeasureFont, clearMeasureCache, measure, THEME_MODES } from "./theme.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const instanceId = params.get("i") || "";
const token = params.get("t") || "";

function loadTheme(mode) {
  const t = readTheme(mode);
  setMeasureFont(t.font);
  applyThemeVars($("app"), t);
  return { ...t, measure };
}

// The page stays invisible until the host's theme is in, or briefly when there is no host.
const reveal = () => $("app").classList.remove("booting");

async function boot() {
  // The server writes the saved theme choice into the page, so the first paint is already right.
  let mode = THEME_MODES.includes($("app").dataset.themeMode) ? $("app").dataset.themeMode : "app";
  let theme = loadTheme(mode);
  if (theme.present.length) reveal();
  else setTimeout(reveal, 400);
  const ed = new Editor(
    { stage: $("stage"), svg: $("svg"), world: $("world"), content: $("content"), overlay: $("overlay"), layer: $("layer") },
    theme,
  );
  new LabelEditor(ed);
  attachPointer(ed);
  const ui = new UI(ed);
  ui.themeMode = () => mode;
  ui.setThemeMode = (next) => applyMode(next, true);
  attachMenus(ui);
  ui.syncThemeButton();
  attachKeys(ed, ui);

  // Match app, light or dark. Saving the choice also switches every other open panel.
  function applyMode(next, save) {
    if (!THEME_MODES.includes(next)) return;
    if (next !== mode) {
      mode = next;
      $("app").dataset.themeMode = mode;
      theme = loadTheme(mode);
      ed.setTheme(theme);
      ui.refresh();
      ui.syncThemeButton();
    }
    if (save) {
      sync.post("settings", { theme: next }).catch((err) => ui.toast(`Could not save the theme: ${err.message}`, { error: true }));
    }
  }

  async function answerExport({ requestId, format }) {
    try {
      const data = format === "svg" ? ed.exportSVG() : await blobToBase64(await ed.exportPNG());
      await sync.post("export", { requestId, format, data });
    } catch (err) {
      sync.post("export", { requestId, format, error: err.message || String(err) }).catch(() => {});
    }
  }

  const sync = new Sync({
    instanceId,
    token,
    editor: ed,
    handlers: {
      connection: (ok) => ui.setConnection(ok),
      list: (drawings) => ui.setDrawings(drawings),
      switched: (drawing) => {
        ui.closePopover();
        ed.load(drawing);
        ui.setDoc(drawing);
        ui.syncEmpty();
      },
      exportRequest: answerExport,
      select: (ids) => {
        if (!ed.busy) ed.select(ids);
      },
      status: (kind, msg) => ui.setStatus(kind, msg),
      problem: (msg) => ui.toast(msg, { error: true, timeout: 8000 }),
      settings: (values) => applyMode(values.theme, false),
    },
  });
  ui.sync = sync;
  ed.on("selection", () => sync.sendSelection([...ed.selection]));

  watchTheme(() => {
    theme = loadTheme(mode);
    ed.setTheme(theme);
    ui.refresh();
    if (theme.present.length) reveal();
  });
  document.fonts?.ready.then(() => {
    clearMeasureCache();
    ed.refresh();
  });

  if (!instanceId || !token) {
    reveal();
    ui.fatal("This page must be opened from the Draw canvas in Copilot.");
    return;
  }
  let state;
  try {
    state = await sync.loadState();
  } catch (err) {
    reveal();
    ui.fatal(err.message);
    return;
  }
  if (state.settings) applyMode(state.settings.theme, false);
  sync.setDoc(state.drawing);
  ui.setup(state);
  ed.load(state.drawing);
  ui.syncEmpty();
  sync.setDiskError(state.drawing.saveError);
  sync.connect();
  ed.stage.focus({ preventScroll: true });
}

boot().catch((err) => {
  reveal();
  const stage = $("stage");
  if (stage) stage.textContent = `Draw failed to start: ${err.message}`;
});
