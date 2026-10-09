/**
 * webmcpify Workbench — vendored from https://github.com/TueJon/webmcpify
 *
 * MIT License
 * Copyright (c) 2026 Jonas Tüchler
 *
 * Development-only, dependency-free WebMCP inspector. Load before the app entry
 * when portable simulation is needed. It never replaces an existing native
 * document.modelContext and always labels simulated evidence explicitly.
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
 */
(function webmcpifyWorkbench(global) {
  'use strict';

  const EMPTY_SCHEMA = { type: 'object', properties: {} };
  const state = { instance: null, simulatedContext: null };

  function parseSchema(raw) {
    if (!raw) return EMPTY_SCHEMA;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return EMPTY_SCHEMA; }
    }
    return raw;
  }

  function json(value) {
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
    }
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }

  function makeSimulationContext(doc) {
    const tools = new Map();
    const notify = () => doc.dispatchEvent(new Event('toolchange'));
    const context = {
      __webmcpStubObjectMode: true,
      async registerTool(tool, options = {}) {
        if (!tool || typeof tool.name !== 'string' || typeof tool.execute !== 'function') {
          throw new TypeError('Simulated WebMCP tools need a name and execute function.');
        }
        if (tools.has(tool.name)) throw new Error(`Tool "${tool.name}" is already registered.`);
        tools.set(tool.name, { public: { ...tool, execute: undefined }, execute: tool.execute });
        options.signal?.addEventListener('abort', () => {
          if (tools.delete(tool.name)) notify();
        }, { once: true });
        notify();
      },
      async getTools() {
        return Array.from(tools.values(), ({ public: tool }) => ({ ...tool }));
      },
      async executeTool(tool, input) {
        const registered = tools.get(tool?.name);
        if (!registered) throw new Error(`Tool "${tool?.name ?? 'unknown'}" is not registered.`);
        const args = typeof input === 'string' ? JSON.parse(input) : input;
        return registered.execute(args ?? {});
      },
    };
    return context;
  }

  function installContext(doc) {
    const nativeContext = doc.modelContext ?? global.navigator?.modelContext;
    if (nativeContext) return { context: nativeContext, evidence: 'native', inputMode: null };
    const context = makeSimulationContext(doc);
    try {
      Object.defineProperty(doc, 'modelContext', { configurable: true, value: context });
    } catch {
      doc.modelContext = context;
    }
    state.simulatedContext = context;
    return { context, evidence: 'simulated', inputMode: Promise.resolve('object') };
  }

  async function detectExecuteInputMode(installed) {
    if (installed.inputMode) return installed.inputMode;
    installed.inputMode = (async () => {
      const context = installed.context;
      const controller = new AbortController();
      const name = `webmcpify_input_probe_${global.crypto.randomUUID().replaceAll('-', '')}`;
      let calls = 0;
      await context.registerTool({
        name,
        description: 'Side-effect-free verification of the browser executeTool input contract.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        async execute() { calls += 1; return 'webmcpify-input-probe'; },
      }, { signal: controller.signal });
      try {
        const tool = (await context.getTools()).find((candidate) => candidate.name === name);
        if (!tool) throw new Error('WebMCP input-contract probe did not register.');
        try {
          await context.executeTool(tool, {});
          if (calls !== 1) throw new Error('Object-input probe did not execute exactly once.');
          return 'object';
        } catch (error) {
          if (calls !== 0) throw error;
          await context.executeTool(tool, '{}');
          if (calls !== 1) throw new Error('JSON-string input probe did not execute exactly once.');
          return 'json-string';
        }
      } finally {
        controller.abort();
      }
    })();
    return installed.inputMode;
  }

  function removeSimulatedContext(doc, installed) {
    if (installed.evidence !== 'simulated' || state.simulatedContext !== installed.context) return;
    if (doc.modelContext === installed.context) {
      try { delete doc.modelContext; } catch { /* non-configurable host property */ }
    }
    state.simulatedContext = null;
  }

  const expectedManifestStatuses = new Set(['approved', 'integrated', 'verified', 'failed']);

  function normalizeExpected(raw) {
    const explicitSubset = Array.isArray(raw);
    const source = explicitSubset ? raw : raw?.tools;
    return (source ?? []).filter((tool) => tool && tool.id
      && (explicitSubset || expectedManifestStatuses.has(tool.status))).map((tool) => ({
      ...tool,
      name: tool.name ?? tool.id,
      inputSchema: parseSchema(tool.inputSchema),
    }));
  }

  function excludedManifestNames(raw) {
    if (Array.isArray(raw)) return new Set();
    return new Set((raw?.tools ?? []).filter((tool) => tool && tool.id
      && !expectedManifestStatuses.has(tool.status)).map((tool) => tool.name ?? tool.id));
  }

  function declarativeTools(doc) {
    return Array.from(doc.querySelectorAll('form[toolname]')).map((form) => {
      const properties = {};
      const required = [];
      for (const control of Array.from(form.elements)) {
        if (!control.name || control.disabled || ['submit', 'button', 'reset'].includes(control.type)) continue;
        const definition = { type: ['number', 'range'].includes(control.type) ? 'number' : control.type === 'checkbox' ? 'boolean' : 'string' };
        if (control instanceof global.HTMLSelectElement) definition.enum = Array.from(control.options, (option) => option.value);
        const description = control.getAttribute('toolparamdescription') ?? control.closest('fieldset')?.getAttribute('toolparamdescription');
        if (description) definition.description = description;
        properties[control.name] = definition;
        if (control.required) required.push(control.name);
      }
      return {
        name: form.getAttribute('toolname'),
        description: form.getAttribute('tooldescription') ?? '',
        inputSchema: { type: 'object', properties, ...(required.length ? { required } : {}) },
        annotations: { readOnlyHint: form.hasAttribute('toolautosubmit') },
        _declarativeForm: form,
      };
    }).filter((tool) => tool.name);
  }

  async function executeDeclarative(tool, args) {
    const form = tool._declarativeForm;
    for (const [name, value] of Object.entries(args)) {
      const control = form.elements.namedItem(name);
      if (!control) continue;
      if (control instanceof global.RadioNodeList) {
        control.value = String(value);
      } else if (control.type === 'checkbox') {
        control.checked = Boolean(value);
      } else {
        control.value = String(value);
      }
      const target = control instanceof global.RadioNodeList ? control[0] : control;
      target?.dispatchEvent(new Event('input', { bubbles: true }));
      target?.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (!form.reportValidity()) throw new Error('The simulated form arguments failed native HTML validation.');
    form.requestSubmit();
    return { ok: true, simulated: true, submitted: true };
  }

  function createWorkbench(options = {}, preinstalled) {
    if (!global.document?.documentElement) throw new Error('WebMCP Workbench needs a document.');
    const doc = global.document;
    const installed = preinstalled ?? installContext(doc);
    const expectedSource = options.expectedTools ?? options.manifest;
    const expected = normalizeExpected(expectedSource);
    const expectedByName = new Map(expected.map((tool) => [tool.name, tool]));
    const excludedByName = excludedManifestNames(expectedSource);
    const host = doc.createElement('div');
    host.id = 'webmcpify-workbench';
    host.dataset.evidence = installed.evidence;
    host.dataset.secureContext = String(global.isSecureContext === true);
    const root = host.attachShadow({ mode: 'open' });
    const css = styles();
    if ('adoptedStyleSheets' in root && global.CSSStyleSheet) {
      const sheet = new global.CSSStyleSheet();
      sheet.replaceSync(css);
      root.adoptedStyleSheets = [sheet];
    } else {
      const style = doc.createElement('style');
      style.textContent = css;
      root.append(style);
    }
    root.append(markup(doc, installed.evidence, global.isSecureContext === true));
    doc.documentElement.append(host);

    const $ = (selector) => root.querySelector(selector);
    const ui = {
      launcher: $('.launcher'), panel: $('.panel'), close: $('.close'), search: $('.search'),
      list: $('.tool-list'), select: $('.tool-select'), title: $('.tool-title'), meta: $('.tool-meta'),
      schema: $('.schema'), expected: $('.expected'), fields: $('.fields'), raw: $('.raw-input'), run: $('.run'),
      result: $('.result'), resultMeta: $('.result-meta'), live: $('.live'),
      confirm: $('.confirm'), confirmText: $('.confirm-text'), confirmRun: $('.confirm-run'),
      validExample: $('.valid-example'), invalidExample: $('.invalid-example'),
      history: $('.history-list'), historyEmpty: $('.history-empty'),
    };
    let tools = [];
    let selectedName = '';
    let pendingRun = null;
    let toolFingerprint = '';
    let fieldSchema = null;
    const history = [];

    function setOpen(open) {
      ui.panel.hidden = !open;
      ui.launcher.setAttribute('aria-expanded', String(open));
      if (open) { refresh(); requestAnimationFrame(() => (ui.search.offsetParent ? ui.search : ui.select).focus()); }
      else ui.launcher.focus();
    }

    function selected() { return tools.find((tool) => tool.name === selectedName); }

    function mutationLabel(tool) {
      const expectedTool = expectedByName.get(tool.name);
      if (expectedTool?.mutating === false) return 'Read only';
      if (expectedTool?.mutating === 'client') return 'Changes this browser';
      if (expectedTool?.mutating === 'server') return 'Changes server data';
      return 'Mutation unknown';
    }

    function statusLabel(tool) {
      if (tool._observed === false) return 'Expected only';
      if (excludedByName.has(tool.name)) return 'Excluded by manifest gate';
      if (!expectedByName.size) return 'Observed';
      const expectedTool = expectedByName.get(tool.name);
      if (!expectedTool) return 'Observed only';
      const schemaMatches = JSON.stringify(canonical(parseSchema(tool.inputSchema))) === JSON.stringify(canonical(expectedTool.inputSchema));
      const annotationsMatch = !expectedTool.annotations || JSON.stringify(canonical(tool.annotations ?? {})) === JSON.stringify(canonical(expectedTool.annotations));
      const descriptionMatches = !expectedTool.description || tool.description === expectedTool.description;
      return schemaMatches && annotationsMatch && descriptionMatches ? 'Observed + expected' : 'Contract differs';
    }

    function renderList() {
      const query = ui.search.value.trim().toLowerCase();
      const visible = tools.filter((tool) => `${tool.name} ${tool.description ?? ''}`.toLowerCase().includes(query));
      ui.list.replaceChildren(...visible.map((tool) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = `tool-row${tool.name === selectedName ? ' active' : ''}`;
        button.dataset.name = tool.name;
        button.setAttribute('aria-pressed', String(tool.name === selectedName));
        const name = doc.createElement('strong'); name.textContent = tool.name;
        const status = doc.createElement('span'); status.textContent = statusLabel(tool);
        button.append(name, status);
        return button;
      }));
      ui.select.replaceChildren(...tools.map((tool) => {
        const option = doc.createElement('option'); option.value = tool.name; option.textContent = tool.name;
        option.selected = tool.name === selectedName; return option;
      }));
      $('.empty').textContent = tools.length ? 'No tools match this search.' : 'Waiting for tools to register…';
      $('.empty').hidden = visible.length > 0;
    }

    function applyArguments(args) {
      const plainObject = args && typeof args === 'object' && !Array.isArray(args);
      const fieldsCanRepresent = fieldSchema && plainObject
        && Object.keys(args).every((name) => Object.hasOwn(fieldSchema, name));
      ui.fields.hidden = !fieldsCanRepresent || !Object.keys(fieldSchema ?? {}).length;
      ui.raw.hidden = Boolean(fieldsCanRepresent);
      if (!fieldsCanRepresent) {
        ui.raw.value = json(args ?? {});
        return;
      }
      for (const input of ui.fields.querySelectorAll('input, select')) {
        const definition = fieldSchema[input.name] ?? {};
        const value = Object.hasOwn(args, input.name) ? args[input.name] : definition.default;
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = value === undefined ? '' : String(value);
      }
    }

    function renderHistory(entry) {
      history.unshift(entry);
      history.splice(20);
      ui.historyEmpty.hidden = history.length > 0;
      ui.history.replaceChildren(...history.map((item) => {
        const row = doc.createElement('li');
        const heading = doc.createElement('div'); heading.className = 'history-heading';
        const name = doc.createElement('strong'); name.textContent = item.name;
        const meta = doc.createElement('span'); meta.textContent = `${item.status} · ${item.duration} ms`;
        const output = doc.createElement('pre'); output.textContent = json({ arguments: item.args, result: item.result });
        heading.append(name, meta); row.append(heading, output); return row;
      }));
    }

    function fieldFor(name, definition, required) {
      const label = doc.createElement('label'); label.className = 'field';
      const caption = doc.createElement('span');
      caption.textContent = `${name}${required ? ' *' : ''}`;
      let input;
      if (Array.isArray(definition.enum)) {
        input = doc.createElement('select');
        for (const value of definition.enum) {
          const option = doc.createElement('option'); option.value = String(value); option.textContent = String(value);
          input.append(option);
        }
      } else {
        input = doc.createElement('input');
        input.type = definition.type === 'number' || definition.type === 'integer' ? 'number' : definition.type === 'boolean' ? 'checkbox' : 'text';
        if (definition.default !== undefined && input.type !== 'checkbox') input.value = String(definition.default);
        if (input.type === 'checkbox') input.checked = Boolean(definition.default);
      }
      input.name = name; input.required = required; input.dataset.type = definition.type ?? 'string';
      if (definition.description) input.setAttribute('aria-description', definition.description);
      label.append(caption, input);
      return label;
    }

    function renderDetail() {
      const tool = selected();
      if (!tool) return;
      const schema = parseSchema(tool.inputSchema);
      ui.title.textContent = tool.name;
      ui.meta.textContent = `${mutationLabel(tool)} · ${statusLabel(tool)}`;
      ui.schema.textContent = json(schema);
      const expectedTool = expectedByName.get(tool.name);
      ui.expected.textContent = expectedTool ? json({
        description: expectedTool.description,
        inputSchema: expectedTool.inputSchema,
        annotations: expectedTool.annotations,
        mutating: expectedTool.mutating,
      }) : 'Not present in the approved manifest.';
      const properties = schema.properties ?? {};
      const supported = Object.entries(properties).every(([, value]) => ['string', 'number', 'integer', 'boolean'].includes(value?.type ?? 'string'));
      fieldSchema = supported ? properties : null;
      ui.fields.replaceChildren(...Object.entries(properties).map(([name, definition]) => fieldFor(name, definition, schema.required?.includes(name))));
      const examples = expectedTool?.examples ?? {};
      const hasValid = Object.hasOwn(examples, 'valid');
      const hasInvalid = Object.hasOwn(examples, 'invalid') && examples.invalid !== null;
      ui.validExample.hidden = !hasValid;
      ui.invalidExample.hidden = !hasInvalid;
      applyArguments(hasValid ? examples.valid : {});
      ui.result.textContent = 'Run the tool to inspect its structured result.';
      ui.resultMeta.textContent = 'Not run';
      ui.run.textContent = `Run ${tool.name}`;
      ui.run.disabled = tool._observed === false || excludedByName.has(tool.name);
    }

    function readArguments() {
      if (!ui.raw.hidden) return JSON.parse(ui.raw.value || '{}');
      const output = {};
      for (const input of ui.fields.querySelectorAll('input, select')) {
        if (input.type === 'checkbox') output[input.name] = input.checked;
        else if (input.value !== '') output[input.name] = input.dataset.type === 'number' || input.dataset.type === 'integer' ? Number(input.value) : input.value;
      }
      return output;
    }

    async function execute() {
      const tool = selected();
      if (!tool || tool._observed === false || excludedByName.has(tool.name)) return;
      ui.run.disabled = true;
      ui.resultMeta.textContent = 'Running…';
      const started = performance.now();
      let args;
      try {
        args = readArguments();
        const inputMode = await detectExecuteInputMode(installed);
        const result = tool._declarativeForm
          ? await executeDeclarative(tool, args)
          : await installed.context.executeTool(tool, inputMode === 'object' ? args : JSON.stringify(args));
        ui.result.textContent = json(result);
        const duration = Math.round(performance.now() - started);
        ui.resultMeta.textContent = `Succeeded · ${duration} ms`;
        ui.live.textContent = `${tool.name} succeeded.`;
        renderHistory({ name: tool.name, status: 'Succeeded', duration, args, result });
      } catch (error) {
        const duration = Math.round(performance.now() - started);
        ui.result.textContent = error?.stack ?? String(error);
        ui.resultMeta.textContent = `Failed · ${duration} ms`;
        ui.live.textContent = `${tool.name} failed.`;
        renderHistory({ name: tool.name, status: 'Failed', duration, args, result: error?.message ?? String(error) });
      } finally {
        const current = selected();
        ui.run.disabled = !current || current._observed === false || excludedByName.has(current.name);
      }
    }

    function requestRun() {
      const tool = selected();
      if (!tool) return;
      if (mutationLabel(tool) === 'Read only') return execute();
      ui.confirmText.textContent = `${tool.name} may change application state. Run it once with the visible arguments?`;
      pendingRun = execute;
      ui.confirm.showModal();
    }

    async function refresh() {
      let observed = [];
      try { observed = await installed.context.getTools(); } catch (error) { ui.live.textContent = `Could not enumerate tools: ${error}`; }
      const observedNames = new Set(observed.map((tool) => tool.name));
      const portableForms = installed.evidence === 'simulated' ? declarativeTools(doc) : [];
      const registeredNames = new Set(observedNames);
      const uniqueForms = portableForms.filter((tool) => !registeredNames.has(tool.name));
      for (const tool of uniqueForms) registeredNames.add(tool.name);
      const nextTools = [
        ...observed.map((tool) => ({ ...tool, inputSchema: parseSchema(tool.inputSchema), _observed: true })),
        ...uniqueForms.map((tool) => ({ ...tool, _observed: true })),
        ...expected.filter((tool) => !registeredNames.has(tool.name)).map((tool) => ({ ...tool, _observed: false })),
      ];
      const nextFingerprint = JSON.stringify(nextTools.map((tool) => [tool.name, tool.description, tool.inputSchema, tool.annotations, tool._observed]));
      if (nextFingerprint === toolFingerprint) return;
      toolFingerprint = nextFingerprint;
      tools = nextTools;
      if (!tools.some((tool) => tool.name === selectedName)) selectedName = tools[0]?.name ?? '';
      renderList();
      if (selectedName) renderDetail();
      else {
        ui.title.textContent = 'No tools yet';
        ui.meta.textContent = 'Waiting for registration';
        ui.run.textContent = 'Run tool';
        ui.run.disabled = true;
      }
      $('.count').textContent = String(observed.length + uniqueForms.length);
    }

    ui.launcher.addEventListener('click', () => setOpen(ui.panel.hidden));
    ui.close.addEventListener('click', () => setOpen(false));
    ui.search.addEventListener('input', renderList);
    ui.list.addEventListener('click', (event) => {
      const row = event.target.closest('.tool-row'); if (!row) return;
      selectedName = row.dataset.name; renderList(); renderDetail();
    });
    ui.select.addEventListener('change', () => { selectedName = ui.select.value; renderList(); renderDetail(); });
    ui.run.addEventListener('click', requestRun);
    ui.validExample.addEventListener('click', () => applyArguments(expectedByName.get(selectedName)?.examples?.valid));
    ui.invalidExample.addEventListener('click', () => applyArguments(expectedByName.get(selectedName)?.examples?.invalid));
    ui.confirm.addEventListener('close', () => { pendingRun = null; });
    ui.confirmRun.addEventListener('click', () => { const run = pendingRun; pendingRun = null; ui.confirm.close(); run?.(); });
    doc.addEventListener('toolchange', refresh);
    installed.context.addEventListener?.('toolchange', refresh);
    const refreshTimer = global.setInterval(() => { if (!ui.panel.hidden) refresh(); }, 1000);
    const onKeydown = (event) => { if (event.key === 'Escape' && !ui.panel.hidden && !ui.confirm.open) setOpen(false); };
    global.addEventListener('keydown', onKeydown);

    refresh();
    if (options.open === true) setOpen(true);
    return {
      element: host,
      evidence: installed.evidence,
      open: () => setOpen(true),
      close: () => setOpen(false),
      refresh,
      destroy() {
        doc.removeEventListener('toolchange', refresh);
        installed.context.removeEventListener?.('toolchange', refresh);
        global.removeEventListener('keydown', onKeydown);
        global.clearInterval(refreshTimer);
        host.remove();
        removeSimulatedContext(doc, installed);
        state.instance = null;
      },
    };
  }

  function markup(doc, evidence, secureContext) {
    const native = evidence === 'native';
    const make = (tag, options = {}, ...children) => {
      const element = doc.createElement(tag);
      if (options.className) element.className = options.className;
      if (options.id) element.id = options.id;
      if (options.text !== undefined) element.textContent = options.text;
      if (options.hidden) element.hidden = true;
      for (const [name, value] of Object.entries(options.attributes ?? {})) element.setAttribute(name, value);
      element.append(...children);
      return element;
    };
    const button = (className, text, attributes = {}, hidden = false) => make('button', {
      className, text, hidden, attributes: { type: 'button', ...attributes },
    });
    const eyebrow = (text) => make('p', { className: 'eyebrow', text });
    const details = (summary, className, content) => make('details', { className }, make('summary', { text: summary }), content);
    const blockTitle = (title, trailing) => make('div', { className: 'block-title' }, make('h3', { text: title }), trailing);
    const fragment = doc.createDocumentFragment();
    fragment.append(button('launcher', 'w', {
      'aria-label': 'Open WebMCP Workbench', 'aria-expanded': 'false', 'aria-controls': 'wb-panel',
    }));

    const panel = make('section', {
      className: 'panel', id: 'wb-panel', hidden: true, attributes: { 'aria-label': 'WebMCP Workbench' },
    });
    panel.append(make('header', {},
      make('div', {}, eyebrow('WebMCPify'), make('h1', { text: 'Workbench' })),
      make('div', { className: 'header-actions' },
        make('span', { className: `evidence ${evidence}`, text: native ? 'Native' : 'Simulated' }),
        button('icon close', '×', { 'aria-label': 'Close Workbench' }),
      ),
    ));
    panel.append(make('div', {
      className: 'notice',
      text: `${native ? 'Calls use this browser’s WebMCP implementation.' : 'Portable preview only — this is not native browser proof.'} ${secureContext ? 'Secure context.' : 'Not a secure context; native WebMCP cannot register here.'}`,
    }));

    const mobileSelect = make('select', { className: 'tool-select', id: 'wb-select' });
    panel.append(make('div', { className: 'mobile-picker' },
      make('label', { text: 'Tool', attributes: { for: 'wb-select' } }), mobileSelect,
    ));
    const searchCount = make('span', {}, make('b', { className: 'count', text: '0' }), ' tools');
    const aside = make('aside', {},
      make('div', { className: 'search-wrap' }, make('input', {
        className: 'search', attributes: { type: 'search', placeholder: 'Find a tool', 'aria-label': 'Find a tool' },
      }), searchCount),
      make('div', { className: 'tool-list' }),
      make('p', { className: 'empty', text: 'Waiting for tools to register…' }),
    );
    const exampleActions = make('div', { className: 'example-actions' },
      button('valid-example', 'Use valid example', {}, true),
      button('invalid-example', 'Use invalid example', {}, true),
    );
    const argumentsBlock = make('section', { className: 'block' },
      blockTitle('Arguments', exampleActions),
      make('div', { className: 'fields' }),
      make('textarea', {
        className: 'raw-input', text: '{}', attributes: { spellcheck: 'false', 'aria-label': 'JSON arguments' },
      }),
    );
    const resultBlock = make('section', { className: 'block result-block' },
      blockTitle('Result', make('span', { className: 'result-meta', text: 'Not run' })),
      make('pre', { className: 'result', text: 'Run a tool to inspect its structured result.' }),
    );
    const history = details('Workbench call history', 'history', make('div', {},
      make('p', { className: 'history-empty', text: 'No calls in this session.' }),
      make('ol', { className: 'history-list' }),
    ));
    const main = make('main', {},
      make('div', { className: 'tool-heading' }, make('div', {}, eyebrow('Selected tool'),
        make('h2', { className: 'tool-title', text: 'No tools yet' }), make('p', { className: 'tool-meta' }))),
      argumentsBlock,
      details('Observed schema', '', make('pre', { className: 'schema' })),
      details('Expected contract', '', make('pre', { className: 'expected' })),
      resultBlock, history,
    );
    panel.append(make('div', { className: 'body' }, aside, main));
    panel.append(make('footer', {},
      make('span', { text: native ? 'Native verification' : 'Portable simulation' }),
      button('run', 'Run tool'),
    ));
    panel.append(make('p', { className: 'live', attributes: { 'aria-live': 'polite' } }));
    const confirmForm = make('form', { attributes: { method: 'dialog' } },
      eyebrow('Confirm mutation'), make('h2', { id: 'wb-confirm-title', text: 'Run this tool?' }),
      make('p', { className: 'confirm-text' }),
      make('div', {}, button('', 'Cancel', { value: 'cancel', type: 'submit' }), button('confirm-run', 'Run once', { value: 'default' })),
    );
    panel.append(make('dialog', {
      className: 'confirm', attributes: { 'aria-labelledby': 'wb-confirm-title' },
    }, confirmForm));
    fragment.append(panel);
    return fragment;
  }

  function styles() {
    return `
      :host{--p:#5f3dc4;--p2:#4d31a5;--button-ink:#fff;--bg:#fff;--surface:#f7f5fb;--ink:#26232d;--muted:#6d6777;--line:#e7e2ed;--good:#16845b;all:initial;color-scheme:light dark;font-family:"Familjen Grotesk","Segoe UI",system-ui,sans-serif;color:var(--ink)}
      *,*::before,*::after{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}.launcher{position:fixed;z-index:2147483646;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:48px;height:48px;border:0;border-radius:13px;background:var(--p);color:var(--button-ink);font:800 25px/1 ui-monospace,monospace;box-shadow:0 10px 28px #22163b3d}.launcher:focus-visible,.panel :focus-visible{outline:3px solid color-mix(in srgb,var(--p),white 35%);outline-offset:2px}.panel{position:fixed;z-index:2147483645;right:max(18px,env(safe-area-inset-right));bottom:max(78px,calc(env(safe-area-inset-bottom) + 70px));width:min(760px,calc(100vw - 36px));height:min(680px,calc(100dvh - 110px));background:var(--bg);border:0;border-radius:16px;box-shadow:0 24px 70px #22163b33;overflow:hidden}.panel[hidden]{display:none}.panel>header{height:74px;display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--line)}h1,h2,h3,p{margin:0}h1{font-size:20px;letter-spacing:-.02em}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font:700 10px/1.4 ui-monospace,monospace;color:var(--p)}.header-actions{display:flex;align-items:center;gap:10px}.evidence{padding:6px 9px;border:1px solid currentColor;border-radius:999px;font:700 11px/1 ui-monospace,monospace}.evidence.native{color:var(--good)}.evidence.simulated{color:var(--p)}.icon{width:44px;height:44px;border:0;background:transparent;color:var(--muted);font-size:27px}.notice{padding:8px 18px;background:var(--surface);border-bottom:1px solid var(--line);color:var(--muted);font-size:12px}.body{display:grid;grid-template-columns:250px 1fr;height:calc(100% - 174px)}aside{border-right:1px solid var(--line);overflow:auto}.search-wrap{position:sticky;top:0;padding:14px;background:var(--bg);border-bottom:1px solid var(--line)}.search{width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)}.search-wrap span{display:block;margin-top:8px;color:var(--muted);font:11px ui-monospace,monospace}.tool-list{padding:8px}.tool-row{width:100%;min-height:54px;padding:9px 10px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--ink);text-align:left}.tool-row strong,.tool-row span{display:block;overflow:hidden;text-overflow:ellipsis}.tool-row strong{font:700 12px ui-monospace,monospace}.tool-row span{margin-top:5px;color:var(--muted);font-size:11px}.tool-row:hover{background:var(--surface)}.tool-row.active{background:color-mix(in srgb,var(--p),transparent 91%);border-color:color-mix(in srgb,var(--p),transparent 70%)}.empty{padding:18px;color:var(--muted);font-size:12px}main{padding:18px;overflow:auto}.tool-heading{margin-bottom:16px}.tool-title{font:700 19px ui-monospace,monospace;overflow-wrap:anywhere}.tool-meta{margin-top:6px;color:var(--muted);font-size:12px}.block,details{margin-top:12px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}.block-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-bottom:1px solid var(--line)}h3,summary{font-size:13px}.example-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.example-actions button{min-height:32px;padding:0 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:11px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px}.field span{display:block;margin-bottom:6px;color:var(--muted);font-size:11px}.field input,.field select,.raw-input{width:100%;min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}.field input[type=checkbox]{width:44px}.raw-input{min-height:110px;border:0;border-radius:0 0 10px 10px;resize:vertical;font:12px/1.55 ui-monospace,monospace}details summary{display:flex;align-items:center;min-height:44px;padding:10px 12px;cursor:pointer}.schema,.expected,.result,.history-list pre{margin:0;padding:12px;max-height:190px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface);color:var(--ink);font:11px/1.55 ui-monospace,monospace}.result-block{margin-bottom:18px}.history-empty{padding:0 12px 12px;color:var(--muted);font-size:12px}.history-list{margin:0;padding:0;list-style:none}.history-list li{border-top:1px solid var(--line)}.history-heading{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;font-size:11px}.history-heading strong{overflow-wrap:anywhere}.history-heading span{color:var(--muted);white-space:nowrap}.panel>footer{position:absolute;left:250px;right:0;bottom:0;height:58px;display:flex;align-items:center;justify-content:space-between;padding:8px 18px;border-top:1px solid var(--line);background:var(--bg)}footer span{color:var(--muted);font:11px ui-monospace,monospace}.run,.confirm-run{min-height:44px;padding:0 16px;border:0;border-radius:9px;background:var(--p);color:var(--button-ink);font-weight:750}.run:hover,.confirm-run:hover{background:var(--p2)}.run:disabled{opacity:.5}.live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.confirm{max-width:380px;border:0;border-radius:14px;background:var(--bg);color:var(--ink);box-shadow:0 24px 70px #22163b4d}.confirm::backdrop{background:#17131f66}.confirm form{padding:6px}.confirm h2{margin-top:4px}.confirm-text{margin:12px 0 20px;color:var(--muted);line-height:1.45}.confirm form>div{display:flex;justify-content:flex-end;gap:8px}.confirm form button{min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)}.confirm form .confirm-run{border:0;background:var(--p);color:var(--button-ink)}.mobile-picker{display:none}
      @media(prefers-color-scheme:dark){:host{--bg:#1b1821;--surface:#25212c;--ink:#f5f1fa;--muted:#aaa2b5;--line:#3b3544;--p:#9b7af0;--p2:#aa8df5;--button-ink:#17121d;--good:#5ad4a4}}
      @media(max-width:640px){.launcher{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.launcher[aria-expanded=true]{display:none}.panel{inset:0;width:100vw;height:100dvh;border:0;border-radius:0;padding-top:env(safe-area-inset-top)}.panel>header{height:68px}.notice{padding:8px 14px}.mobile-picker{display:block;padding:10px 14px;border-bottom:1px solid var(--line)}.mobile-picker label{display:block;margin-bottom:5px;color:var(--muted);font-size:11px}.tool-select{width:100%;height:44px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}.body{display:block;height:calc(100% - 229px)}aside{display:none}main{height:100%;padding:14px}.fields{grid-template-columns:1fr}.panel>footer{left:0;height:70px;padding:9px 14px calc(9px + env(safe-area-inset-bottom))}.run{min-height:48px;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
      @media(prefers-reduced-motion:no-preference){.panel{animation:wb-in .16s ease-out}.launcher{transition:transform .15s ease}.launcher:hover{transform:translateY(-2px)}@keyframes wb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}
    `;
  }

  const api = {
    start(options = {}) {
      if (state.instance) return state.instance;
      if (!global.document) throw new Error('WebMCP Workbench needs a document.');
      const installed = installContext(global.document);
      if (!global.document.documentElement) {
        let cancelled = false;
        let resolveReady;
        const onReady = () => {
          if (!cancelled) state.instance = createWorkbench(options, installed);
          resolveReady(state.instance);
        };
        const pending = {
          evidence: installed.evidence,
          ready: new Promise((resolve) => { resolveReady = resolve; }),
          destroy() {
            cancelled = true;
            global.document.removeEventListener('DOMContentLoaded', onReady);
            removeSimulatedContext(global.document, installed);
            state.instance = null;
            resolveReady(null);
          },
        };
        global.document.addEventListener('DOMContentLoaded', onReady, { once: true });
        state.instance = pending;
        return pending;
      }
      state.instance = createWorkbench(options, installed);
      return state.instance;
    },
    stop() { state.instance?.destroy(); },
    parseSchema,
    formatResult: json,
    normalizeExpected,
    createSimulationContext: makeSimulationContext,
    detectExecuteInputMode,
  };
  global.WebMCPifyWorkbench = api;
  if (global.__WEBMCPIFY_WORKBENCH__) api.start(global.__WEBMCPIFY_WORKBENCH__);
})(globalThis);
