// Extension: daily-focus-board
// Renders the daily focus board as a GHCP canvas, backed by a JSON state file
// that both the canvas UI and the AI partner read and write. All the real logic
// (server, state, mutations, recap) lives in board-core.mjs so it can be tested
// without the SDK; this file only wires the canvas/session lifecycle + actions.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import {
    startServer, ensureStateFile, loadDoc, mutate, recapMarkdown,
    opStatus, opNote, opCount, opCarry, opFocus, opAddTask,
} from "./board-core.mjs";

// instanceId -> { server, url, stateFile }
const servers = new Map();

// Run a mutation for the canvas instance and return { ok, state } / { error }.
async function act(ctx, fn) {
    const entry = servers.get(ctx.instanceId);
    if (!entry) return { error: "Board not open" };
    return await mutate(entry.stateFile, fn);
}
async function read(ctx) {
    const entry = servers.get(ctx.instanceId);
    if (!entry) return null;
    return await loadDoc(entry.stateFile);
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "daily-focus-board",
            displayName: "Daily Focus Board",
            description: "A warm, executive-function-friendly daily focus board backed by a JSON file you and your AI partner both read and write. Tasks (to-do -> in progress -> done) with progress notes, numeric counters, Focus mode, kind 'not today' carryover, a brain-dump box, reduced motion, and a live clock.",
            inputSchema: {
                type: "object",
                properties: {
                    stateFile: {
                        type: "string",
                        description: "Absolute path to the board's JSON state file. Seeded if it doesn't exist yet. Defaults to a date-scoped focus-board-<YYYY-MM-DD>.json in the current working directory, so each day starts a fresh board; pass an explicit path to keep a single ongoing file.",
                    },
                    seed: {
                        type: "object",
                        description: "Initial board, used ONLY when the state file doesn't exist: { name, dateKey, tasks: [ { id, emoji, title, sub, tag, tagc, due, goal, start, inc, unit } ] }. A numeric goal makes a counter; otherwise a status task.",
                    },
                },
            },
            actions: [
                {
                    name: "get_board",
                    description: "Return the full board state as JSON (tasks, statuses, progress notes, counters, momentum feed, parked thoughts). Use to see where the day stands.",
                    handler: async (ctx) => {
                        const doc = await read(ctx);
                        return doc ? { ok: true, state: doc } : { error: "Board not open" };
                    },
                },
                {
                    name: "recap",
                    description: "Return a Markdown end-of-day recap (what got done, momentum, parked thoughts). Paste it into a journal or use it to plan tomorrow.",
                    handler: async (ctx) => {
                        const doc = await read(ctx);
                        return doc ? { ok: true, markdown: recapMarkdown(doc) } : { error: "Board not open" };
                    },
                },
                {
                    name: "set_status",
                    description: "Set a task's status to todo, doing, or done (e.g. mark the design doc done). Omit status to advance to the next status.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: { type: "string", description: "The task's id" },
                            status: { type: "string", enum: ["todo", "doing", "done"] },
                        },
                        required: ["taskId"],
                    },
                    handler: (ctx) => act(ctx, doc => opStatus(doc, ctx.input.taskId, ctx.input.status)),
                },
                {
                    name: "log_progress",
                    description: "Add a timestamped progress note to a task (moves it to 'in progress' if it was to-do). Small logged wins build the momentum feed.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: { type: "string", description: "The task's id" },
                            note: { type: "string", description: "The progress note" },
                        },
                        required: ["taskId", "note"],
                    },
                    handler: (ctx) => act(ctx, doc => opNote(doc, ctx.input.taskId, ctx.input.note)),
                },
                {
                    name: "set_count",
                    description: "Set a numeric-counter task's current value (e.g. steps to 6200).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: { type: "string", description: "The counter task's id" },
                            value: { type: "number", description: "New current value" },
                        },
                        required: ["taskId", "value"],
                    },
                    handler: (ctx) => act(ctx, doc => opCount(doc, ctx.input.taskId, { value: ctx.input.value })),
                },
                {
                    name: "carry_over",
                    description: "Kindly carry a task to tomorrow ('not today') — no shame, it leaves today's progress ring. Pass carried:false to bring it back to today.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            taskId: { type: "string", description: "The task's id" },
                            carried: { type: "boolean", description: "true = carry to tomorrow (default toggles)" },
                        },
                        required: ["taskId"],
                    },
                    handler: (ctx) => act(ctx, doc => opCarry(doc, ctx.input.taskId, ctx.input.carried)),
                },
                {
                    name: "add_task",
                    description: "Add a task. A numeric 'goal' makes it a counter (steps/pages/pomodoros); otherwise a status task. Keep the board to ~4-9 items — a focus board, not a backlog.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            emoji: { type: "string" },
                            sub: { type: "string" },
                            tag: { type: "string" },
                            tagc: { type: "string", enum: ["new", "deadline", "career"] },
                            due: { type: "string", description: "ISO local datetime for a gentle countdown" },
                            goal: { type: "number", description: "Makes this a counter task" },
                            start: { type: "number" },
                            inc: { type: "number" },
                            unit: { type: "string" },
                            id: { type: "string", description: "Optional stable id; derived from the title if omitted" },
                        },
                        required: ["title"],
                    },
                    handler: (ctx) => act(ctx, doc => opAddTask(doc, ctx.input)),
                },
                {
                    name: "focus",
                    description: "Enter Focus mode on one task (dim the rest), or omit taskId to clear focus.",
                    inputSchema: {
                        type: "object",
                        properties: { taskId: { type: "string", description: "Task to focus; omit to clear" } },
                    },
                    handler: (ctx) => act(ctx, doc => opFocus(doc, ctx.input.taskId || null)),
                },
                {
                    name: "refresh",
                    description: "Return the current board state (a fresh read of the state file).",
                    handler: async (ctx) => {
                        const doc = await read(ctx);
                        return doc ? { ok: true, state: doc } : { error: "Board not open" };
                    },
                },
            ],
            open: async (ctx) => {
                const stateFile = await ensureStateFile(ctx.input?.stateFile, ctx.input?.seed);
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(stateFile);
                    entry.stateFile = stateFile;
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "🔥 Daily Focus Board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
