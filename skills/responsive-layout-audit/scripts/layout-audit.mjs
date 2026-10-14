import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";

const defaultViewports = ["1920x1080", "1392x900", "950x900", "696x900", "390x844"];

function usage() {
  return `Usage: node layout-audit.mjs --target <URL|HTML> --out-dir <directory> [options]

Options:
  --playwright-root <directory>  Directory whose node_modules contains Playwright
  --browser <msedge|chromium>    Browser channel (default: msedge)
  --viewports <WxH,...>          Viewports (default: ${defaultViewports.join(",")})
  --ready-selector <selector>    Wait for a page element before capture
  --scroll-selector <selector>   Repeatable horizontal scroll region selector
  --edge-selector <selector>     Element that must be visible at each region's end
  --check-hit-testing            Check sampled points on visible buttons and links
  --wait-ms <number>             Extra settling time after navigation (default: 250)
  --force                        Allow overwriting files in a non-empty output directory
  --help                         Show this help`;
}

function parseArguments(args) {
  const options = {
    browser: "msedge",
    viewports: defaultViewports,
    scrollSelectors: [],
    waitMs: 250,
    force: false,
    checkHitTesting: false,
  };

  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (name === "--help") {
      options.help = true;
      continue;
    }
    if (name === "--force") {
      options.force = true;
      continue;
    }
    if (name === "--check-hit-testing") {
      options.checkHitTesting = true;
      continue;
    }

    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    if (name === "--target") options.target = value;
    else if (name === "--out-dir") options.outDir = value;
    else if (name === "--playwright-root") options.playwrightRoot = value;
    else if (name === "--browser") options.browser = value;
    else if (name === "--ready-selector") options.readySelector = value;
    else if (name === "--scroll-selector") options.scrollSelectors.push(value);
    else if (name === "--edge-selector") options.edgeSelector = value;
    else if (name === "--wait-ms") options.waitMs = Number(value);
    else if (name === "--viewports") options.viewports = value.split(",");
    else throw new Error(`Unknown option: ${name}`);
  }

  if (options.help) return options;
  if (!options.target || !options.outDir) throw new Error("--target and --out-dir are required");
  if (!["msedge", "chromium"].includes(options.browser)) throw new Error("--browser must be msedge or chromium");
  if (!Number.isFinite(options.waitMs) || options.waitMs < 0) throw new Error("--wait-ms must be a non-negative number");
  options.viewports = options.viewports.map(value => {
    const match = /^(\d+)x(\d+)$/.exec(value);
    if (!match || Number(match[1]) < 1 || Number(match[2]) < 1) throw new Error(`Invalid viewport: ${value}`);
    return {name: value, width: Number(match[1]), height: Number(match[2])};
  });
  if (!options.viewports.length) throw new Error("At least one viewport is required");
  return options;
}

function resolveTarget(target) {
  if (/^[a-zA-Z]:[\\/]/.test(target)) return pathToFileURL(path.resolve(target)).href;
  try {
    const url = new URL(target);
    if (["http:", "https:", "file:"].includes(url.protocol)) return url.href;
  } catch {
    return pathToFileURL(path.resolve(target)).href;
  }
  throw new Error("--target must be an http, https, file URL, or local HTML path");
}

function sanitizeTarget(target) {
  const url = new URL(target);
  url.username = "";
  url.password = "";
  for (const key of url.searchParams.keys()) {
    if (/(token|secret|password|passwd|authorization|api[-_]?key|session)/i.test(key)) url.searchParams.set(key, "REDACTED");
  }
  return url.href;
}

function loadPlaywright(root) {
  const base = path.resolve(root ?? process.cwd());
  const require = createRequire(path.join(base, "package.json"));
  try {
    return require("playwright");
  } catch (error) {
    throw new Error(`Cannot load Playwright from ${base}. Install it in that directory or pass --playwright-root. ${error.message}`);
  }
}

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "region";
}

async function inspectPage(page, options) {
  return page.evaluate(({checkHitTesting}) => {
    function isVisible(element) {
      if (!element.getClientRects().length) return false;
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0 || current.getAttribute("aria-hidden") === "true") return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function identify(element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      if (element.getAttribute("data-testid")) return `[data-testid="${CSS.escape(element.getAttribute("data-testid"))}"]`;
      return element.tagName.toLowerCase();
    }

    function hasHorizontalScrollAncestor(element) {
      for (let current = element.parentElement; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (["auto", "scroll"].includes(style.overflowX) && current.scrollWidth > current.clientWidth + 1) return true;
      }
      return false;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const pageWidth = document.documentElement.scrollWidth;
    const interactive = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button]")].filter(isVisible);
    const elements = interactive.map(element => {
      const rect = element.getBoundingClientRect();
      return {
        selector: identify(element),
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.value || element.getAttribute("aria-label") || "").trim().slice(0, 80),
        rect: {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height},
        inHorizontalScrollRegion: hasHorizontalScrollAncestor(element),
      };
    });

    const issues = [];
    const textTargets = [...document.querySelectorAll("[data-audit-text], button, a[href], [role=button], label, h1, h2, h3, p, td, th")].filter(isVisible);
    for (const element of textTargets) {
      const style = getComputedStyle(element);
      const clipsText = ["hidden", "clip"].includes(style.overflowX) || style.textOverflow === "ellipsis" || style.lineClamp !== "none";
      if (clipsText && element.scrollWidth > element.clientWidth + 2) {
        issues.push({type: "text-clipping-candidate", selector: identify(element), text: (element.innerText || "").trim().slice(0, 80)});
      }
    }

    for (const element of interactive) {
      const rect = element.getBoundingClientRect();
      if ((rect.left < -1 || rect.right > viewportWidth + 1) && !hasHorizontalScrollAncestor(element)) {
        issues.push({type: "action-outside-viewport-candidate", selector: identify(element), text: (element.innerText || element.value || "").trim().slice(0, 80)});
      }
      if (!checkHitTesting || !["BUTTON", "A"].includes(element.tagName) && element.getAttribute("role") !== "button") continue;

      const insetX = Math.min(4, rect.width / 5);
      const insetY = Math.min(4, rect.height / 5);
      const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + insetX, rect.top + insetY],
        [rect.right - insetX, rect.top + insetY],
        [rect.left + insetX, rect.bottom - insetY],
        [rect.right - insetX, rect.bottom - insetY],
      ].filter(([x, y]) => x >= 0 && y >= 0 && x < viewportWidth && y < innerHeight);
      const blockedPoints = points.filter(([x, y]) => {
        const top = document.elementFromPoint(x, y);
        return top && top !== element && !element.contains(top);
      });
      if (blockedPoints.length) issues.push({type: "hit-test-obstruction-candidate", selector: identify(element), sampledPoints: points.length, blockedPoints: blockedPoints.length});
    }

    return {
      page: {viewportWidth, pageWidth, horizontalOverflow: pageWidth > viewportWidth + 1},
      elements,
      issues,
    };
  }, {checkHitTesting: options.checkHitTesting});
}

async function inspectScrollRegions(page, selectors, edgeSelector, outDir, viewportName) {
  const regions = [];
  let sequence = 0;
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();
    for (let index = 0; index < count; index++) {
      const region = locator.nth(index);
      const initial = await region.evaluate(element => ({
        label: element.getAttribute("aria-label") || element.id || element.className || "scroll-region",
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        initialScrollLeft: element.scrollLeft,
        maxScrollLeft: Math.max(0, element.scrollWidth - element.clientWidth),
      }));
      const scrollable = initial.maxScrollLeft > 1;
      if (scrollable) await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const endReached = await region.evaluate(element => Math.abs(element.scrollLeft - Math.max(0, element.scrollWidth - element.clientWidth)) <= 1);
      let edgeVisible = null;
      if (edgeSelector) {
        const edge = region.locator(edgeSelector).last();
        if (await edge.count()) {
          edgeVisible = await edge.evaluate((element, container) => {
            const containerRect = container.getBoundingClientRect();
            const edgeRect = element.getBoundingClientRect();
            return edgeRect.left >= containerRect.left - 1 && edgeRect.right <= containerRect.right + 1;
          }, await region.elementHandle());
        } else {
          edgeVisible = false;
        }
      }

      sequence++;
      const screenshot = `${viewportName}-scroll-${String(sequence).padStart(2, "0")}-${safeName(String(initial.label))}.png`;
      if (scrollable) await region.screenshot({path: path.join(outDir, screenshot)});
      regions.push({...initial, selector, index, scrollable, endReached, edgeVisible, screenshot: scrollable ? screenshot : null});
    }
  }
  return regions;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, {recursive: true});
  if (!options.force && fs.readdirSync(outDir).length) throw new Error(`Output directory is not empty; use --force to overwrite: ${outDir}`);
  const target = resolveTarget(options.target);
  const {chromium} = loadPlaywright(options.playwrightRoot);
  const launchOptions = {headless: true};
  if (options.browser === "msedge") launchOptions.channel = "msedge";
  const browser = await chromium.launch(launchOptions);
  const report = {target: sanitizeTarget(target), browser: options.browser, generatedAt: new Date().toISOString(), viewports: []};

  try {
    for (const viewport of options.viewports) {
      const page = await browser.newPage({viewport: {width: viewport.width, height: viewport.height}});
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      try {
        await page.goto(target, {waitUntil: "domcontentloaded", timeout: 60000});
        if (options.readySelector) await page.locator(options.readySelector).waitFor({state: "visible", timeout: 30000});
        if (options.waitMs) await page.waitForTimeout(options.waitMs);
        const screenshot = `${viewport.name}.png`;
        await page.screenshot({path: path.join(outDir, screenshot), fullPage: true});

        const inspected = await inspectPage(page, options);
        if (inspected.page.horizontalOverflow) inspected.issues.unshift({type: "page-horizontal-overflow", pageWidth: inspected.page.pageWidth, viewportWidth: inspected.page.viewportWidth});
        const scrollRegions = await inspectScrollRegions(page, options.scrollSelectors, options.edgeSelector, outDir, viewport.name);
        report.viewports.push({...viewport, ...inspected, scrollRegions, pageErrors, screenshot});
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outDir, "layout-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`LAYOUT_AUDIT_DONE viewports=${report.viewports.length} report=${reportPath}`);
}

try {
  await run();
} catch (error) {
  console.error(`${error.name}: ${error.message}`);
  if (process.argv.includes("--help")) console.error(usage());
  process.exitCode = 1;
}