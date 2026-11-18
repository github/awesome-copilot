// Configured patterns run against contributor-controlled PR titles and branch names, so they must not be
// able to backtrack catastrophically. Instead of a timeout (a regex cannot be interrupted), patterns with
// the constructs that cause exponential matching are rejected and inputs are length-capped.

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
            if (source[i] === "^") i += 1;
            if (source[i] === "]") i += 1;
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
