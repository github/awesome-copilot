// Resolves the host app's theme tokens into hex colors, and measures text with the real font.
import { LIGHT_PALETTE, DARK_PALETTE, staticPaint, luminance, mixHex, textOn } from "/lib/model.mjs";
import { DEFAULT_FONT } from "/lib/render.mjs";

export const HOST_TOKENS = [
  "--background-color-default",
  "--text-color-default",
  "--text-color-muted",
  "--border-color-default",
  "--color-focus-outline",
  "--font-sans",
  "--font-mono",
];

const pixel = document.createElement("canvas");
pixel.width = pixel.height = 1;
const pctx = pixel.getContext("2d", { willReadFrequently: true });
let probe = null;

// Any CSS color (rgb, oklch, color-mix, names) -> "#rrggbb", or null when it is not a usable color.
export function cssToHex(value) {
  if (!value) return null;
  if (!probe) {
    probe = document.createElement("span");
    probe.style.display = "none";
    document.body.append(probe);
  }
  probe.style.color = "";
  probe.style.color = value;
  if (!probe.style.color) return null;
  const computed = getComputedStyle(probe).color;
  pctx.clearRect(0, 0, 1, 1);
  pctx.fillStyle = "#000";
  pctx.fillStyle = computed;
  pctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
  if (a < 8) return null;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const THEME_MODES = ["app", "light", "dark"];

// mode "app" follows the host. "light" and "dark" use the host's colors only when its tone
// matches, and the built-in palette otherwise. The host's fonts are used either way.
export function readTheme(mode = "app") {
  const styles = getComputedStyle(document.body);
  const tok = (name) => styles.getPropertyValue(name).trim();
  const present = HOST_TOKENS.filter((name) => tok(name));
  const hostBg = cssToHex(tok("--background-color-default"));
  // Before its colors load, the host already marks the tone on <html> (data-theme-tone).
  const tone = document.documentElement.dataset.themeTone;
  const hostDark = hostBg
    ? luminance(hostBg) < 0.4
    : tone === "dark" || tone === "light" ? tone === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "light" ? false : mode === "dark" ? true : hostDark;
  const hostColor = (name) => (dark === hostDark ? cssToHex(tok(name)) : null);
  const base = dark ? DARK_PALETTE : LIGHT_PALETTE;
  const bg = hostColor("--background-color-default") || base.bg;
  const ink = hostColor("--text-color-default") || base.ink;
  const muted = hostColor("--text-color-muted") || mixHex(ink, bg, 0.62);
  const border = hostColor("--border-color-default") || mixHex(ink, bg, dark ? 0.24 : 0.17);
  const accent = hostColor("--color-focus-outline") || base.blue;
  const font = tok("--font-sans") || DEFAULT_FONT;
  const mono = tok("--font-mono") || "ui-monospace, 'Cascadia Code', Consolas, monospace";
  const palette = { ...base, bg, ink };
  return {
    mode, dark, bg, ink, muted, border, accent, font, mono, palette, present,
    danger: base.red,
    paint: staticPaint(palette),
  };
}

// Pushes theme colors into CSS variables on the app root (not <html>, which the host may own).
export function applyThemeVars(root, t) {
  const set = (k, v) => root.style.setProperty(k, v);
  set("--d-bg", t.bg);
  set("--d-ink", t.ink);
  set("--d-muted", t.muted);
  set("--d-border", t.border);
  set("--d-accent", t.accent);
  set("--d-on-accent", textOn(t.accent));
  set("--d-hover", mixHex(t.ink, t.bg, t.dark ? 0.1 : 0.06));
  set("--d-active", mixHex(t.ink, t.bg, t.dark ? 0.16 : 0.1));
  set("--d-accent-soft", mixHex(t.accent, t.bg, t.dark ? 0.24 : 0.12));
  set("--d-dot", mixHex(t.ink, t.bg, t.dark ? 0.22 : 0.2));
  set("--d-danger", t.danger);
  set("--d-on-danger", textOn(t.danger));
  set("--d-font", t.font);
  set("--d-mono", t.mono);
  set("--d-shadow", t.dark ? "0 1px 2px rgba(0,0,0,0.4)" : "0 1px 2px rgba(31,35,40,0.06)");
  set("--d-pop-shadow", t.dark ? "0 8px 28px rgba(0,0,0,0.55)" : "0 8px 28px rgba(31,35,40,0.16)");
  root.style.colorScheme = t.dark ? "dark" : "light";
}

// Calls back (debounced) when the host changes theme attributes, stylesheets or the OS scheme.
export function watchTheme(callback) {
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(callback, 16);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true });
  mo.observe(document.body, { attributes: true });
  mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
}

// Text measurement with the real UI font. Cached, because layout measures the same strings a lot.
const mctx = document.createElement("canvas").getContext("2d");
const cache = new Map();
let family = DEFAULT_FONT;

export function setMeasureFont(font) {
  if (font === family) return;
  family = font;
  cache.clear();
}

export function clearMeasureCache() {
  cache.clear();
}

export function measure(str, fontSize, weight = 400) {
  const key = `${weight}|${fontSize}|${str}`;
  let w = cache.get(key);
  if (w === undefined) {
    mctx.font = `${weight} ${fontSize}px ${family}`;
    w = mctx.measureText(str).width;
    if (cache.size > 20000) cache.clear();
    cache.set(key, w);
  }
  return w;
}
