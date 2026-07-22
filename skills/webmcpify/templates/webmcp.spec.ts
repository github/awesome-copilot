/**
 * webmcpify verification template — vendored from https://github.com/TueJon/webmcpify
 *
 * MIT License
 * Copyright (c) 2026 Jonas Tüchler
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software — keep this header when
 * copying this file into your project.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Full text: https://github.com/TueJon/webmcpify/blob/main/LICENSE
 *
 * The webmcpify skill instantiates one describe-block per manifest tool, filling
 * route/auth/examples/expect from .webmcpify/manifest.json. The example blocks
 * below show the complete patterns with REAL assertions — generated blocks must
 * assert, never comment out.
 *
 * Requirements: real Chrome, HEADED (WebMCP needs a visible tab — headless will
 * never work; use xvfb-run in CI). Enumeration/execution uses the production
 * document.modelContext.getTools()/executeTool() surface (Chrome 2026-07+), with a
 * probe fallback to the removed navigator.modelContextTesting for older builds.
 * Alternative harness: Puppeteer's first-class WebMCP API (pptr.dev/guides/webmcp).
 */
import { chromium, expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

const BASE_URL = process.env.WEBMCP_BASE_URL ?? 'http://localhost:5173';

let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chrome',
    headless: false,
    args: ['--enable-features=WebMCP,WebMCPTesting'],
  });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
});

/** Enumerate registered tools; inputSchema comes back as a STRING (JSON Schema). */
async function listTools(p: Page): Promise<
  Array<{
    name: string;
    inputSchema?: string;
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  }>
> {
  return p.evaluate(async () => {
    const mc = (document as any).modelContext ?? (navigator as any).modelContext;
    if (mc?.getTools) return mc.getTools();
    const legacy = (navigator as any).modelContextTesting; // removed 2026-07; older builds only
    if (legacy?.listTools) return legacy.listTools();
    throw new Error('No WebMCP enumeration surface — wrong Chrome build or flags');
  });
}

/**
 * Execute a tool. Contract (Chrome): resolves to a string result, or null when the
 * execution navigated; execution/validation failures REJECT — assert with
 * expect(...).rejects where a failure is the expected outcome.
 */
async function executeTool(p: Page, name: string, args: object): Promise<string | null> {
  return p.evaluate(
    async ({ name, args }) => {
      const mc = (document as any).modelContext ?? (navigator as any).modelContext;
      if (mc?.getTools && mc?.executeTool) {
        const tools = await mc.getTools();
        const tool = tools.find((t: { name: string }) => t.name === name);
        if (!tool) throw new Error(`tool ${name} is not registered`);
        return mc.executeTool(tool, JSON.stringify(args));
      }
      const legacy = (navigator as any).modelContextTesting;
      if (legacy?.executeTool) return legacy.executeTool(name, JSON.stringify(args));
      throw new Error('No WebMCP execution surface — wrong Chrome build or flags');
    },
    { name, args },
  );
}

/**
 * registerTool is ASYNC — a tool is not enumerable the instant the page loads.
 * Poll (or await a `toolchange` event) instead of asserting immediately.
 */
async function waitForTool(p: Page, name: string, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const tools = await listTools(p);
    if (tools.some((t) => t.name === name)) return true;
    if (Date.now() >= deadline) return false;
    await p.waitForTimeout(100);
  }
}

/** The modern surface exposes annotations; the legacy fallback does not. */
async function hasModernSurface(p: Page): Promise<boolean> {
  return p.evaluate(() => {
    const mc = (document as any).modelContext ?? (navigator as any).modelContext;
    return !!mc?.getTools;
  });
}

test('WebMCP is available in the test environment', async () => {
  await page.goto(BASE_URL);
  const available = await page.evaluate(
    () => !!(document as any).modelContext || !!(navigator as any).modelContext,
  );
  expect(available, 'Enable chrome://flags/#enable-webmcp-testing and use current Chrome').toBe(
    true,
  );
});

// ── Generated per manifest tool ──────────────────────────────────────────────
// Complete example for a read-only imperative tool. Fill route/examples/expect
// from the manifest entry; for `auth != none`, sign in with the recorded
// app.authFixtures fixture before the tool tests — once per role listed in `auth`.

test.describe('search_tickets', () => {
  test.beforeEach(async () => {
    // Navigate per TEST, not per describe — an earlier test may have navigated
    // away (executeTool returning null means exactly that).
    await page.goto(`${BASE_URL}/projects/demo/tickets`); // manifest: route
  });

  test('is registered with the expected schema and annotations', async () => {
    expect(await waitForTool(page, 'search_tickets')).toBe(true); // async registration — poll
    const tools = await listTools(page);
    const tool = tools.find((t) => t.name === 'search_tickets')!;
    const schema = JSON.parse(tool.inputSchema ?? '{}'); // stringified → parse first
    expect(schema.required).toContain('query'); // manifest: inputSchema
    if (await hasModernSurface(page)) {
      // manifest: annotations — assert exactly what the manifest recorded
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.untrustedContentHint).toBe(true);
    } else {
      // Legacy modelContextTesting fallback cannot enumerate annotations —
      // skip the assertion and record the gap in the report.
      test.info().annotations.push({
        type: 'webmcpify',
        description: 'annotations not enumerable on this Chrome build — assertion skipped',
      });
    }
  });

  test('executes the valid example and changes the UI', async () => {
    expect(await waitForTool(page, 'search_tickets')).toBe(true);
    // Capture the relevant UI state BEFORE executing — success must be a DELTA,
    // not mere visibility of something that was already on screen.
    const before = await page.getByRole('list', { name: 'Tickets' }).innerText();
    const out = await executeTool(page, 'search_tickets', { query: 'test' }); // manifest: examples.valid
    expect(out).not.toBeNull(); // null would mean "navigated" — not expected for this tool
    expect(out).not.toMatch(/^ERROR:/);
    await expect(page.getByRole('list', { name: 'Tickets' })).toBeVisible(); // manifest: expect.ui
    const after = await page.getByRole('list', { name: 'Tickets' }).innerText();
    expect(after).not.toBe(before); // the UI actually changed
  });

  test('rejects the invalid example with a self-correcting message', async () => {
    // Prove the tool is PRESENT first — otherwise this test can "pass" on a
    // rejection that merely means the tool never registered.
    expect(await waitForTool(page, 'search_tickets')).toBe(true);
    const out = await executeTool(page, 'search_tickets', {}); // manifest: examples.invalid
    expect(out).toMatch(/^ERROR:/); // imperative convention: resolves with "ERROR: ..."
    // Declarative tools instead REJECT on schema/validation failures — for those,
    // generate: await expect(executeTool(page, '<tool>', {})).rejects.toThrow();
  });
});

// Complete example for a MUTATING DECLARATIVE form tool. Chrome fills the form,
// then PAUSES the execution until a real submit interaction happens — awaiting
// executeTool alone deadlocks. Start it unawaited, wait for the agent-filled
// value, click submit, then await the result.

test.describe('send_contact_message', () => {
  test.beforeEach(async () => {
    // Navigate per test — a submit-navigating execution leaves the route.
    await page.goto(`${BASE_URL}/contact`); // manifest: route
  });

  test('executes via the concurrent submit-click pattern', async () => {
    expect(await waitForTool(page, 'send_contact_message')).toBe(true);
    // 1. Start the execution WITHOUT awaiting it (Chrome pauses it at the form).
    const pending = executeTool(page, 'send_contact_message', {
      email: 'qa@example.test', // manifest: examples.valid
      message: '[webmcpify verification] harness test message',
    });
    // 2. Wait until the agent-filled value is visible in the form.
    await expect(page.getByLabel('Email')).toHaveValue('qa@example.test');
    // 3. Perform the real submit interaction that resumes the paused execution.
    await page.getByRole('button', { name: 'Send' }).click();
    // 4. Now the promise settles.
    const out = await pending;
    if (out === null) {
      // null = the execution navigated (submit-navigating form) — assert the
      // destination instead of the return value. beforeEach restores the route.
      await expect(page).toHaveURL(/thank-you/); // manifest: expect.navigation
    } else {
      expect(out).not.toMatch(/^ERROR:/);
      expect(out).toContain('received'); // manifest: expect.result
    }
    // manifest: cleanup — mutating:"server" tools MUST undo the side effect here
    // (e.g. delete the test message via the UI's own admin path).
  });
});

// Complete example for a ZERO-PARAM READ tool with `examples.invalid` following
// the zero-param convention ({"unexpected": true}). Dual-outcome: rejecting the
// unexpected key OR resolving benignly (accept-and-ignore) are BOTH passes —
// what must never pass is a missing tool or a missing WebMCP surface.

test.describe('get_page_summary', () => {
  test.beforeEach(async () => {
    await page.goto(BASE_URL); // manifest: route
  });

  test('handles unexpected input without side effects (dual-outcome)', async () => {
    expect(await waitForTool(page, 'get_page_summary')).toBe(true); // presence FIRST
    try {
      const out = await executeTool(page, 'get_page_summary', { unexpected: true }); // manifest: examples.invalid
      // Resolved: must be benign — a normal result (readOnlyHint tool: no side
      // effect possible) or a self-correcting "ERROR: ..." string.
      expect(out).not.toBeNull();
    } catch (err) {
      // Rejected: acceptable only as a validation rejection — a missing surface
      // or unregistered tool is a real failure, not a pass.
      expect(String(err)).not.toMatch(/No WebMCP|is not registered/);
    }
  });
});
