// Port of apps/vscode/src/core/utils/taskCheckboxes.ts; both read apps/vscode/tests/fixtures/task-grammar/.

const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;
const INLINE_CODE_PATTERN = /(`+)[^`]*?\1/g;
const TASK_LINE_PATTERN = /^\s*[-*+]\s*\[([ xX])\]\s*(?:\*\*)?(T\d+)(?:\*\*)?\s*(.*)$/;
const PHASE_HEADING = /^#{2,3}\s+(.+?)\s*$/;
const CHECKBOX_LINE = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]\s+\S/;

/** Each prose line with its raw twin: fenced blocks dropped, inline code blanked in the prose copy. */
function* proseEntries(content) {
    let openFence = null;
    for (const raw of content.split(/\r\n?|\n/)) {
        const fence = raw.match(FENCE_PATTERN)?.[1];
        if (openFence) {
            if (fence && fence[0] === openFence[0] && fence.length >= openFence.length) openFence = null;
            continue;
        }
        if (fence) {
            openFence = fence;
            continue;
        }
        yield { prose: raw.replace(INLINE_CODE_PATTERN, ''), raw };
    }
}

/** Whether the text holds a checkbox line outside code: any bullet style, with or without a task id. */
export function hasCheckboxLine(content) {
    for (const { prose } of proseEntries(content)) if (CHECKBOX_LINE.test(prose)) return true;
    return false;
}

/** The first heading outside code fences, without its `#`, or null. */
export function firstHeading(content) {
    for (const { raw } of proseEntries(content)) {
        const heading = raw.match(/^#\s+(.*?)\s*$/);
        if (heading) return heading[1];
    }
    return null;
}

export function countTaskCheckboxes(content) {
    let checked = 0;
    let total = 0;
    for (const task of listTasks(content)) {
        total++;
        if (task.checked) checked++;
    }
    return { checked, total };
}

/** Every task in document order, with the phase heading it sits under. */
export function listTasks(content) {
    const tasks = [];
    let phase = null;
    for (const { prose, raw } of proseEntries(content)) {
        const heading = prose.match(PHASE_HEADING);
        if (heading) {
            phase = heading[1];
            continue;
        }
        const match = prose.match(TASK_LINE_PATTERN);
        if (!match) continue;
        const text = raw.match(TASK_LINE_PATTERN)?.[3] ?? match[3];
        tasks.push({ id: match[2], checked: match[1].toLowerCase() === 'x', text: text.trim(), phase });
    }
    return tasks;
}

/** Done/total per phase heading, in the order phases first appear. */
export function phaseProgress(content) {
    const phases = new Map();
    for (const task of listTasks(content)) {
        const key = task.phase ?? 'Tasks';
        const entry = phases.get(key) ?? { name: key, checked: 0, total: 0 };
        entry.total++;
        if (task.checked) entry.checked++;
        phases.set(key, entry);
    }
    return [...phases.values()];
}
