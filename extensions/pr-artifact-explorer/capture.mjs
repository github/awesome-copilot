import { mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { DATA_ROOT } from "./constants.mjs";

export const SCREENSHOT_ROOT = join(DATA_ROOT, "screenshots");
let screenshotRoot = SCREENSHOT_ROOT;

/** Directs screenshot output to the owning session's files area; falls back to the cache root. */
export function setScreenshotRoot(dir) {
  screenshotRoot = dir || SCREENSHOT_ROOT;
}

export function getScreenshotRoot() {
  return screenshotRoot;
}
const LEGACY_SETUP_ENV = "PR_ARTIFACT_EXPLORER_PLAYWRIGHT";

export const VIEWPORT_PRESETS = Object.freeze({
  mobile: { label: "Mobile", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tablet: { label: "Tablet", width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { label: "Desktop", width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
});

export class CaptureError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CaptureError";
    this.code = code;
  }
}

export const SETUP_INSTRUCTIONS = [
  "Screenshots need Playwright with a Chromium browser. Nothing is installed automatically.",
  "1. Install the extension dependencies in its folder: npm install   (playwright-core is an optional dependency)",
  "2. Install the browser once: npx playwright-core install chromium",
].join("\n");

export async function loadPlaywright() {
  if (process.env[LEGACY_SETUP_ENV]) {
    throw new CaptureError(
      "playwright_config_unsupported",
      `${LEGACY_SETUP_ENV} is no longer supported because Explorer no longer loads Playwright from arbitrary paths. Unset it.\n${SETUP_INSTRUCTIONS}`,
    );
  }
  try {
    const mod = await import("playwright-core");
    const chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) return chromium;
  } catch {
    // reported below with setup instructions
  }
  throw new CaptureError("playwright_missing", `Playwright is not available.\n${SETUP_INSTRUCTIONS}`);
}

export function resolveViewport({ preset, width, height, deviceScaleFactor, orientation } = {}) {
  const base = preset && preset !== "native" ? VIEWPORT_PRESETS[preset] : null;
  if (preset && preset !== "native" && preset !== "custom" && !base) {
    throw new CaptureError("invalid_viewport", `Unknown preset "${preset}". Use native, mobile, tablet, desktop or custom.`);
  }
  let w = width ?? base?.width ?? 1280;
  let h = height ?? base?.height ?? 800;
  for (const [label, value] of [["width", w], ["height", h]]) {
    if (!Number.isInteger(value) || value < 200 || value > 4000) {
      throw new CaptureError("invalid_viewport", `${label} must be an integer between 200 and 4000.`);
    }
  }
  if (orientation === "landscape" && h > w) [w, h] = [h, w];
  if (orientation === "portrait" && w > h) [w, h] = [h, w];
  return {
    width: w,
    height: h,
    deviceScaleFactor: deviceScaleFactor ?? base?.deviceScaleFactor ?? 1,
    isMobile: base?.isMobile ?? false,
    hasTouch: base?.hasTouch ?? false,
  };
}

function assertHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new CaptureError("invalid_url", "A valid http(s) URL is required.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CaptureError("invalid_url", "Only http and https URLs can be captured.");
  }
  if (url.username || url.password) {
    throw new CaptureError("invalid_url", "URLs with embedded credentials cannot be captured.");
  }
  return url;
}

async function launchChromium() {
  const chromium = await loadPlaywright();
  let browser;
  const failures = [];
  const attempts = [
    ...(process.env.PR_ARTIFACT_EXPLORER_CHROMIUM
      ? [{ executablePath: process.env.PR_ARTIFACT_EXPLORER_CHROMIUM }]
      : []),
    {},
    { channel: "chrome" },
    { channel: "msedge" },
  ];
  for (const options of attempts) {
    try {
      browser = await chromium.launch({ headless: true, ...options });
      break;
    } catch (error) {
      failures.push(error?.message?.split("\n")[0] ?? String(error));
    }
  }
  if (!browser) {
    throw new CaptureError(
      "chromium_missing",
      `Chromium could not be launched: ${failures[0]}\n${SETUP_INSTRUCTIONS}`,
    );
  }
  return browser;
}

const CLOSE_TIMEOUT_MS = 5_000;

/** Closes a Playwright browser without ever waiting forever; returns whether it closed cleanly in time. */
export async function closeBrowserBounded(browser, timeoutMs = CLOSE_TIMEOUT_MS) {
  return closeBounded(browser, timeoutMs);
}

/** Waits for a promise to settle (either way), but never longer than the close bound; false on timeout. */
async function settleBounded(promise, timeoutMs = CLOSE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([promise.then(() => true, () => true), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function hasViewportOptions(options) {
  return ["preset", "width", "height", "orientation", "deviceScaleFactor"].some((key) => options?.[key] != null);
}

/** Bounded close of any Playwright closable (browser or context); false only on timeout. */
async function closeBounded(target, timeoutMs = CLOSE_TIMEOUT_MS) {
  if (!target) return true;
  let timer;
  const timeout = new Promise((resolve) => {
    // Referenced on purpose: an unsettled close must still reach this timeout before Node can exit.
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => target.close()).then(() => true, () => true), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function savePng(png, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const file = join(outputDir, `screenshot-${Date.now()}-${randomUUID().slice(0, 8)}.png`);
  await writeFile(file, png);
  return { path: file, bytes: png.length, sha256: createHash("sha256").update(png).digest("hex") };
}

/**
 * Renders the URL in a fresh, isolated headless Chromium and saves a PNG.
 * This is a NEW render, not a snapshot of the page currently shown in the canvas.
 */
export function normalizeColorScheme(value) {
  if (value === undefined || value === null) return undefined;
  if (value === "light" || value === "dark") return value;
  throw new CaptureError("invalid_viewport", 'Color scheme must be "light" or "dark".');
}

export async function captureScreenshot({ url, fullPage = false, outputDir = getScreenshotRoot(), colorScheme, ...viewportOptions }) {
  const target = assertHttpUrl(url);
  const viewport = resolveViewport(viewportOptions);
  const scheme = normalizeColorScheme(colorScheme);
  const browser = await launchChromium();
  try {
    // A new context has no cookies or profile data and is discarded afterwards.
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      ...(scheme ? { colorScheme: scheme } : {}),
    });
    const page = await context.newPage();
    let status = null;
    try {
      const response = await page.goto(target.href, { waitUntil: "load", timeout: 30_000 });
      status = response?.status() ?? null;
    } catch (error) {
      throw new CaptureError("navigation_failed", `Could not load ${target.origin}: ${error?.message?.split("\n")[0] ?? error}`);
    }
    const png = await page.screenshot({ type: "png", fullPage: Boolean(fullPage) });
    const finalUrl = page.url();
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));
    return {
      ...(await savePng(png, outputDir)),
      source: "fresh-render",
      colorScheme: scheme ?? null,
      note: "Fresh headless Chromium render of the URL. It does not include unsaved page state from the canvas preview.",
      requestedUrl: target.href,
      finalUrl,
      status,
      fullPage: Boolean(fullPage),
      viewport,
      page: dimensions,
    };
  } finally {
    await closeBrowserBounded(browser);
  }
}

/**
 * An explicit, isolated, controlled Chromium: one in-memory context (no persistent profile,
 * cookies or logins), real history, device emulation, and screenshots of the CURRENT page.
 * Used for sites that refuse to be embedded in an iframe.
 */
export class ControlledBrowser {
  #browser = null;
  #context = null;
  #page = null;
  #viewport = null;
  #starting = null;
  #epoch = 0;
  #colorScheme = undefined;

  get active() {
    return Boolean(this.#page);
  }

  get currentUrl() {
    const url = this.#page?.url();
    return url && url !== "about:blank" ? url : null;
  }

  async setColorScheme(value) {
    const scheme = normalizeColorScheme(value);
    if (!scheme || scheme === this.#colorScheme) return { colorScheme: this.#colorScheme ?? null };
    this.#colorScheme = scheme;
    if (this.#page) await this.#page.emulateMedia({ colorScheme: scheme });
    return { colorScheme: scheme };
  }

  async #ensure(viewportOptions) {
    if (this.#page) return;
    // Validate before launching so invalid input never allocates a browser.
    const viewport = resolveViewport(viewportOptions);
    const epoch = this.#epoch;
    this.#starting ??= (async () => {
      const browser = await launchChromium();
      if (epoch !== this.#epoch) {
        await closeBrowserBounded(browser);
        throw new CaptureError("closed", "The controlled browser was closed while it was starting.");
      }
      this.#browser = browser;
      this.#viewport = viewport;
      try {
        await this.#open();
      } catch (error) {
        this.#browser = this.#context = this.#page = null;
        await closeBrowserBounded(browser);
        throw error;
      }
      if (epoch !== this.#epoch) {
        this.#browser = this.#context = this.#page = null;
        await closeBrowserBounded(browser);
        throw new CaptureError("closed", "The controlled browser was closed while it was starting.");
      }
    })().finally(() => {
      this.#starting = null;
    });
    await this.#starting;
  }

  async #open() {
    const v = this.#viewport;
    this.#context = await this.#browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.deviceScaleFactor,
      isMobile: v.isMobile,
      hasTouch: v.hasTouch,
      ...(this.#colorScheme ? { colorScheme: this.#colorScheme } : {}),
    });
    this.#page = await this.#context.newPage();
  }

  async #state() {
    const page = this.#page;
    const history = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    })).catch(() => null);
    const nav = await page.evaluate(() => {
      const entries = performance.getEntriesByType("navigation");
      return { length: window.history.length, type: entries[0]?.type ?? null };
    }).catch(() => null);
    return { url: page.url(), title: await page.title().catch(() => ""), viewport: this.#viewport, page: history, historyLength: nav?.length ?? null };
  }

  async navigate(url, viewportOptions = {}) {
    const target = assertHttpUrl(url);
    const wasActive = Boolean(this.#page);
    await this.#ensure(viewportOptions);
    // An already-open session keeps its settings unless this call names a new viewport.
    if (wasActive && hasViewportOptions(viewportOptions)) await this.setViewport(viewportOptions);
    try {
      const response = await this.#page.goto(target.href, { waitUntil: "load", timeout: 30_000 });
      return { ...(await this.#state()), status: response?.status() ?? null };
    } catch (error) {
      throw new CaptureError("navigation_failed", `Could not load ${target.origin}: ${error?.message?.split("\n")[0] ?? error}`);
    }
  }

  async history(direction) {
    if (!this.#page) throw new CaptureError("not_started", "Open a page in the controlled browser first.");
    const verbs = { back: "goBack", forward: "goForward", refresh: "reload" };
    const verb = verbs[direction];
    if (!verb) throw new CaptureError("invalid_url", `Unknown history action "${direction}".`);
    try {
      // goBack/goForward resolve null when there is no such entry; that is not a failure.
      await this.#page[verb]({ waitUntil: "load", timeout: 30_000 });
      // The context starts on about:blank; it is not user history, so never stay on it.
      if (direction === "back" && this.#page.url() === "about:blank") await this.#page.goForward({ waitUntil: "load", timeout: 30_000 });
    } catch (error) {
      throw new CaptureError("navigation_failed", `Could not ${direction === "refresh" ? "reload" : `go ${direction} to`} the page: ${error?.message?.split("\n")[0] ?? error}`);
    }
    return this.#state();
  }

  /** Real session history (about:blank excluded) so it can be replayed into a recreated context. */
  async #readHistory() {
    const cdp = await this.#context.newCDPSession(this.#page);
    try {
      const { entries, currentIndex } = await cdp.send("Page.getNavigationHistory");
      const urls = [];
      let index = -1;
      entries.forEach((entry, i) => {
        if (entry.url === "about:blank") return;
        urls.push(entry.url);
        if (i === currentIndex) index = urls.length - 1;
      });
      return { urls, index: index < 0 ? urls.length - 1 : index };
    } finally {
      await cdp.detach().catch(() => {});
    }
  }

  /**
   * Resizing keeps the page and its history. Changing device traits (mobile, touch, scale factor) needs
   * a new browser context, so the logical history is replayed into it and the position is restored.
   */
  async setViewport(viewportOptions) {
    if (!this.#page) throw new CaptureError("not_started", "Open a page in the controlled browser first.");
    const next = resolveViewport(viewportOptions);
    const needsNewContext = next.isMobile !== this.#viewport.isMobile
      || next.hasTouch !== this.#viewport.hasTouch
      || next.deviceScaleFactor !== this.#viewport.deviceScaleFactor;
    if (!needsNewContext) {
      await this.#page.setViewportSize({ width: next.width, height: next.height });
      this.#viewport = next;
      return this.#state();
    }
    const { urls, index } = await this.#readHistory();
    const previous = this.#context;
    const previousViewport = this.#viewport;
    this.#viewport = next;
    try {
      await this.#open();
      for (const url of urls) {
        await this.#page.goto(url, { waitUntil: "load", timeout: 30_000 });
      }
      for (let i = urls.length - 1; i > index; i -= 1) {
        await this.#page.goBack({ waitUntil: "load", timeout: 30_000 });
      }
    } catch (error) {
      await closeBounded(this.#context);
      this.#viewport = previousViewport;
      this.#context = previous;
      this.#page = previous.pages()[0] ?? this.#page;
      throw new CaptureError("navigation_failed", `Could not re-open the page with the new device settings: ${error?.message?.split("\n")[0] ?? error}`);
    }
    await closeBounded(previous);
    return this.#state();
  }

  async screenshot({ fullPage = false, outputDir = getScreenshotRoot() } = {}) {
    if (!this.#page) throw new CaptureError("not_started", "Open a page in the controlled browser first.");
    const png = await this.#page.screenshot({ type: "png", fullPage: Boolean(fullPage) });
    const state = await this.#state();
    return {
      ...(await savePng(png, outputDir)),
      source: "controlled-current",
      note: "Screenshot of the controlled Chromium's current page state, including navigation and unsaved page state.",
      finalUrl: state.url,
      fullPage: Boolean(fullPage),
      viewport: state.viewport,
      page: state.page,
    };
  }

  /** Raw PNG of the current viewport for live display; not written to disk. */
  async frame() {
    if (!this.#page) throw new CaptureError("not_started", "Open a page in the controlled browser first.");
    return this.#page.screenshot({ type: "png" });
  }

  async close() {
    this.#epoch += 1;
    const browser = this.#browser;
    const starting = this.#starting;
    this.#browser = this.#context = this.#page = null;
    const [closed, settled] = await Promise.all([
      closeBrowserBounded(browser),
      starting ? settleBounded(starting) : true,
    ]);
    return { clean: closed && settled };
  }
}
