// pdf-unlock — a canvas that strips encryption from PDFs by re-printing them
// through the macOS print-to-PDF engine and replacing the originals in place.
//
// extension.mjs is wiring only: the conversion engine lives in lib/pdf.mjs, the
// HTTP/API surface in lib/server.mjs, per-instance state in lib/store.mjs, and
// the panel UI in ui/index.html.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

import { capabilities, collectPdfs, inspect, unlockAndReplace } from "./lib/pdf.mjs";
import { startServer } from "./lib/server.mjs";
import { dropInstance, setOptions, snapshot, upsertFile } from "./lib/store.mjs";

const servers = new Map();

function requireInstance(ctx) {
    const entry = servers.get(ctx.instanceId);
    if (!entry) {
        throw new Error(`Canvas instance "${ctx.instanceId}" is not open.`);
    }
    return entry.instance;
}

async function queuePaths(instance, paths, password = "") {
    const expanded = [];
    for (const raw of paths) {
        const found = await collectPdfs(raw, { recursive: instance.options.recursive });
        expanded.push(...(found.length > 0 ? found : [raw]));
    }
    const added = [];
    for (const file of [...new Set(expanded)]) {
        added.push(upsertFile(instance, { ...(await inspect(file, password)), result: null }));
    }
    return added;
}

function summarize(file) {
    return {
        path: file.path,
        name: file.name,
        status: file.status,
        pages: file.pages,
        size: file.size,
        encrypted: file.encrypted,
        needsPassword: file.needsPassword,
        algorithm: file.algorithm ?? null,
        error: file.error ?? null,
    };
}

const canvas = createCanvas({
    id: "pdf-unlock",
    displayName: "PDF Unlock",
    description:
        "Removes encryption and permission locks from PDFs by re-printing them through the macOS print-to-PDF engine, then replaces each original file in place.",
    inputSchema: {
        type: "object",
        properties: {
            paths: {
                type: "array",
                items: { type: "string" },
                description: "PDF files or folders to queue up when the canvas opens.",
            },
            password: {
                type: "string",
                description: "Password used to open the PDFs, if they require one.",
            },
            backup: {
                type: "string",
                enum: ["sibling", "trash", "none"],
                description:
                    "What to do with each original: keep it as '… (original).pdf', move it to the Trash / Recycle Bin, or overwrite it.",
            },
        },
    },

    actions: [
        {
            name: "add_files",
            description:
                "Queue PDF files or folders (folders are scanned for PDFs) and report their encryption status.",
            inputSchema: {
                type: "object",
                properties: {
                    paths: { type: "array", items: { type: "string" } },
                    password: { type: "string" },
                },
                required: ["paths"],
            },
            handler: async (ctx) => {
                const instance = requireInstance(ctx);
                const added = await queuePaths(
                    instance,
                    ctx.input?.paths ?? [],
                    ctx.input?.password ?? ""
                );
                return { added: added.map(summarize), total: instance.files.size };
            },
        },
        {
            name: "list_files",
            description: "List the queued PDFs with their current encryption status and results.",
            handler: async (ctx) => {
                const instance = requireInstance(ctx);
                const state = snapshot(instance);
                return {
                    options: state.options,
                    files: state.files.map((file) => ({
                        ...summarize(file),
                        result: file.result
                            ? {
                                  ok: file.result.ok,
                                  method: file.result.method ?? null,
                                  backup: file.result.backup ?? null,
                                  preview: file.result.preview ?? null,
                                  error: file.result.error ?? null,
                              }
                            : null,
                    })),
                };
            },
        },
        {
            name: "set_options",
            description:
                "Change the conversion engine, what happens to each original, or whether to only write preview copies.",
            inputSchema: {
                type: "object",
                properties: {
                    method: {
                        type: "string",
                        enum: ["auto", "quartz", "ghostscript", "poppler", "qpdf"],
                    },
                    backup: { type: "string", enum: ["sibling", "trash", "none"] },
                    dryRun: { type: "boolean" },
                    recursive: { type: "boolean" },
                },
            },
            handler: async (ctx) => setOptions(requireInstance(ctx), ctx.input ?? {}),
        },
        {
            name: "unlock_all",
            description:
                "Unlock every queued PDF that can be opened and replace each original file in place.",
            inputSchema: {
                type: "object",
                properties: {
                    password: { type: "string" },
                    dryRun: {
                        type: "boolean",
                        description:
                            "Write '… (unlocked preview).pdf' next to each original instead of replacing it.",
                    },
                },
            },
            handler: async (ctx) => {
                const instance = requireInstance(ctx);
                const password = ctx.input?.password ?? "";
                const dryRun = ctx.input?.dryRun ?? instance.options.dryRun;

                instance.busy = true;
                const results = [];
                const skipped = [];
                try {
                    for (const file of [...instance.files.values()]) {
                        if (!file.ok || file.result?.ok) continue;
                        if (!file.encrypted) {
                            skipped.push({ name: file.name, reason: "not encrypted" });
                            continue;
                        }
                        const result = await unlockAndReplace(file.path, {
                            password,
                            method: instance.options.method,
                            backup: instance.options.backup,
                            dryRun,
                        });
                        const refreshed = result.ok ? await inspect(file.path, "") : file;
                        upsertFile(instance, { ...refreshed, path: file.path, result });
                        results.push({
                            name: file.name,
                            path: file.path,
                            ok: result.ok,
                            method: result.method ?? null,
                            backup: result.backup ?? null,
                            preview: result.preview ?? null,
                            needsPassword: result.needsPassword ?? false,
                            error: result.error ?? null,
                        });
                    }
                } finally {
                    instance.busy = false;
                    instance.lastRun = new Date().toISOString();
                }

                return {
                    dryRun,
                    succeeded: results.filter((item) => item.ok).length,
                    failed: results.filter((item) => !item.ok).length,
                    skipped,
                    results,
                };
            },
        },
        {
            name: "capabilities",
            description: "Report which conversion engines are available on this machine.",
            handler: async () => capabilities(),
        },
    ],

    open: async (ctx) => {
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
            entry = await startServer(ctx.instanceId);
            servers.set(ctx.instanceId, entry);
        }

        const input = ctx.input ?? {};
        if (input.backup) setOptions(entry.instance, { backup: input.backup });
        if (Array.isArray(input.paths) && input.paths.length > 0) {
            await queuePaths(entry.instance, input.paths, input.password ?? "");
        }

        const count = entry.instance.files.size;
        return {
            title: "PDF Unlock",
            url: entry.url,
            status: count > 0 ? `${count} file${count === 1 ? "" : "s"} queued` : "Ready",
        };
    },

    onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (!entry) return;
        servers.delete(ctx.instanceId);
        dropInstance(ctx.instanceId);
        await new Promise((resolve) => entry.server.close(() => resolve()));
    },
});

const session = await joinSession({ canvases: [canvas] });

// Warm the engine detection so the first open is instant, and tell the user up
// front when the machine has nothing installed that can do the job.
capabilities()
    .then(async (caps) => {
        if (caps.anyAvailable) return;
        const hints = caps.setup.map((hint) => `${hint.tool}: ${hint.command}`).join(" · ");
        await session.log(
            `PDF Unlock has no conversion engine available on this machine. Install one of — ${hints}`,
            { level: "warning" }
        );
    })
    .catch(() => {});
