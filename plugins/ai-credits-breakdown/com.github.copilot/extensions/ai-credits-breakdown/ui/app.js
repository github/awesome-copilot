(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('en-US');
  const fmt = (n) => nf.format(Math.round(n));
  const usd = (c) => {
    const v = c * 0.01;
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: v < 1000 ? 2 : 0, maximumFractionDigits: v < 1000 ? 2 : 0 });
  };
  const plural = (n, one, many) => fmt(n) + ' ' + (n === 1 ? one : (many || one + 's'));
  const cu = (c) => fmt(c) + ' (' + usd(c) + ')';
  // Averages per call are often a fraction of a credit, so they keep their decimals and sub-cent dollars.
  const cuFine = (c) => (c >= 100 ? fmt(c) : c >= 10 ? c.toFixed(1) : c.toFixed(2)) + ' (' +
    (c >= 100 ? usd(c) : '$' + (c * 0.01).toFixed(4).replace(/(\.\d\d)0+$/, '$1')) + ')';
  // Totals grouped by names that come from telemetry: a name like "constructor" must stay an ordinary key.
  const dict = () => Object.create(null);
  const credTxt = (c) => fmt(c) + ' credits (' + usd(c) + ')';
  const pct = (x) => (x >= 0.1 ? Math.round(x * 100) + '%' : x >= 0.01 ? (x * 100).toFixed(1) + '%' : x > 0 ? '<1%' : '0%');
  const mtok = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = (mo) => MONTHS[parseInt(mo.slice(5, 7), 10) - 1];
  const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return d + ' ' + MONTHS[m - 1] + ' ' + y; };
  const shortDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return d + ' ' + MONTHS[m - 1]; };
  const FAMILY_COLOR = { 'Claude Opus': 'var(--opus)', 'Claude Sonnet & Haiku': 'var(--sonnet)', GPT: 'var(--gpt)', Other: 'var(--other)' };
  const TIER_NAME = ['Metered per call', 'Metered per session'];

  fetch('data.json', { cache: 'no-store' })
    .then((r) => r.json().then((body) => { if (!r.ok) throw new Error(body.error || r.status); return body; }))
    .then(init)
    .catch((e) => {
      $('loading').textContent = 'Could not read your Copilot usage: ' + e.message;
    });

  function init(data) {
    if (!data.facts.length) {
      $('loading').textContent = 'No AI credit usage was found in your local Copilot telemetry yet. Run a Copilot session, then reload this panel.';
      return;
    }
    const D = data.dims, M = data.meta;
    const AUTOMATIONS = D.automations || [];
    const CACHES = D.caches;
    const cacheOf = (v) => v;
    const CACHE_TTL = M.cacheTtl;
    const ownerOf = (repo) => (!repo ? '(no repository)' : repo.split('/')[0]);
    const repoLabel = (repo) => repo || '(no repository)';
    const sessInfo = data.sessions.map((s) => {
      const repo = D.repos[s.repo];
      return { repo, owner: ownerOf(repo), surf: D.surfaces[s.surface], automation: s.automation };
    });

    const facts = data.facts.map((r) => {
      const day = D.days[r[0]]; const si = sessInfo[r[1]];
      return {
        day, mo: day.slice(0, 7), s: r[1], m: r[2], k: r[3], tier: r[4], c: r[5],
        ci: r[6], cr: r[7], cw: r[8], co: r[9], ti: r[10], tr: r[11], tw: r[12], to: r[13], calls: r[14], cache: cacheOf(r[15]),
        repo: si.repo, owner: si.owner, surf: si.surf, automation: si.automation,
      };
    });
    const hourly = data.hourly.map((r) => {
      const si = sessInfo[r[1]];
      return { day: D.days[r[0]], s: r[1], m: r[2], k: r[3], tier: 0, dow: r[4], h: r[5], c: r[6], cache: cacheOf(r[7]), repo: si.repo, owner: si.owner, surf: si.surf };
    });
    const modelName = (i) => D.models[i].name;
    const modelFam = (i) => D.models[i].family;
    const months = Array.from(new Set(facts.map((f) => f.mo))).sort();
    const lastMonth = M.generated.slice(0, 7);
    const START = M.periodStart, END = M.generated.slice(0, 10);
    const EVENTS_FROM = M.eventsStart ? longDate(M.eventsStart.slice(0, 10)) : 'the day the Copilot CLI began recording them';
    const TZ = M.timeZone || 'UTC';

    /* ---------- Dates ---------- */
    const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const spanDays = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5) + 1;
    const daysInMonth = (mo) => { const [y, m] = mo.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
    const monthEnd = (mo) => mo + '-' + String(daysInMonth(mo)).padStart(2, '0');
    const prevMonth = (mo) => { const [y, m] = mo.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); };
    const clampDay = (d) => (d < START ? START : d > END ? END : d);
    const fullName = (mo) => ({ Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' })[monthName(mo)];
    const rangeText = (a, b) => (a === b ? longDate(a) : a.slice(0, 4) === b.slice(0, 4) ? shortDate(a) + ' – ' + longDate(b) : longDate(a) + ' – ' + longDate(b));

    const PRESETS = [
      { id: 'mtd', label: 'This month to date', range: () => [lastMonth + '-01', END] },
      { id: '7d', label: 'Last 7 days', range: () => [addDays(END, -6), END] },
      { id: '30d', label: 'Last 30 days', range: () => [addDays(END, -29), END] },
      { id: '90d', label: 'Last 90 days', range: () => [addDays(END, -89), END] },
      { id: 'all', label: 'All time', range: () => [START, END] },
    ];
    months.slice().reverse().forEach((mo) => PRESETS.push({ id: 'mo:' + mo, group: 'Month', label: fullName(mo) + ' ' + mo.slice(0, 4) + (mo === lastMonth ? ' (to date)' : ''), range: () => [clampDay(mo + '-01'), clampDay(monthEnd(mo))] }));
    const presetOf = () => {
      const p = PRESETS.find((x) => { const r = x.range(); return r[0] === F.from && r[1] === F.to; });
      return p ? p.id : 'custom';
    };

    /* ---------- Filter state ---------- */
    const DIMS = [
      { key: 'repo', label: 'Repository', all: 'All repositories', name: repoLabel, enc: (v) => v, dec: (s) => s },
      { key: 'owner', label: 'Owner', all: 'All owners', name: (v) => v, enc: (v) => v, dec: (s) => s },
      { key: 'm', label: 'Model', all: 'All models', num: true, name: modelName, enc: (v) => D.models[v].id, dec: (s) => { const i = D.models.findIndex((x) => x.id === s); return i >= 0 ? i : null; } },
      { key: 'surf', label: 'Surface', all: 'All surfaces', name: (v) => v, enc: (v) => v, dec: (s) => (D.surfaces.indexOf(s) >= 0 ? s : null) },
      { key: 'k', label: 'Call type', all: 'All call types', num: true, name: (v) => D.kinds[v], enc: (v) => D.kinds[v], dec: (s) => { const i = D.kinds.indexOf(s); return i >= 0 ? i : null; } },
      { key: 'tier', label: 'Basis', all: 'All bases', num: true, name: (v) => TIER_NAME[v], enc: String, dec: (s) => (['0', '1'].indexOf(s) >= 0 ? Number(s) : null) },
      { key: 'cache', label: 'Prompt cache', all: 'All cache states', num: true, name: (v) => CACHES[v].name, enc: (v) => CACHES[v].id, dec: (s) => { const i = CACHES.findIndex((x) => x.id === s); return i >= 0 ? i : null; } },
    ];
    const DIM = {}; DIMS.forEach((d) => { DIM[d.key] = d; });
    const DEFAULT = PRESETS[0].range();
    const F = { from: DEFAULT[0], to: DEFAULT[1], repo: null, owner: null, m: null, surf: null, k: null, tier: null, cache: null };
    const match = (f, exclude) => (exclude === 'date' || (f.day >= F.from && f.day <= F.to)) &&
      DIMS.every((d) => d.key === exclude || F[d.key] === null || f[d.key] === F[d.key]);
    const rowsFor = (exclude) => facts.filter((f) => match(f, exclude));
    const rowsBetween = (a, b, exclude) => facts.filter((f) => f.day >= a && f.day <= b && DIMS.every((d) => d.key === exclude || F[d.key] === null || f[d.key] === F[d.key]));
    const sum = (rows, key) => rows.reduce((a, f) => a + f[key], 0);
    const anyDim = () => DIMS.some((d) => F[d.key] !== null);

    function readHash() {
      const q = new URLSearchParams(location.hash.slice(1));
      const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
      if (isDay(q.get('from')) && isDay(q.get('to'))) {
        let a = clampDay(q.get('from')), b = clampDay(q.get('to')); if (a > b) [a, b] = [b, a];
        F.from = a; F.to = b;
      } else if (q.get('p')) {
        const p = PRESETS.find((x) => x.id === q.get('p')); if (p) [F.from, F.to] = p.range();
      }
      DIMS.forEach((d) => { F[d.key] = q.has(d.key) ? d.dec(q.get(d.key)) : null; });
    }
    function writeHash() {
      const q = new URLSearchParams(); const p = presetOf();
      if (p === 'custom') { q.set('from', F.from); q.set('to', F.to); } else if (p !== 'mtd') q.set('p', p);
      DIMS.forEach((d) => { if (F[d.key] !== null) q.set(d.key, d.enc(F[d.key])); });
      const h = q.toString(); const url = location.pathname + location.search + (h ? '#' + h : '');
      if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url);
    }
    readHash();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#provenance' || location.hash === '#main') {
        writeHash();
        return;
      }
      readHash(); render();
    });

    const updated = new Date(M.generated).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    $('stamp').textContent = 'Last updated ' + updated + ' · data ' + shortDate(START) + ' – ' + longDate(END) + ' (UTC days)';

    /* ---------- Filter bar ---------- */
    const preset = $('preset'), fromEl = $('from'), toEl = $('to');
    preset.innerHTML = PRESETS.filter((p) => !p.group).map((p) => '<option value="' + p.id + '">' + esc(p.label) + '</option>').join('') +
      '<optgroup label="Month">' + PRESETS.filter((p) => p.group).map((p) => '<option value="' + p.id + '">' + esc(p.label) + '</option>').join('') + '</optgroup>' +
      '<option value="custom" disabled>Custom range</option>';
    [fromEl, toEl].forEach((el) => { el.min = START; el.max = END; });
    preset.addEventListener('change', () => { const p = PRESETS.find((x) => x.id === preset.value); if (p) { [F.from, F.to] = p.range(); render(); } });
    function onDate(e) {
      if (!fromEl.value || !toEl.value) return;
      let a = clampDay(fromEl.value), b = clampDay(toEl.value);
      if (a > b) { if (e.target === fromEl) b = a; else a = b; }
      F.from = a; F.to = b; render();
    }
    fromEl.addEventListener('change', onDate); toEl.addEventListener('change', onDate);
    $('dimbar').innerHTML = DIMS.map((d) => '<div class="fld"><label for="f-' + d.key + '">' + esc(d.label) + '</label><select id="f-' + d.key + '" data-dim="' + d.key + '"></select></div>').join('');
    $('more').addEventListener('click', () => {
      const open = $('more').getAttribute('aria-expanded') !== 'true';
      $('more').setAttribute('aria-expanded', String(open)); $('dimbar').classList.toggle('open', open);
    });
    $('dimbar').addEventListener('change', (e) => {
      const sel = e.target.closest('select[data-dim]'); if (!sel) return;
      const d = DIM[sel.dataset.dim]; const v = sel.value;
      F[d.key] = v === '__all' ? null : (d.num ? Number(v) : v);
      render();
    });
    $('reset').addEventListener('click', () => { [F.from, F.to] = DEFAULT; clearFilters(); });
    $('csv').addEventListener('click', downloadCsv);
    $('refresh').addEventListener('click', () => location.reload());

    function renderFilterBar() {
      const pid = presetOf(); preset.value = pid;
      fromEl.value = F.from; toEl.value = F.to;
      DIMS.forEach((d) => {
        const g = dict(); rowsFor(d.key).forEach((f) => { g[f[d.key]] = (g[f[d.key]] || 0) + f.c; });
        const raw = (v) => (d.num ? Number(v) : v);
        const opts = Object.entries(g).map(([v, c]) => ({ v: raw(v), c })).sort((a, b) => b.c - a.c);
        if (F[d.key] !== null && !opts.some((o) => o.v === F[d.key])) opts.unshift({ v: F[d.key], c: 0 });
        const sel = $('f-' + d.key);
        sel.innerHTML = '<option value="__all">' + esc(d.all) + '</option>' +
          opts.map((o) => '<option value="' + esc(o.v) + '">' + esc(d.name(o.v)) + ' · ' + (o.c ? usd(o.c) : 'none') + '</option>').join('');
        sel.value = F[d.key] === null ? '__all' : String(F[d.key]);
        sel.closest('.fld').classList.toggle('set', F[d.key] !== null);
      });
      $('reset').disabled = !anyDim() && F.from === DEFAULT[0] && F.to === DEFAULT[1];
      const n = DIMS.filter((d) => F[d.key] !== null).length;
      $('more').textContent = n ? 'Filters (' + n + ')' : 'Filters';
    }

    // Delegated click-filters from tables and lists
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const key = b.dataset.f; const val = DIM[key].num ? Number(b.dataset.v) : b.dataset.v;
      F[key] = F[key] === val ? null : val; render();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !e.target.closest('select,input')) clearFilters();
    });
    function clearFilters() { DIMS.forEach((d) => { F[d.key] = null; }); render(); }

    function downloadCsv() {
      const rows = rowsFor(null).slice().sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : b.c - a.c));
      const q = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const head = ['day_utc', 'session', 'repository', 'owner', 'surface', 'model', 'call_type', 'basis', 'prompt_cache', 'credits', 'usd', 'calls', 'input_tokens', 'cache_read_tokens', 'cache_write_tokens', 'output_tokens'];
      const lines = [head.join(',')].concat(rows.map((f) => [f.day, data.sessions[f.s].id, f.repo, f.owner, f.surf, D.models[f.m].id, D.kinds[f.k], TIER_NAME[f.tier], CACHES[f.cache].name, f.c.toFixed(3), (f.c * 0.01).toFixed(4), f.calls, f.ti, f.tr, f.tw, f.to].map(q).join(',')));
      const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ai-credits_' + F.from + '_' + F.to + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    const SECTIONS = ['daterange', 'dimbar', 'stamp', 'statement', 'repos-sheet', 'rain-sheet', 'models-sheet', 'side-stack', 'kinds-sheet', 'anat-sheet', 'hours-sheet', 'cache-sheet', 'sessions-sheet', 'provenance', 'automations-sheet'];
    function render() {
      $('loading').hidden = true;
      SECTIONS.forEach((id) => { $(id).hidden = false; });
      writeHash();
      renderFilterBar();
      renderStatement();
      renderRepoSpend();
      renderRain();
      renderModels();
      renderOwners();
      renderSurfaces();
      renderKinds();
      renderAnatomy();
      renderHours();
      renderCache();
      renderSessions();
      renderAutomations();
    }

    /* ---------- Comparison period ---------- */
    const delta = (now, before) => {
      if (!before) return now ? 'new' : '';
      const d = (now - before) / before; const r = Math.round(Math.abs(d) * 100);
      if (now / before >= 3) return '▲ ×' + (now / before >= 10 ? Math.round(now / before) : (now / before).toFixed(1));
      return r === 0 ? 'level' : (d > 0 ? '▲ ' : '▼ ') + r + '%';
    };
    // The period the selected range is compared against, or null when it falls before the data starts.
    function comparison() {
      const mo = F.from.slice(0, 7); const len = spanDays(F.from, F.to);
      const wholeMonth = F.from === mo + '-01' && (F.to === monthEnd(mo) || (F.to === END && mo === lastMonth));
      let a, b, label;
      if (wholeMonth && F.to.slice(0, 7) === mo) {
        const pm = prevMonth(mo);
        if (F.to === END && mo === lastMonth && F.to !== monthEnd(mo)) {
          const dd = Math.min(Number(F.to.slice(8)), daysInMonth(pm));
          a = pm + '-01'; b = pm + '-' + String(dd).padStart(2, '0'); label = monthName(pm) + ' 1–' + dd;
        } else { a = pm + '-01'; b = monthEnd(pm); label = fullName(pm); }
      } else {
        b = addDays(F.from, -1); a = addDays(F.from, -len);
        label = len === 1 ? 'Day before' : 'Previous ' + len + ' days';
      }
      if (b < START) return null;
      return { a, b, label, partial: a < START };
    }

    /* ---------- Statement (period headline) ---------- */
    function renderStatement() {
      const rows = rowsFor(null);
      const c = sum(rows, 'c');
      const sess = new Set(rows.map((f) => f.s)).size;
      const repos = new Set(rows.map((f) => f.repo).filter(Boolean)).size;
      const tiers = [0, 1].map((t) => sum(rows.filter((f) => f.tier === t), 'c'));
      const amt = '<strong class="amt">' + usd(c) + '</strong>';
      const len = spanDays(F.from, F.to);
      const byDay = dict(); rows.forEach((f) => { byDay[f.day] = (byDay[f.day] || 0) + f.c; });
      const active = Object.keys(byDay).length;
      const peak = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
      const counts = '<span class="cr">' + credTxt(c) + ' · ' + plural(sess, 'session') + ' · ' + plural(repos, 'repository', 'repositories') + ' · ' + plural(active, 'active day') + ' of ' + len + '</span>';
      const pid = presetOf(); const mo = F.from.slice(0, 7);
      let lead;
      if (pid === 'mtd') lead = 'You have spent ' + amt + ' in ' + fullName(mo) + ' so far';
      else if (pid === 'all') lead = 'You have spent ' + amt + ' since ' + longDate(START);
      else if (pid.indexOf('mo:') === 0) lead = 'You spent ' + amt + ' in ' + fullName(mo) + ' ' + mo.slice(0, 4);
      else if (/^\d+d$/.test(pid)) lead = 'You spent ' + amt + ' in the last ' + parseInt(pid, 10) + ' days';
      else lead = 'You spent ' + amt + (len === 1 ? ' on ' + longDate(F.from) : ' from ' + (F.from.slice(0, 4) === F.to.slice(0, 4) ? shortDate(F.from) : longDate(F.from)) + ' to ' + longDate(F.to));
      const facts2 = [];
      facts2.push(['Range (UTC)', rangeText(F.from, F.to) + ' · ' + plural(len, 'day')]);
      facts2.push(['Daily average', usd(c / len) + ' a day']);
      if (pid === 'mtd') {
        const dim = daysInMonth(mo);
        facts2.push(['At this pace', '≈ ' + usd((c / len) * dim) + ' by ' + dim + ' ' + monthName(mo)]);
      }
      const cmp = comparison();
      if (cmp) {
        const pv = sum(rowsBetween(cmp.a, cmp.b), 'c'); const d = delta(c, pv);
        facts2.push([cmp.label + (cmp.partial ? ' (partial data)' : ''), (pv ? usd(pv) : 'Nothing') + (d ? ' <span class="chg">' + d + '</span>' : '')]);
      }
      if (peak && len > 1) facts2.push(['Busiest day', shortDate(peak[0]) + ' · ' + usd(peak[1])]);
      const parts = [];
      DIMS.forEach((d) => {
        if (F[d.key] === null) return;
        parts.push('<span class="tag">' + esc(d.label) + ': ' + esc(d.name(F[d.key])) + '<button data-f="' + d.key + '" data-v="' + esc(F[d.key]) + '" aria-label="Remove ' + esc(d.label) + ' filter">×</button></span>');
      });
      $('statement').innerHTML =
        '<div class="st-main"><h2 class="lead">' + lead + '.</h2>' + counts +
        (parts.length ? '<p class="filters"><span class="label">Only showing</span>' + parts.join('') + '<button class="linkbtn" id="clear">Clear filters</button></p>' : '') +
        '<dl class="facts">' + facts2.map((x) => '<div><dt>' + esc(x[0]) + '</dt><dd>' + x[1] + '</dd></div>').join('') + '</dl></div>' +
        '<div class="basis"><p class="basis-h">Basis of these numbers</p><div class="basis-bar" role="img" aria-label="Basis: ' + tiers.map((v, i) => TIER_NAME[i] + ' ' + pct(c ? v / c : 0)).join(', ') + '">' +
        tiers.map((v, i) => '<span style="width:' + (c ? (v / c) * 100 : 0) + '%;' + tierFill(i) + '"></span>').join('') + '</div>' +
        '<div class="basis-key">' + tiers.map((v, i) => '<button type="button" class="keybtn" data-f="tier" data-v="' + i + '" aria-pressed="' + (F.tier === i) + '"><i class="sw t' + i + '"></i>' + TIER_NAME[i] + ' ' + cu(v) + ' · ' + pct(c ? v / c : 0) + '</button>').join('') + '</div>' +
        '<p class="note">These are list-price amounts from local telemetry, not an invoice; see <a href="#provenance" id="prov-link">where these numbers come from</a>.</p>' +
        '</div>';
      const clr = $('clear'); if (clr) clr.addEventListener('click', clearFilters);
      const pl = $('prov-link'); if (pl) pl.addEventListener('click', () => { $('provenance').open = true; });
    }

    /* ---------- Repository spend ---------- */
    let allRepos = false;
    function renderRepoSpend() {
      const rows = rowsFor('repo');
      const by = dict();
      rows.forEach((f) => {
        const k = f.repo || '';
        const b = by[k] || (by[k] = { c: 0, sess: new Set(), models: dict() });
        b.c += f.c; b.sess.add(f.s); b.models[f.m] = (b.models[f.m] || 0) + f.c;
      });
      const cmpP = comparison(); const cmpLabel = cmpP ? cmpP.label : null; const cmp = dict();
      if (cmpP) rowsBetween(cmpP.a, cmpP.b, 'repo').forEach((f) => { cmp[f.repo || ''] = (cmp[f.repo || ''] || 0) + f.c; });
      const items = Object.entries(by).sort((a, b) => b[1].c - a[1].c);
      const total = items.reduce((a, [, b]) => a + b.c, 0); const max = items.length ? items[0][1].c : 1;
      $('repos-h').textContent = 'Spend by repository, ' + rangeText(F.from, F.to);
      const nameCell = (repo) => {
        if (!repo) return '<span class="muted">(no repository)</span>';
        const [o, n] = repo.split('/');
        return '<span class="owner">' + esc(o) + '/</span>' + esc(n);
      };
      $('repos-table').innerHTML =
        '<thead><tr><th class="left">Repository</th><th>Spent</th><th class="share left">Share of ' + usd(total) + '</th>' +
        (cmpLabel ? '<th class="cmp">' + esc(cmpLabel) + '</th>' : '') + '<th class="cred">Credits</th><th class="opt">Sessions</th><th class="left opt">Main model</th></tr></thead><tbody>' +
        (items.length ? items.filter(([repo], i) => allRepos || i < 12 || repo === F.repo).map(([repo, b]) => {
          const on = F.repo !== null && F.repo === repo;
          const mm = Object.entries(b.models).sort((a, c) => c[1] - a[1])[0];
          const pv = cmp[repo] || 0; const d = cmpLabel ? delta(b.c, pv) : '';
          return '<tr class="' + (on ? 'on' : '') + '"><td class="left"><button class="rowbtn" data-f="repo" data-v="' + esc(repo) + '" aria-pressed="' + on + '">' + nameCell(repo) + '</button></td>' +
            '<td class="spent">' + usd(b.c) + '</td>' +
            '<td class="share"><div class="sharewrap"><span class="sharebar"><i style="width:' + (b.c / max) * 100 + '%"></i></span><span class="pct">' + pct(total ? b.c / total : 0) + '</span></div></td>' +
            (cmpLabel ? '<td class="muted cmp">' + (pv ? usd(pv) : '–') + (d ? ' <span class="chg">' + d + '</span>' : '') + '</td>' : '') +
            '<td class="muted cred">' + cu(b.c) + '</td><td class="opt">' + b.sess.size + '</td><td class="left opt">' + esc(modelName(Number(mm[0]))) + '</td></tr>';
        }).join('') + (items.length > 12 ? '<tr class="more-row"><td class="left" colspan="7"><button type="button" class="linkbtn" id="repos-more">' + (allRepos ? 'Show top 12 only' : 'Show all ' + items.length + ' repositories (' + (items.length - 12) + ' more, ' + usd(items.slice(12).reduce((a, [, b]) => a + b.c, 0)) + ')') + '</button></td></tr>' : '') : '<tr><td class="left muted" colspan="7">No spend under these filters. Widen the date range or clear a filter.</td></tr>') +
        '</tbody>' + (items.length > 1 ? '<tfoot><tr><td class="left">Total</td><td class="spent">' + usd(total) + '</td><td class="share"></td>' + (cmpLabel ? '<td class="muted cmp">' + usd(Object.values(cmp).reduce((a, v) => a + v, 0)) + '</td>' : '') + '<td class="muted cred">' + cu(total) + '</td><td class="opt"></td><td class="opt"></td></tr></tfoot>' : '');
    }
    document.addEventListener('click', (e) => { if (e.target.id === 'repos-more') { allRepos = !allRepos; renderRepoSpend(); } });
    function tierFill(t) {
      return t === 0 ? 'background:var(--rain)' : 'background:var(--rain-soft)';
    }

    /* ---------- Rain chart ---------- */
    let rainState = { days: [], per: [], cum: [], active: null, geom: null };
    function dayList(a, b) {
      const out = []; const d = new Date(a + 'T00:00:00Z'); const end = new Date(b + 'T00:00:00Z');
      while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
      return out;
    }
    function niceMax(v) {
      if (v <= 0) return 1;
      const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    }
    function renderRain() {
      const rows = rowsFor(null);
      const days = dayList(F.from, F.to);
      const idx = dict(); days.forEach((d, i) => { idx[d] = i; });
      const per = days.map(() => [0, 0]);
      const topModel = days.map(() => dict());
      const sessSet = days.map(() => new Set());
      rows.forEach((f) => {
        const i = idx[f.day]; if (i === undefined) return;
        per[i][f.tier] += f.c; topModel[i][f.m] = (topModel[i][f.m] || 0) + f.c; sessSet[i].add(f.s);
      });
      const tot = per.map((p) => p[0] + p[1]);
      let run = 0; const cum = tot.map((t) => (run += t));
      rainState = { days, per, tot, cum, topModel, sessSet, active: rainState.active, geom: null };

      const el = $('rain'); const W = Math.max(320, el.clientWidth || 900);
      const narrow = W < 560;
      const L = narrow ? 50 : 56, R = narrow ? 56 : 66, T = 22;
      const H1 = narrow ? 120 : 150, GAP = 46, H2 = narrow ? 110 : 140, B = 18;
      const H = T + H1 + GAP + H2 + B;
      const pw = W - L - R; const n = days.length; const step = pw / n; const bw = Math.max(1, Math.min(step - (step > 4 ? 1 : 0), 24));
      const maxDay = niceMax(Math.max(...tot, 1)); const maxCum = niceMax(Math.max(run, 1));
      const x = (i) => L + i * step + (step - bw) / 2;
      const xc = (i) => L + i * step + step / 2;
      const y1 = (v) => T + (v / maxDay) * H1;            // hangs from the top
      const y2 = (v) => T + H1 + GAP + H2 - (v / maxCum) * H2; // rises from the bottom
      const top2 = T + H1 + GAP;
      let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Daily credits hang from the top; cumulative credits rise below. Total ' + credTxt(run) + '.">';
      // gridlines & axis labels
      [0, 0.5, 1].forEach((f) => {
        const yy = T + f * H1; s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmt(f * maxDay) + '</text>' + (f ? '<text class="sub" x="' + (L - 6) + '" y="' + (yy + 15) + '" text-anchor="end">(' + usd(f * maxDay) + ')</text>' : '');
        const y2v = top2 + H2 - f * H2; s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y2v + '" y2="' + y2v + '"/><text x="' + (L - 6) + '" y="' + (y2v + 4) + '" text-anchor="end">' + fmt(f * maxCum) + '</text>' + (f ? '<text class="sub" x="' + (L - 6) + '" y="' + (y2v + 15) + '" text-anchor="end">(' + usd(f * maxCum) + ')</text>' : '');
      });
      s += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + T + '" y2="' + T + '"/>';
      s += '<text class="cap" x="' + L + '" y="' + (T - 8) + '">Daily credits, hanging from the top</text><text class="cap" x="' + L + '" y="' + (top2 - 5) + '">Running total, rising</text>';
      s += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + (top2 + H2) + '" y2="' + (top2 + H2) + '"/>';
      // month boundaries + labels (drop a label when the next one is too close to read)
      const marks = [];
      days.forEach((d, i) => { if (d.slice(8) === '01' || i === 0) marks.push({ d, i, xx: L + i * step }); });
      marks.forEach((mk, j) => {
        if (mk.i !== 0) s += '<line class="mo" x1="' + mk.xx + '" x2="' + mk.xx + '" y1="' + T + '" y2="' + (top2 + H2) + '"/>';
        const next = marks[j + 1];
        if (next && next.xx - mk.xx < 44) return;
        const label = monthName(mk.d.slice(0, 7)) + (mk.d.slice(5, 7) === '01' || mk.i === 0 ? ' ' + mk.d.slice(0, 4) : '');
        s += '<text class="moname" x="' + (mk.xx + 3) + '" y="' + (T + H1 + 14) + '">' + label + '</text>';
      });
      // hanging bars (stacked by basis)
      for (let i = 0; i < n; i++) {
        let acc = 0;
        [0, 1].forEach((t) => {
          const v = per[i][t]; if (v <= 0) return;
          const h = (v / maxDay) * H1; s += '<rect class="t' + t + '" x="' + x(i).toFixed(2) + '" y="' + (T + acc).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + Math.max(0.75, h).toFixed(2) + '"/>'; acc += h;
        });
      }
      // cumulative curve
      if (n > 0) {
        let d = 'M' + xc(0).toFixed(2) + ' ' + y2(cum[0]).toFixed(2);
        for (let i = 1; i < n; i++) d += ' L' + xc(i).toFixed(2) + ' ' + y2(cum[i]).toFixed(2);
        s += '<path class="wash" d="' + d + ' L' + xc(n - 1).toFixed(2) + ' ' + (top2 + H2) + ' L' + xc(0).toFixed(2) + ' ' + (top2 + H2) + ' Z"/>';
        s += '<path class="curve" d="' + d + '"/>';
        s += '<text class="endlabel" x="' + (xc(n - 1) + 6) + '" y="' + (y2(cum[n - 1]) + 4) + '">' + fmt(run) + '</text><text class="sub" x="' + (xc(n - 1) + 6) + '" y="' + (y2(cum[n - 1]) + 17) + '">(' + usd(run) + ')</text>';
      }
      s += '<rect class="brush" id="brush" y="' + T + '" height="' + (top2 + H2 - T) + '" x="0" width="0" hidden/>';
      s += '<line class="cross" id="cross" y1="' + T + '" y2="' + (top2 + H2) + '" hidden/>';
      s += '</svg>';
      el.innerHTML = s;
      rainState.geom = { L, step, n, T, top2, H2, W };
      $('rain-legend').innerHTML = '<span><i class="sw t0"></i>Metered per call</span><span><i class="sw t1"></i>Metered per session (day = when the session reported)</span><span>Peak day ' + credTxt(Math.max(...tot, 0)) + '</span>';
      if (rainState.active !== null && rainState.active < n) showDay(rainState.active, false); else rainState.active = null;
    }
    function showDay(i, fromKey) {
      const g = rainState.geom; if (!g) return;
      rainState.active = i;
      const cross = $('cross'); const xx = g.L + i * g.step + g.step / 2;
      cross.setAttribute('x1', xx); cross.setAttribute('x2', xx); cross.removeAttribute('hidden');
      const per = rainState.per[i]; const tot = rainState.tot[i];
      const tm = Object.entries(rainState.topModel[i]).sort((a, b) => b[1] - a[1])[0];
      const tip = $('tip');
      tip.innerHTML = '<b>' + longDate(rainState.days[i]) + '</b>' +
        '<div class="row"><span>Credits</span><span>' + cu(tot) + '</span></div>' +
        '<div class="row"><span>Running total</span><span>' + cu(rainState.cum[i]) + '</span></div>' +
        '<div class="row"><span>Sessions</span><span>' + rainState.sessSet[i].size + '</span></div>' +
        (tm ? '<div class="row"><span>Top model</span><span>' + esc(modelName(Number(tm[0]))) + '</span></div>' : '') +
        (per[1] ? '<div class="row"><span>Basis</span><span>' + [per[0] && 'call ' + cu(per[0]), 'session ' + cu(per[1])].filter(Boolean).join(' · ') + '</span></div>' : '');
      tip.hidden = false;
      // Keyboard users get the same detail as a spoken status; pointer movement stays silent.
      if (fromKey) {
        $('rain-status').textContent = longDate(rainState.days[i]) + '. ' + credTxt(tot) + '. Running total ' + credTxt(rainState.cum[i]) + '. ' +
          plural(rainState.sessSet[i].size, 'session') + (tm ? '. Top model ' + modelName(Number(tm[0])) : '') + '.';
      }
      const svg = $('rain').querySelector('svg'); const r = svg.getBoundingClientRect();
      const px = r.left + (xx / g.W) * r.width; const py = r.top + 20;
      const tw = tip.offsetWidth; const left = Math.min(Math.max(8, px + 14), window.innerWidth - tw - 8);
      tip.style.left = (px + 14 + tw > window.innerWidth ? px - tw - 14 : left) + 'px'; tip.style.top = Math.max(8, py) + 'px';
    }
    function hideDay() { $('tip').hidden = true; const c = $('cross'); if (c) c.setAttribute('hidden', ''); rainState.active = null; }
    const rainEl = $('rain');
    let brush = null;
    const dayAt = (e) => {
      const g = rainState.geom; if (!g) return -1; const svg = rainEl.querySelector('svg'); const r = svg.getBoundingClientRect();
      const xx = ((e.clientX - r.left) / r.width) * g.W; return Math.floor((xx - g.L) / g.step);
    };
    function drawBrush(a, b) {
      const g = rainState.geom; const el = $('brush'); if (!g || !el) return;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      el.setAttribute('x', g.L + lo * g.step); el.setAttribute('width', (hi - lo + 1) * g.step); el.removeAttribute('hidden');
    }
    rainEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const i = dayAt(e); if (i < 0 || i >= rainState.days.length) return;
      brush = { a: i, b: i }; rainEl.setPointerCapture(e.pointerId); e.preventDefault();
    });
    rainEl.addEventListener('pointermove', (e) => {
      const g = rainState.geom; if (!g) return;
      let i = dayAt(e);
      if (brush) { i = Math.max(0, Math.min(g.n - 1, i)); brush.b = i; drawBrush(brush.a, brush.b); }
      if (i >= 0 && i < g.n) showDay(i); else hideDay();
    });
    rainEl.addEventListener('pointerup', () => {
      if (!brush) return; const lo = Math.min(brush.a, brush.b), hi = Math.max(brush.a, brush.b); brush = null;
      if (hi > lo) { F.from = rainState.days[lo]; F.to = rainState.days[hi]; hideDay(); render(); }
      else { const el = $('brush'); if (el) el.setAttribute('hidden', ''); }
    });
    rainEl.addEventListener('pointercancel', () => { brush = null; const el = $('brush'); if (el) el.setAttribute('hidden', ''); });
    rainEl.addEventListener('pointerleave', () => { if (!brush) hideDay(); });
    rainEl.addEventListener('blur', () => { hideDay(); $('rain-status').textContent = ''; });
    rainEl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
      const n = rainState.days.length; let i = rainState.active === null ? (e.key === 'ArrowLeft' ? n - 1 : 0) : rainState.active + (e.key === 'ArrowLeft' ? -1 : 1);
      i = Math.max(0, Math.min(n - 1, i)); showDay(i, true);
    });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderRain(); renderAutomations(); }, 120); });

    /* ---------- Automation daily spend ---------- */
    const automationEl = $('automations-chart');
    let automationState = { days: [], series: [], active: null, selected: null, geom: null };
    const automationStyle = (i) => ({
      color: ['var(--rain)', 'var(--ink)', 'var(--other)'][i % 3],
      dash: ['', '7 3', '2 3', '10 3 2 3'][Math.floor(i / 3) % 4],
    });
    function renderAutomations() {
      const days = dayList(F.from, F.to);
      const indices = new Map(days.map((day, i) => [day, i]));
      const series = AUTOMATIONS.map((a, i) => ({ name: a.name, i, values: days.map(() => 0), total: 0, style: automationStyle(i) }));
      rowsFor(null).forEach((f) => {
        const a = series[f.automation];
        if (!a) return;
        a.values[indices.get(f.day)] += f.c;
        a.total += f.c;
      });
      const previousDay = automationState.days[automationState.active];
      automationState = { days, series, active: indices.has(previousDay) ? indices.get(previousDay) : days.length - 1, selected: automationState.selected, geom: null };
      const legend = $('automations-legend');
      if (!series.length) {
        $('automations-sheet').hidden = !M.automationsUnavailable;
        $('automations-summary').textContent = M.automationsUnavailable ? 'Automation attribution is unavailable: ' + M.automationsUnavailable + '.' : '';
        automationEl.innerHTML = '';
        automationEl.removeAttribute('tabindex');
        legend.innerHTML = '';
        return;
      }
      automationEl.setAttribute('tabindex', '0');
      const total = series.reduce((v, a) => v + a.total, 0);
      $('automations-summary').textContent =
        (M.automationsUnavailable ? 'Automation attribution is unavailable: ' + M.automationsUnavailable + '. ' : '') +
        plural(series.length, 'series', 'series') + ' · ' + credTxt(total) + ' recorded · ' + rangeText(F.from, F.to) +
        (total ? '' : '. No automation spend under these filters; widen the date range or clear a filter.');
      const W = Math.max(240, automationEl.clientWidth), L = 72, R = 16, T = 26, PH = 240, H = T + PH + 34;
      const pw = W - L - R, n = days.length;
      const x = (i) => L + (n === 1 ? pw / 2 : i * pw / (n - 1));
      const max = niceMax(series.reduce((v, a) => Math.max(v, ...a.values), 1));
      const y = (v) => T + PH - v / max * PH;
      let h = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Daily spend in USD for ' + series.length + ' automation series. ' + rangeText(F.from, F.to) + '. Total ' + credTxt(total) + '.') + '">' +
        '<text class="cap" x="' + L + '" y="14">Daily spend (USD)</text>';
      [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
        const yy = y(f * max);
        h += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + usd(f * max) + '</text>';
      });
      const ticks = Math.min(n, Math.max(2, Math.floor(pw / 95)));
      for (let t = 0; t < ticks; t++) {
        const i = ticks === 1 ? 0 : Math.round(t * (n - 1) / (ticks - 1));
        h += '<text x="' + x(i) + '" y="' + (T + PH + 22) + '" text-anchor="' + (t === 0 && n > 1 ? 'start' : t === ticks - 1 && n > 1 ? 'end' : 'middle') + '">' + shortDate(days[i]) + '</text>';
      }
      series.forEach((a) => {
        const path = a.values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(v).toFixed(2)).join(' ');
        h += '<g class="automation-series" data-series="' + a.i + '" style="--series-color:' + a.style.color + '"><title>' + esc(a.name + ' · ' + credTxt(a.total)) + '</title>' +
          '<path class="automation-line" d="' + path + '" stroke-dasharray="' + a.style.dash + '"/>' +
          a.values.map((v, i) => v > 0 || n === 1 ? '<circle cx="' + x(i).toFixed(2) + '" cy="' + y(v).toFixed(2) + '" r="2.5"/>' : '').join('') + '</g>';
      });
      h += '<line class="cross" id="automations-cross" y1="' + T + '" y2="' + (T + PH) + '"/></svg>';
      automationEl.innerHTML = h;
      automationState.geom = { W, L, pw, n, x };
      legend.innerHTML = '<caption class="sr-only">Automation legend, selected day spend and period totals</caption><thead><tr><th>Automation</th><th id="automations-day" aria-live="polite"></th><th>Period total</th></tr></thead><tbody>' +
        series.slice().sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).map((a) => '<tr><th scope="row"><button type="button" class="keybtn automation-key" data-automation="' + a.i + '" aria-pressed="' + (a.i === automationState.selected) + '">' +
          '<svg class="automation-swatch" viewBox="0 0 32 12" aria-hidden="true"><line x1="0" y1="6" x2="32" y2="6" stroke="' + a.style.color + '" stroke-width="2.5" stroke-dasharray="' + a.style.dash + '"/></svg>' +
          esc(a.name) + '</button></th><td id="automation-day-' + a.i + '"></td><td>' + usd(a.total) + '</td></tr>').join('') + '</tbody>';
      highlightAutomation();
      showAutomationDay(automationState.active);
    }
    function showAutomationDay(i) {
      const g = automationState.geom; if (!g) return;
      automationState.active = i;
      $('automations-cross').setAttribute('x1', g.x(i));
      $('automations-cross').setAttribute('x2', g.x(i));
      $('automations-day').textContent = shortDate(automationState.days[i]);
      automationState.series.forEach((a) => { $('automation-day-' + a.i).textContent = usd(a.values[i]); });
      automationEl.setAttribute('aria-label', 'Daily spend by automation. ' + longDate(automationState.days[i]) + '. ' +
        automationState.series.map((a) => a.name + ': ' + credTxt(a.values[i])).join('; '));
    }
    function highlightAutomation() {
      automationEl.querySelectorAll('[data-series]').forEach((el) => {
        el.classList.toggle('highlighted', Number(el.dataset.series) === automationState.selected);
      });
      $('automations-legend').querySelectorAll('[data-automation]').forEach((el) => {
        el.setAttribute('aria-pressed', String(Number(el.dataset.automation) === automationState.selected));
      });
    }
    $('automations-legend').addEventListener('click', (e) => {
      const el = e.target.closest('[data-automation]'); if (!el) return;
      const i = Number(el.dataset.automation);
      automationState.selected = automationState.selected === i ? null : i;
      highlightAutomation();
    });
    function readAutomationPointer(e) {
      const g = automationState.geom; if (!g) return;
      const r = automationEl.querySelector('svg').getBoundingClientRect();
      const xx = (e.clientX - r.left) * g.W / r.width;
      const i = g.n === 1 ? 0 : Math.round((xx - g.L) / g.pw * (g.n - 1));
      showAutomationDay(Math.max(0, Math.min(g.n - 1, i)));
    }
    automationEl.addEventListener('pointermove', readAutomationPointer);
    automationEl.addEventListener('pointerdown', readAutomationPointer);
    automationEl.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || !automationState.geom) return;
      e.preventDefault();
      const last = automationState.days.length - 1;
      const i = e.key === 'Home' ? 0 : e.key === 'End' ? last : automationState.active + (e.key === 'ArrowLeft' ? -1 : 1);
      showAutomationDay(Math.max(0, Math.min(last, i)));
    });

    /* ---------- Ranked list helper ---------- */
    function rankList(items, key, opts) {
      opts = opts || {};
      const total = items.reduce((a, i) => a + i.c, 0); const max = Math.max(...items.map((i) => i.c), 1);
      if (!items.length) return '<p class="empty">No spend under these filters.</p>';
      const shown = items.slice(0, opts.limit || items.length);
      let h = '<ul class="rank">' + shown.map((i) => {
        const on = F[key] !== null && String(F[key]) === String(i.v);
        return '<li><button data-f="' + key + '" data-v="' + esc(i.v) + '" aria-pressed="' + on + '" style="--c:' + (i.color || 'var(--rain)') + '">' +
          '<span class="name" title="' + esc(i.label) + '">' + (i.color && !opts.noDot ? '<i class="dot"></i>' : '') + esc(i.label) + '</span>' +
          '<span class="val">' + cu(i.c) + '</span><span class="pct">' + pct(total ? i.c / total : 0) + '</span>' +
          '<span class="track"><i style="width:' + (i.c / max) * 100 + '%"></i></span></button></li>';
      }).join('') + '</ul>';
      const rest = items.slice(shown.length);
      if (rest.length) h += '<p class="note">+ ' + rest.length + ' more, ' + credTxt(rest.reduce((a, i) => a + i.c, 0)) + ' combined.</p>';
      return h;
    }
    const groupSum = (rows, keyFn) => { const o = dict(); rows.forEach((f) => { const k = keyFn(f); o[k] = (o[k] || 0) + f.c; }); return o; };

    function renderModels() {
      const rows = rowsFor('m'); const g = groupSum(rows, (f) => f.m);
      const items = Object.entries(g).map(([m, c]) => ({ v: m, label: modelName(Number(m)), c, color: FAMILY_COLOR[modelFam(Number(m))] })).sort((a, b) => b.c - a.c);
      const tok = dict(); rows.forEach((f) => { tok[f.m] = (tok[f.m] || 0) + f.ti + f.tr + f.tw + f.to; });
      $('models').innerHTML = rankList(items, 'm', { limit: 10 }) +
        '<p class="fam">' + Object.keys(FAMILY_COLOR).map((k) => '<span><i class="dot" style="--c:' + FAMILY_COLOR[k] + '"></i>' + esc(k) + '</span>').join('') + '</p>' +
        (items.length ? '<p class="note">' + esc(items[0].label) + ' alone accounts for ' + pct(items[0].c / items.reduce((a, i) => a + i.c, 0)) + ' of the credits shown.</p>' : '');
    }
    function renderOwners() {
      const ro = rowsFor('owner'); const go = groupSum(ro, (f) => f.owner);
      $('owners').innerHTML = rankList(Object.entries(go).map(([v, c]) => ({ v, label: v, c })).sort((a, b) => b.c - a.c), 'owner', { limit: 8 });
    }
    function renderSurfaces() {
      const rows = rowsFor('surf'); const g = groupSum(rows, (f) => f.surf);
      $('surfaces').innerHTML = rankList(Object.entries(g).map(([v, c]) => ({ v, label: v, c })).sort((a, b) => b.c - a.c), 'surf') +
        '<p class="note">Coding agent and code review sessions are not metered per token; see “Where these numbers come from”.</p>';
    }
    function renderKinds() {
      const rows = rowsFor('k'); const g = groupSum(rows, (f) => f.k);
      const UNITEMISED = ['Session total'];
      const items = Object.entries(g).map(([v, c]) => {
        const name = D.kinds[Number(v)];
        return { v: Number(v), label: UNITEMISED.indexOf(name) >= 0 ? name + ' (not itemised)' : name, c, color: UNITEMISED.indexOf(name) >= 0 ? 'var(--rule-strong)' : null };
      }).sort((a, b) => (a.color ? 1 : 0) - (b.color ? 1 : 0) || b.c - a.c);
      $('kinds').innerHTML = rankList(items, 'k', { noDot: true }) +
        '<p class="note">Call types come from per-call telemetry, available from ' + EVENTS_FROM + '. “Your prompt” is the first call after you hit enter; “Agent turn” covers the tool loop that follows.</p>';
    }
    // What credits pay for, shared by the anatomy panel and the prompt-cache table.
    const TOKEN_PARTS = [
      { k: 'cr', label: 'Cache reads', color: '#1b64c8', why: 'Re-reading the conversation so far on every model call.' },
      { k: 'cw', label: 'Cache writes', color: '#6fa2ea', why: 'Storing new context for later calls to reuse.' },
      { k: 'co', label: 'Output', color: '#0b2540', why: 'Tokens the model generates, including reasoning.' },
      { k: 'ci', label: 'Fresh input', color: '#b7d1f4', why: 'New, uncached input tokens.' },
    ];
    const UNITEMISED_PART = { label: 'Not itemised', color: '#d9e2ea', why: 'Session-level totals and early-period residuals carry no token split.' };
    function renderAnatomy() {
      const rows = rowsFor(null); const c = sum(rows, 'c');
      const parts = TOKEN_PARTS.map((p) => Object.assign({}, p, { c: sum(rows, p.k) }));
      const itemised = parts.reduce((a, p) => a + p.c, 0);
      parts.push(Object.assign({}, UNITEMISED_PART, { c: Math.max(0, c - itemised) }));
      $('anatomy').innerHTML = '<div class="anat-bar" role="img" aria-label="' + parts.map((p) => p.label + ' ' + pct(c ? p.c / c : 0)).join(', ') + '">' +
        parts.map((p) => '<i style="width:' + (c ? (p.c / c) * 100 : 0) + '%;background:' + p.color + '"></i>').join('') + '</div>' +
        '<ul class="anat-list">' + parts.map((p) => '<li><span><i class="dot" style="--c:' + p.color + '"></i>' + p.label + '</span><span class="val">' + cu(p.c) + '</span><span class="pct muted">' + pct(c ? p.c / c : 0) + '</span><span class="why">' + p.why + '</span></li>').join('') + '</ul>';
    }
    function renderHours() {
      const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
      hourly.forEach((r) => { if (match(r, null)) grid[r.dow][r.h] += r.c; });
      const total = grid.flat().reduce((a, v) => a + v, 0);
      const max = Math.max(...grid.flat(), 1); const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const shade = (v) => { if (v <= 0) return 'var(--grid)'; const t = Math.sqrt(v / max); return 'color-mix(in srgb, var(--rain) ' + Math.round(12 + t * 88) + '%, #fff)'; };
      let h = '<div class="hours" role="img" aria-label="Credits by weekday and hour, ' + esc(TZ) + ' time">' + '<span></span>' + Array.from({ length: 24 }, (_, i) => '<span class="h">' + (i % 6 === 0 ? i : '') + '</span>').join('');
      grid.forEach((row, d) => { h += '<span class="d">' + days[d] + '</span>' + row.map((v, i) => '<span class="cell" style="background:' + shade(v) + '" title="' + days[d] + ' ' + String(i).padStart(2, '0') + ':00 · ' + credTxt(v) + '"></span>').join(''); });
      let peak = null; grid.forEach((row, d) => row.forEach((v, i) => { if (v > 0 && (!peak || v > peak.v)) peak = { v, d, i }; }));
      const hourlyTable = '<details class="note"><summary>Hourly credits as a table</summary><div class="scroll"><table class="tbl">' +
        '<caption>AI credits by weekday and hour, ' + esc(TZ) + ' time</caption>' +
        '<thead><tr><th scope="col">Day</th>' + Array.from({ length: 24 }, (_, i) => '<th scope="col">' + String(i).padStart(2, '0') + ':00</th>').join('') + '</tr></thead>' +
        '<tbody>' + grid.map((row, d) => '<tr><th scope="row">' + days[d] + '</th>' + row.map((v) => '<td>' + esc(credTxt(v)) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div></details>';
      $('hours').innerHTML = h + '</div>' +
        (peak ? '<p class="note">Busiest slot: ' + days[peak.d] + ' ' + String(peak.i).padStart(2, '0') + ':00, ' + credTxt(peak.v) + '. Grid covers ' + credTxt(total) + ' of per-call telemetry.</p>' : '<p class="note">No per-call telemetry under these filters.</p>') +
        '<p class="note">' + esc(TZ) + ' time, per-call telemetry only (from ' + EVENTS_FROM + '). Darker = more credits. Follows every filter.</p>' + hourlyTable;
    }

    /* ---------- Prompt cache ---------- */
    const mins = (s) => (s >= 3600 && s % 3600 === 0 ? s / 3600 + (s === 3600 ? ' hour' : ' hours') : Math.round(s / 60) + ' min');
    const CACHE_DESC = {
      warm: 'Read the conversation so far back from the cache.',
      expired: 'Came back after the cache lifetime (' + mins(CACHE_TTL.claude) + ' for Claude, ' + mins(CACHE_TTL.other) + ' for other models), so the whole conversation was written again.',
      rebuilt: 'Within the cache lifetime, but most of the prompt was written again: a model switch, a compaction or a changed prompt.',
      new: 'First call of a session, sub-agent or background task: instructions and tools are written to the cache.',
      none: 'Session totals have no per-call record.',
    };
    function paidBar(b) {
      const parts = TOKEN_PARTS.map((p) => ({ label: p.label, color: p.color, v: b[p.k] }));
      parts.push({ label: UNITEMISED_PART.label, color: UNITEMISED_PART.color, v: Math.max(0, b.c - parts.reduce((a, p) => a + p.v, 0)) });
      const said = parts.filter((p) => b.c && p.v / b.c >= 0.005).map((p) => p.label + ' ' + pct(p.v / b.c)).join(', ');
      return '<div class="paidwrap"><span class="paidbar" role="img" aria-label="' + esc(said) + '" title="' + esc(said) + '">' +
        parts.map((p) => '<i style="width:' + (b.c ? (p.v / b.c) * 100 : 0) + '%;background:' + p.color + '"></i>').join('') + '</span>' +
        '<span class="pct">' + (b.c && b.cw ? pct(b.cw / b.c) + ' writes' : '') + '</span></div>';
    }
    function renderCache() {
      const rows = rowsFor('cache');
      const by = CACHES.map(() => ({ c: 0, calls: 0, cr: 0, cw: 0, co: 0, ci: 0 }));
      rows.forEach((f) => { const b = by[f.cache]; b.c += f.c; b.calls += f.calls; b.cr += f.cr; b.cw += f.cw; b.co += f.co; b.ci += f.ci; });
      const total = by.reduce((a, b) => a + b.c, 0); const max = Math.max(...by.map((b) => b.c), 1);
      const idOf = (id) => CACHES.findIndex((x) => x.id === id);
      const shown = CACHES.map((s, i) => i).filter((i) => by[i].c > 0 || F.cache === i);
      const metered = shown.filter((i) => CACHES[i].id !== 'none');
      const mCredits = metered.reduce((a, i) => a + by[i].c, 0); const mCalls = metered.reduce((a, i) => a + by[i].calls, 0);
      $('cache-h').textContent = 'Prompt cache: reused or rebuilt, ' + rangeText(F.from, F.to);
      $('cache-table').innerHTML =
        '<thead><tr><th class="left">Prompt cache</th><th>Spent</th><th class="share left">Share of ' + usd(total) + '</th><th class="opt">Calls</th><th>Per call</th><th class="left paid">What it paid for</th><th class="cred">Credits</th></tr></thead><tbody>' +
        (shown.length ? shown.map((i) => {
          const s = CACHES[i], b = by[i], on = F.cache === i, none = s.id === 'none', perCall = !none && b.calls;
          return '<tr class="' + (on ? 'on' : '') + (none ? ' none' : '') + '"><td class="left state"><button class="rowbtn" data-f="cache" data-v="' + i + '" aria-pressed="' + on + '">' + esc(s.name) + '</button><span class="desc">' + esc(CACHE_DESC[s.id] || '') + '</span></td>' +
            '<td class="spent">' + usd(b.c) + '</td>' +
            '<td class="share"><div class="sharewrap"><span class="sharebar"><i style="width:' + (b.c / max) * 100 + '%"></i></span><span class="pct">' + pct(total ? b.c / total : 0) + '</span></div></td>' +
            '<td class="opt">' + (perCall ? fmt(b.calls) : '–') + '</td><td>' + (perCall ? cuFine(b.c / b.calls) : '–') + '</td>' +
            '<td class="left paid">' + paidBar(b) + '</td><td class="muted cred">' + cu(b.c) + '</td></tr>';
        }).join('') : '<tr><td class="left muted" colspan="7">No spend under these filters. Widen the date range or clear a filter.</td></tr>') +
        '</tbody>' + (shown.length > 1 ? '<tfoot><tr><td class="left">Total</td><td class="spent">' + usd(total) + '</td><td class="share"></td><td class="opt">' + (mCalls ? fmt(mCalls) : '') + '</td><td></td><td class="paid"></td><td class="muted cred">' + cu(total) + '</td></tr></tfoot>' : '');
      const W = by[idOf('warm')], X = by[idOf('expired')];
      let insight = '';
      if (W && X && W.calls && X.calls) {
        const pw = W.c / W.calls, px = X.c / X.calls, r = px / pw;
        insight = 'After a pause, a call cost ' + cuFine(px) + ' on average' +
          (r >= 1.5 ? ': ' + (r >= 10 ? Math.round(r) : r.toFixed(1)) + ' times the ' + cuFine(pw) + ' of a call that reused the cache' : '') +
          '. Those ' + plural(X.calls, 'call') + ' came to ' + credTxt(X.c) + ', ' + pct(mCredits ? X.c / mCredits : 0) + ' of the per-call metered credits shown.';
      }
      $('cache-notes').innerHTML =
        '<div class="legend cache-legend"><span class="label">What it paid for:</span>' + TOKEN_PARTS.concat([UNITEMISED_PART]).map((p) => '<span><i class="dot" style="--c:' + p.color + '"></i>' + esc(p.label) + '</span>').join('') + '</div>' +
        (insight ? '<p class="note">' + insight + '</p>' : '') +
        '<p class="note">Per-call telemetry, available from ' + EVENTS_FROM + '. How each call is classed is under “Where these numbers come from”.</p>';
    }

    /* ---------- Sessions ---------- */
    function renderSessions() {
      const rows = rowsFor(null); const by = dict();
      rows.forEach((f) => {
        const b = by[f.s] || (by[f.s] = { c: 0, calls: 0, tok: 0, first: f.day, models: {}, t: [0, 0] });
        b.c += f.c; b.calls += f.calls; b.tok += f.ti + f.tr + f.tw + f.to; if (f.day < b.first) b.first = f.day; b.models[f.m] = (b.models[f.m] || 0) + f.c; b.t[f.tier] += f.c;
      });
      const top = Object.entries(by).sort((a, b) => b[1].c - a[1].c).slice(0, 10);
      const all = rows.length ? sum(rows, 'c') : 0;
      $('sessions-table').innerHTML = '<thead><tr><th class="left">Session</th><th class="left">First matching usage</th><th class="left">Repository</th><th class="left">Surface</th><th class="left">Main model</th><th>Credits (USD)</th><th>Share</th><th>Calls</th><th>Tokens</th><th>Basis</th></tr></thead><tbody>' +
        top.map(([s, b]) => {
          const sess = data.sessions[s]; const mm = Object.entries(b.models).sort((a, c) => c[1] - a[1])[0];
          return '<tr><td class="left"><code>' + esc(sess.id) + '</code></td><td class="left">' + shortDate(b.first) + '</td><td class="left">' + esc(repoLabel(D.repos[sess.repo])) + '</td><td class="left">' + esc(D.surfaces[sess.surface]) + '</td><td class="left">' + esc(modelName(Number(mm[0]))) + (Object.keys(b.models).length > 1 ? ' <span class="partial">+' + (Object.keys(b.models).length - 1) + '</span>' : '') + '</td>' +
            '<td>' + cu(b.c) + '</td><td>' + pct(all ? b.c / all : 0) + '</td><td>' + (b.calls ? fmt(b.calls) : '–') + '</td><td>' + (b.tok ? mtok(b.tok) : '–') + '</td>' +
            '<td><div class="mini">' + b.t.map((v, i) => '<i class="t' + i + '" style="width:' + (b.c ? (v / b.c) * 100 : 0) + '%"></i>').join('') + '</div></td></tr>';
        }).join('') + (top.length ? '' : '<tr><td class="left muted" colspan="10">No sessions under these filters.</td></tr>') + '</tbody>';
      $('sess-h').textContent = 'Heaviest sessions, ' + rangeText(F.from, F.to) + (Object.keys(by).length > top.length ? ' (top ' + top.length + ' of ' + Object.keys(by).length + ')' : '');
    }

    /* ---------- Provenance ---------- */
    (function provenance() {
      const t = M.tierTotals;
      $('prov-body').innerHTML =
        '<div class="callout"><p><strong>Consumption, not an invoice.</strong> These totals are your usage priced at list per-token rates, taken from the telemetry the Copilot CLI and Copilot app keep on this machine. GitHub’s own billing is the source of truth; usage on other machines, in the cloud or in IDEs is not in this ledger.</p></div>' +
        '<div class="cols"><div>' +
        '<h3>Two kinds of number</h3><ul>' +
        '<li><b>Metered per call (' + cu(t['0'] || 0) + ').</b> Exact nano-AIU recorded for every model call since ' + EVENTS_FROM + ', with day, model and call type.</li>' +
        '<li><b>Metered per session (' + cu(t['1'] || 0) + ').</b> Exact credits, but only as a session total from the CLI shutdown log or the Copilot app. Placed on the day the session reported (or started), split by model where the log says so.</li></ul>' +
        '<h3>Where sources overlap</h3><p>A session can appear in several sources. Each session takes the largest total among them, and per-call rows win where they exist. Source totals before merging: per-call ' + cu(M.sourceTotals.events) + ', CLI shutdown logs ' + cu(M.sourceTotals.shutdown) + ', Copilot app ' + cu(M.sourceTotals.app) + '.</p>' +
        '</div><div>' +
        '<h3>Not captured</h3><ul>' +
        '<li><b>Cloud sessions.</b> Copilot coding agent and code review sessions run in the cloud and leave no local per-token telemetry. Per GitHub’s billing rules their credits go to the requester or the organization.</li>' +
        '<li><b>Other surfaces and machines.</b> Chat in IDEs, and any machine whose sessions are not in this computer’s telemetry. Code completions do not use credits.</li></ul>' +
        '<h3>Assumptions</h3><ul>' +
        (M.assumedRateModels.length ? '<li>Where a session has only a total, its “what credits pay for” split uses published per-token rates; models missing from the published table (' + M.assumedRateModels.map(esc).join(', ') + ') use their nearest sibling’s rate.</li>' : '') +
        '<li>Where per-session log totals dip between resumes, the running maximum is used. That matched the Copilot app’s own totals to within 4% on sessions that have both.</li>' +
        '<li>Prompt cache: a call reused the cache when at least ' + pct(M.cacheReuseMin) + ' of the previous call’s prompt (same session, agent and model) came back as cache reads. Otherwise its prompt was written again: “Expired after a pause” when that previous call went out longer ago than the model’s cache lifetime as recorded by the Copilot CLI (' + mins(CACHE_TTL.claude) + ' for Claude, ' + mins(CACHE_TTL.other) + ' for other models), else “Rebuilt mid-conversation”. The main agent, each sub-agent and the background calls are separate conversations.</li>' +
        '<li>Everything is read locally and read-only; prompts, session titles and file paths are never read into this view.</li></ul>' +
        '</div></div>';
    })();

    render();
  }
})();
