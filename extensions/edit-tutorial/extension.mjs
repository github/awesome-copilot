// Extension: edit-tutorial
// Learn-by-doing canvas. The agent publishes a tutorial built from the code
// edits it made in the current session: a step-by-step walkthrough of each
// change (with optional comprehension quizzes) followed by a hands-on
// exercise that applies the same technique as a slight variation. The learner
// completes the exercise in the canvas; local regex checks or an agent review
// mark it finished.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
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
        const pattern = typeof c?.pattern === "string" ? c.pattern.slice(0, 500) : "";
        if (!pattern) continue;
        const flags = typeof c?.flags === "string" && /^[gims]*$/.test(c.flags) ? c.flags : "m";
        try {
            new RegExp(pattern, flags);
        } catch {
            return { error: "solutionChecks pattern is not a valid regular expression: " + pattern };
        }
        checks.push({ pattern, flags, hint: text(c?.hint, 300) });
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
        state = { tutorial: null, progress: null };
        stateCache.set(instanceId, state);
    }
    return state;
}

// --- Persistence ---

async function saveState(workspacePath, state) {
    if (!workspacePath) return;
    const dir = join(workspacePath, "files");
    try { await mkdir(dir, { recursive: true }); } catch {}
    try {
        await writeFile(join(dir, STATE_FILENAME), JSON.stringify(state, null, 2));
    } catch {}
}

async function loadState(workspacePath) {
    if (!workspacePath) return null;
    try {
        const raw = await readFile(join(workspacePath, "files", STATE_FILENAME), "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
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

function renderHtml() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
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

function saveProgress(immediate) {
  if (saveTimer) clearTimeout(saveTimer);
  var doSave = function () {
    fetch("/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(S.progress)
    }).catch(function () {});
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

function diffLines(before, after) {
  var b = String(before || "").split("\\n");
  var a = String(after || "").split("\\n");
  var bset = {}, aset = {};
  b.forEach(function (l) { if (l.trim()) bset[l.trim()] = true; });
  a.forEach(function (l) { if (l.trim()) aset[l.trim()] = true; });
  return {
    before: b.map(function (l) { return { text: l, removed: !!l.trim() && !aset[l.trim()] }; }),
    after: a.map(function (l) { return { text: l, added: !!l.trim() && !bset[l.trim()] }; })
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
    '<button class="btn btn-primary" onclick="requestTutorial(this)">Build my tutorial</button>' +
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
    if (view.kind === "step" && view.index === i) cls += " active";
    if (p.understood) cls += " done";
    html += '<button class="' + cls + '" onclick="gotoStep(' + i + ')">' +
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
    html += '<div class="check-item ' + (r.pass ? "pass" : "fail") + '">' +
      '<span class="mark">' + (r.pass ? "[x]" : "[ ]") + "</span>" +
      "<span>" + esc(r.pass ? r.hint || "Requirement met" : r.hint || "One requirement not met yet") + "</span></div>";
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
  html += '<button class="btn btn-accent" onclick="checkWork()">Check my work</button>';
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

function checkWork() {
  var ex = S.tutorial.exercise;
  var pe = S.progress.exercise;
  var codeText = pe.code || "";
  var allPass = true;
  lastCheckResults = ex.checks.map(function (c) {
    var pass = false;
    try { pass = new RegExp(c.pattern, c.flags || "m").test(codeText); } catch (err) { pass = false; }
    if (!pass) allPass = false;
    return { pass: pass, hint: c.hint };
  });
  pe.attempts++;
  if (allPass) {
    pe.completed = true;
    pe.completedBy = "checks";
    pe.completedAt = new Date().toISOString();
  } else {
    pe.failedAttempts++;
  }
  saveProgress(true);
  render();
  if (allPass) toast("All checks passed. Nicely done.");
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
  saveProgress(true);
  fetch("/review", { method: "POST" })
    .then(function () { toast("Sent to Copilot. Watch the chat for coaching."); })
    .catch(function () { toast("Could not reach the session."); })
    .then(function () { if (btn) setTimeout(function () { btn.disabled = false; }, 2000); });
}

function requestTutorial(btn) {
  if (btn) btn.disabled = true;
  requested = true;
  fetch("/request-tutorial", { method: "POST" })
    .then(function () { render(); })
    .catch(function () { toast("Could not reach the session."); if (btn) btn.disabled = false; });
}

function resetProgress() {
  fetch("/reset", { method: "POST" })
    .then(function (r) { return r.json(); })
    .then(function (state) {
      S = state;
      view = { kind: "step", index: 0 };
      lastCheckResults = null;
      render();
    })
    .catch(function () {});
}

// --- Wiring ---

var evtSource = new EventSource("/events");
evtSource.onmessage = function (e) {
  var msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  if (!msg || !msg.state) return;
  var editor = document.getElementById("editor");
  var localCode = editor && document.activeElement === editor ? editor.value : null;
  var hadTutorial = !!S.tutorial;
  S = msg.state;
  if (localCode !== null && S.progress && S.progress.exercise && !S.progress.exercise.completed) {
    S.progress.exercise.code = localCode;
  }
  if (!hadTutorial && S.tutorial) {
    view = { kind: "step", index: 0 };
    toast("Your tutorial is ready.");
  }
  if (msg.kind === "approved") toast("Copilot approved your exercise.");
  if (msg.kind === "reset") { view = { kind: "step", index: 0 }; lastCheckResults = null; }
  render();
};

fetch("/state")
  .then(function (r) { return r.json(); })
  .then(function (state) {
    S = state;
    if (S.tutorial && S.progress) {
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

async function startServer(instanceId) {
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const state = getState(instanceId);

        if (url.pathname === "/events") {
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
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(state));
            return;
        }

        if (url.pathname === "/progress" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            try {
                const incoming = JSON.parse(body);
                if (incoming && typeof incoming === "object" && incoming.exercise) {
                    state.progress = incoming;
                    await saveState(sessionRef?.workspacePath, state);
                }
            } catch {}
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        if (url.pathname === "/review" && req.method === "POST") {
            if (state.tutorial && sessionRef) {
                try { await sessionRef.send(buildReviewPrompt(state)); } catch {}
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        if (url.pathname === "/request-tutorial" && req.method === "POST") {
            if (sessionRef) {
                try { await sessionRef.send(buildTutorialRequestPrompt()); } catch {}
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        if (url.pathname === "/reset" && req.method === "POST") {
            state.progress = state.tutorial ? freshProgress(state.tutorial) : null;
            await saveState(sessionRef?.workspacePath, state);
            broadcast(instanceId, { kind: "reset", state });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(state));
            return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml());
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
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
                        await saveState(sessionRef?.workspacePath, state);
                    }
                } else if (!state.tutorial) {
                    const persisted = await loadState(sessionRef?.workspacePath);
                    if (persisted?.tutorial) {
                        state.tutorial = persisted.tutorial;
                        state.progress = persisted.progress || freshProgress(persisted.tutorial);
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
