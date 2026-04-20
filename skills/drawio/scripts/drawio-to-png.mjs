/**
 * drawio-to-png.mjs - Convert .drawio files to PNG with accurate rendering.
 *
 * Rendering priority:
 *   1. draw.io CLI (if installed) — pixel-perfect, fastest
 *   2. Official draw.io viewer JS in headless browser — pixel-perfect, needs network
 *
 * Usage: node drawio-to-png.mjs <input.drawio> [output.png]
 *        node drawio-to-png.mjs --dir <directory>   (converts all .drawio files in directory)
 *        node drawio-to-png.mjs --renderer=cli|viewer|auto <input.drawio> [output.png]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename, dirname, resolve } from "path";
import { spawnSync } from "child_process";
import { inflateRawSync } from "zlib";
import puppeteer from "puppeteer-core";

// --- Build HTML that uses the official draw.io viewer for rendering ---
function buildViewerHtml(rawFileContent) {
  // Escape for embedding in a JS template literal
  const escaped = rawFileContent
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  // The official draw.io viewer (viewer-static.min.js) contains the full mxGraph
  // rendering engine — it handles orthogonal edge routing, all shape types,
  // container layouts, and compressed/uncompressed diagram formats.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    body { background: white; }
  </style>
</head>
<body>
  <div id="diagram-host"></div>
  <script>
    // Prepare diagram XML and set up the viewer target div
    (function() {
      var raw = \`${escaped}\`;

      // Wrap raw mxGraphModel in mxfile if needed (viewer expects mxfile format)
      var xmlStr = raw.trim();
      if (xmlStr.startsWith('<mxGraphModel')) {
        xmlStr = '<mxfile><diagram name="Page-1">' + xmlStr + '</diagram></mxfile>';
      } else if (!xmlStr.startsWith('<mxfile')) {
        // Assume it's already an mxfile or a diagram element
        if (xmlStr.startsWith('<diagram')) {
          xmlStr = '<mxfile>' + xmlStr + '</mxfile>';
        }
      }

      var config = {
        xml: xmlStr,
        highlight: "none",
        nav: false,
        resize: true,
        toolbar: null,
        "toolbar-nohide": true,
        edit: null,
        lightbox: false,
        "auto-fit": true,
        "check-visible-state": false
      };

      var div = document.createElement('div');
      div.className = 'mxgraph';
      div.setAttribute('data-mxgraph', JSON.stringify(config));
      document.getElementById('diagram-host').appendChild(div);
    })();

    // Poll until the viewer renders the diagram (viewer script loaded separately)
    window.__pollStarted = false;
    window.__startPoll = function() {
      if (window.__pollStarted) return;
      window.__pollStarted = true;
      // Explicitly trigger viewer processing
      if (typeof GraphViewer !== 'undefined' && GraphViewer.processElements) {
        GraphViewer.processElements();
      }
      (function poll() {
        // Viewer places SVG directly inside .mxgraph div
        var mxDiv = document.querySelector('.mxgraph');
        if (mxDiv) {
          var svg = mxDiv.querySelector('svg');
          if (svg) {
            var rect = mxDiv.getBoundingClientRect();
            if (rect.width > 10 && rect.height > 10) {
              window.__renderComplete = true;
              window.__renderWidth = rect.width;
              window.__renderHeight = rect.height;
              return;
            }
          }
        }
        setTimeout(poll, 150);
      })();
    };
  </script>
</body>
</html>`;
}

// --- Extract mxGraph XML from .drawio input (supports mxGraphModel and mxfile) ---
function extractMxGraphModelXml(inputXml) {
  const trimmed = inputXml.trim();

  if (trimmed.startsWith("<mxGraphModel")) {
    return trimmed;
  }

  const diagramMatch = trimmed.match(/<diagram\b[^>]*>([\s\S]*?)<\/diagram>/i);
  if (!diagramMatch) {
    throw new Error("Unsupported .drawio format: missing <mxGraphModel> or <diagram> content");
  }

  const diagramContent = diagramMatch[1].trim();

  if (diagramContent.startsWith("<mxGraphModel")) {
    return diagramContent;
  }

  // draw.io compressed diagrams are base64(deflateRaw(encodeURIComponent(xml)))
  try {
    const inflated = inflateRawSync(Buffer.from(diagramContent, "base64")).toString("utf-8");
    const decoded = decodeURIComponent(inflated);
    if (!decoded.trim().startsWith("<mxGraphModel")) {
      throw new Error("decoded content is not mxGraphModel XML");
    }
    return decoded;
  } catch (err) {
    throw new Error(`Failed to decode compressed <diagram> content: ${err.message}`);
  }
}

function resolveRenderer(rawArgs) {
  let renderer = "auto";
  const args = [];

  for (const arg of rawArgs) {
    if (arg.startsWith("--renderer=")) {
      renderer = arg.substring("--renderer=".length).trim().toLowerCase();
      continue;
    }
    args.push(arg);
  }

  if (!["auto", "cli", "viewer"].includes(renderer)) {
    throw new Error(`Invalid renderer '${renderer}'. Use auto, cli, or viewer.`);
  }

  return { renderer, args };
}

function findDrawioCliPath() {
  const envPath = process.env.DRAWIO_PATH;
  if (envPath) {
    try {
      if (statSync(envPath).isFile()) return envPath;
    } catch { /* ignore */ }
  }

  const candidates = [
    "C:\\Program Files\\draw.io\\draw.io.exe",
    "C:\\Program Files (x86)\\draw.io\\draw.io.exe",
    "/Applications/draw.io.app/Contents/MacOS/draw.io",
    "/usr/bin/drawio",
    "/usr/local/bin/drawio",
  ];

  for (const p of candidates) {
    try {
      if (statSync(p).isFile()) return p;
    } catch { /* ignore */ }
  }

  const locator = process.platform === "win32" ? "where" : "which";
  const names = process.platform === "win32" ? ["drawio", "draw.io"] : ["drawio"];

  for (const name of names) {
    const probe = spawnSync(locator, [name], { encoding: "utf-8" });
    if (probe.status === 0 && probe.stdout) {
      const first = probe.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean);
      if (first) return first;
    }
  }

  return null;
}

function exportWithDrawioCli(drawioPath, input, output) {
  const args = ["-x", "-f", "png", "-e", "-b", "10", "-o", output, input];
  const result = spawnSync(drawioPath, args, { encoding: "utf-8" });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(stderr || stdout || `draw.io CLI failed with exit code ${result.status}`);
  }
}

// --- Main ---
async function main() {
  const parsed = resolveRenderer(process.argv.slice(2));
  const renderer = parsed.renderer;
  const args = parsed.args;

  let files = [];
  if (args[0] === "--dir") {
    const dir = resolve(args[1] || ".");
    files = readdirSync(dir)
      .filter(f => f.endsWith(".drawio"))
      .map(f => ({
        input: join(dir, f),
        output: join(dir, f.replace(/\.drawio$/, ".drawio.png"))
      }));
  } else if (args[0]) {
    const input = resolve(args[0]);
    const output = args[1] || input.replace(/\.drawio$/, ".drawio.png");
    files = [{ input, output }];
  } else {
    console.error("Usage: node drawio-to-png.mjs <input.drawio> [output.png]");
    console.error("       node drawio-to-png.mjs --dir <directory>");
    console.error("       node drawio-to-png.mjs --renderer=cli|auto|custom <input.drawio> [output.png]");
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No .drawio files found.");
    return;
  }

  const drawioCliPath = findDrawioCliPath();

  // --- Path 1: draw.io CLI (best fidelity, no network needed) ---
  if (renderer === "cli" || (renderer === "auto" && drawioCliPath)) {
    if (!drawioCliPath) {
      console.error("draw.io CLI not found. Install draw.io desktop or set DRAWIO_PATH.");
      process.exit(1);
    }
    console.log(`Using renderer: draw.io CLI (${basename(drawioCliPath)})`);
    for (const { input, output } of files) {
      console.log(`Rendering: ${basename(input)}`);
      try {
        exportWithDrawioCli(drawioCliPath, input, output);
        let kb = "?";
        try {
          kb = (statSync(output).size / 1024).toFixed(0);
        } catch { /* ignore size read errors */ }
        console.log(`  -> ${basename(output)} (${kb} KB)`);
      } catch (err) {
        console.error(`  Error rendering ${basename(input)}: ${err.message}`);
      }
    }
    console.log("Done.");
    return;
  }

  // --- Path 2: Official draw.io viewer in headless browser ---
  // Find browser
  const browserPaths = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);

  let execPath;
  for (const p of browserPaths) {
    try {
      if (statSync(p).isFile()) { execPath = p; break; }
    } catch { /* not found */ }
  }

  if (!execPath) {
    console.error("No browser found. Set CHROME_PATH or EDGE_PATH environment variable.");
    process.exit(1);
  }

  console.log(`Using renderer: draw.io viewer (${basename(execPath)})`);

  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  for (const { input, output } of files) {
    console.log(`Rendering: ${basename(input)}`);
    try {
      const rawContent = readFileSync(input, "utf-8");
      const html = buildViewerHtml(rawContent);

      const page = await browser.newPage();
      await page.setViewport({ width: 2400, height: 1600, deviceScaleFactor: 2 });

      // Set HTML content first (sets up the .mxgraph div with diagram XML)
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      // Load the official draw.io viewer JS via addScriptTag (more reliable than inline src)
      const VIEWER_URL = "https://viewer.diagrams.net/js/viewer-static.min.js";
      try {
        await page.addScriptTag({ url: VIEWER_URL });
      } catch (scriptErr) {
        throw new Error(`Failed to load draw.io viewer JS: ${scriptErr.message}`);
      }

      // Start polling for the rendered diagram
      await page.evaluate(() => window.__startPoll());

      // Wait for the viewer to finish rendering
      await page.waitForFunction(() => window.__renderComplete === true, { timeout: 30000 });

      // Check rendering succeeded
      const viewerOk = await page.evaluate(() => window.__renderWidth > 0);
      if (!viewerOk) {
        throw new Error("draw.io viewer failed to load or render (check network access)");
      }

      // Take element screenshot of just the diagram div for exact bounds
      const containerHandle = await page.$('.mxgraph');
      let pngBuffer;

      if (containerHandle) {
        pngBuffer = await containerHandle.screenshot({ type: "png" });
      } else {
        // Fallback: full-page screenshot
        const dims = await page.evaluate(() => ({
          w: Math.ceil(window.__renderWidth),
          h: Math.ceil(window.__renderHeight)
        }));
        pngBuffer = await page.screenshot({
          type: "png",
          clip: { x: 0, y: 0, width: dims.w + 20, height: dims.h + 20 },
        });
      }

      writeFileSync(output, pngBuffer);
      console.log(`  -> ${basename(output)} (${(pngBuffer.length / 1024).toFixed(0)} KB)`);

      await page.close();
    } catch (err) {
      console.error(`  Error rendering ${basename(input)}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });
