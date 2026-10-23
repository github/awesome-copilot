import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const original = await readFile(new URL('../templates/webmcp-workbench.js', import.meta.url), 'utf8');
// Expose the private dispatch boundary only in the test copy, to verify that a
// forged UI event or direct dispatch cannot bypass the disabled button.
const source = original.replace('      element: host,', '      testExecute: execute,\n      element: host,');
for (const transport of ['native', 'simulated']) {
  for (const surface of ['imperative', 'declarative']) {
    test(`${transport} ${surface}: read-only dispatch and fail-closed mutation boundary`, async () => {
      const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://app.example.test', runScripts: 'outside-only', pretendToBeVisual: true });
      const evaluate = (fn, args) => dom.window.eval(`(${fn.toString()})(${JSON.stringify(args) ?? ''})`);
      try {
        await evaluate(({ transport, surface }) => {
          window.calls = []; window.events = []; window.probes = 0;
          const classes = ['read', 'client', 'server', 'unknown', 'undeclared', 'denied', 'skipped'];
          window.entries = classes.map(name => ({ id: name, status: name === 'denied' ? 'rejected' : name === 'skipped' ? 'skipped' : 'integrated', ...(name === 'unknown' || name === 'undeclared' ? {} : { mutating: ['read', 'denied', 'skipped'].includes(name) ? false : name }), inputSchema: { type: 'object', properties: { q: { type: 'string' } } }, examples: { valid: { q: 'hello' } } }));
          window.entries.push({ id: 'absent', status: 'integrated', mutating: false });
          if (surface === 'declarative') {
            for (const name of classes) {
              const form = document.createElement('form'); form.setAttribute('toolname', name);
              form.innerHTML = '<input name="q"><button type="submit">Submit</button>';
              form.addEventListener('submit', e => { e.preventDefault(); calls.push(name); });
              for (const type of ['input', 'change']) form.addEventListener(type, () => events.push(name));
              document.body.append(form);
            }
          }
          if (transport === 'native') {
            const registry = new Map();
            document.modelContext = {
              async registerTool(tool, options = {}) { if (tool.name.startsWith('webmcpify_input_probe_')) probes++; registry.set(tool.name, tool); options.signal?.addEventListener('abort', () => registry.delete(tool.name)); },
              async getTools() { return [...registry.values()]; },
              async executeTool(tool, args) { return registry.get(tool.name).execute(args); },
            };
          }
        }, { transport, surface });
        dom.window.eval(source);
        await evaluate(async ({ transport, surface }) => {
          window.instance = WebMCPifyWorkbench.start({ manifest: { tools: entries.filter(e => e.id !== 'undeclared') }, open: true });
          if (surface === 'imperative' || transport === 'native') {
            for (const entry of entries.filter(e => e.id !== 'absent')) {
              await document.modelContext.registerTool({ name: entry.id, inputSchema: entry.inputSchema,
                ...(surface === 'declarative' ? { _declarativeForm: document.querySelector(`form[toolname="${entry.id}"]`) } : {}),
                execute: args => { calls.push(entry.id); return { ok: true, args }; } });
            }
          }
          // An observed tool absent from the manifest must also fail closed.
          await document.modelContext.registerTool({ name: 'outsider', annotations: { readOnlyHint: true }, execute: () => calls.push('outsider') });
          await instance.refresh();
        }, { transport, surface });
        const root = dom.window.document.querySelector('#webmcpify-workbench').shadowRoot;
        for (const name of ['client', 'server', 'unknown', 'undeclared', 'denied', 'skipped', 'absent', 'outsider']) {
          root.querySelector(`.tool-row[data-name="${name}"]`).click();
          assert.equal(root.querySelector('.run').disabled, true, name);
          await evaluate(async () => {
            const run = instance.element.shadowRoot.querySelector('.run');
            run.disabled = false; run.dispatchEvent(new Event('click'));
            await instance.testExecute();
          });
          assert.deepEqual(JSON.parse(JSON.stringify(await evaluate(() => ({ calls, events })))), { calls: [], events: [] }, name);
        }
        assert.equal(await evaluate(() => probes), 0, 'blocked tools must not reach input-contract probing');
        root.querySelector('.tool-row[data-name="read"]').click();
        assert.equal(root.querySelector('.run').disabled, false);
        root.querySelector('.run').click();
        for (let i = 0; i < 50 && !root.querySelector('.result-meta').textContent.includes('Succeeded'); i++) await new Promise(resolve => setTimeout(resolve, 10));
        assert.match(root.querySelector('.result-meta').textContent, /Succeeded/);
        assert.deepEqual(Array.from(await evaluate(() => calls)), ['read']);
        if (surface === 'declarative') assert.deepEqual(Array.from(await evaluate(() => events)), ['read', 'read']);
        assert.equal(root.querySelectorAll('dialog').length, 0);
        await evaluate(() => instance.destroy());
      } finally { dom.window.close(); }
    });
  }
}
