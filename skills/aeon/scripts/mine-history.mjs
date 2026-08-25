#!/usr/bin/env node
// mine-history.mjs — scan local coding-agent conversation history and surface
// recurring work worth turning into a scheduled Aeon skill.
//
// OPERATOR-SIDE ONLY. Reads local transcripts under ~/.claude/projects (Claude
// Code) and ~/.codex/sessions (Codex). Does nothing on GitHub Actions (no
// history there) — the aeon
// `aeon` skill invokes it during skill authoring (Mode 8), never at run time.
//
// It does the mechanical part — parse transcripts, normalise commands, count
// recurrence and cadence — and prints a compact digest. The semantic judgment
// (which cluster is actually a good skill) is left to the model reading it.
//
// Usage:
//   node mine-history.mjs [--days N] [--top N] [--project SUBSTR]
//                         [--min-sessions N] [--json]
//
//   --days N         only sessions whose file was modified in the last N days (default 120)
//   --top N          rows per table (default 20)
//   --project SUBSTR only sessions whose cwd contains SUBSTR
//   --min-sessions N drop candidates seen in fewer than N distinct sessions (default 2)
//   --json           emit raw JSON instead of the markdown digest
//
// No dependencies — plain Node (>=16), reads line-by-line.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

// ---- args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(name);
const DAYS = parseInt(opt('--days', '120'), 10);
const TOP = parseInt(opt('--top', '20'), 10);
const PROJECT = opt('--project', '');
const MIN_SESSIONS = parseInt(opt('--min-sessions', '2'), 10);
const JSON_OUT = flag('--json');

// Coding-agent transcript roots. Claude Code writes
// ~/.claude/projects/<encoded-cwd>/<session>.jsonl; Codex writes
// ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl. Scan whichever exist.
const ROOTS = [
  path.join(os.homedir(), '.claude', 'projects'),
  path.join(os.homedir(), '.codex', 'sessions'),
].filter((d) => fs.existsSync(d));
if (!ROOTS.length) {
  console.error('No coding-agent history found under ~/.claude/projects or ~/.codex/sessions — nothing to mine (this is normal off a local machine).');
  process.exit(2);
}
const CUTOFF_MS = Date.now() - DAYS * 86400_000;

// ---- helpers -------------------------------------------------------------
// The interesting binaries — the ones a workflow is built from. Bare file
// pokers (ls/cat/cd/echo/grep/…) are noise and get dropped.
const VERBS = new Set([
  'gh', 'git', 'npm', 'npx', 'node', 'python', 'python3', 'pip', 'pip3',
  'cargo', 'forge', 'cast', 'docker', 'vercel', 'gcloud', 'aws', 'railway',
  'potpie', 'raindrop', 'langfuse', 'openrouter', 'x-cli', 'yt-dlp',
  './aeon', './notify', './secretcurl', './scripts/skill-runs', 'bin/install-skill-pack',
]);
const NOISE_BIN = new Set(['ls', 'cd', 'cat', 'echo', 'head', 'tail', 'grep',
  'rg', 'find', 'wc', 'sed', 'awk', 'sort', 'uniq', 'cut', 'tr', 'chmod',
  'mkdir', 'rm', 'cp', 'mv', 'touch', 'pwd', 'which', 'true', 'export', 'set',
  'jq', 'tee', 'xargs', 'sleep', 'read', 'test', 'source', '.',
  // shell loop / conditional keywords that leak through segment splitting
  'do', 'done', 'then', 'fi', 'else', 'elif', 'esac', 'while', 'for', 'if',
  'case', 'in', 'time', 'env', 'command', 'sudo', 'exec', 'eval', 'wait',
  'printf', 'break', 'continue', 'local', 'declare', 'unset', 'trap', 'shift',
  'exit', 'return', 'printenv', 'basename', 'dirname', 'seq', 'date', 'sleep',
  // JS keywords leaking from `node -e "... ; ..."` split on ';'
  'const', 'let', 'var', 'function', 'import', 'class', 'await', 'async',
  'console', 'require', 'module', 'yield', 'throw', 'typeof', 'new',
  'error', 'warn', 'warning', 'note', 'fail', 'failed', 'success', 'ok']);

// Universal coding substrate — present in nearly every session, tells you
// nothing about what to automate. Dropped from the command leaderboard.
const PLUMBING = new Set([
  'git log', 'git status', 'git diff', 'git branch', 'git checkout', 'git switch',
  'git remote', 'git pull', 'git fetch', 'git add', 'git stash', 'git rev-parse',
  'git config', 'git show', 'git reset', 'git rebase', 'git init', 'git clone',
  'git restore', 'git ls-files', 'git worktree', 'gh auth',
]);
const isPlumbing = (label) => PLUMBING.has(label);

const STOP = new Set(('the a an and or but of to in on for with at by from is are be it this that ' +
  'i you we can could should would do does did my your our me us it its as if then else so ' +
  'what how why when where which who not no yes okay ok just get got make made need want ' +
  'please thanks lets let also more most some any all one two now new use using used via ' +
  'check fix add update change into out up off over about like know see look try help ' +
  'run running runs file files repo pr prs claude code session task ' +
  // pronouns / connectives / filler that dominated the raw keyword cluster
  'they them these those their there here have has had been will was were would could ' +
  'only each good line page across still such very much many more into onto than that ' +
  'this with your our were are you can not but and the for who why how when what does ' +
  'want need make made done work working works thing things stuff really actually maybe ' +
  'right left same other another every both either neither also again back down then than ' +
  'give given take taken keep kept show shown tell told find found look looked well good ' +
  'better best worse first last next previous current whole full part some most least ' +
  'okay yeah yep nope sure fine great nice cool right wrong true false null please thanks').split(/\s+/));

function normCmd(cmd) {
  if (!cmd || typeof cmd !== 'string') return [];
  const out = [];
  // split a compound line into segments run as separate binaries
  for (let seg of cmd.split(/&&|\|\||[|;]|\bthen\b|\bdo\b/)) {
    seg = seg.trim().replace(/^["'(]+/, '');
    if (!seg) continue;
    const toks = seg.split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    let bin = toks[0];
    if (bin.startsWith('$') || bin.includes('=')) continue; // var / env-assign
    const base = bin.split('/').pop();
    if (NOISE_BIN.has(base) || NOISE_BIN.has(bin)) continue;
    const known = VERBS.has(bin) || VERBS.has(base);
    // second, non-flag token = the subcommand or the script name
    let sub = toks.slice(1).find((t) => t && !t.startsWith('-'));
    if (sub && (base === 'node' || base === 'python' || base === 'python3')) {
      sub = sub.split('/').pop(); // script basename
    } else if (sub) {
      sub = sub.split('/').pop();
    }
    // keep known verbs always; unknown binaries only if they look like a tool call
    if (!known && !/^[a-z][a-z0-9._-]{1,}$/.test(base)) continue;
    if (!known && (base.length < 3 || base.includes('.'))) continue;
    const label = sub && /^[a-z0-9][\w.-]*$/i.test(sub) ? `${base} ${sub}` : base;
    out.push(label);
  }
  return out;
}

function dayKey(ts) {
  return (ts || '').slice(0, 10);
}

// ---- scan ----------------------------------------------------------------
// per-candidate accumulator: {runs, sessions:Set, days:Set, projects:Set}
const cmds = new Map();
const mcp = new Map();
const slash = new Map();
const themeWords = new Map(); // keyword -> {sessions:Set, days:Set, titles:[]}
const titleGroups = new Map(); // normalised title -> {sessions:Set, days:Set, sample}
const projects = new Map();   // cwd -> {sessions:Set, last}
let sessionsScanned = 0;
const allDays = new Set();

function bump(map, key, sid, day, proj) {
  let e = map.get(key);
  if (!e) { e = { runs: 0, sessions: new Set(), days: new Set(), projects: new Set() }; map.set(key, e); }
  e.runs++; e.sessions.add(sid); if (day) e.days.add(day); if (proj) e.projects.add(proj);
}

async function scanFile(fp) {
  const rl = readline.createInterface({ input: fs.createReadStream(fp), crlfDelay: Infinity });
  let sid = path.basename(fp, '.jsonl');
  let cwd = '', title = '', minTs = '', maxTs = '';
  const prompts = [];
  const localCmds = [], localMcp = [], localSlash = [];
  for await (const line of rl) {
    if (!line) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    const t = d.type;
    if (d.sessionId) sid = d.sessionId;
    if (d.cwd) cwd = d.cwd;
    if (d.timestamp) { if (!minTs || d.timestamp < minTs) minTs = d.timestamp; if (d.timestamp > maxTs) maxTs = d.timestamp; }
    if (t === 'ai-title' && d.aiTitle) title = d.aiTitle; // last one wins = freshest
    if (t === 'user') {
      const c = d.message?.content;
      if (typeof c === 'string') {
        if (c.startsWith('/') || c.startsWith('<command-name>')) {
          const name = (c.match(/<command-name>([^<]+)/) || c.match(/^\/([\w:-]+)/) || [])[1];
          if (name) localSlash.push(name.replace(/^\//, '').trim());
        } else if (!c.includes('<system-reminder>') && c.trim().length > 3) {
          prompts.push(c);
        }
      }
    } else if (t === 'assistant') {
      const c = d.message?.content;
      if (Array.isArray(c)) {
        for (const b of c) {
          if (b?.type !== 'tool_use') continue;
          if (b.name === 'Bash') localCmds.push(...normCmd(b.input?.command));
          else if (typeof b.name === 'string' && b.name.startsWith('mcp__')) localMcp.push(b.name);
        }
      }
    }
    // Codex rollout schema (best-effort; refine with real samples). Records are
    // often wrapped in a `payload`; Claude lines never match these shapes
    // (`message`/`function_call` + role), so this can't double-count.
    const px = (d.payload && typeof d.payload === 'object') ? d.payload : d;
    if (px !== d) {
      if (px.cwd && !cwd) cwd = px.cwd;
      if (px.timestamp) { const ts = px.timestamp; if (!minTs || ts < minTs) minTs = ts; if (ts > maxTs) maxTs = ts; }
    }
    if (px.type === 'message' && Array.isArray(px.content)) {
      if (px.role === 'user') {
        const txt = px.content
          .map((b) => (b && (b.type === 'input_text' || b.type === 'text')) ? (b.text || '') : '')
          .join(' ').trim();
        if (txt.length > 3 && !txt.startsWith('/') && !txt.includes('<system-reminder>')) prompts.push(txt);
      }
    } else if (px.type === 'function_call' && /shell/.test(px.name || '')) {
      let cmd = '';
      try {
        const a = JSON.parse(px.arguments || '{}');
        const cc = a.command;
        cmd = Array.isArray(cc) ? (cc[cc.length - 1] || cc.join(' ')) : (typeof cc === 'string' ? cc : '');
      } catch { /* opaque arguments — skip */ }
      if (cmd) localCmds.push(...normCmd(cmd));
    }
  }
  if (PROJECT && !cwd.includes(PROJECT)) return false;
  sessionsScanned++;
  const proj = cwd || 'unknown';
  const day = dayKey(maxTs || minTs);
  if (day) allDays.add(day);
  // commands / mcp / slash — count each distinct pattern once per session too via Sets
  for (const k of localCmds) bump(cmds, k, sid, day, proj);
  for (const k of localMcp) bump(mcp, k, sid, day, proj);
  for (const k of localSlash) bump(slash, k, sid, day, proj);
  // project activity
  let p = projects.get(proj);
  if (!p) { p = { sessions: new Set(), last: '' }; projects.set(proj, p); }
  p.sessions.add(sid); if (maxTs > p.last) p.last = maxTs;
  // recurring session titles — the strongest human-readable "what I keep doing"
  // signal. Normalise so near-identical titles collapse into one group.
  if (title) {
    const norm = title.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
      .split(' ').filter((w) => !STOP.has(w)).slice(0, 6).join(' ');
    if (norm) {
      let g = titleGroups.get(norm);
      if (!g) { g = { sessions: new Set(), days: new Set(), sample: title }; titleGroups.set(norm, g); }
      g.sessions.add(sid); if (day) g.days.add(day);
    }
  }
  // theme keywords from title + prompts
  const text = (title + ' ' + prompts.join(' ')).toLowerCase();
  const words = new Set();
  for (const w of text.split(/[^a-z0-9.+-]+/)) {
    if (w.length < 4 || w.length > 24 || STOP.has(w)) continue;
    if (/^\d+$/.test(w) || /^https?/.test(w)) continue;
    words.add(w);
  }
  for (const w of words) {
    let e = themeWords.get(w);
    if (!e) { e = { sessions: new Set(), days: new Set(), titles: [] }; themeWords.set(w, e); }
    e.sessions.add(sid); if (day) e.days.add(day); if (title && e.titles.length < 5 && !e.titles.includes(title)) e.titles.push(title);
  }
  return true;
}

// gather candidate files (top-level sessions only; skip subagent sidechains),
// windowed by mtime for speed.
function listFiles() {
  const files = [];
  // Claude nests one level (projects/<cwd>/*.jsonl); Codex nests by date
  // (sessions/YYYY/MM/DD/*.jsonl), so walk each root recursively.
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const fp = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(fp); continue; }
      if (!ent.name.endsWith('.jsonl')) continue;
      let fst; try { fst = fs.statSync(fp); } catch { continue; }
      if (fst.mtimeMs < CUTOFF_MS) continue;
      files.push(fp);
    }
  };
  for (const root of ROOTS) walk(root);
  return files;
}

// ---- render --------------------------------------------------------------
const spanDays = (e) => e.days ? e.days.size : 0;
// rank by breadth of recurrence: distinct sessions first, then distinct days
const score = (e) => e.sessions.size * 1000 + spanDays(e) * 10 + (e.runs || 0);
function rank(map, minSessions = MIN_SESSIONS) {
  return [...map.entries()]
    .filter(([, e]) => e.sessions.size >= minSessions)
    .sort((a, b) => score(b[1]) - score(a[1]));
}

function mdTable(rows, headers) {
  const line = (r) => `| ${r.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

const files = listFiles();
for (const fp of files) { try { await scanFile(fp); } catch { /* skip unreadable */ } }

const cmdRows = rank(cmds).filter(([k]) => !isPlumbing(k)).slice(0, TOP).map((e, i) => {
  const [k, v] = e;
  return [i + 1, '`' + k + '`', v.runs, v.sessions.size, v.days.size, v.projects.size];
});
const titleRows = rank(titleGroups).slice(0, TOP).map((e, i) => {
  const [, v] = e;
  return [i + 1, v.sample.slice(0, 64), v.sessions.size, v.days.size];
});
const keywordList = rank(themeWords).slice(0, 18).map((e) => `${e[0]} (${e[1].sessions.size})`);
const mcpRows = rank(mcp, 1).slice(0, 12).map((e) => `${e[0].replace(/^mcp__/, '')} (${e[1].sessions.size})`);
const slashRows = rank(slash, 1).slice(0, 12).map((e) => `/${e[0]} (${e[1].sessions.size})`);
const projRows = [...projects.entries()]
  .sort((a, b) => b[1].sessions.size - a[1].sessions.size).slice(0, 12)
  .map((e) => [e[0].replace(os.homedir(), '~'), e[1].sessions.size, (e[1].last || '').slice(0, 10)]);

if (JSON_OUT) {
  const dump = (map, min = MIN_SESSIONS) => rank(map, min).map(([k, v]) => ({
    key: k, runs: v.runs, sessions: v.sessions.size, days: v.days?.size || 0, projects: v.projects?.size || 0,
  }));
  console.log(JSON.stringify({
    scanned: { sessions: sessionsScanned, files: files.length, days: allDays.size, windowDays: DAYS },
    commands: dump(cmds).filter((r) => !isPlumbing(r.key)),
    titles: rank(titleGroups).map(([, v]) => ({ title: v.sample, sessions: v.sessions.size, days: v.days.size })),
    keywords: rank(themeWords).map(([k, v]) => ({ key: k, sessions: v.sessions.size, days: v.days.size })),
    mcp: dump(mcp, 1), slash: dump(slash, 1),
  }, null, 2));
} else {
  const out = [];
  out.push(`# Automation candidates — mined from coding-agent history`);
  out.push('');
  out.push(`Scanned **${sessionsScanned}** sessions (${files.length} files, last ${DAYS} days) across **${allDays.size}** active days${PROJECT ? `, project filter \`${PROJECT}\`` : ''}.`);
  out.push('');
  out.push(`## Recurring command workflows`);
  out.push(`Normalised \`binary subcommand\`, ranked by distinct sessions then distinct days. High sessions+days = a habit, not a one-off.`);
  out.push('');
  out.push(cmdRows.length ? mdTable(cmdRows, ['#', 'pattern', 'runs', 'sessions', 'days', 'projects']) : '_none above threshold_');
  out.push('');
  out.push(`## Recurring task themes`);
  out.push(`Session titles grouped by their normalised form, ranked by distinct sessions then days. A title you've hit across many days at a rough cadence is a scheduled-skill candidate.`);
  out.push('');
  out.push(titleRows.length ? mdTable(titleRows, ['#', 'recurring session title', 'sessions', 'days']) : '_none above threshold_');
  out.push('');
  out.push(`**Topic keywords** (title+prompt, noise-filtered): ${keywordList.join(', ') || '—'}`);
  out.push('');
  out.push(`## Tooling`);
  out.push(`- **MCP tools:** ${mcpRows.join(', ') || '—'}`);
  out.push(`- **Slash / skills:** ${slashRows.join(', ') || '—'}`);
  out.push('');
  out.push(`## Where the work happens`);
  out.push(projRows.length ? mdTable(projRows, ['project', 'sessions', 'last seen']) : '_none_');
  out.push('');
  out.push(`---`);
  out.push(`Next: pick the 2-3 rows that are **recurring + fetch/report-shaped + not already an Aeon skill**, then author each via Mode 4. A workflow spanning many days at a rough cadence → a \`schedule:\`; a read-only fetch-and-report → \`mode: read-only\`.`);
  console.log(out.join('\n'));
}
