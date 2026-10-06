// The Overview dossier as HTML, in the same order and class names as the VS Code viewer's
// OverviewDossier: Intent → Expectations → Verified → Decisions → Coverage, run log last.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml } from './vendor/viewer-markdown.mjs';
import { formatElapsed, phaseTimings, timingSummaryText } from './spec-rules.mjs';

export { stepTiming } from './spec-rules.mjs';

const CONSTRAINT_PREFIX = 'constraint: ';
const AREA_PREFIX = 'area: ';
const DECISIONS_SHOWN = 3;
const COVERAGE_SHOWN = 6;

const e = escapeHtml;
const text = v => (typeof v === 'string' ? v.trim() : '');
const list = v => (Array.isArray(v) ? v : []);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** What a time means on a record the board kept, said where the times are shown. */
export const BOARD_TIMED_NOTE = 'Timed by the board: from the moment it sent a step to the end of that chat turn. A step run any other way has no time.';
export const BOARD_UNTIMED_NOTE = 'No step has a time. The board times a step it sends, from the send to the end of that chat turn.';

function timingSection(ctx, { steps = null, boardTimed = false } = {}) {
    const timings = phaseTimings(ctx);
    if (!timings.phases.length) return '';
    const summary = timingSummaryText(timings);
    const items = timings.phases.map((p, i) => {
        // A record that stopped at a step's start still says "running"; the files may know the step finished.
        const inFlight = p.inFlight && steps?.[p.step] !== 'completed';
        return `<div role="listitem" class="dossier-timing__phase${inFlight ? ' is-in-flight' : ''}">`
            + (i > 0 ? '<span class="dossier-timing__connector" aria-hidden="true"></span>' : '')
            + '<span class="dossier-timing__dot" aria-hidden="true"></span>'
            + `<span class="dossier-timing__name">${e(cap(p.step))}</span>`
            + (p.durationMs != null ? `<span class="dossier-timing__duration">${e(formatElapsed(p.durationMs))}</span>` : '')
            + '</div>';
    }).join('');
    return `<section class="dossier-timing" aria-label="Run timing overview"><div class="dossier-timing__head"><span class="dossier-kicker">Run overview</span><strong>${e(summary)}</strong></div><div class="dossier-timing__phases" role="list">${items}</div>${boardTimed ? `<p class="dossier-timing__note">${e(timings.measuredPhases > 0 ? BOARD_TIMED_NOTE : BOARD_UNTIMED_NOTE)}</p>` : ''}</section>`;
}

function sectionHead(kicker, title, count, tone) {
    const badge = count ? `<span class="dossier-count${tone ? ` dossier-count--${tone}` : ''}">${e(count)}</span>` : '';
    return `<header class="dossier-section__head"><div><p class="dossier-kicker">${e(kicker)}</p><h2 class="dossier-section__title">${e(title)}</h2></div>${badge}</header>`;
}

function sizingLine(c) {
    const parts = [];
    if (typeof c.projectedFiles === 'number') parts.push(`${c.projectedFiles} files`);
    if (typeof c.projectedTasks === 'number') parts.push(`${c.projectedTasks} tasks`);
    return parts.length ? `Sized ${c.verdict}: ${parts.join(', ')} projected` : `Sized ${c.verdict}`;
}

function intentSection(ctx, options) {
    const intent = text(ctx.intent);
    const approach = text(ctx.approach);
    const area = list(ctx.context).find(i => typeof i === 'string' && i.startsWith(AREA_PREFIX))?.slice(AREA_PREFIX.length);
    const sizing = ctx.classification && typeof ctx.classification.verdict === 'string' ? sizingLine(ctx.classification) : null;
    const timing = timingSection(ctx, options);
    if (!intent && !approach && !area && !sizing && !timing) return '';
    const meta = [];
    if (approach) meta.push(`<div class="dossier-intent__approach"><span class="dossier-meta-label">Approach</span><p>${e(approach)}</p></div>`);
    if (area || sizing) {
        meta.push('<div class="dossier-intent__context">'
            + (area ? `<span class="dossier-meta-label">Working area</span><p>${e(area)}</p>` : '')
            + (sizing ? `<span class="dossier-meta-label">Size</span><p>${e(sizing)}</p>` : '')
            + '</div>');
    }
    return '<section class="dossier-intent" aria-label="Intent">'
        + (intent ? `<p class="dossier-kicker">Intent</p><p class="dossier-intent__statement">${e(intent)}</p>` : '')
        + timing
        + (meta.length ? `<div class="dossier-intent__meta">${meta.join('')}</div>` : '')
        + '</section>';
}

function expectationsSection(ctx) {
    const constraints = list(ctx.context).filter(i => typeof i === 'string' && i.startsWith(CONSTRAINT_PREFIX)).map(i => i.slice(CONSTRAINT_PREFIX.length));
    const out = list(ctx.expectations).filter(i => typeof i === 'string');
    if (!constraints.length && !out.length) return '';
    const fence = (cls, title, items) => (items.length ? `<div class="dossier-fence ${cls}"><h3>${title}</h3><ul>${items.map(i => `<li>${e(i)}</li>`).join('')}</ul></div>` : '');
    return `<section class="dossier-section" aria-label="Expectations">${sectionHead('Expectations', 'The fence around the work', String(constraints.length + out.length))}<div class="dossier-fence-grid">${fence('dossier-fence--scope', 'Must stay true', constraints)}${fence('dossier-fence--out', 'Deliberately out of scope', out)}</div></section>`;
}

function verification(v) {
    if (typeof v === 'string') return { what: v };
    if (!v || typeof v !== 'object' || typeof v.what !== 'string') return null;
    return v;
}

function evidenceRows(items) {
    return `<div class="dossier-evidence">${items.map(v => {
        const warnings = list(v.warnings).filter(w => typeof w === 'string');
        const claimed = v.source !== 'derived';
        const mark = warnings.length ? '⚠' : claimed ? '”' : '✓';
        return `<article class="dossier-evidence__row${claimed ? ' dossier-evidence__row--claimed' : ''}">`
            + `<span class="dossier-check${warnings.length ? ' dossier-check--warn' : claimed ? ' dossier-check--claimed' : ''}" aria-hidden="true">${mark}</span>`
            + `<div class="dossier-evidence__body"><h3>${e(v.what)}</h3>${v.result ? `<p>${e(String(v.result))}</p>` : ''}${warnings.length ? `<p class="dossier-evidence__warnings">${e(warnings.join('; '))}</p>` : ''}</div>`
            + (v.command ? `<code>${e(String(v.command))}</code>` : '')
            + '</article>';
    }).join('')}</div>`;
}

function verifiedSection(ctx) {
    const items = list(ctx.verified).map(verification).filter(Boolean);
    if (!items.length) return '';
    const checked = items.filter(v => v.source === 'derived');
    const reported = items.filter(v => v.source !== 'derived');
    const failed = checked.filter(v => v.exitCode !== undefined && v.exitCode !== 0).length;
    const count = reported.length ? `${checked.length} checked · ${reported.length} reported` : `${checked.length} checked`;
    const tone = failed ? 'warn' : checked.length ? 'good' : undefined;
    return `<section class="dossier-section" aria-label="Verified">${sectionHead('Verified', 'What was checked, and what happened', count, tone)}`
        + (checked.length ? evidenceRows(checked) : '')
        + (reported.length ? (checked.length ? '<p class="dossier-evidence__label">Reported — the run\'s own account</p>' : '') + evidenceRows(reported) : '')
        + '</section>';
}

function decision(d, num) {
    return `<article class="dossier-decision"><span class="dossier-decision__num" aria-hidden="true">${String(num).padStart(2, '0')}</span><div><h3>${e(d.decision)}</h3>${d.why ? `<p><b>Why</b> ${e(d.why)}</p>` : ''}${d.rejected ? `<p class="dossier-decision__rejected"><b>Rejected</b> ${e(d.rejected)}</p>` : ''}</div></article>`;
}

function decisionsSection(ctx) {
    const items = list(ctx.decisions).map(d => (typeof d === 'string' ? { decision: d } : d)).filter(d => d && typeof d.decision === 'string');
    if (!items.length) return '';
    const rest = items.slice(DECISIONS_SHOWN);
    return `<section class="dossier-section" aria-label="Decisions">${sectionHead('Decisions', 'Choices future work should not have to rediscover', String(items.length))}`
        + `<div class="dossier-decisions">${items.slice(0, DECISIONS_SHOWN).map((d, i) => decision(d, i + 1)).join('')}</div>`
        + (rest.length ? `<details class="dossier-more"><summary>Show ${rest.length} more decision${rest.length === 1 ? '' : 's'}</summary><div class="dossier-more__body">${rest.map((d, i) => decision(d, DECISIONS_SHOWN + i + 1)).join('')}</div></details>` : '')
        + '</section>';
}

const names = v => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : list(v).filter(s => typeof s === 'string'));
const looksLikePath = ref => /[\\/]/.test(ref) && /\.[a-z]{2,4}$/i.test(ref.split('::')[0].split('#')[0].trim());

/** Coverage rows in the viewer's shape, with named test files checked against the workspace. */
export function coverageRows(ctx, root) {
    const v = ctx?.coverage;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return [];
    const rows = [];
    for (const [req, entry] of Object.entries(v)) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const tests = names(entry.tests);
        const missing = root ? tests.filter(t => looksLikePath(t) && !existsSync(join(root, t.split('::')[0].split('#')[0].trim()))) : [];
        rows.push({ req, title: text(entry.title) || undefined, tasks: names(entry.tasks), tests, missingTests: missing.length ? missing : undefined });
    }
    return rows.sort((a, b) => a.req.localeCompare(b.req, undefined, { numeric: true }));
}

function coverageRow(row) {
    const missing = row.missingTests?.length ?? 0;
    const cls = missing ? 'is-missing' : row.tests.length ? 'is-traced' : 'is-untraced';
    const label = missing
        ? (missing === row.tests.length ? `${missing} test${missing === 1 ? '' : 's'} not found` : `${row.tests.length - missing} of ${row.tests.length} found`)
        : row.tests.length ? `${row.tests.length} test${row.tests.length === 1 ? '' : 's'}` : 'No test linked';
    return `<article class="dossier-coverage__row"><div class="dossier-coverage__req"><b>${e(row.req)}</b>${row.title ? `<span>${e(row.title)}</span>` : ''}</div><div class="dossier-coverage__tasks">${row.tasks.map(t => `<code>${e(t)}</code>`).join('')}</div><div class="dossier-coverage__state ${cls}"><i aria-hidden="true"></i> ${e(label)}</div></article>`;
}

function coverageSection(ctx, root) {
    const rows = coverageRows(ctx, root);
    if (!rows.length) return '';
    const traced = rows.filter(r => r.tests.length).length;
    const ordered = [...rows.filter(r => !r.tests.length), ...rows.filter(r => r.tests.length)];
    const rest = ordered.slice(COVERAGE_SHOWN);
    return `<section class="dossier-section" aria-label="Coverage">${sectionHead('Coverage', 'Requirement → task → test', `${traced}/${rows.length} traced`, traced === rows.length ? 'good' : 'warn')}`
        + '<div class="dossier-coverage__head" aria-hidden="true"><span>Requirement</span><span>Delivery</span><span>Evidence</span></div>'
        + `<div class="dossier-coverage">${ordered.slice(0, COVERAGE_SHOWN).map(coverageRow).join('')}</div>`
        + (rest.length ? `<details class="dossier-more"><summary>Show all ${rows.length} requirements</summary><div class="dossier-coverage">${rest.map(coverageRow).join('')}</div></details>` : '')
        + '</section>';
}

function runLog(ctx) {
    const lastAction = text(ctx.last_action);
    const concerns = list(ctx.concerns).map(c => (typeof c === 'string' ? c : c?.what)).filter(c => typeof c === 'string');
    const files = list(ctx.files_modified).filter(f => typeof f === 'string');
    if (!lastAction && !concerns.length && !files.length) return '';
    return '<details class="dossier-log"><summary>Run log</summary><div class="dossier-log__body">'
        + (lastAction ? `<p class="dossier-log__last-action">${e(lastAction)}</p>` : '')
        + (concerns.length ? `<h3>Concerns</h3><ul>${concerns.map(c => `<li>${e(c)}</li>`).join('')}</ul>` : '')
        + (files.length ? `<h3>Files touched</h3><ul>${files.slice(0, 40).map(f => `<li><code>${e(f)}</code></li>`).join('')}</ul>` : '')
        + '</div></details>';
}

/** The whole dossier, or an empty string when the record carries nothing worth a page. */
export function renderOverview(ctx, root, options = {}) {
    if (!ctx || typeof ctx !== 'object') return '';
    const body = [intentSection(ctx, options), expectationsSection(ctx), verifiedSection(ctx), decisionsSection(ctx), coverageSection(ctx, root), runLog(ctx)].join('');
    return body ? `<div class="dossier">${body}</div>` : '';
}
