#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const playwrightVersion = '1.61.1';
const usage = 'Usage: node workbench.mjs --url <dev-url> [--manifest <path>] [--browser chromium|firefox|webkit] [--native]';
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const result = argv[index + 1];
  if (!result || result.startsWith('--')) throw new Error(`${flag} needs a value.`);
  return result;
};
if (argv.includes('--help')) {
  console.log(usage);
  process.exit(0);
}
const url = value('--url');
if (!url) {
  console.error(usage);
  process.exit(2);
}
const browserName = value('--browser', 'chromium');
if (!['chromium', 'firefox', 'webkit'].includes(browserName)) throw new Error(`Unsupported browser "${browserName}".`);
const native = argv.includes('--native');
if (native && browserName !== 'chromium') throw new Error('--native requires Chromium/Chrome.');

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

async function loadPlaywright() {
  const localRequire = createRequire(import.meta.url);
  try {
    return { playwright: localRequire('playwright'), resolveModule: localRequire.resolve };
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes("'playwright'")) throw error;
  }

  const scratch = join(tmpdir(), `webmcpify-workbench-playwright-${playwrightVersion}`);
  const scratchRequire = createRequire(join(scratch, 'package.json'));
  try {
    return { playwright: scratchRequire('playwright'), resolveModule: scratchRequire.resolve };
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes("'playwright'")) throw error;
  }

  await mkdir(scratch, { recursive: true });
  console.error(`Preparing temporary Playwright ${playwrightVersion} runtime outside the target project…`);
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
    'install', '--no-save', '--no-package-lock', `playwright@${playwrightVersion}`,
  ], { cwd: scratch, env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
  return { playwright: scratchRequire('playwright'), resolveModule: scratchRequire.resolve };
}

const loaded = await loadPlaywright();
const { chromium, firefox, webkit } = loaded.playwright;
const browserType = { chromium, firefox, webkit }[browserName];

const manifestPath = value('--manifest');
const manifest = manifestPath ? JSON.parse(await readFile(resolve(manifestPath), 'utf8')) : { tools: [] };
const source = await readFile(resolve(here, '..', 'templates', 'webmcp-workbench.js'), 'utf8');
const bootSource = `globalThis.__WEBMCPIFY_WORKBENCH__ = ${JSON.stringify({ manifest, open: true })};\n${source}`;
const launchOptions = {
  headless: false,
  ...(native ? { channel: 'chrome', args: ['--enable-features=WebMCP,WebMCPTesting'] } : {}),
};
let browser;
try {
  browser = await browserType.launch(launchOptions);
} catch (error) {
  const missingBundledBrowser = !native && /Executable doesn't exist|browserType\.launch: Executable/.test(String(error));
  if (!missingBundledBrowser) throw error;
  console.error(`Downloading the temporary ${browserName} browser runtime…`);
  await run(process.execPath, [loaded.resolveModule('playwright/cli'), 'install', browserName]);
  browser = await browserType.launch(launchOptions);
}
try {
  const context = await browser.newContext();
  await context.addInitScript({ content: bootSource });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[page] ${message.text()}`);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const evidence = await page.locator('#webmcpify-workbench').getAttribute('data-evidence');
  console.log(`WebMCP Workbench: ${url} · ${browserName} · ${evidence}`);
  console.log('Close the browser or press Ctrl+C to end the temporary session.');

  await new Promise((resolveDone) => {
    const done = () => resolveDone();
    browser.on('disconnected', done);
    process.once('SIGINT', done);
    process.once('SIGTERM', done);
  });
} finally {
  await browser.close().catch(() => {});
}
