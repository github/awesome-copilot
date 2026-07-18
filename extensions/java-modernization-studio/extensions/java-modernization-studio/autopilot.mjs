// autopilot.mjs — Sequencing engine for "Run on autopilot".
//
// Given the live plan, Autopilot drives the agent through the checklist one
// step at a time: pick the next eligible step (respecting phase ordering),
// hand it to the agent, wait for the turn to finish, re-scan, and repeat —
// streaming progress to the canvas after every step.
//
// All I/O is injected (`snapshot`, `runTurn`, `buildStepPrompt`, `onProgress`)
// so the loop is unit-testable without a live session or HTTP server. The pure
// helpers below are the same selection logic the renderer uses for "Continue
// here", which keeps the visible recommendation and the automated run in sync.

// How long to wait for a single step's turn to go idle. Generous: one
// modernization step can involve edits, a build, and tests. The wait does not
// abort in-flight agent work; it only bounds how long Autopilot blocks before
// treating the step as failed.
export const AUTOPILOT_TURN_TIMEOUT_MS = 30 * 60 * 1000;

export const AUTOPILOT_MAX_STEPS = 25;

/** The checklist Autopilot follows: progress.md when present, else plan.md. */
export function currentSteps(state) {
    if (!state) return [];
    if (state.progress && state.progress.steps && state.progress.steps.length) return state.progress.steps;
    if (state.plan && state.plan.steps) return state.plan.steps;
    return [];
}

/** Stable identity for a step across re-scans (phase + title). */
export function stepKey(step) {
    if (!step) return "";
    return (step.section || "") + "::" + (step.title || "");
}

/**
 * The next step Autopilot should run: the first not-done step in the active
 * phase, falling back to the first not-done step overall. Mirrors the renderer's
 * "Continue here" so the automated run never jumps ahead of the safe next step.
 * @returns {object|null}
 */
export function selectNextStep(state) {
    const steps = currentSteps(state);
    if (!steps.length) return null;
    const ord = (state && state.ordering) || { activeRank: null };
    const inPhase = steps.find(
        (x) => x.status !== "done" && (ord.activeRank == null || x.rank === ord.activeRank)
    );
    return inPhase || steps.find((x) => x.status !== "done") || null;
}

/** Whether the given step is now checked off in a freshly scanned state. */
export function isStepDone(state, step) {
    const k = stepKey(step);
    const match = currentSteps(state).find((s) => stepKey(s) === k);
    return !!(match && match.status === "done");
}

/** Construct the mutable, serializable run record broadcast to the canvas. */
export function makeRun({ scope, maxSteps, startRank } = {}) {
    return {
        running: true,
        cancelled: false,
        scope: scope === "all" ? "all" : "phase",
        maxSteps: maxSteps || AUTOPILOT_MAX_STEPS,
        startRank: startRank == null ? null : startRank,
        status: "running",
        current: null,
        completed: [],
        startedAt: Date.now(),
        finishedAt: null,
    };
}

/**
 * Drive the run to completion. Mutates `run` in place and calls
 * `deps.onProgress(run, state|null)` whenever something changes so the caller
 * can broadcast. Resolves with the final `run`.
 *
 * @param {object} run from makeRun()
 * @param {{
 *   snapshot: () => Promise<object>,
 *   runTurn: (prompt: string) => Promise<any>,
 *   buildStepPrompt: (step: object) => string,
 *   onProgress: (run: object, state: object|null) => void,
 *   log?: Function,
 * }} deps
 */
export async function runAutopilot(run, deps) {
    const onProgress = deps.onProgress || (() => {});
    let lastKey = null;
    try {
        while (true) {
            if (run.cancelled) {
                run.status = "cancelled";
                break;
            }
            if (run.completed.length >= run.maxSteps) {
                run.status = "capped";
                break;
            }
            const state = await deps.snapshot();
            const step = selectNextStep(state);
            if (!step) {
                run.status = "completed";
                break;
            }
            // Phase scope: stop once the active phase advances past where we began.
            if (run.scope === "phase" && run.startRank != null && step.rank != null && step.rank > run.startRank) {
                run.status = "phase_done";
                break;
            }
            const key = stepKey(step);
            // Selecting the same step twice running means the previous attempt did
            // not check it off — the agent is stuck or waiting on a decision. Stop
            // and hand control back rather than loop on it.
            if (key === lastKey) {
                run.status = "stuck";
                run.stuck = step.title;
                break;
            }
            lastKey = key;

            run.current = { title: step.title, section: step.section || null };
            onProgress(run, state);
            if (deps.log) deps.log("Autopilot → " + step.title, { ephemeral: true });

            let stepError = null;
            try {
                await deps.runTurn(deps.buildStepPrompt(step));
            } catch (e) {
                stepError = (e && e.message) || String(e);
            }

            const after = await deps.snapshot();
            const done = isStepDone(after, step);
            run.completed.push({
                title: step.title,
                section: step.section || null,
                done,
                error: stepError,
                at: Date.now(),
            });
            run.current = null;
            onProgress(run, after);

            if (stepError) {
                run.status = "error";
                run.error = stepError;
                break;
            }
        }
    } catch (e) {
        run.status = "error";
        run.error = (e && e.message) || String(e);
    } finally {
        if (run.status === "running") run.status = "completed";
        run.running = false;
        run.finishedAt = Date.now();
        onProgress(run, null);
    }
    return run;
}
