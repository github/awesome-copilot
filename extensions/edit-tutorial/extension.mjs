// Extension: edit-tutorial
// Learn-by-doing canvas. The agent publishes a tutorial built from the code
// edits it made in the current session: a step-by-step walkthrough of each
// change (with optional comprehension quizzes) followed by a hands-on
// exercise that applies the same technique as a slight variation. The learner
// completes the exercise in the canvas; local regex checks or an agent review
// mark it finished.

import { createServer } from "node:http";
import { readFile, writeFile, rename, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map(); // instanceId -> { server, url }
const sseClients = new Map(); // instanceId -> Set<res>
const stateCache = new Map(); // instanceId -> { tutorial, progress }

const MAX_STEPS = 12;
const MAX_CODE_CHARS = 20000;
const MAX_CHECKS = 10;
const MAX_HINTS = 5;
const STATE_FILENAME = "edit-tutorial-state.json";

let sessionRef = null;

// --- Input normalization ---

function text(value, max) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, max);
}

function code(value) {
    if (typeof value !== "string") return "";
    return value.replace(/\s+$/, "").slice(0, MAX_CODE_CHARS);
}

// --- Solution check safety ---

// solutionChecks patterns are authored by the agent and run against whatever the
// learner typed, so a syntactically valid expression can still hang the canvas by
// backtracking catastrophically. Two layers guard that: the canvas evaluates
// checks in a worker with a hard time budget, and this screen refuses the known
// explosive shapes at publish time so the agent gets an actionable error instead
// of shipping a lesson that stalls.
//
// The explosive shape is a repeated group whose body can match the same input in
// more than one way: (a+)+, (\s*\w+)*, (\w+,\s*)+. A fixed-width body such as
// (\d{4})+ has only one possible split, so it stays allowed.

// Reads the quantifier starting at index i, if there is one. `repeats` means the
// atom can apply more than once; `ambiguous` means it can apply a variable number
// of times; `unbounded` means it has no upper limit.
function readQuantifier(src, i) {
    const ch = src[i];
    if (ch === "*" || ch === "+") return { length: 1, repeats: true, ambiguous: true, unbounded: true };
    // "?" is variable width, so a body containing one is ambiguous: (a?){100} is
    // a real blowup. A "?" on the group itself only makes it optional, which is
    // why `repeats` stays false.
    if (ch === "?") return { length: 1, repeats: false, ambiguous: true, unbounded: false };
    if (ch !== "{") return null;
    const m = /^\{(\d+)(,(\d*))?\}/.exec(src.slice(i));
    if (!m) return null; // a literal brace, not a quantifier
    const min = Number(m[1]);
    const openEnded = m[2] !== undefined && m[3] === "";
    const max = m[2] === undefined ? min : openEnded ? Infinity : Number(m[3]);
    return { length: m[0].length, repeats: max >= 2, ambiguous: openEnded || max > min, unbounded: openEnded };
}

// True when a group body can consume the same text in more than one way, which is
// what turns an enclosing repetition into exponential backtracking.
function bodyIsAmbiguous(body) {
    let inClass = false;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "\\") { i++; continue; }
        if (inClass) { if (ch === "]") inClass = false; continue; }
        if (ch === "[") { inClass = true; continue; }
        const q = readQuantifier(body, i);
        if (q) {
            if (q.ambiguous) return true;
            i += q.length - 1;
        }
    }
    return false;
}

// Alternation at any depth counts: ((a|aa))+ is just as explosive as (a|aa)+.
function bodyHasAlternation(body) {
    let inClass = false;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "\\") { i++; continue; }
        if (inClass) { if (ch === "]") inClass = false; continue; }
        if (ch === "[") { inClass = true; continue; }
        if (ch === "|") return true;
    }
    return false;
}

// Returns null when the pattern is safe to run, or a short reason when it is not.
// Deliberately conservative: it walks the source rather than parsing it fully, and
// would rather refuse an exotic-but-safe pattern than let a stalling one through.
function screenPattern(pattern) {
    const stack = [];
    let inClass = false;
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (ch === "\\") { i++; continue; }
        if (inClass) { if (ch === "]") inClass = false; continue; }
        if (ch === "[") { inClass = true; continue; }
        if (ch === "(") { stack.push(i); continue; }
        if (ch !== ")") continue;

        const open = stack.pop();
        if (open === undefined) continue; // unbalanced; the RegExp compile below reports it
        const q = readQuantifier(pattern, i + 1);
        if (!q || !q.repeats) continue;
        const body = pattern.slice(open + 1, i);
        if (bodyIsAmbiguous(body)) {
            return "it repeats a group whose body also repeats, such as (a+)+ or (\\s*\\w+)*";
        }
        // A bound does not make overlapping alternatives safe: (a|aa){100} has as
        // many ways to split its input as (a|aa)+ does, so any repeat counts.
        if (bodyHasAlternation(body)) {
            return "it repeats a group containing alternatives, such as (a|ab)+ or (a|aa){100}";
        }
    }
    return null;
}

// Validates one solutionChecks entry. Returns { check } or { error }.
function normalizeCheck(raw) {
    const pattern = typeof raw?.pattern === "string" ? raw.pattern.slice(0, 500) : "";
    if (!pattern) return {};
    const flags = typeof raw?.flags === "string" && /^[gims]*$/.test(raw.flags) ? raw.flags : "m";
    try {
        new RegExp(pattern, flags);
    } catch {
        return { error: "solutionChecks pattern is not a valid regular expression: " + pattern };
    }
    const unsafe = screenPattern(pattern);
    if (unsafe) {
        return {
            error:
                "solutionChecks pattern can hang on a near match because " + unsafe + ": " + pattern +
                ". Match the repeated part once instead, or give it a fixed width like (\\d{4})+.",
        };
    }
    return { check: { pattern, flags, hint: text(raw?.hint, 300) } };
}

// Validates and normalizes a tutorial payload from the agent. Returns
// { tutorial } on success or { error } with a message the agent can act on.
function normalizeTutorial(raw) {
    if (!raw || typeof raw !== "object") {
        return { error: "Tutorial payload must be an object with title, steps, and exercise." };
    }

    const title = text(raw.title, 160);
    if (!title) return { error: "Tutorial needs a non-empty title." };
    const summary = text(raw.summary, 1200);

    const rawSteps = Array.isArray(raw.steps) ? raw.steps.slice(0, MAX_STEPS) : [];
    if (!rawSteps.length) return { error: "Tutorial needs at least one step describing an edit." };

    const steps = [];
    for (let i = 0; i < rawSteps.length; i++) {
        const s = rawSteps[i] || {};
        const explanation = text(s.explanation, 4000);
        if (!explanation) return { error: "Step " + (i + 1) + " needs an explanation of the edit." };

        let quiz = null;
        if (s.quiz && typeof s.quiz === "object") {
            const question = text(s.quiz.question, 500);
            const options = Array.isArray(s.quiz.options)
                ? s.quiz.options.map((o) => text(o, 300)).filter(Boolean).slice(0, 5)
                : [];
            const answerIndex = Number.isInteger(s.quiz.answerIndex) ? s.quiz.answerIndex : -1;
            if (question && options.length >= 2 && answerIndex >= 0 && answerIndex < options.length) {
                quiz = { question, options, answerIndex, why: text(s.quiz.why, 800) };
            }
        }

        steps.push({
            id: "step-" + (i + 1),
            file: text(s.file, 260),
            heading: text(s.heading, 160) || "Step " + (i + 1),
            explanation,
            before: code(s.before),
            after: code(s.after),
            quiz,
        });
    }

    const ex = raw.exercise;
    if (!ex || typeof ex !== "object") {
        return { error: "Tutorial needs an exercise object (brief, starterCode, solutionChecks)." };
    }
    const brief = text(ex.brief, 4000);
    if (!brief) return { error: "Exercise needs a brief telling the learner what to build." };

    const checks = [];
    const rawChecks = Array.isArray(ex.solutionChecks) ? ex.solutionChecks.slice(0, MAX_CHECKS) : [];
    for (const c of rawChecks) {
        const result = normalizeCheck(c);
        if (result.error) return { error: result.error };
        if (result.check) checks.push(result.check);
    }
    if (!checks.length) {
        return { error: "Exercise needs at least one solutionChecks entry ({ pattern, hint })." };
    }

    return {
        tutorial: {
            title,
            summary,
            steps,
            exercise: {
                heading: text(ex.heading, 160) || "Your turn",
                brief,
                file: text(ex.file, 260),
                starterCode: code(ex.starterCode),
                hints: (Array.isArray(ex.hints) ? ex.hints : [])
                    .map((h) => text(h, 500))
                    .filter(Boolean)
                    .slice(0, MAX_HINTS),
                checks,
                solution: code(ex.solution),
            },
        },
    };
}

function freshProgress(tutorial) {
    const steps = {};
    for (const s of tutorial?.steps || []) {
        steps[s.id] = { understood: false, quizAnswer: null, quizCorrect: false };
    }
    return {
        steps,
        exercise: {
            code: tutorial?.exercise?.starterCode || "",
            attempts: 0,
            failedAttempts: 0,
            hintsRevealed: 0,
            solutionRevealed: false,
            completed: false,
            completedBy: null,
            completedAt: null,
            approvalNote: "",
        },
        startedAt: new Date().toISOString(),
    };
}

function getState(instanceId) {
    let state = stateCache.get(instanceId);
    if (!state) {
        state = { tutorial: null, progress: null, rev: 0 };
        stateCache.set(instanceId, state);
    }
    return state;
}

// Bumped by every authoritative change the canvas did not make: publishing a
// lesson, approving, resetting. The canvas stamps each /progress body with the
// revision it was composed against, so an update that was already in flight when
// one of those landed is rejected instead of overwriting the newer state. Without
// it a debounced progress save can silently undo an approval.
function bumpRev(state) {
    state.rev = (state.rev || 0) + 1;
    return state;
}

// --- Persistence ---

// Saves come from HTTP handlers and from canvas actions, which can overlap, and
// two concurrent writeFile calls to one path interleave their chunks: the file
// ends up either holding the older snapshot or cut off mid-JSON, and loadState can
// only treat a broken document as missing, so the lesson disappears. Writes are
// queued per file and land through a rename, so a reader only ever sees a whole
// document and the last save requested is the one that survives.
const saveQueues = new Map(); // state file path -> tail of that file's write chain

async function atomicWrite(file, contents) {
    const tmp = file + ".tmp-" + randomUUID();
    try {
        await writeFile(tmp, contents, "utf-8");
        await rename(tmp, file);
    } catch (error) {
        try { await rm(tmp, { force: true }); } catch {}
        throw error;
    }
}

function saveState(workspacePath, state) {
    if (!workspacePath) return Promise.resolve();
    const dir = join(workspacePath, "files");
    const file = join(dir, STATE_FILENAME);
    // Serialize the snapshot now rather than when the write runs, so a queued save
    // persists the state as it was when the save was asked for.
    let contents;
    try { contents = JSON.stringify(state, null, 2); } catch { return Promise.resolve(); }

    const run = async () => {
        try { await mkdir(dir, { recursive: true }); } catch {}
        await atomicWrite(file, contents);
    };
    const prior = saveQueues.get(file) || Promise.resolve();
    const chained = prior.then(run, run);
    saveQueues.set(file, chained);
    // Drop the entry once this write is the tail, so the map does not grow.
    chained.then(() => {
        if (saveQueues.get(file) === chained) saveQueues.delete(file);
    });
    return chained;
}

// A state file written before the backtracking screen existed, or edited by hand,
// can carry patterns the publish path would now refuse. Drop those on the way back
// in rather than handing them to the canvas. An exercise left with no runnable
// checks is still completable through "Ask Copilot for a review".
function rescreenLoadedChecks(state) {
    const ex = state?.tutorial?.exercise;
    if (!ex || !Array.isArray(ex.checks)) return state;
    ex.checks = ex.checks
        .map((c) => normalizeCheck(c))
        .filter((r) => !r.error && r.check)
        .map((r) => r.check);
    return state;
}

async function loadState(workspacePath) {
    if (!workspacePath) return null;
    try {
        const raw = await readFile(join(workspacePath, "files", STATE_FILENAME), "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return rescreenLoadedChecks(parsed);
    } catch {}
    return null;
}

// --- SSE ---

function broadcast(instanceId, payload) {
    const clients = sseClients.get(instanceId);
    if (!clients) return;
    const message = "data: " + JSON.stringify(payload) + "\n\n";
    for (const res of clients) {
        try { res.write(message); } catch {}
    }
}

// --- Prompts sent to the agent ---

function buildTutorialRequestPrompt() {
    return [
        "Please build me a lesson in the Edit Tutorial canvas.",
        "",
        "Review the code edits you made earlier in this session: which files you created or changed, what each change does, and why. Then call the edit-tutorial canvas action `set_tutorial` with:",
        "",
        "1. A short `title` and a `summary` of the overall change.",
        "2. Three to six `steps`, each teaching one focused edit: `file`, `heading`, `explanation`, `before` and `after` snippets, and (for the most important steps) a multiple-choice `quiz` with `question`, `options`, `answerIndex`, and `why`.",
        "3. An `exercise` that applies the same technique as your edits but as a slight variation, never a repeat: same pattern, different target (another function, module, field, or parameter values). Include `brief`, `file`, `starterCode`, two or three `hints` ordered from gentle to specific, `solutionChecks` (regex `pattern` plus a learner-facing `hint` for each), and a reference `solution`.",
        "",
        "If you made no code edits in this session, ask me which recent change or file I would like to learn instead.",
    ].join("\n");
}

function buildReviewPrompt(state) {
    const ex = state.tutorial?.exercise || {};
    const attempt = state.progress?.exercise?.code || "";
    return [
        "I am working on the Edit Tutorial exercise \"" + (ex.heading || "Your turn") + "\" and would like a review of my attempt.",
        "",
        "Exercise brief:",
        ex.brief || "(none)",
        "",
        "My attempt" + (ex.file ? " (" + ex.file + ")" : "") + ":",
        "```",
        attempt || "(empty)",
        "```",
        "",
        "Review it like a coach: tell me what is right, what is missing or off, and nudge me toward the fix without pasting the full solution. If my attempt correctly completes the exercise, call the edit-tutorial canvas action `approve_exercise` with a short congratulatory note.",
    ].join("\n");
}

// --- HTML renderer ---

// Renders the canvas document. The per-instance capability token is embedded in
// a meta tag so the page - and only the page - can authenticate to the local API.
function renderHtml(token) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="tutorial-token" content="${token}" />
<title>Edit Tutorial</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #f4f8fb;
  --surface: #ffffff;
  --text: #1f2933;
  --muted: #5f6c7b;
  --faint: #5f7082;
  --border: #dce6ef;
  --blue: #1a66c2;
  --blue-dark: #14549f;
  --blue-tint: #e9f2fb;
  --green: #2e7d4f;
  --green-tint: #e9f6ee;
  --accent: #c2410c;
  --accent-dark: #a83809;
  --accent-tint: #fdf0e7;
  --code-bg: #f0f4f8;
  --added: #e4f3e7;
  --removed: #fbecec;
  --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: 'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace;
  --radius: 14px;
  --radius-sm: 8px;
  --radius-pill: 9999px;
}

html, body {
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.65;
  color: var(--text);
  background: linear-gradient(180deg, #eef4fa 0%, var(--bg) 30%);
  -webkit-font-smoothing: antialiased;
}

body { padding: 1.75rem 1.5rem 3rem; max-width: 940px; margin: 0 auto; }

.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.header h1 { font-size: 1.55rem; font-weight: 700; letter-spacing: -0.02em; }
.header .kicker {
  font-size: 0.68rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  color: var(--blue); margin-bottom: 0.2rem;
}
.summary { color: var(--muted); font-size: 0.92rem; max-width: 64ch; margin-bottom: 1.5rem; }

.progress-pill {
  font-family: var(--mono); font-size: 0.75rem; font-weight: 500; color: var(--blue-dark);
  background: var(--blue-tint); border: 1px solid rgba(26,102,194,0.15);
  padding: 6px 14px; border-radius: var(--radius-pill); white-space: nowrap;
}

.stepper { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 1.5rem; }
.step-node {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.78rem; font-weight: 600; color: var(--muted);
  background: var(--surface); border: 1px solid var(--border);
  padding: 6px 12px; border-radius: var(--radius-pill); cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.step-node:hover { border-color: var(--blue); color: var(--blue); }
.step-node.active { background: var(--blue); border-color: var(--blue); color: #ffffff; }
.step-node.done { color: var(--green); border-color: rgba(46,125,79,0.35); background: var(--green-tint); }
.step-node.done.active { background: var(--green); border-color: var(--green); color: #ffffff; }
.step-node.locked { cursor: not-allowed; color: var(--faint); background: transparent; }
.step-node.exercise-node { border-style: dashed; }
.step-node.exercise-node.unlocked { border-style: solid; border-color: rgba(194,65,12,0.4); color: var(--accent); background: var(--accent-tint); }
.step-node.exercise-node.unlocked.active { background: var(--accent); color: #ffffff; }
.step-connector { width: 14px; height: 1px; background: var(--border); }

.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px 28px; margin-bottom: 1rem;
}

.file-chip {
  display: inline-block; font-family: var(--mono); font-size: 0.74rem; color: var(--blue-dark);
  background: var(--blue-tint); border-radius: var(--radius-sm); padding: 3px 10px; margin-bottom: 0.75rem;
}
.step-heading { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.explanation { color: var(--text); font-size: 0.92rem; margin-bottom: 1.25rem; white-space: pre-wrap; }

.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
@media (max-width: 700px) { .diff-grid { grid-template-columns: 1fr; } }
.diff-pane { min-width: 0; }
.diff-label {
  font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--faint); margin-bottom: 0.4rem;
}
.code-block {
  font-family: var(--mono); font-size: 0.78rem; line-height: 1.55;
  background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 10px 0; overflow-x: auto; white-space: pre;
}
.code-line { padding: 0 14px; min-height: 1.2em; }
.code-line.added { background: var(--added); }
.code-line.removed { background: var(--removed); text-decoration: line-through; text-decoration-color: rgba(31,41,51,0.35); }

.quiz { background: var(--blue-tint); border: 1px solid rgba(26,102,194,0.15); border-radius: var(--radius-sm); padding: 16px 20px; margin-bottom: 1.25rem; }
.quiz .q-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--blue-dark); margin-bottom: 0.4rem; }
.quiz .q-text { font-size: 0.92rem; font-weight: 600; margin-bottom: 0.75rem; }
.quiz-option {
  display: block; width: 100%; text-align: left; font-family: var(--sans); font-size: 0.88rem;
  color: var(--text); background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 14px; margin-bottom: 6px; cursor: pointer;
  transition: border-color 0.15s ease;
}
.quiz-option:hover { border-color: var(--blue); }
.quiz-option.picked-right { border-color: var(--green); background: var(--green-tint); font-weight: 600; }
.quiz-option.picked-wrong { border-color: var(--accent); background: var(--accent-tint); }
.quiz-why { font-size: 0.84rem; color: var(--muted); margin-top: 0.5rem; }
.quiz-why.right { color: var(--green); }

.actions-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; gap: 8px; font-family: var(--sans);
  font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-pill); cursor: pointer;
  padding: 10px 22px; border: 1px solid transparent; transition: background 0.15s ease, border-color 0.15s ease;
}
.btn[disabled] { opacity: 0.45; cursor: not-allowed; }
.btn-primary { color: #ffffff; background: var(--blue); }
.btn-primary:not([disabled]):hover { background: var(--blue-dark); }
.btn-accent { color: #ffffff; background: var(--accent); }
.btn-accent:not([disabled]):hover { background: var(--accent-dark); }
.btn-ghost { color: var(--muted); background: transparent; border-color: var(--border); }
.btn-ghost:not([disabled]):hover { border-color: var(--blue); color: var(--blue); }
.hint-inline { font-size: 0.8rem; color: var(--faint); }

.exercise-brief { font-size: 0.95rem; margin-bottom: 1.25rem; white-space: pre-wrap; }
.editor {
  width: 100%; min-height: 220px; resize: vertical;
  font-family: var(--mono); font-size: 0.82rem; line-height: 1.6; color: var(--text);
  background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 14px 16px; margin-bottom: 0.9rem; white-space: pre; overflow-x: auto;
}
.editor:focus { outline: 2px solid rgba(26,102,194,0.35); }

.hints { margin: 1rem 0; }
.hint-item {
  font-size: 0.86rem; color: var(--text); background: var(--blue-tint);
  border-left: 3px solid var(--blue); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 8px 14px; margin-bottom: 6px;
}

.check-results { margin: 1rem 0; }
.check-item { display: flex; align-items: baseline; gap: 8px; font-size: 0.86rem; padding: 4px 0; }
.check-item .mark { font-family: var(--mono); font-weight: 600; flex-shrink: 0; }
.check-item.pass .mark { color: var(--green); }
.check-item.fail .mark { color: var(--accent); }
.check-item.fail { color: var(--muted); }
.check-item.stalled .mark { color: var(--faint); }
.check-item.stalled { color: var(--faint); }

.banner-complete {
  background: var(--green-tint); border: 1px solid rgba(46,125,79,0.3); border-radius: var(--radius);
  padding: 20px 24px; margin-bottom: 1rem;
}
.banner-complete h2 { font-size: 1.1rem; color: var(--green); margin-bottom: 0.35rem; }
.banner-complete p { font-size: 0.9rem; color: var(--muted); }

.solution-block { margin-top: 1rem; }
.locked-note {
  display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 0.9rem;
  background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius);
  padding: 18px 22px;
}

.empty-state { text-align: center; padding: 3.5rem 1rem; }
.empty-state h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.6rem; }
.empty-state p { color: var(--muted); font-size: 0.95rem; max-width: 52ch; margin: 0 auto 1.5rem; }
.empty-state .waiting { color: var(--blue-dark); font-size: 0.85rem; margin-top: 1rem; }

.toast {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
  background: var(--text); color: #f5f8fa; font-size: 0.84rem;
  padding: 10px 20px; border-radius: var(--radius-pill); opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
.toast.show { opacity: 1; }

.footer-row { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
.reset-link { font-size: 0.75rem; color: var(--faint); background: none; border: none; cursor: pointer; }
.reset-link:hover { color: var(--accent); text-decoration: underline; }

.loading { display: flex; align-items: center; justify-content: center; padding: 4rem 0; color: var(--faint); gap: 0.5rem; font-size: 0.9rem; }
.loading .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: pulse 1.2s ease-in-out infinite; }
.loading .dot:nth-child(2) { animation-delay: 0.2s; }
.loading .dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
</head>
<body>
<div id="app">
  <div class="loading">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span style="margin-left: 8px;">Loading your tutorial...</span>
  </div>
</div>
<div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<script>
"use strict";

var S = { tutorial: null, progress: null };
var view = { kind: "step", index: 0 };
var requested = false;
var saveTimer = null;
var lastCheckResults = null;
var checking = false;

// Capability token minted by the server for this canvas instance. Every API call
// carries it, so a page that never received this document cannot read the lesson
// or drive the session bridge.
var TOKEN = (document.querySelector('meta[name="tutorial-token"]') || {}).content || "";

// Single entry point for API calls so the token is never forgotten on a route.
function api(path, options) {
  var opts = options || {};
  var headers = { "x-tutorial-token": TOKEN };
  if (opts.body) headers["Content-Type"] = "application/json";
  return fetch(path, { method: opts.method || "GET", headers: headers, body: opts.body });
}

// Every state document the canvas receives goes through here: the initial /state
// read, an event from the stream, and the /reset response. They can arrive out of
// order, because the read is issued before the stream is open, so a tutorial or
// reset event can be applied first and the older read would then overwrite it.
// Revisions only ever move forward, so a snapshot no newer than the one already
// applied is dropped. Without that the canvas can end up sitting on a lesson that
// no longer exists, with no further event coming to correct it, and every save it
// makes refused as a stale revision.
var appliedRev = -1;

function applyState(next) {
  if (!next || typeof next !== "object") return false;
  var rev = Number(next.rev) || 0;
  if (appliedRev !== -1 && rev <= appliedRev) return false;
  S = next;
  appliedRev = rev;
  return true;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toast(msg) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function () { el.classList.remove("show"); }, 2600);
}

// Stamped on every progress write. The server rejects a body whose revision is
// behind its own, which is what stops a debounced save composed before the agent
// published, approved, or reset from landing on top of the newer state.
function progressBody() {
  return JSON.stringify({ rev: S.rev || 0, progress: S.progress });
}

function saveProgress(immediate) {
  if (saveTimer) clearTimeout(saveTimer);
  var doSave = function () {
    // A rejected save needs no handling here: every revision bump also broadcasts,
    // so the authoritative state is already on its way over the event stream.
    api("/progress", { method: "POST", body: progressBody() }).catch(function () {});
  };
  if (immediate) doSave();
  else saveTimer = setTimeout(doSave, 450);
}

function stepProgress(stepId) {
  if (!S.progress.steps[stepId]) {
    S.progress.steps[stepId] = { understood: false, quizAnswer: null, quizCorrect: false };
  }
  return S.progress.steps[stepId];
}

function understoodCount() {
  var n = 0;
  (S.tutorial.steps || []).forEach(function (s) {
    if (stepProgress(s.id).understood) n++;
  });
  return n;
}

function exerciseUnlocked() {
  return understoodCount() === (S.tutorial.steps || []).length;
}

// Above this many matrix cells an exact LCS is not worth the memory, so oversized
// snippets fall back to a positional compare. 20k characters of realistic code is
// well under the cap; the guard only fires on pathological input.
var DIFF_CELL_BUDGET = 250000;

// Suffix LCS table: m[i][j] is the LCS length of b[i..] and a[j..]. Walking it
// forward reconstructs which occurrences pair up and which do not.
function lcsSuffixLengths(b, a) {
  var m = new Array(b.length + 1), i, j;
  for (i = 0; i <= b.length; i++) {
    m[i] = new Array(a.length + 1);
    for (j = 0; j <= a.length; j++) m[i][j] = 0;
  }
  for (i = b.length - 1; i >= 0; i--) {
    for (j = a.length - 1; j >= 0; j--) {
      m[i][j] = b[i] === a[j]
        ? m[i + 1][j + 1] + 1
        : Math.max(m[i + 1][j], m[i][j + 1]);
    }
  }
  return m;
}

// Sequence-aware line diff. Comparing sets of lines collapses duplicates and
// throws away ordering, so two "x" lines becoming one showed no removal at all
// and a reordering showed no change. Walking an LCS marks one occurrence per
// unmatched line and respects position. Lines are keyed on their trimmed text so
// a pure re-indent is not reported as a change, and blank lines are never marked.
function diffLines(before, after) {
  var b = String(before || "").split("\\n");
  var a = String(after || "").split("\\n");
  var bKey = b.map(function (line) { return line.trim(); });
  var aKey = a.map(function (line) { return line.trim(); });
  var removed = {}, added = {};
  var i = 0, j = 0, k;

  if ((b.length + 1) * (a.length + 1) <= DIFF_CELL_BUDGET) {
    var m = lcsSuffixLengths(bKey, aKey);
    while (i < b.length && j < a.length) {
      if (bKey[i] === aKey[j]) { i++; j++; continue; }
      // Drop from whichever side leaves the longer common subsequence behind.
      if (m[i + 1][j] >= m[i][j + 1]) { removed[i] = true; i++; }
      else { added[j] = true; j++; }
    }
    for (; i < b.length; i++) removed[i] = true;
    for (; j < a.length; j++) added[j] = true;
  } else {
    // Oversized snippet: compare line for line by position instead of building a
    // quadratic matrix. Coarser on inserts, but bounded and still order-aware.
    var max = Math.max(b.length, a.length);
    for (k = 0; k < max; k++) {
      if (bKey[k] !== aKey[k]) {
        if (k < b.length) removed[k] = true;
        if (k < a.length) added[k] = true;
      }
    }
  }

  return {
    before: b.map(function (l, idx) { return { text: l, removed: !!bKey[idx] && !!removed[idx] }; }),
    after: a.map(function (l, idx) { return { text: l, added: !!aKey[idx] && !!added[idx] }; })
  };
}

function codeBlock(lines, cls) {
  var html = '<div class="code-block">';
  lines.forEach(function (l) {
    var marker = l[cls] ? " " + cls : "";
    html += '<div class="code-line' + marker + '">' + (esc(l.text) || " ") + "</div>";
  });
  return html + "</div>";
}

// --- Views ---

function renderEmpty() {
  return '<div class="empty-state">' +
    '<h1>Edit Tutorial</h1>' +
    '<p>Copilot just changed your code. Turn those edits into a lesson: a guided walkthrough of every change, then a hands-on exercise where you apply the same idea yourself, with a twist.</p>' +
    '<button class="btn btn-primary" onclick="requestTutorial()">Build my tutorial</button>' +
    (requested
      ? '<div class="waiting">Copilot is reviewing its edits and writing your lesson. This view updates automatically.</div>'
      : '<p style="margin-top:1rem; font-size:0.8rem;">You can also just ask Copilot: "teach me what you changed".</p>') +
    "</div>";
}

function renderStepper() {
  var html = '<div class="stepper">';
  (S.tutorial.steps || []).forEach(function (s, i) {
    var p = stepProgress(s.id);
    var cls = "step-node";
    var isActive = view.kind === "step" && view.index === i;
    if (isActive) cls += " active";
    if (p.understood) cls += " done";
    html += '<button class="' + cls + '" aria-label="Step ' + (i + 1) + ': ' + esc(s.heading) + '"' +
      (isActive ? ' aria-current="step"' : "") + ' onclick="gotoStep(' + i + ')">' +
      (p.understood ? "&#10003; " : "") + (i + 1) + "</button>";
    html += '<span class="step-connector"></span>';
  });
  var unlocked = exerciseUnlocked();
  var exCls = "step-node exercise-node" + (unlocked ? " unlocked" : " locked");
  if (view.kind === "exercise") exCls += " active";
  if (S.progress.exercise.completed) exCls += " done";
  html += '<button class="' + exCls + '" onclick="gotoExercise()">' +
    (S.progress.exercise.completed ? "&#10003; " : "") + "Exercise</button>";
  return html + "</div>";
}

function renderQuiz(step, p) {
  var q = step.quiz;
  if (!q) return "";
  var html = '<div class="quiz"><div class="q-label">Check yourself</div>' +
    '<div class="q-text">' + esc(q.question) + "</div>";
  q.options.forEach(function (opt, i) {
    var cls = "quiz-option";
    if (p.quizAnswer === i) cls += i === q.answerIndex ? " picked-right" : " picked-wrong";
    html += '<button class="' + cls + '" onclick="answerQuiz(\\'' + step.id + '\\',' + i + ')">' + esc(opt) + "</button>";
  });
  if (p.quizAnswer !== null && p.quizAnswer !== undefined) {
    if (p.quizAnswer === q.answerIndex) {
      html += '<div class="quiz-why right">Correct.' + (q.why ? " " + esc(q.why) : "") + "</div>";
    } else {
      html += '<div class="quiz-why">Not quite, try another option.' + (q.why ? " Hint: " + esc(q.why) : "") + "</div>";
    }
  }
  return html + "</div>";
}

function renderStep(i) {
  var step = S.tutorial.steps[i];
  var p = stepProgress(step.id);
  var d = diffLines(step.before, step.after);
  var quizGate = step.quiz && !p.quizCorrect;
  var isLast = i === S.tutorial.steps.length - 1;

  var html = '<div class="card">';
  if (step.file) html += '<span class="file-chip">' + esc(step.file) + "</span>";
  html += '<div class="step-heading">' + esc(step.heading) + "</div>";
  html += '<div class="explanation">' + esc(step.explanation) + "</div>";

  if (step.before || step.after) {
    html += '<div class="diff-grid">';
    if (step.before) {
      html += '<div class="diff-pane"><div class="diff-label">Before</div>' + codeBlock(d.before, "removed") + "</div>";
    }
    html += '<div class="diff-pane"><div class="diff-label">' + (step.before ? "After" : "New code") + "</div>" + codeBlock(d.after, "added") + "</div>";
    html += "</div>";
  }

  html += renderQuiz(step, p);

  html += '<div class="actions-row">';
  if (i > 0) html += '<button class="btn btn-ghost" onclick="gotoStep(' + (i - 1) + ')">Back</button>';
  html += '<button class="btn btn-primary" ' + (quizGate ? "disabled" : "") + ' onclick="markUnderstood(\\'' + step.id + '\\',' + i + ')">' +
    (p.understood ? (isLast ? "Go to exercise" : "Next step") : "Got it" + (isLast ? ", unlock the exercise" : ", next step")) +
    "</button>";
  if (quizGate) html += '<span class="hint-inline">Answer the quiz correctly to continue.</span>';
  html += "</div></div>";
  return html;
}

function renderChecks() {
  if (!lastCheckResults) return "";
  var html = '<div class="check-results">';
  lastCheckResults.forEach(function (r) {
    // A stalled check is not a failed requirement, so say so rather than telling
    // the learner their code is wrong.
    var label = r.pass
      ? r.hint || "Requirement met"
      : r.stalled
        ? "This check could not be run" + (r.hint ? " (" + r.hint + ")" : "") + ". Ask Copilot for a review instead."
        : r.hint || "One requirement not met yet";
    html += '<div class="check-item ' + (r.pass ? "pass" : r.stalled ? "stalled" : "fail") + '">' +
      '<span class="mark">' + (r.pass ? "[x]" : r.stalled ? "[!]" : "[ ]") + "</span>" +
      "<span>" + esc(label) + "</span></div>";
  });
  return html + "</div>";
}

function renderExercise() {
  var ex = S.tutorial.exercise;
  var pe = S.progress.exercise;

  if (!exerciseUnlocked()) {
    var remaining = S.tutorial.steps.length - understoodCount();
    return '<div class="locked-note">Finish the walkthrough first: ' + remaining +
      " step" + (remaining === 1 ? "" : "s") + " to go. The exercise builds on what each step teaches.</div>";
  }

  var html = "";
  if (pe.completed) {
    html += '<div class="banner-complete"><h2>Exercise complete</h2><p>' +
      (pe.completedBy === "copilot"
        ? esc(pe.approvalNote || "Copilot reviewed your attempt and approved it.")
        : "All checks passed. You applied the pattern on your own, which is the whole point.") +
      "</p></div>";
  }

  html += '<div class="card">';
  if (ex.file) html += '<span class="file-chip">' + esc(ex.file) + "</span>";
  html += '<div class="step-heading">' + esc(ex.heading) + "</div>";
  html += '<div class="exercise-brief">' + esc(ex.brief) + "</div>";

  if (pe.hintsRevealed > 0) {
    html += '<div class="hints">';
    ex.hints.slice(0, pe.hintsRevealed).forEach(function (h, i) {
      html += '<div class="hint-item">Hint ' + (i + 1) + ": " + esc(h) + "</div>";
    });
    html += "</div>";
  }

  html += '<textarea id="editor" class="editor" aria-label="Exercise code editor" spellcheck="false" oninput="onEditorInput(this)" onkeydown="onEditorKey(event)">' +
    esc(pe.code) + "</textarea>";

  html += renderChecks();

  html += '<div class="actions-row">';
  html += '<button class="btn btn-accent" onclick="checkWork(this)"' + (checking ? " disabled" : "") + ">" +
    (checking ? "Checking..." : "Check my work") + "</button>";
  if (pe.hintsRevealed < ex.hints.length) {
    html += '<button class="btn btn-ghost" onclick="revealHint()">Hint (' + (pe.hintsRevealed + 1) + " of " + ex.hints.length + ")</button>";
  }
  html += '<button class="btn btn-ghost" onclick="askReview(this)">Ask Copilot for a review</button>';
  if (ex.solution && !pe.solutionRevealed && pe.failedAttempts >= 3) {
    html += '<button class="btn btn-ghost" onclick="revealSolution()">Show reference solution</button>';
  }
  html += "</div>";

  if (pe.solutionRevealed && ex.solution) {
    html += '<div class="solution-block"><div class="diff-label">Reference solution</div>' +
      codeBlock(String(ex.solution).split("\\n").map(function (t) { return { text: t }; }), "none") +
      '<p class="hint-inline" style="margin-top:0.4rem;">Study it, then adapt your own attempt so the checks pass.</p></div>';
  }

  html += "</div>";
  return html;
}

function render() {
  var app = document.getElementById("app");
  if (!S.tutorial) { app.innerHTML = renderEmpty(); return; }
  if (view.kind === "step" && view.index >= S.tutorial.steps.length) view = { kind: "step", index: 0 };
  if (!S.progress) S.progress = { steps: {}, exercise: { code: S.tutorial.exercise.starterCode || "", attempts: 0, failedAttempts: 0, hintsRevealed: 0, solutionRevealed: false, completed: false } };

  var total = S.tutorial.steps.length + 1;
  var done = understoodCount() + (S.progress.exercise.completed ? 1 : 0);

  var html = '<div class="header"><div>' +
    '<div class="kicker">Edit Tutorial</div>' +
    "<h1>" + esc(S.tutorial.title) + "</h1></div>" +
    '<span class="progress-pill">' + done + " / " + total + " complete</span></div>";
  if (S.tutorial.summary) html += '<p class="summary">' + esc(S.tutorial.summary) + "</p>";

  html += renderStepper();
  html += view.kind === "exercise" ? renderExercise() : renderStep(view.index);
  html += '<div class="footer-row"><button class="reset-link" onclick="resetProgress()">Reset my progress</button></div>';

  app.innerHTML = html;
}

// --- Interactions ---

function gotoStep(i) {
  view = { kind: "step", index: i };
  lastCheckResults = null;
  render();
}

function gotoExercise() {
  view = { kind: "exercise" };
  render();
}

function answerQuiz(stepId, optionIndex) {
  var step = S.tutorial.steps.filter(function (s) { return s.id === stepId; })[0];
  var p = stepProgress(stepId);
  p.quizAnswer = optionIndex;
  if (step.quiz && optionIndex === step.quiz.answerIndex) p.quizCorrect = true;
  saveProgress();
  render();
}

function markUnderstood(stepId, i) {
  var p = stepProgress(stepId);
  p.understood = true;
  saveProgress(true);
  if (i < S.tutorial.steps.length - 1) gotoStep(i + 1);
  else gotoExercise();
}

function onEditorInput(el) {
  S.progress.exercise.code = el.value;
  saveProgress();
}

function onEditorKey(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    var el = e.target;
    var start = el.selectionStart, end = el.selectionEnd;
    el.value = el.value.slice(0, start) + "  " + el.value.slice(end);
    el.selectionStart = el.selectionEnd = start + 2;
    S.progress.exercise.code = el.value;
    saveProgress();
  }
}

// Solution checks are regexes the agent wrote, run against whatever the learner
// typed. Even a pattern that compiles can backtrack catastrophically on a near
// match and freeze the tab, so whenever a worker can be created the checks run
// there: it evaluates them one at a time and reports each result as it lands, and
// if the batch blows its budget the worker is terminated and the unfinished checks
// come back as "not evaluated", leaving the canvas responsive. If no worker can be
// started at all, the checks stay unevaluated rather than falling back to this
// thread: without a worker there is no way to stop a runaway pattern, and an agent
// review is a working alternative where a frozen tab is not.
var CHECK_BUDGET_MS = 2000;
var CHECK_WORKER_SRC = [
  "self.onmessage = function (e) {",
  "  var d = e.data || {};",
  "  var checks = d.checks || [];",
  "  for (var i = 0; i < checks.length; i++) {",
  "    var pass = false;",
  "    try { pass = new RegExp(checks[i].pattern, checks[i].flags || 'm').test(d.code || ''); }",
  "    catch (err) { pass = false; }",
  "    self.postMessage({ index: i, pass: pass });",
  "  }",
  "  self.postMessage({ done: true });",
  "};"
].join("\\n");

// Runs the checks and calls done(results, reason). Each result is true, false, or
// null for a check that was never evaluated. reason is "ok" when the batch ran to
// completion, "timeout" when it blew the budget, or "unavailable" when no worker
// could be started, which the caller uses to explain itself accurately.
function runChecks(checks, codeText, done) {
  var results = [], i;
  for (i = 0; i < checks.length; i++) results.push(null);
  if (!checks.length) { done(results, "ok"); return; }

  var worker = null, blobUrl = null;
  try {
    blobUrl = URL.createObjectURL(new Blob([CHECK_WORKER_SRC], { type: "text/javascript" }));
    worker = new Worker(blobUrl);
  } catch (err) {
    worker = null;
  }

  var release = function () {
    if (!blobUrl) return;
    try { URL.revokeObjectURL(blobUrl); } catch (err) {}
    blobUrl = null;
  };

  // No worker means no way to interrupt a runaway pattern. Evaluating here
  // instead would put an agent-authored regex on the UI thread with no timeout at
  // all, and the publish-time screen is a conservative heuristic with known gaps
  // rather than a proof, so one bad pattern could freeze the canvas outright with
  // nothing left to stop it. An unevaluated check costs the learner a click on
  // "Ask Copilot for a review"; a frozen tab costs them their work.
  if (!worker) {
    release();
    done(results, "unavailable");
    return;
  }

  var settled = false;
  var finish = function (reason) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    try { worker.terminate(); } catch (err) {}
    release();
    done(results, reason);
  };
  var timer = setTimeout(function () { finish("timeout"); }, CHECK_BUDGET_MS);

  worker.onmessage = function (e) {
    var msg = e.data || {};
    if (msg.done) { finish("ok"); return; }
    if (typeof msg.index === "number") results[msg.index] = !!msg.pass;
  };
  // A policy that blocks blob: workers fails asynchronously, so the try/catch
  // above never sees it. Whatever the worker managed to report is kept; the rest
  // stay unevaluated.
  worker.onerror = function () { finish("unavailable"); };
  worker.postMessage({ checks: checks, code: codeText });
}

function checkWork(btn) {
  if (checking) return;
  var ex = S.tutorial.exercise;
  // The exact exercise, progress record, and code snapshot this run describes.
  // The callback refuses to apply its verdict to anything else.
  var startedOn = S.progress.exercise;
  var codeText = startedOn.code || "";

  if (!ex.checks.length) {
    // A lesson can reach the canvas with no runnable checks (patterns dropped
    // when the saved state was re-screened). "Nothing to check" must not fall
    // through to "everything passed".
    lastCheckResults = null;
    toast("This exercise has no automatic checks. Ask Copilot for a review.");
    return;
  }

  checking = true;
  // Flip the button in place rather than re-rendering, so a check that finishes
  // in a millisecond does not blow away the editor the learner is typing in.
  if (btn) { btn.disabled = true; btn.textContent = "Checking..."; }

  runChecks(ex.checks, codeText, function (results, reason) {
    checking = false;
    // A verdict is only meaningful for the exercise, progress record, and code it
    // was computed from. A new lesson or a progress reset replaces all of S, and
    // comparing the progress object catches that directly rather than inferring it
    // from the tutorial, which is what keeps this correct if the update path ever
    // starts merging state instead of replacing it.
    if (!S.tutorial || !S.progress ||
        S.tutorial.exercise.checks !== ex.checks ||
        S.progress.exercise !== startedOn) {
      // That path repaints on its own; this render is what guarantees the pending
      // "Checking..." button never sticks if it did not.
      render();
      return;
    }
    var pe = startedOn;
    if ((pe.code || "") !== codeText) {
      // The learner kept typing while the checks ran, so this verdict describes
      // code they have already replaced. Crediting it could complete the exercise
      // on the strength of an answer that is no longer in the editor.
      lastCheckResults = null;
      render();
      toast("Your code changed while the checks were running. Check it again.");
      return;
    }
    var allPass = true;
    lastCheckResults = ex.checks.map(function (c, i) {
      var pass = results[i] === true;
      if (!pass) allPass = false;
      return { pass: pass, stalled: results[i] === null, hint: c.hint };
    });
    var stalled = lastCheckResults.some(function (r) { return r.stalled; });
    pe.attempts++;
    if (allPass) {
      pe.completed = true;
      pe.completedBy = "checks";
      pe.completedAt = new Date().toISOString();
    } else if (!stalled) {
      // Only count a run where every check actually returned a verdict. A stalled
      // check is not the learner getting it wrong, and failedAttempts is what
      // offers up the reference solution, so an unrunnable check must not push
      // them toward the answer they never failed to reach.
      pe.failedAttempts++;
    }
    saveProgress(true);
    render();
    if (allPass) toast("All checks passed. Nicely done.");
    else if (reason === "unavailable") toast("Automatic checks cannot run in this view. Ask Copilot for a review instead.");
    else if (stalled) toast("A check took too long to run and was stopped. Ask Copilot for a review instead.");
  });
}

function revealHint() {
  S.progress.exercise.hintsRevealed++;
  saveProgress();
  render();
}

function revealSolution() {
  S.progress.exercise.solutionRevealed = true;
  saveProgress();
  render();
}

function askReview(btn) {
  if (btn) btn.disabled = true;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  api("/progress", { method: "POST", body: progressBody() })
    .then(function (r) {
      // 409 means the server already holds newer progress than this flush, so the
      // attempt it would review is on the server either way. Only a real failure
      // to store should stop the review from being asked for.
      if (!r.ok) throw new Error("progress rejected");
      return api("/review", { method: "POST" });
    })
    .then(function (r) {
      toast(r.ok
        ? "Sent to Copilot. Watch the chat for coaching."
        : "Copilot did not receive your attempt. Try again in a moment.");
    })
    .catch(function () { toast("Could not reach the session."); })
    .then(function () { if (btn) setTimeout(function () { btn.disabled = false; }, 2000); });
}

function requestTutorial() {
  if (requested) return;
  requested = true;
  render();
  api("/request-tutorial", { method: "POST" })
    .then(function (r) {
      // A failed send leaves the learner staring at "Copilot is writing your
      // lesson" forever, so drop back out of the waiting state and say so.
      if (r.ok) return;
      requested = false;
      toast("Copilot did not get the request. Try again, or ask in the chat.");
      render();
    })
    .catch(function () {
      requested = false;
      toast("Could not reach the session.");
      render();
    });
}

function resetProgress() {
  api("/reset", { method: "POST" })
    .then(function (r) {
      // An error body is not a state document, so do not let it become S.
      if (!r.ok) throw new Error("reset rejected");
      return r.json();
    })
    .then(function (state) {
      // The broadcast for this same reset may have arrived first and carried the
      // same revision, in which case it already moved the view and there is
      // nothing left to do here.
      if (applyState(state)) {
        view = { kind: "step", index: 0 };
        lastCheckResults = null;
      }
      render();
    })
    .catch(function () { toast("Could not reset your progress."); });
}

// --- Wiring ---

// EventSource cannot set request headers, so the stream carries the capability
// token as a query parameter instead.
var evtSource = new EventSource("/events?token=" + encodeURIComponent(TOKEN));
evtSource.onmessage = function (e) {
  var msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  if (!msg || !msg.state) return;
  var hadTutorial = !!S.tutorial;
  // A replayed or out-of-order event carries a revision already applied; its view
  // changes and toasts would be duplicates, so stop here.
  if (!applyState(msg.state)) return;
  if (!hadTutorial && S.tutorial) {
    view = { kind: "step", index: 0 };
    toast("Your tutorial is ready.");
  }
  if (msg.kind === "approved") toast("Copilot approved your exercise.");
  if (msg.kind === "reset") { view = { kind: "step", index: 0 }; lastCheckResults = null; }
  render();
};

api("/state")
  .then(function (r) {
    if (!r.ok) throw new Error("state rejected");
    return r.json();
  })
  .then(function (state) {
    // This read was issued before the stream opened. If an event has already
    // delivered a newer document, this snapshot is stale and the opening step it
    // would pick is wrong, so leave the applied state and its view alone.
    if (applyState(state) && S.tutorial && S.progress) {
      var firstOpen = -1;
      S.tutorial.steps.forEach(function (s, i) {
        if (firstOpen === -1 && !(S.progress.steps[s.id] || {}).understood) firstOpen = i;
      });
      view = firstOpen === -1 ? { kind: "exercise" } : { kind: "step", index: firstOpen };
    }
    render();
  })
  .catch(function () { render(); });
</script>
</body>
</html>`;
}

// --- Server ---

const JSON_HEADERS = { "Content-Type": "application/json" };
// A progress payload is the exercise code the learner typed plus a little
// bookkeeping, so a few hundred KB is already far past anything legitimate.
const MAX_BODY_BYTES = 256 * 1024;
// Routes that read state or drive the session. All of them require the
// capability token; the served document at "/" is the only anonymous route.
const API_PATHS = new Set(["/events", "/state", "/progress", "/review", "/request-tutorial", "/reset"]);

// The exact loopback authority this server bound to. A DNS-rebinding page
// reaches us under its own hostname (Host: attacker.example:<port>), so pinning
// Host refuses those requests - including the one that would otherwise read the
// token straight out of the served document - before any state is touched.
// An Origin check alone cannot do that, since a rebinding attacker controls both.
function canonicalHost(server) {
    const address = server.address();
    return address && typeof address === "object" ? "127.0.0.1:" + address.port : null;
}

// Per-instance capability token, minted at startup and embedded in the page we
// serve. Only that document knows it, so a blind cross-origin caller cannot read
// the lesson or the code attempt, nor forge a reset or a session prompt.
// EventSource cannot set request headers, so /events also accepts the token as a
// query parameter; every other route requires the header.
function hasToken(req, url, token, allowQuery) {
    const header = req.headers["x-tutorial-token"];
    const value = Array.isArray(header) ? header[0] : header;
    if (typeof value === "string" && value.length > 0 && value === token) return true;
    if (!allowQuery) return false;
    const query = url.searchParams.get("token");
    return typeof query === "string" && query.length > 0 && query === token;
}

// Reject a state-changing POST the browser marks as cross-site. Fetches from the
// document we served carry an Origin equal to our own host; anything else is a
// third-party page trying to drive this canvas.
function isCrossSiteRequest(req) {
    const origin = req.headers.origin;
    if (origin) {
        if (origin === "http://" + req.headers.host) return false;
        if (origin === "null") return true;
        if (/^https?:\/\//i.test(origin)) return true;
        return false;
    }
    const site = req.headers["sec-fetch-site"];
    return site === "cross-site" || site === "same-site";
}

// Read a request body under a hard byte cap. Resolves { ok: false } once the cap
// is passed so the handler answers with 413 instead of buffering without limit.
function readBody(req, limit) {
    return new Promise((resolve) => {
        let data = "", size = 0, settled = false;
        const settle = (result) => { if (!settled) { settled = true; resolve(result); } };
        req.on("data", (chunk) => {
            if (settled) return;
            size += chunk.length;
            if (size > limit) { req.pause(); settle({ ok: false, body: "" }); return; }
            data += chunk;
        });
        req.on("end", () => settle({ ok: true, body: data }));
        req.on("error", () => settle({ ok: false, body: "" }));
    });
}

// Deliver a prompt to the chat session. Returns false when no session is joined
// or the bridge rejects the send, so the canvas can tell the learner nothing was
// delivered rather than leaving them waiting on a silent failure.
async function sendToSession(prompt) {
    if (!sessionRef) return false;
    try {
        await sessionRef.send(prompt);
        return true;
    } catch {
        return false;
    }
}

function sendJson(res, status, payload, extraHeaders) {
    res.writeHead(status, extraHeaders ? { ...JSON_HEADERS, ...extraHeaders } : JSON_HEADERS);
    res.end(JSON.stringify(payload));
}

async function startServer(instanceId) {
    const token = randomUUID();
    const html = renderHtml(token);

    const server = createServer(async (req, res) => {
        try {
            // Host pin first, ahead of every read and write.
            const expected = canonicalHost(server);
            if (!expected || String(req.headers.host || "").toLowerCase() !== expected) {
                sendJson(res, 403, { ok: false, error: "bad_host" });
                return;
            }

            const url = new URL(req.url, "http://" + expected);
            const state = getState(instanceId);

            if (API_PATHS.has(url.pathname)) {
                if (!hasToken(req, url, token, url.pathname === "/events")) {
                    sendJson(res, 403, { ok: false, error: "missing_capability_token" });
                    return;
                }
                if (req.method === "POST" && isCrossSiteRequest(req)) {
                    sendJson(res, 403, { ok: false, error: "cross_site_blocked" });
                    return;
                }
            }

            if (url.pathname === "/events" && req.method === "GET") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                });
                res.write(":\n\n");
                let clients = sseClients.get(instanceId);
                if (!clients) { clients = new Set(); sseClients.set(instanceId, clients); }
                clients.add(res);
                req.on("close", () => { clients.delete(res); });
                return;
            }

            if (url.pathname === "/state" && req.method === "GET") {
                sendJson(res, 200, state);
                return;
            }

            if (url.pathname === "/progress" && req.method === "POST") {
                const { ok, body } = await readBody(req, MAX_BODY_BYTES);
                if (!ok) {
                    // The rest of the body is still in flight and will never be
                    // read, so close the connection rather than leave a
                    // half-drained socket in the keep-alive pool.
                    sendJson(res, 413, { ok: false, error: "payload_too_large" }, { Connection: "close" });
                    return;
                }
                let incoming = null;
                try { incoming = JSON.parse(body); } catch {}
                const progress = incoming && typeof incoming === "object" ? incoming.progress : null;
                if (!progress || typeof progress !== "object" || !progress.exercise) {
                    sendJson(res, 400, { ok: false, error: "invalid_progress" });
                    return;
                }
                // This body was composed against a specific revision. If the lesson
                // was republished, approved, or reset since then, the canvas is
                // describing an exercise that no longer exists; the broadcast for
                // that change is already on its way, so drop this write.
                if (Number(incoming.rev) !== (state.rev || 0)) {
                    sendJson(res, 409, { ok: false, error: "stale_revision", rev: state.rev || 0 });
                    return;
                }
                state.progress = progress;
                await saveState(sessionRef?.workspacePath, state);
                sendJson(res, 200, { ok: true, rev: state.rev || 0 });
                return;
            }

            if (url.pathname === "/review" && req.method === "POST") {
                if (!state.tutorial) {
                    sendJson(res, 409, { ok: false, error: "no_tutorial" });
                    return;
                }
                // Report the real outcome: the canvas promises coaching only when
                // the prompt actually reached the session.
                const sent = await sendToSession(buildReviewPrompt(state));
                if (!sent) {
                    sendJson(res, 502, { ok: false, error: "session_unavailable" });
                    return;
                }
                sendJson(res, 200, { ok: true });
                return;
            }

            if (url.pathname === "/request-tutorial" && req.method === "POST") {
                const sent = await sendToSession(buildTutorialRequestPrompt());
                if (!sent) {
                    sendJson(res, 502, { ok: false, error: "session_unavailable" });
                    return;
                }
                sendJson(res, 200, { ok: true });
                return;
            }

            if (url.pathname === "/reset" && req.method === "POST") {
                state.progress = state.tutorial ? freshProgress(state.tutorial) : null;
                bumpRev(state);
                await saveState(sessionRef?.workspacePath, state);
                broadcast(instanceId, { kind: "reset", state });
                sendJson(res, 200, state);
                return;
            }

            if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(html);
                return;
            }

            sendJson(res, 404, { ok: false, error: "not_found" });
        } catch {
            if (!res.headersSent) sendJson(res, 500, { ok: false, error: "internal_error" });
            else { try { res.end(); } catch {} }
        }
    });

    await new Promise((resolve, reject) => {
        const onError = (err) => { server.removeListener("listening", onListening); reject(err); };
        const onListening = () => { server.removeListener("error", onError); resolve(); };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(0, "127.0.0.1");
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

// --- Extension ---

const tutorialSchema = {
    type: "object",
    description: "The tutorial to publish, built from the code edits made in this session.",
    properties: {
        title: { type: "string", description: "Short lesson title, e.g. 'Adding retry with backoff'" },
        summary: { type: "string", description: "One or two sentences on what changed overall and why" },
        steps: {
            type: "array",
            description: "One step per focused edit, in reading order (3 to 6 works best)",
            items: {
                type: "object",
                properties: {
                    file: { type: "string", description: "Repo-relative path of the edited file" },
                    heading: { type: "string", description: "What this edit accomplishes" },
                    explanation: { type: "string", description: "Teach the edit: what it does, why it was needed, what to notice" },
                    before: { type: "string", description: "Relevant snippet before the edit (omit for new files)" },
                    after: { type: "string", description: "The same region after the edit" },
                    quiz: {
                        type: "object",
                        description: "Optional multiple-choice comprehension check for this step",
                        properties: {
                            question: { type: "string" },
                            options: { type: "array", items: { type: "string" } },
                            answerIndex: { type: "number", description: "Zero-based index of the correct option" },
                            why: { type: "string", description: "Shown after answering; explains the correct choice" },
                        },
                        required: ["question", "options", "answerIndex"],
                    },
                },
                required: ["heading", "explanation"],
            },
        },
        exercise: {
            type: "object",
            description: "Hands-on task the learner finishes in the canvas. It must apply the same technique as the session's edits but as a slight variation (different function, module, field, or values), never a repeat of an edit already shown.",
            properties: {
                heading: { type: "string" },
                brief: { type: "string", description: "What to build and how it varies from the walkthrough edits" },
                file: { type: "string", description: "File the exercise pretends to edit" },
                starterCode: { type: "string", description: "Code the learner starts from, with the variation left unimplemented" },
                hints: { type: "array", items: { type: "string" }, description: "2 or 3 hints, gentle to specific" },
                solutionChecks: {
                    type: "array",
                    description: "Regex checks that a correct attempt must satisfy; each hint is shown to the learner when its check fails",
                    items: {
                        type: "object",
                        properties: {
                            pattern: { type: "string", description: "JavaScript regex source, e.g. 'maxAttempts\\\\s*=\\\\s*5'" },
                            flags: { type: "string", description: "Regex flags, default 'm'" },
                            hint: { type: "string", description: "Learner-facing nudge when this check fails" },
                        },
                        required: ["pattern"],
                    },
                },
                solution: { type: "string", description: "Reference solution, offered only after repeated failed attempts" },
            },
            required: ["brief", "starterCode", "solutionChecks"],
        },
    },
    required: ["title", "steps", "exercise"],
};

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "edit-tutorial",
            displayName: "Edit Tutorial",
            description:
                "Turns the code edits made in this session into an interactive lesson: a step-by-step walkthrough of each change with before/after views and comprehension quizzes, then a hands-on exercise that varies the same edits so the learner finishes the change themselves. After making code edits, publish a lesson with set_tutorial; check on the learner with get_progress; approve a reviewed attempt with approve_exercise.",
            inputSchema: {
                type: "object",
                properties: {
                    tutorial: tutorialSchema,
                },
            },
            actions: [
                {
                    name: "set_tutorial",
                    description:
                        "Publish (or replace) the lesson shown in the canvas. Build it from the code edits made in this session: one step per focused change with before/after snippets, and an exercise that is a slight variation of those edits (same technique, different target), never a repeat. Republishing resets learner progress.",
                    inputSchema: tutorialSchema,
                    handler: async (ctx) => {
                        const result = normalizeTutorial(ctx.input);
                        if (result.error) return { ok: false, error: result.error };
                        const state = getState(ctx.instanceId);
                        state.tutorial = result.tutorial;
                        state.progress = freshProgress(result.tutorial);
                        bumpRev(state);
                        await saveState(sessionRef?.workspacePath, state);
                        broadcast(ctx.instanceId, { kind: "tutorial", state });
                        return {
                            ok: true,
                            steps: result.tutorial.steps.length,
                            checks: result.tutorial.exercise.checks.length,
                            note: "Lesson published. The learner works through the steps, then finishes the exercise in the canvas.",
                        };
                    },
                },
                {
                    name: "get_progress",
                    description:
                        "Return the learner's progress: which steps are understood, quiz answers, and the exercise state including their current code attempt. Use it to coach without asking the learner to paste anything.",
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        if (!state.tutorial) return { ok: false, error: "No tutorial has been published yet." };
                        return {
                            ok: true,
                            title: state.tutorial.title,
                            stepsTotal: state.tutorial.steps.length,
                            stepsUnderstood: Object.values(state.progress?.steps || {}).filter((s) => s.understood).length,
                            progress: state.progress,
                        };
                    },
                },
                {
                    name: "approve_exercise",
                    description:
                        "Mark the exercise complete after reviewing the learner's attempt and judging it correct. Call this only when their code genuinely satisfies the exercise brief.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            note: { type: "string", description: "Short congratulatory note shown in the completion banner" },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        if (!state.tutorial || !state.progress) {
                            return { ok: false, error: "No tutorial in progress." };
                        }
                        state.progress.exercise.completed = true;
                        state.progress.exercise.completedBy = "copilot";
                        state.progress.exercise.completedAt = new Date().toISOString();
                        state.progress.exercise.approvalNote = text(ctx.input?.note, 300);
                        bumpRev(state);
                        await saveState(sessionRef?.workspacePath, state);
                        broadcast(ctx.instanceId, { kind: "approved", state });
                        return { ok: true };
                    },
                },
                {
                    name: "reset_progress",
                    description: "Reset the learner's progress for the current lesson (steps and exercise) without changing the lesson content.",
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        if (!state.tutorial) return { ok: false, error: "No tutorial has been published yet." };
                        state.progress = freshProgress(state.tutorial);
                        bumpRev(state);
                        await saveState(sessionRef?.workspacePath, state);
                        broadcast(ctx.instanceId, { kind: "reset", state });
                        return { ok: true };
                    },
                },
            ],
            open: async (ctx) => {
                const state = getState(ctx.instanceId);

                if (ctx.input?.tutorial) {
                    const result = normalizeTutorial(ctx.input.tutorial);
                    if (result.tutorial) {
                        state.tutorial = result.tutorial;
                        state.progress = freshProgress(result.tutorial);
                        bumpRev(state);
                        await saveState(sessionRef?.workspacePath, state);
                    }
                } else if (!state.tutorial) {
                    const persisted = await loadState(sessionRef?.workspacePath);
                    if (persisted?.tutorial) {
                        state.tutorial = persisted.tutorial;
                        state.progress = persisted.progress || freshProgress(persisted.tutorial);
                        bumpRev(state);
                    }
                }

                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Edit Tutorial", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                const clients = sseClients.get(ctx.instanceId);
                if (clients) {
                    for (const res of clients) {
                        try { res.end(); } catch {}
                    }
                    clients.clear();
                }
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
                sseClients.delete(ctx.instanceId);
                stateCache.delete(ctx.instanceId);
            },
        }),
    ],
});

sessionRef = session;
