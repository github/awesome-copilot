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
 * Requirements: real current Chrome, HEADED (headless exposes no modelContext in
 * the supported verification path), a virtual display when needed, and a dedicated
 * user-data directory. Enumeration/execution uses the production
 * document.modelContext.getTools()/executeTool() surface (Chrome 2026-07+).
 * Alternative harness: Puppeteer's first-class WebMCP API (pptr.dev/guides/webmcp).
 */
import { chromium, expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — shared JS helper; inlined copies live inside page.evaluate (browser boundary)
import { parseInputSchema } from './webmcp-compat.js';
import { openMutationJournal, type MutationJournal } from './mutation-journal.js';

test.describe.configure({ mode: 'serial', retries: 0 });

function requiredEnv(name: 'WEBMCP_BASE_URL' | 'WEBMCP_PROFILE_DIR'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required; do not pin a host port or profile path in the spec`);
  return value;
}

const BASE_URL = requiredEnv('WEBMCP_BASE_URL');
const PROFILE_DIR = requiredEnv('WEBMCP_PROFILE_DIR');
const MANIFEST_PATH = fileURLToPath(new URL('./manifest.json', import.meta.url));

let context: BrowserContext | undefined;
let page: Page;
let mutationJournal: MutationJournal | undefined;
type ExecuteInputMode = 'object' | 'json-string';
let executeInputMode: ExecuteInputMode | undefined;

test.beforeAll(async () => {
  // The helper acquires the permanent manifest.lock sidecar before its first
  // manifest read and holds it through every dispatch, cleanup and settlement.
  mutationJournal = await openMutationJournal({ manifestPath: MANIFEST_PATH });
  if (mutationJournal.unresolved.length > 0) {
    const ids = mutationJournal.unresolved.map(({ executionId }) => executionId).join(', ');
    await mutationJournal.close();
    mutationJournal = undefined;
    throw new Error(`reconcile unresolved mutation executions before running the harness: ${ids}`);
  }
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',
      headless: false,
      args: ['--enable-features=WebMCP,WebMCPTesting'],
    });
    page = await context.newPage();
  } catch (error) {
    await mutationJournal.close();
    mutationJournal = undefined;
    throw error;
  }
});

test.afterAll(async () => {
  try {
    await context?.close();
  } finally {
    await mutationJournal?.close();
  }
});

/** Enumerate registered tools; older native builds may stringify JSON Schema while current builds return objects — handle both. */
async function listTools(p: Page): Promise<
  Array<{
    name: string;
    inputSchema?: string | object;
    annotations?: {
      readOnlyHint?: boolean;
      untrustedContentHint?: boolean;
      consequentialHint?: boolean;
    };
  }>
> {
  return p.evaluate(async () => {
    const mc = (document as any).modelContext;
    if (mc?.getTools) return mc.getTools();
    throw new Error('No document.modelContext enumeration surface — insecure origin, headless/wrong Chrome, reused profile, or missing flag');
  });
}

/**
 * Probe the browser contract with a temporary, side-effect-free tool. Chrome
 * 150 requires JSON strings; the current CG draft and Chrome docs use objects.
 * Real application tools are never retried to avoid duplicating mutations.
 */
async function detectExecuteInputMode(p: Page): Promise<ExecuteInputMode> {
  return p.evaluate(async () => {
    const mc = (document as any).modelContext;
    if ((mc as any)?.__webmcpStubObjectMode) return 'object';
    if (!mc?.registerTool || !mc?.getTools || !mc?.executeTool) {
      throw new Error('No complete document.modelContext execution surface for capability probe');
    }
    const controller = new AbortController();
    const name = `webmcpify_input_probe_${crypto.randomUUID().replaceAll('-', '')}`;
    const probeState = { calls: 0 };
    await mc.registerTool({
      name,
      description: 'Side-effect-free verification of the browser executeTool input contract.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      async execute() { probeState.calls += 1; return 'webmcpify-input-probe'; },
    }, { signal: controller.signal });
    try {
      const tool = (await mc.getTools()).find((candidate: { name: string }) => candidate.name === name);
      if (!tool) throw new Error('WebMCP input-contract probe did not register');
      try {
        await mc.executeTool(tool, {});
        if (Number(probeState.calls) !== 1) throw new Error('Object-input probe did not execute exactly once');
        return 'object';
      } catch (error) {
        if (Number(probeState.calls) !== 0) throw error;
        await mc.executeTool(tool, '{}');
        if (Number(probeState.calls) !== 1) throw new Error('JSON-string input probe did not execute exactly once');
        return 'json-string';
      }
    } finally {
      controller.abort();
    }
  });
}

/**
 * Execute a tool. Contract (Chrome): resolves to a string result, or null when the
 * execution navigated; execution/validation failures REJECT — assert with
 * expect(...).rejects where a failure is the expected outcome.
 */
async function executeTool(p: Page, name: string, args: object): Promise<string | null> {
  executeInputMode ??= await detectExecuteInputMode(p);
  return p.evaluate(
    async ({ name, args, inputMode }) => {
      // inline helpers: page.evaluate cannot close over outer imports — keep in sync with webmcp-compat.js
      const normalizeResult = (r: unknown) => (r == null ? null : typeof r === 'string' ? (r as string) : JSON.stringify(r));
      const mc = (document as any).modelContext;
      if (mc?.getTools) {
        const tools = await mc.getTools();
        const tool = tools.find((t: { name: string }) => t.name === name);
        if (!tool) throw new Error(`tool ${name} is not registered`);
        // Explicit adapter mode — a harmless probe chose the native shape.
        // - tool.execute(object): headless-era stub
        // - mc.__webmcpStubObjectMode + mc.executeTool(tool, object): spec-shaped stub (enumerated tool has no .execute)
        // - current native/spec mc.executeTool(tool, object)
        // - legacy Chrome mc.executeTool(tool, JSON string)
        // Real tools are never retried: a handler failure may follow a mutation.
        if (typeof tool?.execute === 'function') return normalizeResult(await tool.execute(args));
        if (mc.executeTool) {
          const input = inputMode === 'object' ? args : JSON.stringify(args);
          return normalizeResult(await mc.executeTool(tool, input));
        }
      }
      throw new Error('No document.modelContext execution surface — insecure origin, headless/wrong Chrome, reused profile, or missing flag');
    },
    { name, args, inputMode: executeInputMode },
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

test('verification origin is secure and WebMCP is available', async () => {
  await page.goto(BASE_URL);
  const probe = await page.evaluate(() => ({
    secureContext: window.isSecureContext,
    hasDocumentModelContext: !!(document as any).modelContext,
  }));
  expect(probe.secureContext, `Verification origin must be secure: ${BASE_URL}`).toBe(true);
  expect(
    probe.hasDocumentModelContext,
    'Use current headed Chrome, a dedicated profile, and enable chrome://flags/#enable-webmcp-testing',
  ).toBe(true);
  executeInputMode = await detectExecuteInputMode(page);
  test.info().annotations.push({
    type: 'webmcp-compatibility',
    description: `executeTool input mode: ${executeInputMode}`,
  });
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
    const schema = parseInputSchema(tool.inputSchema); // handles string, object, or undefined
    expect(schema.required).toContain('query'); // manifest: inputSchema
    // manifest: annotations — assert exactly what the manifest recorded
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.untrustedContentHint).toBe(true);
    // CG draft + current Chrome docs define consequentialHint, but Chrome 150
    // accepted it at registration without returning it from getTools(). Assert
    // native propagation when present; keep the registration object covered by
    // app/unit tests and report an omitted field as browser compatibility evidence.
    if (tool.annotations?.consequentialHint !== undefined) {
      expect(tool.annotations.consequentialHint).toBe(false);
    } else {
      test.info().annotations.push({
        type: 'webmcp-compatibility',
        description: 'Browser omitted consequentialHint from getTools(); last reproduced in Chrome 150',
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
    const args = {
      email: 'qa@example.test', // manifest: examples.valid
      message: '[webmcpify verification] harness test message',
    };
    // Persist `started` BEFORE dispatch. Any exception after this line leaves it
    // unresolved for authoritative read-path reconciliation on the next run.
    const execution = await mutationJournal!.beforeDispatch({
      tool: 'send_contact_message',
      contractRevision: 1, // manifest: contractRevision
      origin: BASE_URL, // manifest: app.verificationOrigin
      role: 'none', // manifest: auth fixture role
      fixtureRevision: 'contact-seed-v1', // manifest: app.authFixtures fixture revision
      arguments: args,
      evidence: '.webmcpify/evidence/send-contact-message.json',
    });
    // 1. Start the execution WITHOUT awaiting it (Chrome pauses it at the form).
    const pending = executeTool(page, 'send_contact_message', args);
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
    // manifest: cleanup — this UI action mutates too, so it gets its own durable
    // entry linked to the still-started parent. Replace selectors with the
    // manifest's concrete cleanup/read path when instantiating the template.
    const cleanup = await mutationJournal!.beforeDispatch({
      tool: 'cleanup:send_contact_message',
      manifestTool: 'send_contact_message',
      contractRevision: 1,
      origin: BASE_URL,
      role: 'none',
      fixtureRevision: 'contact-seed-v1',
      arguments: { email: 'qa@example.test' },
      evidence: '.webmcpify/evidence/send-contact-message-cleanup.json',
      parentExecutionId: execution.executionId,
    });
    await page.goto(`${BASE_URL}/admin/messages`); // manifest: cleanup read path
    const fixtureRow = page.getByRole('row', { name: /qa@example\.test/ });
    await expect(fixtureRow).toHaveCount(1); // independent read path proves the mutation before cleanup
    await fixtureRow.getByRole('button', { name: 'Delete' }).click();
    await expect(fixtureRow).toHaveCount(0); // independently prove cleanup
    await mutationJournal!.settle(cleanup.executionId, {
      outcome: 'fixture removed',
      evidence: '.webmcpify/evidence/send-contact-message-cleanup-settled.json',
    });
    await mutationJournal!.settle(execution.executionId, {
      outcome: 'effect verified and cleanup reconciled',
      evidence: '.webmcpify/evidence/send-contact-message-settled.json',
    });
  });

  test('rejects the invalid example without changing server state', async () => {
    expect(await waitForTool(page, 'send_contact_message')).toBe(true);
    const before = await page.getByRole('status', { name: 'Sent message count' }).innerText();
    const execution = await mutationJournal!.beforeDispatch({
      tool: 'send_contact_message',
      contractRevision: 1,
      origin: BASE_URL,
      role: 'none',
      fixtureRevision: 'contact-seed-v1',
      arguments: {}, // manifest: examples.invalid
      evidence: '.webmcpify/evidence/send-contact-message-invalid.json',
    });
    await expect(executeTool(page, 'send_contact_message', {})).rejects.toThrow();
    const after = await page.getByRole('status', { name: 'Sent message count' }).innerText();
    expect(after).toBe(before); // independent read path proves absence of an effect
    await mutationJournal!.settle(execution.executionId, {
      outcome: 'validation rejected; no effect observed',
      evidence: '.webmcpify/evidence/send-contact-message-invalid-settled.json',
    });
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
      expect(String(err)).not.toMatch(/No document\.modelContext|is not registered/);
    }
  });
});
