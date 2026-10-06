const params = new URLSearchParams(location.search);
const token = params.get('token') ?? '';

const forcedTheme = ['light', 'dark'].includes(params.get('theme')) ? params.get('theme') : null;
const systemLight = window.matchMedia('(prefers-color-scheme: light)');
const applyTheme = () => {
    const theme = forcedTheme ?? (systemLight.matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle('vscode-light', theme === 'light');
    document.body.classList.toggle('vscode-dark', theme === 'dark');
};
applyTheme();
systemLight.addEventListener('change', applyTheme);

const STEPS = ['specify', 'plan', 'tasks', 'implement'];
const STEP_LABELS = { specify: 'Specify', plan: 'Plan', tasks: 'Tasks', implement: 'Implement' };
const BADGE_LABELS = { completed: 'Done', 'in-progress': 'Running', 'not-started': 'Not started' };
const STEP_WHY = {
    plan: 'Writes plan.md: the approach, research and design for this spec.',
    tasks: 'Breaks the plan into tasks.md, phased by user story.',
    implement: 'Works through tasks.md in order and checks each task off.',
};
const STATUS_TIERS = {
    specifying: 'active', planning: 'active', tasking: 'active', implementing: 'active',
    draft: 'info', specified: 'info', planned: 'info', 'ready-to-implement': 'info',
    implemented: 'success', completed: 'done', archived: 'muted',
};
const SECONDARY = [
    ['status', 'Status', 'Ask for the resolved position and the next action'],
    ['resume', 'Resume', 'Pick the run back up where it stopped'],
    ['doctor', 'Doctor', 'Check the run health: unfinished steps, drift, missing files'],
    ['ask', 'Ask Copilot', 'Ask where this spec stands (read only)'],
];

const state = {
    snapshot: null,
    selected: null,
    detail: null,
    filter: 'active',
    query: '',
    tab: null,
    detailRequest: 0,
    workflow: null,
    install: { dismissed: false, open: false },
};

const $ = (id) => document.getElementById(id);
const els = {
    list: $('spec-list'),
    listEmpty: $('list-empty'),
    detail: $('detail'),
    layout: $('layout'),
    repoLine: $('repo-line'),
    live: $('live'),
    liveLabel: $('live-label'),
    search: $('search'),
    refresh: $('refresh'),
    toast: $('toast'),
    toastMsg: $('toast-msg'),
    toastActions: $('toast-actions'),
    toastPrompt: $('toast-prompt'),
    toastFile: $('toast-file'),
    newSpec: $('new-spec'),
    newSpecToggle: $('new-spec-toggle'),
    newSpecText: $('new-spec-text'),
    newSpecWorkflow: $('new-spec-workflow'),
    newSpecHint: $('new-spec-hint'),
    newSpecInstall: $('new-spec-install'),
};

function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
}

async function api(path, body) {
    const response = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'x-speckit-token': token },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
}

const TOAST_MS = 4000;

function hideToast() {
    clearTimeout(toast.timer);
    els.toast.classList.remove('is-visible');
}

function armToast() {
    clearTimeout(toast.timer);
    if (!toast.pinned) toast.timer = setTimeout(hideToast, TOAST_MS);
}

/** A short line that fades; with `prompt`, the message that was sent sits behind Show prompt and Copy, with the path of its instruction file. `pinned` keeps it up. */
function showToast({ message, prompt = null, file = null, pinned = false }) {
    toast.pinned = pinned;
    els.toastMsg.replaceChildren(...[message].flat());
    els.toastPrompt.textContent = prompt ?? '';
    els.toastPrompt.hidden = !(prompt && pinned);
    els.toastFile.replaceChildren(...(prompt && file ? fileLine(file) : []));
    els.toastFile.hidden = els.toastPrompt.hidden || !file;
    els.toastActions.replaceChildren(...(prompt ? promptActions(prompt, file) : []));
    els.toast.classList.add('is-visible');
    armToast();
}

function toast(...message) {
    showToast({ message });
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function copyButton(text, label = 'Copy') {
    const button = el('button', {
        class: 'btn btn-chip',
        type: 'button',
        onclick: async () => { button.textContent = await copyText(text) ? 'Copied' : 'Copy failed'; },
    }, label);
    return button;
}

function fileLine(file) {
    return ['Run instructions: ', el('code', {}, file), ' ', copyButton(file, 'Copy path')];
}

function promptActions(prompt, file) {
    const label = () => (els.toastPrompt.hidden ? 'Show prompt' : 'Hide prompt');
    const toggle = el('button', {
        class: 'btn btn-chip',
        type: 'button',
        'aria-controls': 'toast-prompt',
        'aria-expanded': String(!els.toastPrompt.hidden),
        onclick: () => {
            els.toastPrompt.hidden = !els.toastPrompt.hidden;
            els.toastFile.hidden = els.toastPrompt.hidden || !file;
            toggle.setAttribute('aria-expanded', String(!els.toastPrompt.hidden));
            toggle.textContent = label();
            if (!els.toastPrompt.hidden) {
                toast.pinned = true;
                armToast();
            }
        },
    }, label());
    const close = el('button', { class: 'btn btn-icon toast-close', type: 'button', 'aria-label': 'Dismiss', onclick: hideToast }, '×');
    return [toggle, copyButton(prompt), close];
}

async function reportSend({ prompt, sent, instructionsFile: file = null }, what = 'your question') {
    if (sent) {
        const command = prompt.split(/\s/, 1)[0];
        showToast({ message: command.startsWith('/') ? ['Sent ', el('code', {}, command), ' to the chat'] : `Sent ${what} to the chat`, prompt, file });
        return;
    }
    const copied = await copyText(prompt);
    showToast({
        message: copied ? 'No chat session here, so the prompt was copied. Paste it into the chat.' : 'No chat session here. Copy the prompt and paste it into the chat.',
        prompt,
        file,
        pinned: true,
    });
}

const INSTALL_DISMISSED = 'speckit-install-hint-dismissed';
try {
    state.install.dismissed = sessionStorage.getItem(INSTALL_DISMISSED) === '1';
} catch { /* no storage: the line stays dismissible for this page */ }

function refreshInstallHints() {
    renderSpecifyChoices();
    if (state.detail) renderDetail();
}

async function askInstall(button) {
    button.disabled = true;
    try {
        await reportSend(await api('/api/install', {}), 'the install request');
    } catch (error) {
        toast(`Could not send: ${error.message}`);
    } finally {
        button.disabled = false;
    }
}

const hintNodes = {};

/** The install line for one place on the page, the same node for as long as it says the same thing, so a redraw keeps a "Copied" in it. */
function installHint(place) {
    const command = state.snapshot?.specify?.installCommand;
    if (!command || state.install.dismissed) return null;
    const key = `${command}\n${state.install.open}`;
    if (hintNodes[place]?.key !== key) hintNodes[place] = { key, node: buildInstallHint(command) };
    return hintNodes[place].node;
}

/** One quiet line, shown only where SpecKit Companion is not installed, that opens to the install command. */
function buildInstallHint(command) {
    const { open } = state.install;
    return el('div', { class: 'install-hint' },
        el('p', { class: 'install-hint__line' },
            'SpecKit Companion is not installed in this project, so the standard Spec Kit commands run. ',
            el('button', {
                class: 'btn-link',
                type: 'button',
                'aria-expanded': String(open),
                onclick: () => {
                    state.install.open = !open;
                    refreshInstallHints();
                },
            }, 'Install it'),
            el('button', {
                class: 'btn btn-icon install-hint__dismiss',
                type: 'button',
                'aria-label': 'Dismiss the install note',
                onclick: () => {
                    state.install.dismissed = true;
                    try {
                        sessionStorage.setItem(INSTALL_DISMISSED, '1');
                    } catch { /* dismissed for this page only */ }
                    refreshInstallHints();
                },
            }, '×')),
        open ? el('div', { class: 'install-hint__how' },
            el('code', {}, command),
            copyButton(command),
            el('button', { class: 'btn btn-chip', type: 'button', onclick: (e) => askInstall(e.currentTarget) }, 'Ask Copilot to install it')) : null);
}

els.toast.addEventListener('pointerenter', () => clearTimeout(toast.timer));
els.toast.addEventListener('pointerleave', armToast);
els.toast.addEventListener('focusin', () => clearTimeout(toast.timer));
els.toast.addEventListener('focusout', (event) => { if (!els.toast.contains(event.relatedTarget)) armToast(); });

function relativeTime(iso) {
    if (!iso) return '';
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'just now';
    const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];
    for (const [unit, size] of units) {
        if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
    }
    return 'just now';
}

function statusPill(spec) {
    const tier = spec.status ? STATUS_TIERS[spec.status] ?? 'info' : 'muted';
    return el('span', { class: `pill tier-${tier}`, title: spec.status ? `Status: ${spec.statusLabel}` : 'No .spec-context.json: position read from the files' }, spec.statusLabel);
}

function miniRail(steps) {
    return el('span', { class: 'mini-rail', role: 'img', 'aria-label': STEPS.map(s => `${STEP_LABELS[s]} ${BADGE_LABELS[steps[s]].toLowerCase()}`).join(', ') },
        STEPS.map(s => el('span', { dataset: { state: steps[s] }, title: `${STEP_LABELS[s]}: ${BADGE_LABELS[steps[s]]}` })));
}

function visibleSpecs() {
    const specs = state.snapshot?.specs ?? [];
    const q = state.query.trim().toLowerCase();
    return specs.filter(spec => {
        if (state.filter === 'active' && spec.done) return false;
        if (state.filter === 'done' && !spec.done) return false;
        if (!q) return true;
        return spec.name.toLowerCase().includes(q) || spec.title.toLowerCase().includes(q);
    });
}

function renderBoard() {
    const specs = state.snapshot?.specs ?? [];
    const active = specs.filter(s => !s.done).length;
    $('count-active').textContent = active;
    $('count-done').textContent = specs.length - active;
    $('count-all').textContent = specs.length;
    els.repoLine.textContent = `Spec board · ${state.snapshot.repoName} · ${active} active of ${specs.length}`;

    const shown = visibleSpecs();
    els.listEmpty.hidden = shown.length > 0;
    els.listEmpty.textContent = specs.length === 0
        ? 'No specs here yet. Use New spec to start one.'
        : 'No specs match.';
    els.list.replaceChildren(...shown.map(spec => el('li', {},
        el('button', {
            class: 'spec-card',
            type: 'button',
            'aria-current': spec.id === state.selected ? 'true' : 'false',
            dataset: { id: spec.id },
            onclick: () => select(spec.id, { pushView: true }),
        },
        el('span', { class: 'card-top' },
            spec.number ? el('span', { class: 'card-num' }, spec.number) : null,
            el('span', { class: 'sb-title', title: spec.title }, spec.title)),
        el('span', { class: 'card-meta' },
            statusPill(spec),
            miniRail(spec.steps),
            spec.tasks && spec.tasks.total > 0 ? el('span', { class: 'card-tasks', title: 'Tasks done' }, `${spec.tasks.checked}/${spec.tasks.total}`) : null,
            el('span', { class: 'card-time', title: spec.lastActivity ?? spec.updatedAt ?? '' }, relativeTime(spec.lastActivity ?? spec.updatedAt)))))));
}

/** The commands this spec's buttons send: its own workflow's family, else the workspace's. */
function specCommands() {
    return {
        commandSet: state.detail?.commandSet ?? state.snapshot.commandSet,
        commands: state.detail?.commands ?? state.snapshot.commands,
    };
}

function nextAction(spec) {
    const { commands } = specCommands();
    const running = STEPS.find(s => spec.steps[s] === 'in-progress');
    if (running && running !== 'specify') {
        return { title: `${STEP_LABELS[running]} is running`, why: 'Watch the pipeline move here, or pick the run back up if it stopped.', command: commands.includes('resume') ? 'resume' : running, label: commands.includes('resume') ? 'Resume' : `Run ${running}` };
    }
    const pending = ['plan', 'tasks', 'implement'].find(s => spec.steps[s] !== 'completed');
    if (pending) {
        return { title: `Next: ${STEP_LABELS[pending]}`, why: STEP_WHY[pending], command: pending, label: `Run ${pending}` };
    }
    if (!spec.done && commands.includes('mark-complete')) {
        return { title: 'Every step is done', why: 'Mark the spec complete to close the run and fold it into living specs.', command: 'mark-complete', label: 'Mark complete' };
    }
    return { title: 'This spec is finished', why: 'Every step ran. Ask the doctor if anything looks off.', command: commands.includes('doctor') ? 'doctor' : null, label: 'Run doctor' };
}

async function run(command, button) {
    const spec = state.detail?.spec;
    if (!spec) return;
    button.disabled = true;
    try {
        const result = await api('/api/run', { spec: spec.id, command });
        if (result.sent) {
            button.classList.add('sent');
            setTimeout(() => button.classList.remove('sent'), 2400);
        }
        await reportSend(result);
    } catch (error) {
        toast(`Could not send: ${error.message}`);
    } finally {
        button.disabled = false;
    }
}

function renderRail(steps) {
    return el('ol', { class: 'rail', 'aria-label': 'Pipeline' }, STEPS.map((step, i) => el('li', { dataset: { state: steps[step] } },
        el('span', { class: 'rail-node', 'aria-hidden': 'true' }, steps[step] === 'completed' ? '✓' : String(i + 1)),
        el('span', { class: 'sb-rail-label' }, STEP_LABELS[step]),
        el('span', { class: 'rail-state' }, BADGE_LABELS[steps[step]]),
        el('span', { class: 'sr-only' }, `: ${BADGE_LABELS[steps[step]]}`))));
}

function renderNext(spec) {
    const next = nextAction(spec);
    const { commandSet, commands } = specCommands();
    const primary = next.command
        ? el('button', { class: 'btn btn-primary', type: 'button', onclick: (e) => run(next.command, e.currentTarget) }, next.label)
        : null;
    const more = SECONDARY
        .filter(([command]) => command === 'ask' || commands.includes(command))
        .filter(([command]) => command !== next.command && !(command === 'resume' && spec.done))
        .map(([command, label, title]) => el('button', { class: 'btn btn-chip', type: 'button', title, onclick: (e) => run(command, e.currentTarget) }, label));
    const pattern = state.detail?.commandHint ?? (commandSet === 'companion' ? '/speckit.companion.<step>' : '/speckit.<step>');
    const hint = installHint('card');
    const stockNote = commandSet === 'companion' || hint
        ? null
        : state.snapshot.commandSet === 'companion' ? ' This spec uses the Spec Kit workflow, so it runs the standard commands.' : ' Stock Spec Kit commands: SpecKit Companion is not installed in this workspace.';
    return el('section', { class: 'next', 'aria-label': 'Next step' },
        el('div', { class: 'next-main' },
            el('div', { class: 'next-copy' }, el('p', { class: 'next-title' }, next.title), el('p', { class: 'next-why' }, next.why)),
            primary),
        el('div', { class: 'next-more' }, more),
        el('p', { class: 'command-hint' }, 'Buttons send ', el('code', {}, `${pattern} ${spec.id}`), ' to the chat.',
            stockNote ? el('span', { class: 'command-hint__stock' }, stockNote) : null),
        hint);
}

function tabsFor(detail) {
    const tabs = detail.overviewHtml ? [{ id: 'overview', label: 'Overview' }] : [];
    tabs.push(...detail.documents.map(doc => ({
        id: `doc:${doc.type}`,
        label: doc.label,
        count: doc.type === 'tasks' && detail.spec.tasks ? `${detail.spec.tasks.checked}/${detail.spec.tasks.total}` : null,
    })));
    for (const step of ['plan', 'tasks']) {
        if (!detail.documents.some(d => d.type === step)) tabs.push({ id: `missing:${step}`, label: STEP_LABELS[step], missing: true });
    }
    tabs.push({ id: 'activity', label: 'Activity', count: detail.history.length ? String(detail.history.length) : null });
    return tabs;
}

function viewerScope(...children) {
    return el('div', { class: 'viewer-scope' }, el('main', { class: 'content-area' }, children));
}

function renderPanel(detail, tabId) {
    if (tabId === 'activity') return renderActivity(detail);
    if (tabId === 'overview') {
        const dossier = el('div');
        dossier.innerHTML = detail.overviewHtml;
        return viewerScope(dossier.firstElementChild ?? dossier);
    }
    if (tabId.startsWith('missing:')) {
        const step = tabId.slice(8);
        return el('div', { class: 'doc-missing' }, `No ${step}.md yet. `, step === 'plan' ? 'Run plan to write it.' : 'Run tasks to write it.');
    }
    const doc = detail.documents.find(d => `doc:${d.type}` === tabId);
    const body = el('div', { id: 'markdown-content', dataset: { doc: doc?.type ?? '' } });
    body.innerHTML = doc?.html ?? '';
    return viewerScope(body);
}

function historyLine(entry) {
    const step = STEP_LABELS[entry.step] ?? entry.step;
    if (entry.task) return [el('strong', {}, entry.task), entry.kind === 'complete' ? ' done' : ' started'];
    if (entry.substep) return [el('strong', {}, step), ` · ${entry.substep}`];
    return [el('strong', {}, step), entry.kind === 'complete' ? ' finished' : ' started'];
}

function renderActivity(detail) {
    if (!detail.history.length) {
        return el('div', { class: 'doc-missing' }, detail.spec.hasContext ? 'No history recorded yet.' : 'No run record. This spec was written without SpecKit Companion capture.');
    }
    const entries = [...detail.history].reverse().slice(0, 80);
    return el('ol', { class: 'timeline', 'aria-label': 'Run history, newest first' }, entries.map(entry => el('li', { dataset: { kind: entry.kind ?? '' } },
        el('span', { class: 'tl-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'tl-text' }, historyLine(entry), entry.by ? el('span', { class: 'tl-by' }, ` · by ${entry.by}`) : null),
        el('time', { class: 'tl-time', datetime: entry.at, title: new Date(entry.at).toLocaleString() }, relativeTime(entry.at)))));
}

function renderDetail() {
    const detail = state.detail;
    if (!detail) {
        els.detail.replaceChildren(el('div', { class: 'detail-empty' },
            el('p', {}, 'Pick a spec to see its pipeline, documents and history.')));
        return;
    }
    const { spec } = detail;
    document.body.dataset.hasSpecContext = spec.hasContext ? 'true' : 'false';
    const tabs = tabsFor(detail);
    if (!tabs.some(t => t.id === state.tab)) {
        const preferred = spec.steps.implement === 'in-progress' ? 'doc:tasks' : detail.overviewHtml ? 'overview' : 'doc:spec';
        state.tab = tabs.some(t => t.id === preferred) ? preferred : tabs[0].id;
    }
    const scrollTop = els.detail.scrollTop;
    const head = el('div', {},
        el('button', { class: 'btn btn-quiet back', type: 'button', onclick: () => showView('board') }, '← All specs'),
        el('p', { class: 'eyebrow' }, spec.id, spec.branch ? `  ·  ${spec.branch}` : ''),
        el('h2', {}, spec.title),
        el('div', { class: 'head-pills' },
            statusPill(spec),
            spec.workflow ? el('span', { class: 'pill tier-muted', title: 'Workflow' }, spec.workflow) : null,
            spec.pendingReviews ? el('span', { class: 'pill tier-review', title: 'Review comments not applied yet' }, `${spec.pendingReviews} review ${spec.pendingReviews === 1 ? 'note' : 'notes'}`) : null,
            spec.lastActivity ? el('span', { class: 'pill tier-muted', title: spec.lastActivity }, `active ${relativeTime(spec.lastActivity)}`) : null));

    const tabBar = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Documents' }, tabs.map(tab => el('button', {
        class: 'tab',
        type: 'button',
        role: 'tab',
        'aria-selected': tab.id === state.tab ? 'true' : 'false',
        onclick: () => {
            state.tab = tab.id;
            renderDetail();
        },
    }, tab.label, tab.count ? el('span', { class: 'count' }, tab.count) : null)));

    els.detail.replaceChildren(el('div', { class: 'detail-inner' },
        head,
        renderRail(spec.steps),
        renderNext(spec),
        tabBar,
        el('div', { class: 'panel', role: 'tabpanel' }, renderPanel(detail, state.tab))));
    els.detail.scrollTop = scrollTop;
}

async function loadDetail() {
    if (!state.selected) {
        state.detail = null;
        renderDetail();
        return;
    }
    const request = ++state.detailRequest;
    try {
        const detail = await api(`/api/spec?id=${encodeURIComponent(state.selected)}`);
        if (request !== state.detailRequest) return;
        // The same detail under the same project facts, as after a scan that changed nothing shown: keep the nodes that are there.
        const { specify, commandSet, commands } = state.snapshot ?? {};
        const key = JSON.stringify([detail, specify, commandSet, commands]);
        if (state.detail && key === state.detailKey) return;
        state.detailKey = key;
        state.detail = detail;
    } catch {
        if (request !== state.detailRequest) return;
        state.detail = null;
        state.selected = null;
    }
    renderDetail();
}

function showView(view) {
    els.layout.dataset.view = view;
    if (view === 'detail') els.detail.focus({ preventScroll: true });
}

function select(id, { pushView = false, fromServer = false } = {}) {
    if (state.selected !== id) {
        state.selected = id;
        state.tab = null;
        els.detail.scrollTop = 0;
    }
    renderBoard();
    loadDetail();
    if (pushView) showView('detail');
    if (!fromServer) api('/api/focus', { spec: id }).catch(() => {});
}

const WORKFLOW_NOTES = {
    companion: 'Companion: the lean pipeline that records the run.',
    speckit: 'Spec Kit: the standard commands.',
    auto: 'Auto: runs every step without pausing.',
};

function renderSpecifyChoices() {
    const { specify } = state.snapshot;
    if (!specify) return;
    const current = specify.choices.find(c => c.id === state.workflow);
    if (!current || !current.available) state.workflow = specify.default;
    els.newSpecWorkflow.replaceChildren(...specify.choices.map(choice => el('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': choice.id === state.workflow ? 'true' : 'false',
        disabled: !choice.available,
        'aria-disabled': choice.available ? null : 'true',
        title: choice.reason ?? WORKFLOW_NOTES[choice.id],
        onclick: () => {
            state.workflow = choice.id;
            renderSpecifyChoices();
        },
    }, choice.label)));
    const hint = installHint('form');
    const blocked = specify.choices.find(c => !c.available);
    els.newSpecHint.textContent = blocked && !hint ? blocked.reason : WORKFLOW_NOTES[state.workflow];
    els.newSpecInstall.replaceChildren(...(hint ? [hint] : []));
    els.newSpecInstall.hidden = !hint;
}

function applySnapshot(snapshot) {
    const key = JSON.stringify({ ...snapshot, generatedAt: null });
    const same = key === state.snapshotKey;
    state.snapshotKey = key;
    state.snapshot = snapshot;
    if (same) return loadDetail();
    renderSpecifyChoices();
    if (state.selected && !snapshot.specs.some(s => s.id === state.selected)) state.selected = null;
    if (!state.selected && window.matchMedia('(min-width: 761px)').matches) {
        state.selected = snapshot.selected ?? snapshot.specs.find(s => !s.done)?.id ?? snapshot.specs[0]?.id ?? null;
    }
    renderBoard();
    loadDetail();
}

function connect() {
    const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    source.addEventListener('open', () => {
        els.live.dataset.state = 'live';
        els.liveLabel.textContent = 'Live';
    });
    source.addEventListener('error', () => {
        els.live.dataset.state = 'offline';
        els.liveLabel.textContent = 'Reconnecting';
    });
    source.addEventListener('snapshot', (event) => applySnapshot(JSON.parse(event.data)));
    source.addEventListener('focus', (event) => {
        const { selected } = JSON.parse(event.data);
        if (selected && selected !== state.selected) {
            if (state.filter !== 'all' && !visibleSpecs().some(s => s.id === selected)) setFilter('all');
            select(selected, { pushView: true, fromServer: true });
            els.list.querySelector(`[data-id="${CSS.escape(selected)}"]`)?.scrollIntoView({ block: 'nearest' });
        }
    });
}

function setFilter(filter) {
    state.filter = filter;
    for (const button of document.querySelectorAll('[data-filter]')) {
        button.setAttribute('aria-checked', button.dataset.filter === filter ? 'true' : 'false');
    }
    renderBoard();
}

for (const button of document.querySelectorAll('[data-filter]')) {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
}

els.search.addEventListener('input', () => {
    state.query = els.search.value;
    renderBoard();
});

els.refresh.addEventListener('click', async () => {
    els.refresh.classList.remove('spinning');
    void els.refresh.offsetWidth;
    els.refresh.classList.add('spinning');
    try {
        const { count } = await api('/api/refresh', {});
        toast(`Re-read ${count} specs`);
    } catch (error) {
        toast(`Refresh failed: ${error.message}`);
    }
});

els.newSpecToggle.addEventListener('click', () => {
    const open = els.newSpec.hidden;
    els.newSpec.hidden = !open;
    els.newSpecToggle.setAttribute('aria-expanded', String(open));
    if (open) els.newSpecText.focus();
});

els.newSpec.addEventListener('submit', async (event) => {
    event.preventDefault();
    const description = els.newSpecText.value.trim();
    if (!description) return;
    try {
        const result = await api('/api/specify', { description, workflow: state.workflow });
        if (result.sent) {
            els.newSpecText.value = '';
            els.newSpec.hidden = true;
            els.newSpecToggle.setAttribute('aria-expanded', 'false');
        }
        await reportSend(result);
    } catch (error) {
        toast(`Could not send: ${error.message}`);
    }
});

connect();
