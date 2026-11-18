// Configured patterns run against contributor-controlled PR titles and branch names, so they must not be
// able to block the extension. Two layers: patterns with the constructs that cause exponential matching are
// rejected up front, and every pattern actually runs in a worker thread under a per-pattern deadline
// (evaluatePatterns), so even polynomial backtracking such as \d*\d*\d*x cannot stall the board.
import { Worker } from "node:worker_threads";

export const MAX_SUBJECT = 256;

/**
 * Why a pattern may backtrack exponentially, or null if it is safe:
 * - backreferences;
 * - a repeating quantifier (`*`, `+`, `{n}` with n > 1, `{n,}`, `{n,m}` with m > 1) applied to a group
 *   that itself contains a quantifier or an alternation, such as `(a+)+`, `(a+){20}` or `(a|aa)*`.
 */
export function unsafePatternReason(source) {
    const stack = [{ inner: false }];
    let closed = null;
    for (let i = 0; i < source.length; i += 1) {
        const c = source[i];
        if (c === "\\") {
            const next = source[i + 1] || "";
            if (/[1-9]/.test(next) || next === "k") return "backreferences are not allowed";
            i += 1;
            closed = null;
            continue;
        }
        if (c === "[") {
            i += 1;
            // In JavaScript (without the u/v flags) a "]" right after "[" or "[^" closes the class, so it is not skipped.
            if (source[i] === "^") i += 1;
            while (i < source.length && source[i] !== "]") i += source[i] === "\\" ? 2 : 1;
            closed = null;
            continue;
        }
        if (c === "(") {
            stack.push({ inner: false });
            if (source[i + 1] === "?") {
                // Skip group modifiers: (?: (?= (?! (?<= (?<! (?<name>
                i += 2;
                if (source[i] === "<" && source[i + 1] !== "=" && source[i + 1] !== "!") {
                    while (i < source.length && source[i] !== ">") i += 1;
                } else if (source[i] === "<") {
                    i += 1;
                }
            }
            closed = null;
            continue;
        }
        if (c === ")") {
            const group = stack.length > 1 ? stack.pop() : { inner: false };
            // Whatever is inside this group is also inside its parent.
            if (group.inner) stack[stack.length - 1].inner = true;
            closed = group;
            continue;
        }
        if (c === "|") {
            stack[stack.length - 1].inner = true;
            closed = null;
            continue;
        }
        const brace = c === "{" ? source.slice(i).match(/^\{(\d+)(,(\d*))?\}/) : null;
        if (c === "*" || c === "+" || c === "?" || brace) {
            // {n} with n > 1 repeats too: (a+){20} backtracks as badly as (a+)+.
            const repeats = c === "*" || c === "+"
                || (brace && (brace[2] === undefined ? Number(brace[1]) > 1 : brace[3] === "" || Number(brace[3]) > 1));
            if (repeats && closed && closed.inner) return "a repeated group must not contain another quantifier or an alternation";
            stack[stack.length - 1].inner = true;
            if (brace) i += brace[0].length - 1;
            if (source[i + 1] === "?") i += 1;
            closed = null;
            continue;
        }
        closed = null;
    }
    return null;
}

const cache = new Map();

/** Compile a configured pattern case-insensitively; invalid or unsafe patterns compile to null and never match. */
export function safeRegex(source) {
    if (!cache.has(source)) {
        let compiled = null;
        if (typeof source === "string" && source.length <= 200 && !unsafePatternReason(source)) {
            try {
                compiled = new RegExp(source, "i");
            } catch {
                compiled = null;
            }
        }
        cache.set(source, compiled);
    }
    return cache.get(source);
}

export function testPattern(source, subject) {
    const re = safeRegex(source);
    return !!re && re.test(String(subject || "").slice(0, MAX_SUBJECT));
}

const PATTERN_DEADLINE_MS = 500;

/**
 * Test every pattern against every subject in a worker thread. A pattern that runs past its deadline is
 * skipped (and reported) and the worker restarts with the next pattern.
 * Returns { test(pattern, subject) => boolean, skipped: [pattern] }.
 */
export async function evaluatePatterns(patternList, subjectList, deadlineMs = PATTERN_DEADLINE_MS) {
    const patterns = [...new Set(patternList)].filter((p) => safeRegex(p));
    const subjects = [...new Set(subjectList.map((x) => String(x || "").slice(0, MAX_SUBJECT)))];
    const hits = new Set();
    const skipped = [];
    const subjectIndex = new Map(subjects.map((x, i) => [x, i]));
    const key = (pi, si) => `${pi}:${si}`;
    let start = 0;
    while (patterns.length && subjects.length && start < patterns.length) {
        start = await new Promise((resolve, reject) => {
            const worker = new Worker(new URL("./match-worker.mjs", import.meta.url), { workerData: { patterns, subjects, start } });
            let current = start;
            let timer = null;
            const arm = () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    skipped.push(patterns[current]);
                    worker.terminate().finally(() => resolve(current + 1));
                }, deadlineMs);
            };
            arm();
            worker.on("message", (m) => {
                if (m.type === "start") {
                    current = m.pi;
                    arm();
                } else if (m.type === "done") {
                    for (const si of m.hits) hits.add(key(m.pi, si));
                } else if (m.type === "end") {
                    clearTimeout(timer);
                    worker.terminate().finally(() => resolve(patterns.length));
                }
            });
            worker.on("error", (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    const patternIndex = new Map(patterns.map((p, i) => [p, i]));
    return {
        skipped,
        test(pattern, subject) {
            const pi = patternIndex.get(pattern);
            const si = subjectIndex.get(String(subject || "").slice(0, MAX_SUBJECT));
            return pi !== undefined && si !== undefined && hits.has(key(pi, si));
        },
    };
}
