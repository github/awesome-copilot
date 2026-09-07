// Jupyter notebook canvas implementation.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";

const extensionRoot = path.dirname(fileURLToPath(import.meta.url));
const servers = new Map();
const clientsByNotebook = new Map();
const notebookQueues = new Map();
const activeRuns = new Map();
const workspaceSnapshots = new Map();
const historyByNotebook = new Map();
let workspaceRoot;
let notebooksDir;
let checkpointsDir;
let storageReady = Promise.resolve();

const notebookIdPattern = "^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$";
const cellIdPattern = "^[A-Za-z0-9_-]{1,64}$";
const notebookIdRegex = new RegExp(notebookIdPattern);
const cellIdRegex = new RegExp(cellIdPattern);
const openInputSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        notebookId: { type: "string", pattern: notebookIdPattern },
        title: { type: "string", minLength: 1, maxLength: 120 },
    },
};

const notebookActionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        notebookId: { type: "string", pattern: notebookIdPattern },
    },
};

function cellIdSchema(required = true) {
    return {
        type: "object",
        additionalProperties: false,
        required: required ? ["cellId"] : [],
        properties: {
            notebookId: { type: "string", pattern: notebookIdPattern },
            cellId: { type: "string", pattern: cellIdPattern },
        },
    };
}

function textToSource(value) {
    return typeof value === "string" ? value : "";
}

async function migrateLegacyDirectory(source, destination) {
    let entries;
    try {
        entries = await readdir(source, { withFileTypes: true });
    } catch (error) {
        if (error?.code === "ENOENT") {
            return;
        }
        throw error;
    }
    await mkdir(destination, { recursive: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);
        if (entry.isDirectory()) {
            await migrateLegacyDirectory(sourcePath, destinationPath);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        try {
            await readFile(destinationPath);
            await rm(sourcePath, { force: true });
        } catch (error) {
            if (error?.code !== "ENOENT") {
                throw error;
            }
            try {
                await rename(sourcePath, destinationPath);
            } catch (renameError) {
                if (renameError?.code !== "EXDEV") {
                    throw renameError;
                }
                await writeFile(destinationPath, await readFile(sourcePath), { mode: 0o600 });
                await rm(sourcePath, { force: true });
            }
        }
    }
    await rm(source, { force: true, recursive: true });
}

async function initializeStorage(sessionWorkspacePath) {
    if (!sessionWorkspacePath) {
        throw new Error("Notebook canvas requires session workspace storage.");
    }
    workspaceRoot = path.resolve(sessionWorkspacePath);
    const dataRoot = path.join(workspaceRoot, ".notebook-canvas");
    notebooksDir = path.join(dataRoot, "notebooks");
    checkpointsDir = path.join(dataRoot, "checkpoints");
    await mkdir(dataRoot, { recursive: true });
    await migrateLegacyDirectory(path.join(extensionRoot, "notebooks"), notebooksDir);
    await migrateLegacyDirectory(path.join(extensionRoot, "checkpoints"), checkpointsDir);
}

function createCellId(usedIds = new Set()) {
    let id;
    do {
        id = `cell-${randomUUID().slice(0, 8)}`;
    } while (usedIds.has(id));
    return id;
}

function getCellId(cell, usedIds) {
    const candidates = [cell.id, cell.metadata?.copilotCellId];
    let id = candidates.find((candidate) => (
        typeof candidate === "string"
        && cellIdRegex.test(candidate)
        && (!usedIds || !usedIds.has(candidate))
    ));
    if (!id) {
        id = createCellId(usedIds);
    }
    cell.id = id;
    cell.metadata = { ...(cell.metadata ?? {}), copilotCellId: id };
    usedIds?.add(id);
    return id;
}

function normalizeSource(source) {
    if (Array.isArray(source)) {
        return source.join("");
    }
    return typeof source === "string" ? source : "";
}

function normalizeNotebook(raw, notebookId, title, createStarter = false) {
    const notebook = raw && typeof raw === "object" ? raw : {};
    let changed = !raw || typeof raw !== "object";
    const originalMetadata = notebook.metadata && typeof notebook.metadata === "object"
        ? notebook.metadata
        : {};
    const originalCopilot = originalMetadata.copilot && typeof originalMetadata.copilot === "object"
        ? originalMetadata.copilot
        : {};
    changed ||= notebook.nbformat !== 4;
    changed ||= typeof notebook.nbformat_minor !== "number";
    changed ||= !originalMetadata.kernelspec || !originalMetadata.language_info;
    changed ||= originalCopilot.notebookId !== notebookId;
    changed ||= typeof originalCopilot.title !== "string";
    changed ||= !Number.isInteger(originalCopilot.executionCount);
    changed ||= !Number.isInteger(originalCopilot.revision);
    notebook.nbformat = 4;
    notebook.nbformat_minor = typeof notebook.nbformat_minor === "number" ? notebook.nbformat_minor : 5;
    notebook.metadata = {
        ...originalMetadata,
        kernelspec: originalMetadata.kernelspec ?? {
            display_name: "Python 3",
            language: "python",
            name: "python3",
        },
        language_info: originalMetadata.language_info ?? {
            name: "python",
            file_extension: ".py",
            mimetype: "text/x-python",
        },
        copilot: {
            ...originalCopilot,
            notebookId,
            title: originalCopilot.title ?? title ?? "Untitled notebook",
            executionCount: Number(originalCopilot.executionCount ?? 0),
            revision: Number.isInteger(originalCopilot.revision) ? originalCopilot.revision : 0,
        },
    };
    if (!Array.isArray(notebook.cells)) {
        notebook.cells = [];
        changed = true;
    }
    const usedIds = new Set();
    for (const cell of notebook.cells) {
        if (!["code", "markdown", "raw"].includes(cell.cell_type)) {
            cell.cell_type = "raw";
            changed = true;
        }
        cell.metadata = cell.metadata && typeof cell.metadata === "object" ? cell.metadata : {};
        const originalId = cell.id;
        getCellId(cell, usedIds);
        changed ||= originalId !== cell.id;
        if (Array.isArray(cell.source) || typeof cell.source !== "string") {
            cell.source = normalizeSource(cell.source);
            changed = true;
        }
        if (cell.cell_type === "code") {
            if (!Array.isArray(cell.outputs)) {
                cell.outputs = [];
                changed = true;
            }
            if (!Number.isInteger(cell.execution_count) && cell.execution_count !== null) {
                cell.execution_count = null;
                changed = true;
            }
        } else {
            if ("outputs" in cell || "execution_count" in cell) {
                changed = true;
            }
            delete cell.outputs;
            delete cell.execution_count;
        }
    }
    if (createStarter && notebook.cells.length === 0) {
        notebook.cells.push(createCell("code", "print(\"Hello from the notebook canvas\")"));
        changed = true;
    }
    return { notebook, changed };
}

function notebookPath(notebookId) {
    if (typeof notebookId !== "string" || !notebookIdRegex.test(notebookId)) {
        throw new CanvasError("notebook_id_invalid", "Notebook ID contains unsupported characters.");
    }
    return path.join(notebooksDir, `${notebookId}.ipynb`);
}

function serializeNotebook(notebook) {
    return `${JSON.stringify(notebook, null, 2)}\n`;
}

function contentHash(content) {
    return createHash("sha256").update(content).digest("hex");
}

function normalizeWorkspacePath(relativePath) {
    if (!workspaceRoot) {
        throw new CanvasError("workspace_unavailable", "This session does not expose a workspace.");
    }
    if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.length > 240) {
        throw new CanvasError("workspace_path_invalid", "Choose a workspace-relative .ipynb path.");
    }
    const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
    if (
        path.posix.isAbsolute(normalized)
        || normalized.split("/").some((segment) => segment === ".." || segment.length === 0)
        || !normalized.toLowerCase().endsWith(".ipynb")
    ) {
        throw new CanvasError("workspace_path_invalid", "Notebook paths must stay inside the workspace and end in .ipynb.");
    }
    const resolved = path.resolve(workspaceRoot, ...normalized.split("/"));
    const rootWithSeparator = `${path.resolve(workspaceRoot)}${path.sep}`;
    if (!resolved.startsWith(rootWithSeparator)) {
        throw new CanvasError("workspace_path_invalid", "Notebook path escapes the workspace.");
    }
    return { relative: normalized, resolved };
}

async function readWorkspaceNotebook(relativePath) {
    const target = normalizeWorkspacePath(relativePath);
    const content = await readFile(target.resolved, "utf8");
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new CanvasError("notebook_json_invalid", `${target.relative} is not a valid notebook JSON file.`);
    }
    return { ...target, content, parsed };
}

async function assertWorkspaceUnchanged(notebookId, notebook) {
    const relativePath = notebook.metadata?.copilot?.workspacePath;
    if (!relativePath) {
        return;
    }
    const target = normalizeWorkspacePath(relativePath);
    const expected = workspaceSnapshots.get(notebookId) ?? contentHash(serializeNotebook(notebook));
    try {
        const actual = contentHash(await readFile(target.resolved, "utf8"));
        if (actual !== expected) {
            throw new CanvasError(
                "workspace_file_conflict",
                `${target.relative} changed outside the canvas. Open it again or save to a different path.`,
            );
        }
    } catch (error) {
        if (error?.code === "ENOENT") {
            throw new CanvasError("workspace_file_missing", `${target.relative} was removed outside the canvas.`);
        }
        throw error;
    }
}

async function writeWorkspaceDocument(relativePath, content, { overwrite = true } = {}) {
    const target = normalizeWorkspacePath(relativePath);
    if (!overwrite) {
        try {
            await readFile(target.resolved, "utf8");
            throw new CanvasError("workspace_file_exists", `${target.relative} already exists.`);
        } catch (error) {
            if (error?.code !== "ENOENT") {
                throw error;
            }
        }
    }
    await mkdir(path.dirname(target.resolved), { recursive: true });
    const temporary = path.join(path.dirname(target.resolved), `.${path.basename(target.resolved)}.${randomUUID()}.tmp`);
    try {
        await writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
        await rename(temporary, target.resolved);
    } finally {
        await rm(temporary, { force: true });
    }
    return target;
}

async function writeWorkspaceCopy(notebookId, notebook, { overwrite = true } = {}) {
    const relativePath = notebook.metadata?.copilot?.workspacePath;
    if (!relativePath) {
        return;
    }
    const content = serializeNotebook(notebook);
    await writeWorkspaceDocument(relativePath, content, { overwrite });
    workspaceSnapshots.set(notebookId, contentHash(content));
}

async function assertWorkspaceTargetAvailable(relativePath, overwrite) {
    const target = normalizeWorkspacePath(relativePath);
    if (overwrite) {
        return target;
    }
    try {
        await readFile(target.resolved, "utf8");
        throw new CanvasError("workspace_file_exists", `${target.relative} already exists.`);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return target;
        }
        throw error;
    }
}

async function listWorkspaceNotebooks() {
    if (!workspaceRoot) {
        return [];
    }
    const results = [];
    async function visit(directory, depth) {
        if (depth > 4 || results.length >= 100) {
            return;
        }
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith(".") || ["node_modules", "dist", "build"].includes(entry.name)) {
                continue;
            }
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await visit(absolute, depth + 1);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".ipynb")) {
                results.push(path.relative(workspaceRoot, absolute).split(path.sep).join("/"));
            }
        }
    }
    await visit(workspaceRoot, 0);
    return results.sort((a, b) => a.localeCompare(b));
}

function checkpointPath(notebookId, checkpointId) {
    if (!notebookIdRegex.test(notebookId) || !/^[A-Za-z0-9_-]{1,80}$/.test(checkpointId)) {
        throw new CanvasError("checkpoint_id_invalid", "Invalid checkpoint identifier.");
    }
    return path.join(checkpointsDir, notebookId, `${checkpointId}.json`);
}

async function createCheckpoint(notebookId, notebook, label) {
    const checkpointId = `cp-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const record = {
        checkpointId,
        createdAt: new Date().toISOString(),
        label: textToSource(label).slice(0, 80) || "Manual checkpoint",
        notebook,
    };
    const target = checkpointPath(notebookId, checkpointId);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, serializeNotebook(record), { encoding: "utf8", mode: 0o600 });
    return { checkpointId, createdAt: record.createdAt, label: record.label };
}

async function listCheckpoints(notebookId) {
    const directory = path.join(checkpointsDir, notebookId);
    try {
        const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
        const checkpoints = [];
        for (const file of files) {
            const record = JSON.parse(await readFile(path.join(directory, file), "utf8"));
            checkpoints.push({
                checkpointId: record.checkpointId,
                createdAt: record.createdAt,
                label: record.label,
            });
        }
        return checkpoints.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

async function getAvailableRuntimes() {
    const runtimes = [];
    for (const command of ["python3", "python"]) {
        const version = await new Promise((resolve) => {
            const child = spawn(command, ["--version"], {
                env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
                stdio: ["ignore", "pipe", "pipe"],
            });
            let output = "";
            child.stdout.on("data", (chunk) => { output += chunk; });
            child.stderr.on("data", (chunk) => { output += chunk; });
            child.on("error", () => resolve(null));
            child.on("close", (code) => resolve(code === 0 ? output.trim() : null));
        });
        if (version) {
            runtimes.push({ id: command, label: version });
        }
    }
    return runtimes;
}

async function applyHistory(notebookId, direction, expectedRevision) {
    return withNotebookLock(notebookId, async () => {
        const current = await loadNotebookUnlocked(notebookId);
        const currentRevision = Number(current.metadata.copilot.revision ?? 0);
        if (Number.isInteger(expectedRevision) && expectedRevision !== currentRevision) {
            throw new CanvasError("revision_conflict", "Notebook changed before history could be applied.");
        }
        await assertWorkspaceUnchanged(notebookId, current);
        const history = historyByNotebook.get(notebookId) ?? { redo: [], undo: [] };
        const source = direction === "undo" ? history.undo : history.redo;
        const destination = direction === "undo" ? history.redo : history.undo;
        const snapshot = source.pop();
        if (!snapshot) {
            throw new CanvasError("history_empty", `Nothing to ${direction}.`);
        }
        destination.push(structuredClone(current));
        const workspacePath = current.metadata?.copilot?.workspacePath;
        if (workspacePath) {
            snapshot.metadata.copilot.workspacePath = workspacePath;
        } else {
            delete snapshot.metadata.copilot.workspacePath;
        }
        snapshot.metadata.copilot.revision = currentRevision + 1;
        historyByNotebook.set(notebookId, history);
        await writeNotebookUnlocked(notebookId, snapshot);
        await writeWorkspaceCopy(notebookId, snapshot);
        broadcast(notebookId, snapshot);
        return { notebookId, notebook: summarizeNotebook(snapshot) };
    });
}

function withNotebookLock(notebookId, operation) {
    const previous = notebookQueues.get(notebookId) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    notebookQueues.set(notebookId, current);
    return current.finally(() => {
        if (notebookQueues.get(notebookId) === current) {
            notebookQueues.delete(notebookId);
        }
    });
}

async function writeNotebookUnlocked(notebookId, notebook) {
    await mkdir(notebooksDir, { recursive: true });
    const target = notebookPath(notebookId);
    const temporary = path.join(notebooksDir, `.${notebookId}.${randomUUID()}.tmp`);
    try {
        await writeFile(temporary, serializeNotebook(notebook), { encoding: "utf8", mode: 0o600 });
        await rename(temporary, target);
    } finally {
        await rm(temporary, { force: true });
    }
}

async function loadNotebookUnlocked(notebookId = "default", title) {
    await mkdir(notebooksDir, { recursive: true });
    try {
        const raw = JSON.parse(await readFile(notebookPath(notebookId), "utf8"));
        const normalized = normalizeNotebook(raw, notebookId, title);
        if (normalized.notebook.metadata?.copilot?.workspacePath) {
            workspaceSnapshots.set(notebookId, contentHash(serializeNotebook(normalized.notebook)));
        }
        if (normalized.changed) {
            await writeNotebookUnlocked(notebookId, normalized.notebook);
        }
        return normalized.notebook;
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
        const { notebook } = normalizeNotebook({}, notebookId, title, true);
        await writeNotebookUnlocked(notebookId, notebook);
        return notebook;
    }
}

function loadNotebook(notebookId = "default", title) {
    return withNotebookLock(notebookId, () => loadNotebookUnlocked(notebookId, title));
}

function createCell(cellType, source = "") {
    const normalizedCellType = ["code", "markdown", "raw"].includes(cellType) ? cellType : "code";
    const cell = {
        id: `cell-${randomUUID().slice(0, 8)}`,
        cell_type: normalizedCellType,
        metadata: {},
        source: textToSource(source),
    };
    if (cell.cell_type === "code") {
        cell.execution_count = null;
        cell.outputs = [];
    }
    return cell;
}

function summarizeNotebook(notebook) {
    const language = notebook.metadata?.language_info?.name
        ?? notebook.metadata?.kernelspec?.language
        ?? "unknown";
    return {
        title: notebook.metadata?.copilot?.title ?? "Untitled notebook",
        revision: Number(notebook.metadata?.copilot?.revision ?? 0),
        language,
        runtimeLabel: language.toLowerCase() === "python" ? "Isolated Python" : "Execution unavailable",
        executionMode: "stateless-run-through",
        workspacePath: notebook.metadata?.copilot?.workspacePath ?? null,
        runtime: notebook.metadata?.copilot?.runtime ?? "python3",
        cells: notebook.cells.map((cell) => ({
            id: getCellId(cell),
            cellType: cell.cell_type,
            source: normalizeSource(cell.source),
            executionCount: cell.execution_count ?? null,
            outputs: cell.outputs ?? [],
        })),
    };
}

function resolveNotebookId(ctx, input) {
    const fromInput = input && typeof input.notebookId === "string" ? input.notebookId : undefined;
    const fromBoundServer = ctx.notebookId ?? servers.get(ctx.instanceId)?.notebookId;
    if (fromBoundServer && fromInput && fromBoundServer !== fromInput) {
        throw new CanvasError("notebook_mismatch", "This canvas instance is bound to a different notebook.");
    }
    return fromBoundServer ?? fromInput ?? "default";
}

function mutateNotebook(notebookId, mutator, expectedRevision, options = {}) {
    return withNotebookLock(notebookId, async () => {
        const notebook = await loadNotebookUnlocked(notebookId);
        const currentRevision = Number(notebook.metadata.copilot.revision ?? 0);
        if (Number.isInteger(expectedRevision) && expectedRevision !== currentRevision) {
            throw new CanvasError(
                "revision_conflict",
                `Notebook changed since revision ${expectedRevision}; current revision is ${currentRevision}. Your draft was not overwritten.`,
            );
        }
        if (!options.skipWorkspacePreflight) {
            await assertWorkspaceUnchanged(notebookId, notebook);
        }
        const history = historyByNotebook.get(notebookId) ?? { redo: [], undo: [] };
        history.undo.push(structuredClone(notebook));
        history.undo = history.undo.slice(-50);
        history.redo = [];
        historyByNotebook.set(notebookId, history);
        const result = await mutator(notebook);
        notebook.metadata.copilot.revision = currentRevision + 1;
        await writeNotebookUnlocked(notebookId, notebook);
        await writeWorkspaceCopy(notebookId, notebook, { overwrite: options.workspaceOverwrite ?? true });
        broadcast(notebookId, notebook);
        return { notebookId, notebook: summarizeNotebook(notebook), ...(result ?? {}) };
    });
}

function findCell(notebook, cellId) {
    const cell = notebook.cells.find((candidate) => getCellId(candidate) === cellId);
    if (!cell) {
        throw new CanvasError("cell_not_found", `No cell found with id ${cellId}`);
    }
    return cell;
}

function findCellIndex(notebook, cellId) {
    const index = notebook.cells.findIndex((candidate) => getCellId(candidate) === cellId);
    if (index === -1) {
        throw new CanvasError("cell_not_found", `No cell found with id ${cellId}`);
    }
    return index;
}

function outputFromRun(result) {
    const outputs = [];
    if (result.stdout) {
        outputs.push({ output_type: "stream", name: "stdout", text: result.stdout });
    }
    if (result.stderr) {
        outputs.push({ output_type: "stream", name: "stderr", text: result.stderr });
    }
    if (result.resultData && Object.keys(result.resultData).length > 0) {
        outputs.push({
            output_type: "execute_result",
            execution_count: result.executionCount,
            data: result.resultData,
            metadata: {},
        });
    }
    for (const display of result.displays ?? []) {
        outputs.push({
            output_type: "display_data",
            data: display,
            metadata: {},
        });
    }
    if (result.error) {
        outputs.push({
            output_type: "error",
            ename: result.error.ename,
            evalue: result.error.evalue,
            traceback: result.error.traceback,
        });
    }
    return outputs;
}

const pythonRunner = String.raw`
import ast
import base64
import contextlib
import io
import json
import os
import pathlib
import sys
import traceback
try:
    import resource
except ImportError:
    resource = None

payload = json.load(sys.stdin)
namespace = {}
results = []
MAX_CAPTURE = 250_000
WORKSPACE = pathlib.Path.cwd().resolve()
if resource is not None:
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (25, 30))
        resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024, 10 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    except (AttributeError, OSError, ValueError):
        pass
READ_ROOTS = [WORKSPACE]
for entry in [sys.base_prefix, sys.prefix, *sys.path]:
    if entry:
        try:
            READ_ROOTS.append(pathlib.Path(entry).resolve())
        except (OSError, TypeError):
            pass

class LimitedBuffer(io.StringIO):
    def __init__(self, limit):
        super().__init__()
        self.limit = limit
        self.written = 0
        self.truncated = False

    def write(self, value):
        value = str(value)
        remaining = self.limit - self.written
        if remaining <= 0:
            self.truncated = True
            return len(value)
        chunk = value[:remaining]
        self.written += len(chunk)
        if len(chunk) < len(value):
            self.truncated = True
        super().write(chunk)
        return len(value)

    def value(self):
        suffix = "\n[output truncated]" if self.truncated else ""
        return self.getvalue() + suffix

def resolve_path(value):
    if isinstance(value, int):
        return None
    try:
        return pathlib.Path(value).resolve()
    except (OSError, TypeError, ValueError):
        raise PermissionError("Unable to resolve filesystem path")

def under(path_value, roots):
    if path_value is None:
        return True
    return any(path_value == root or root in path_value.parents for root in roots)

def audit(event, args):
    if event.startswith(("socket.", "subprocess.", "ctypes.", "pty.")) or event in {
        "os.system", "os.posix_spawn", "os.spawn", "os.fork", "os.forkpty"
    }:
        raise PermissionError(f"{event} is disabled in notebook execution")
    if event == "open":
        target = resolve_path(args[0])
        mode = str(args[1]) if len(args) > 1 else "r"
        write_mode = any(flag in mode for flag in ("w", "a", "x", "+"))
        roots = [WORKSPACE] if write_mode else READ_ROOTS
        if not under(target, roots):
            raise PermissionError("Filesystem access outside the isolated workspace is disabled")
    if event in {"os.listdir", "os.scandir", "os.chdir"} and args:
        if not under(resolve_path(args[0]), READ_ROOTS):
            raise PermissionError("Directory access outside the isolated workspace is disabled")
    if event in {
        "os.remove", "os.rmdir", "os.mkdir", "os.chmod", "os.chown", "os.truncate",
        "os.link", "os.symlink"
    } and args:
        if not under(resolve_path(args[0]), [WORKSPACE]):
            raise PermissionError("Filesystem changes outside the isolated workspace are disabled")
    if event in {"os.rename", "os.replace"}:
        if any(not under(resolve_path(value), [WORKSPACE]) for value in args[:2]):
            raise PermissionError("Filesystem changes outside the isolated workspace are disabled")

sys.addaudithook(audit)

def rich_repr(value):
    data = {}
    if value is None:
        return data
    try:
        html_method = getattr(value, "_repr_html_", None)
        if callable(html_method):
            html = html_method()
            if html:
                data["text/html"] = str(html)[:MAX_CAPTURE]
    except Exception:
        pass
    try:
        png_method = getattr(value, "_repr_png_", None)
        if callable(png_method):
            png = png_method()
            if png:
                if isinstance(png, tuple):
                    png = png[0]
                data["image/png"] = base64.b64encode(png).decode("ascii")
    except Exception:
        pass
    rendered = repr(value)
    data["text/plain"] = rendered[:MAX_CAPTURE]
    if len(rendered) > MAX_CAPTURE:
        data["text/plain"] += "\n[result truncated]"
    return data

def capture_figures():
    displays = []
    pyplot = sys.modules.get("matplotlib.pyplot")
    if pyplot is None:
        return displays
    for number in pyplot.get_fignums():
        buffer = io.BytesIO()
        pyplot.figure(number).savefig(buffer, format="png", bbox_inches="tight")
        displays.append({"image/png": base64.b64encode(buffer.getvalue()).decode("ascii")})
        buffer.close()
    pyplot.close("all")
    return displays

def run_cell(cell, index):
    stdout = LimitedBuffer(MAX_CAPTURE)
    stderr = LimitedBuffer(MAX_CAPTURE)
    result_data = {}
    displays = []
    error = None
    code = cell.get("code") or ""
    try:
        tree = ast.parse(code, filename=f"<cell {index + 1}>", mode="exec")
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                last_expr = ast.Expression(tree.body[-1].value)
                tree.body = tree.body[:-1]
                ast.fix_missing_locations(tree)
                ast.fix_missing_locations(last_expr)
                if tree.body:
                    exec(compile(tree, f"<cell {index + 1}>", "exec"), namespace, namespace)
                value = eval(compile(last_expr, f"<cell {index + 1}>", "eval"), namespace, namespace)
                result_data = rich_repr(value)
            else:
                exec(compile(tree, f"<cell {index + 1}>", "exec"), namespace, namespace)
            displays = capture_figures()
    except Exception as exc:
        error = {
            "ename": exc.__class__.__name__,
            "evalue": str(exc),
            "traceback": traceback.format_exc().splitlines(),
        }
    return {
        "id": cell.get("id"),
        "stdout": stdout.value(),
        "stderr": stderr.value(),
        "resultData": result_data,
        "displays": displays,
        "error": error,
    }

for index, cell in enumerate(payload.get("cells", [])):
    results.append(run_cell(cell, index))
    if results[-1]["error"] is not None and payload.get("stopOnError", True):
        break

print(json.dumps({"results": results}))
`;

async function runPython(payload, notebookId, preferredRuntime) {
    const executionDir = await mkdtemp(path.join(tmpdir(), "copilot-notebook-"));
    const errors = [];
    const commands = preferredRuntime ? [preferredRuntime] : ["python3", "python"];
    try {
        for (const command of commands) {
            try {
                return await runPythonCommand(command, payload, notebookId, executionDir);
            } catch (error) {
                if (error?.code === "ENOENT") {
                    errors.push(`${command}: not found`);
                    continue;
                }
                throw error;
            }
        }
        throw new CanvasError("python_not_found", `Unable to run notebook cells because Python was not found (${errors.join(", ")}).`);
    } finally {
        await rm(executionDir, { recursive: true, force: true });
    }
}

function terminateProcessTree(child, detached, signal) {
    try {
        if (detached && child.pid) {
            process.kill(-child.pid, signal);
        } else {
            child.kill(signal);
        }
    } catch (error) {
        if (error?.code !== "ESRCH") {
            throw error;
        }
    }
}

function runPythonCommand(command, payload, notebookId, executionDir) {
    return new Promise((resolve, reject) => {
        const detached = process.platform !== "win32";
        const child = spawn(command, ["-I", "-c", pythonRunner], {
            cwd: executionDir,
            detached,
            env: {
                HOME: executionDir,
                LANG: "C.UTF-8",
                PATH: process.env.PATH ?? "/usr/bin:/bin",
                PYTHONIOENCODING: "utf-8",
                PYTHONUNBUFFERED: "1",
                TMPDIR: executionDir,
            },
            stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        let forceKillTimer;

        const finish = (callback) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            clearTimeout(forceKillTimer);
            if (activeRuns.get(notebookId)?.child === child) {
                activeRuns.delete(notebookId);
            }
            callback();
        };
        const stop = (message, code = "execution_interrupted") => {
            if (settled) {
                return;
            }
            terminateProcessTree(child, detached, "SIGTERM");
            finish(() => reject(new CanvasError(code, message)));
            forceKillTimer = setTimeout(() => {
                try {
                    terminateProcessTree(child, detached, "SIGKILL");
                } catch {
                    // The process may already have exited.
                }
            }, 1000);
            forceKillTimer.unref?.();
        };
        activeRuns.set(notebookId, { child, stop });
        const timeout = setTimeout(() => {
            stop("Notebook execution timed out after 30 seconds.", "cell_timeout");
        }, 30000);

        child.on("error", (error) => {
            finish(() => reject(error));
        });
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
            if (Buffer.byteLength(stdout) > 2_000_000) {
                stop("Notebook output exceeded the 2 MB limit.", "output_too_large");
            }
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
            if (Buffer.byteLength(stderr) > 250_000) {
                stop("Notebook error output exceeded the 250 KB limit.", "output_too_large");
            }
        });
        child.on("close", (code) => {
            if (settled) {
                return;
            }
            if (code !== 0) {
                finish(() => reject(new CanvasError("python_failed", stderr || `Python exited with code ${code}`)));
                return;
            }
            try {
                const parsed = JSON.parse(stdout);
                finish(() => resolve(parsed));
            } catch {
                finish(() => reject(new CanvasError("runner_output_invalid", "The Python runner returned invalid JSON.")));
            }
        });
        child.stdin.end(JSON.stringify(payload));
    });
}

async function runNotebookCells(notebook, targetCellId, notebookId) {
    const language = String(
        notebook.metadata?.language_info?.name
        ?? notebook.metadata?.kernelspec?.language
        ?? "",
    ).toLowerCase();
    if (language !== "python") {
        throw new CanvasError("kernel_unsupported", `Execution is only available for Python notebooks, not ${language || "unknown"} notebooks.`);
    }
    const targetIndex = targetCellId ? findCellIndex(notebook, targetCellId) : notebook.cells.length - 1;
    const executableCells = notebook.cells
        .slice(0, targetIndex + 1)
        .filter((cell) => cell.cell_type === "code")
        .map((cell) => ({ id: getCellId(cell), code: normalizeSource(cell.source) }));

    broadcastStatus(notebookId, {
        status: "running",
        cellId: executableCells[0]?.id ?? null,
        cellCount: executableCells.length,
        message: `Running ${executableCells.length} ${executableCells.length === 1 ? "cell" : "cells"}`,
    });
    try {
        const run = await runPython(
            { cells: executableCells, stopOnError: true },
            notebookId,
            notebook.metadata?.copilot?.runtime,
        );
        const byId = new Map(run.results.map((result) => [result.id, result]));
        for (const cell of notebook.cells.slice(0, targetIndex + 1)) {
            if (cell.cell_type !== "code") {
                continue;
            }
            const result = byId.get(getCellId(cell));
            if (!result) {
                continue;
            }
            const executionCount = Number(notebook.metadata.copilot.executionCount ?? 0) + 1;
            notebook.metadata.copilot.executionCount = executionCount;
            cell.execution_count = executionCount;
            cell.outputs = outputFromRun({ ...result, executionCount });
        }
    } finally {
        broadcastStatus(notebookId, { status: "idle", cellId: null, message: "Execution finished" });
    }
}

function addClient(notebookId, instanceId, res, entry) {
    let clients = clientsByNotebook.get(notebookId);
    if (!clients) {
        clients = new Set();
        clientsByNotebook.set(notebookId, clients);
    }
    const client = { instanceId, res };
    clients.add(client);
    entry.eventClients.add(res);
    res.on("close", () => {
        clients.delete(client);
        entry.eventClients.delete(res);
        if (clients.size === 0) {
            clientsByNotebook.delete(notebookId);
        }
    });
}

function broadcast(notebookId, notebook) {
    const clients = clientsByNotebook.get(notebookId);
    if (!clients) {
        return;
    }
    const data = JSON.stringify(summarizeNotebook(notebook));
    for (const client of clients) {
        if (!client.res.destroyed && !client.res.writableEnded) {
            client.res.write(`event: notebook\ndata: ${data}\n\n`);
        }
    }
}

function broadcastStatus(notebookId, status) {
    const clients = clientsByNotebook.get(notebookId);
    if (!clients) {
        return;
    }
    const data = JSON.stringify(status);
    for (const client of clients) {
        if (!client.res.destroyed && !client.res.writableEnded) {
            client.res.write(`event: execution\ndata: ${data}\n\n`);
        }
    }
}

async function readJson(req) {
    let body = "";
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 1_000_000) {
            throw new CanvasError("request_too_large", "Request body exceeded the 1 MB limit.");
        }
    }
    try {
        return body ? JSON.parse(body) : {};
    } catch {
        throw new CanvasError("request_json_invalid", "Request body must be valid JSON.");
    }
}

function sendJson(res, status, payload) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(payload));
}

function tokenMatches(provided, expected) {
    if (typeof provided !== "string") {
        return false;
    }
    const actualBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireCapability(req, requestUrl, entry) {
    const provided = req.headers["x-notebook-token"] ?? requestUrl.searchParams.get("token");
    if (!tokenMatches(provided, entry.token)) {
        throw new CanvasError("request_unauthorized", "Missing or invalid canvas capability token.");
    }
}

function requireSameOrigin(req, entry) {
    if (req.headers.origin !== entry.origin) {
        throw new CanvasError("request_origin_invalid", "Notebook actions must originate from this canvas.");
    }
}

function setDocumentSecurityHeaders(res) {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'",
    );
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
}

function assertString(value, name, { required = false, maxLength = 500_000, pattern } = {}) {
    if (value === undefined && !required) {
        return;
    }
    if (typeof value !== "string" || (required && value.length === 0) || value.length > maxLength) {
        throw new CanvasError("action_input_invalid", `${name} must be a string of at most ${maxLength} characters.`);
    }
    if (pattern && !pattern.test(value)) {
        throw new CanvasError("action_input_invalid", `${name} has an invalid format.`);
    }
}

function validateHttpActionPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new CanvasError("action_input_invalid", "Action input must be a JSON object.");
    }
    const actionFields = {
        get_notebook: [],
        list_workspace_notebooks: [],
        save_workspace: ["expectedRevision"],
        save_as: ["path", "overwrite", "expectedRevision"],
        open_workspace: ["path", "expectedRevision"],
        new_notebook: ["title", "expectedRevision"],
        rename_workspace: ["path", "overwrite", "expectedRevision"],
        duplicate_workspace: ["path", "overwrite"],
        move_cell: ["cellId", "direction", "expectedRevision"],
        duplicate_cell: ["cellId", "expectedRevision"],
        undo: ["expectedRevision"],
        redo: ["expectedRevision"],
        get_runtimes: [],
        set_runtime: ["runtime", "expectedRevision"],
        restart_runtime: ["expectedRevision"],
        create_checkpoint: ["label"],
        list_checkpoints: [],
        restore_checkpoint: ["checkpointId", "expectedRevision"],
        set_title: ["title", "expectedRevision"],
        add_cell: ["afterCellId", "cellType", "source", "expectedRevision"],
        update_cell: ["cellId", "cellType", "source", "expectedRevision"],
        delete_cell: ["cellId", "expectedRevision"],
        run_cell: ["cellId", "expectedRevision"],
        run_all: ["expectedRevision"],
        clear_outputs: ["expectedRevision"],
        interrupt: [],
    };
    const action = payload.action;
    if (typeof action !== "string" || !Object.hasOwn(actionFields, action)) {
        throw new CanvasError("unknown_action", "Unknown notebook action.");
    }
    const allowed = new Set(["action", ...actionFields[action]]);
    const unexpected = Object.keys(payload).find((key) => !allowed.has(key));
    if (unexpected) {
        throw new CanvasError("action_input_invalid", `Unexpected action field: ${unexpected}`);
    }
    if (payload.expectedRevision !== undefined && (!Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 0)) {
        throw new CanvasError("action_input_invalid", "expectedRevision must be a non-negative integer.");
    }
    assertString(payload.cellId, "cellId", {
        required: ["update_cell", "delete_cell", "run_cell", "move_cell", "duplicate_cell"].includes(action),
        maxLength: 64,
        pattern: cellIdRegex,
    });
    assertString(payload.afterCellId, "afterCellId", { maxLength: 64, pattern: cellIdRegex });
    assertString(payload.title, "title", { required: action === "set_title", maxLength: 120 });
    assertString(payload.path, "path", {
        required: ["save_as", "open_workspace", "rename_workspace", "duplicate_workspace"].includes(action),
        maxLength: 240,
    });
    assertString(payload.source, "source");
    assertString(payload.runtime, "runtime", { required: action === "set_runtime", maxLength: 32 });
    assertString(payload.label, "label", { maxLength: 80 });
    assertString(payload.checkpointId, "checkpointId", {
        required: action === "restore_checkpoint",
        maxLength: 80,
        pattern: /^[A-Za-z0-9_-]{1,80}$/,
    });
    if (payload.direction !== undefined && !["up", "down"].includes(payload.direction)) {
        throw new CanvasError("action_input_invalid", "direction must be up or down.");
    }
    if (action === "move_cell" && payload.direction === undefined) {
        throw new CanvasError("action_input_invalid", "direction is required.");
    }
    if (payload.overwrite !== undefined && typeof payload.overwrite !== "boolean") {
        throw new CanvasError("action_input_invalid", "overwrite must be a boolean.");
    }
    if (payload.cellType !== undefined && !["code", "markdown", "raw"].includes(payload.cellType)) {
        throw new CanvasError("action_input_invalid", "cellType must be code, markdown, or raw.");
    }
    if (action === "add_cell" && payload.cellType === undefined) {
        throw new CanvasError("action_input_invalid", "cellType is required.");
    }
    if (action === "update_cell" && payload.cellType === undefined && payload.source === undefined) {
        throw new CanvasError("action_input_invalid", "update_cell requires source or cellType.");
    }
    return { action, input: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "action")) };
}

async function handleCanvasAction(ctx, action, input = {}) {
    await storageReady;
    const notebookId = resolveNotebookId(ctx, input);
    if (action === "get_notebook") {
        const notebook = await loadNotebook(notebookId);
        return { notebookId, path: notebookPath(notebookId), notebook: summarizeNotebook(notebook) };
    }
    if (action === "list_workspace_notebooks") {
        return { notebookId, files: await listWorkspaceNotebooks() };
    }
    if (action === "save_workspace") {
        return withNotebookLock(notebookId, async () => {
            const notebook = await loadNotebookUnlocked(notebookId);
            const currentRevision = Number(notebook.metadata.copilot.revision ?? 0);
            if (Number.isInteger(input.expectedRevision) && input.expectedRevision !== currentRevision) {
                throw new CanvasError("revision_conflict", "Notebook changed before it could be saved.");
            }
            if (!notebook.metadata.copilot.workspacePath) {
                throw new CanvasError("workspace_path_required", "Choose Save As before saving this notebook.");
            }
            await assertWorkspaceUnchanged(notebookId, notebook);
            await writeWorkspaceCopy(notebookId, notebook);
            return { notebookId, notebook: summarizeNotebook(notebook), saved: true };
        });
    }
    if (action === "save_as") {
        const target = await assertWorkspaceTargetAvailable(input.path, input.overwrite === true);
        return mutateNotebook(notebookId, (notebook) => {
            notebook.metadata.copilot.workspacePath = target.relative;
        }, input.expectedRevision, { workspaceOverwrite: true });
    }
    if (action === "rename_workspace") {
        const target = await assertWorkspaceTargetAvailable(input.path, input.overwrite === true);
        const current = await loadNotebook(notebookId);
        const previousPath = current.metadata?.copilot?.workspacePath;
        if (!previousPath) {
            throw new CanvasError("workspace_path_required", "Save the notebook before renaming it.");
        }
        const result = await mutateNotebook(notebookId, (notebook) => {
            notebook.metadata.copilot.workspacePath = target.relative;
        }, input.expectedRevision, { workspaceOverwrite: true });
        if (previousPath !== target.relative) {
            await rm(normalizeWorkspacePath(previousPath).resolved, { force: true });
        }
        return result;
    }
    if (action === "duplicate_workspace") {
        const target = await assertWorkspaceTargetAvailable(input.path, input.overwrite === true);
        const notebook = await loadNotebook(notebookId);
        await assertWorkspaceUnchanged(notebookId, notebook);
        const duplicate = structuredClone(notebook);
        duplicate.metadata.copilot.workspacePath = target.relative;
        duplicate.metadata.copilot.title = path.basename(target.relative, ".ipynb");
        await writeWorkspaceDocument(target.relative, serializeNotebook(duplicate), { overwrite: true });
        return { notebookId, duplicatedPath: target.relative, files: await listWorkspaceNotebooks() };
    }
    if (action === "open_workspace") {
        const source = await readWorkspaceNotebook(input.path);
        return withNotebookLock(notebookId, async () => {
            const current = await loadNotebookUnlocked(notebookId);
            const currentRevision = Number(current.metadata.copilot.revision ?? 0);
            if (Number.isInteger(input.expectedRevision) && input.expectedRevision !== currentRevision) {
                throw new CanvasError("revision_conflict", "Notebook changed before the selected file could be opened.");
            }
            const history = historyByNotebook.get(notebookId) ?? { redo: [], undo: [] };
            history.undo.push(structuredClone(current));
            history.redo = [];
            historyByNotebook.set(notebookId, history);
            const { notebook } = normalizeNotebook(
                source.parsed,
                notebookId,
                path.basename(source.relative, ".ipynb"),
            );
            notebook.metadata.copilot.workspacePath = source.relative;
            notebook.metadata.copilot.revision = currentRevision + 1;
            await writeNotebookUnlocked(notebookId, notebook);
            await writeWorkspaceCopy(notebookId, notebook);
            broadcast(notebookId, notebook);
            return { notebookId, notebook: summarizeNotebook(notebook), openedPath: source.relative };
        });
    }
    if (action === "new_notebook") {
        return mutateNotebook(notebookId, (notebook) => {
            const fresh = normalizeNotebook({}, notebookId, input.title || "Untitled notebook", true).notebook;
            notebook.cells = fresh.cells;
            notebook.metadata = fresh.metadata;
            delete notebook.metadata.copilot.workspacePath;
        }, input.expectedRevision);
    }
    if (action === "move_cell") {
        return mutateNotebook(notebookId, (notebook) => {
            const index = findCellIndex(notebook, input.cellId);
            const target = input.direction === "up" ? index - 1 : index + 1;
            if (target < 0 || target >= notebook.cells.length) {
                return;
            }
            [notebook.cells[index], notebook.cells[target]] = [notebook.cells[target], notebook.cells[index]];
        }, input.expectedRevision);
    }
    if (action === "duplicate_cell") {
        return mutateNotebook(notebookId, (notebook) => {
            const index = findCellIndex(notebook, input.cellId);
            const duplicate = structuredClone(notebook.cells[index]);
            duplicate.id = createCellId(new Set(notebook.cells.map((cell) => getCellId(cell))));
            duplicate.metadata = { ...(duplicate.metadata ?? {}), copilotCellId: duplicate.id };
            if (duplicate.cell_type === "code") {
                duplicate.execution_count = null;
                duplicate.outputs = [];
            }
            notebook.cells.splice(index + 1, 0, duplicate);
            return { cellId: duplicate.id };
        }, input.expectedRevision);
    }
    if (action === "undo" || action === "redo") {
        return applyHistory(notebookId, action, input.expectedRevision);
    }
    if (action === "get_runtimes") {
        return { notebookId, runtimes: await getAvailableRuntimes() };
    }
    if (action === "set_runtime") {
        const runtimes = await getAvailableRuntimes();
        if (!runtimes.some((runtime) => runtime.id === input.runtime)) {
            throw new CanvasError("runtime_unavailable", "The selected Python runtime is unavailable.");
        }
        return mutateNotebook(notebookId, (notebook) => {
            notebook.metadata.copilot.runtime = input.runtime;
        }, input.expectedRevision);
    }
    if (action === "restart_runtime") {
        return mutateNotebook(notebookId, (notebook) => {
            notebook.metadata.copilot.executionCount = 0;
            for (const cell of notebook.cells) {
                if (cell.cell_type === "code") {
                    cell.execution_count = null;
                    cell.outputs = [];
                }
            }
        }, input.expectedRevision);
    }
    if (action === "create_checkpoint") {
        const notebook = await loadNotebook(notebookId);
        const checkpoint = await createCheckpoint(notebookId, notebook, input.label);
        return { notebookId, checkpoint, checkpoints: await listCheckpoints(notebookId) };
    }
    if (action === "list_checkpoints") {
        return { notebookId, checkpoints: await listCheckpoints(notebookId) };
    }
    if (action === "restore_checkpoint") {
        const record = JSON.parse(await readFile(checkpointPath(notebookId, input.checkpointId), "utf8"));
        return mutateNotebook(notebookId, (notebook) => {
            const workspacePath = notebook.metadata?.copilot?.workspacePath;
            notebook.cells = structuredClone(record.notebook.cells);
            notebook.metadata = structuredClone(record.notebook.metadata);
            if (workspacePath) {
                notebook.metadata.copilot.workspacePath = workspacePath;
            } else {
                delete notebook.metadata.copilot.workspacePath;
            }
        }, input.expectedRevision);
    }
    if (action === "interrupt") {
        const run = activeRuns.get(notebookId);
        if (!run) {
            return { notebookId, interrupted: false };
        }
        run.stop("Notebook execution interrupted.");
        return { notebookId, interrupted: true };
    }
    if (action === "set_title") {
        return mutateNotebook(notebookId, (notebook) => {
            notebook.metadata.copilot.title = textToSource(input.title).slice(0, 120) || "Untitled notebook";
        }, input.expectedRevision);
    }
    if (action === "add_cell") {
        return mutateNotebook(notebookId, (notebook) => {
            const cell = createCell(input.cellType, input.source);
            if (input.afterCellId) {
                const index = findCellIndex(notebook, input.afterCellId);
                notebook.cells.splice(index + 1, 0, cell);
            } else {
                notebook.cells.push(cell);
            }
            return { cellId: getCellId(cell) };
        }, input.expectedRevision);
    }
    if (action === "update_cell") {
        return mutateNotebook(notebookId, (notebook) => {
            const cell = findCell(notebook, input.cellId);
            if (typeof input.cellType === "string" && input.cellType !== cell.cell_type) {
                cell.cell_type = input.cellType;
                if (cell.cell_type === "code") {
                    cell.execution_count = null;
                    cell.outputs = [];
                } else {
                    delete cell.execution_count;
                    delete cell.outputs;
                }
            }
            if (typeof input.source === "string") {
                cell.source = input.source;
            }
        }, input.expectedRevision);
    }
    if (action === "delete_cell") {
        return mutateNotebook(notebookId, (notebook) => {
            const index = findCellIndex(notebook, input.cellId);
            notebook.cells.splice(index, 1);
            if (notebook.cells.length === 0) {
                notebook.cells.push(createCell("code", ""));
            }
        }, input.expectedRevision);
    }
    if (action === "run_cell") {
        return mutateNotebook(notebookId, async (notebook) => {
            await runNotebookCells(notebook, input.cellId, notebookId);
        }, input.expectedRevision);
    }
    if (action === "run_all") {
        return mutateNotebook(notebookId, async (notebook) => {
            await runNotebookCells(notebook, undefined, notebookId);
        }, input.expectedRevision);
    }
    if (action === "clear_outputs") {
        return mutateNotebook(notebookId, (notebook) => {
            for (const cell of notebook.cells) {
                if (cell.cell_type === "code") {
                    cell.outputs = [];
                    cell.execution_count = null;
                }
            }
        }, input.expectedRevision);
    }
    throw new CanvasError("unknown_action", `Unknown notebook action: ${action}`);
}

async function handleHttpAction(ctx, req, res) {
    const payload = validateHttpActionPayload(await readJson(req));
    const result = await handleCanvasAction(ctx, payload.action, payload.input);
    sendJson(res, 200, result);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function renderHtml(notebookId) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Notebook</title>
  <style>
    :root {
      color-scheme: light dark;
      --canvas-bg: var(--background-color-default, #ffffff);
      --canvas-subtle: color-mix(in srgb, var(--text-color-default, #1f2328) 4%, transparent);
      --canvas-muted: color-mix(in srgb, var(--text-color-default, #1f2328) 7%, transparent);
      --canvas-hover: color-mix(in srgb, var(--text-color-default, #1f2328) 9%, transparent);
      --canvas-border: var(--border-color-default, #d0d7de);
      --canvas-accent: var(--true-color-blue, #0969da);
      --canvas-danger: var(--true-color-red, #cf222e);
      --canvas-success: #1a7f37;
      --canvas-shadow: 0 1px 2px rgba(31, 35, 40, 0.04), 0 8px 24px rgba(31, 35, 40, 0.05);
    }
    * {
      box-sizing: border-box;
    }
    html {
      min-height: 100%;
      background: var(--canvas-bg);
    }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 50% -20%, color-mix(in srgb, var(--canvas-accent) 7%, transparent), transparent 36rem),
        var(--canvas-bg);
      color: var(--text-color-default, #1f2328);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--text-body-medium, 14px);
      line-height: var(--leading-body-medium, 20px);
    }
    button, input, textarea, select {
      font: inherit;
    }
    button {
      color: inherit;
    }
    .app-header {
      position: sticky;
      top: 0;
      z-index: 20;
      border-bottom: 1px solid var(--canvas-border);
      background: color-mix(in srgb, var(--canvas-bg) 94%, transparent);
      backdrop-filter: blur(18px) saturate(1.25);
    }
    .identity-bar {
      display: flex;
      align-items: center;
      min-height: 58px;
      gap: 12px;
      padding: 9px 16px;
    }
    .brand-mark {
      display: grid;
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--canvas-accent) 22%, var(--canvas-border));
      border-radius: 9px;
      background: color-mix(in srgb, var(--canvas-accent) 10%, var(--canvas-bg));
      color: var(--canvas-accent);
      box-shadow: inset 0 1px rgba(255, 255, 255, 0.12);
    }
    .brand-mark svg {
      width: 19px;
      height: 19px;
    }
    .document-identity {
      min-width: 0;
      flex: 1;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-color-muted, #57606a);
      font-size: 11px;
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: 0.055em;
      line-height: 15px;
      text-transform: uppercase;
    }
    .eyebrow-separator {
      opacity: 0.5;
    }
    #title {
      display: block;
      width: min(100%, 640px);
      min-width: 0;
      margin: -1px 0 0 -7px;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 3px 6px;
      background: transparent;
      color: var(--text-color-default, #1f2328);
      font-size: var(--text-title-medium, 18px);
      font-weight: var(--font-weight-semibold, 600);
      line-height: 24px;
      text-overflow: ellipsis;
    }
    #title:hover {
      border-color: var(--canvas-border);
      background: var(--canvas-subtle);
    }
    #title:focus {
      border-color: var(--canvas-accent);
      background: var(--canvas-bg);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--canvas-accent) 18%, transparent);
      outline: none;
    }
    .kernel {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex: 0 0 auto;
      border: 1px solid var(--canvas-border);
      border-radius: 999px;
      padding: 5px 10px;
      background: var(--canvas-subtle);
      color: var(--text-color-muted, #57606a);
      font-size: 12px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .kernel-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--canvas-success);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--canvas-success) 14%, transparent);
    }
    .kernel.unavailable .kernel-dot {
      background: var(--text-color-muted, #57606a);
      box-shadow: none;
    }
    .command-bar {
      display: flex;
      min-height: 44px;
      align-items: center;
      gap: 7px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--border-color-default, #d0d7de);
      border-top: 1px solid color-mix(in srgb, var(--canvas-border) 62%, transparent);
      background: color-mix(in srgb, var(--canvas-bg) 97%, var(--canvas-subtle));
    }
    .command-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .command-separator {
      width: 1px;
      height: 22px;
      margin: 0 3px;
      background: var(--canvas-border);
    }
    .command-spacer {
      flex: 1;
    }
    .button {
      display: inline-flex;
      min-height: 30px;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid var(--canvas-border);
      border-radius: 6px;
      padding: 4px 9px;
      background: color-mix(in srgb, var(--canvas-bg) 96%, var(--canvas-muted));
      color: var(--text-color-default, #1f2328);
      font-weight: var(--font-weight-semibold, 600);
      line-height: 20px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
    }
    .button:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--text-color-default, #1f2328) 28%, var(--canvas-border));
      background: var(--canvas-hover);
    }
    .button:active:not(:disabled) {
      transform: translateY(1px);
    }
    .button:focus-visible, .icon-button:focus-visible, select:focus-visible {
      outline: 2px solid var(--color-focus-outline, #0969da);
      outline-offset: 2px;
    }
    .button:disabled, .icon-button:disabled {
      cursor: not-allowed;
      opacity: 0.52;
    }
    [hidden] {
      display: none !important;
    }
    .button svg, .icon-button svg {
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
    .button.primary {
      border-color: color-mix(in srgb, var(--canvas-accent) 85%, #000000);
      background: var(--canvas-accent);
      color: var(--color-white, #ffffff);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--canvas-accent) 24%, transparent);
    }
    .button.primary:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--canvas-accent) 76%, #000000);
      background: color-mix(in srgb, var(--canvas-accent) 88%, #000000);
    }
    .shortcut {
      margin-left: 3px;
      border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
      border-radius: 4px;
      padding: 0 4px;
      font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace);
      font-size: 10px;
      font-weight: 400;
      line-height: 16px;
      opacity: 0.82;
    }
    #status {
      display: inline-flex;
      min-width: 112px;
      align-items: center;
      justify-content: flex-end;
      gap: 7px;
      color: var(--text-color-muted, #57606a);
      font-size: 12px;
      white-space: nowrap;
    }
    #status::before {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--canvas-success);
      content: "";
    }
    #status[data-tone="busy"]::before {
      border: 1.5px solid color-mix(in srgb, var(--canvas-accent) 28%, transparent);
      border-top-color: var(--canvas-accent);
      background: transparent;
      animation: spin 750ms linear infinite;
    }
    #status[data-tone="error"] {
      color: var(--canvas-danger);
    }
    #status[data-tone="error"]::before {
      background: var(--canvas-danger);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .workspace {
      width: min(100%, 1040px);
      margin: 0 auto;
      padding: 26px 24px 72px;
    }
    .notebook-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 14px 56px;
      color: var(--text-color-muted, #57606a);
      font-size: 12px;
    }
    .summary-divider {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.45;
    }
    #cells {
      display: grid;
      gap: 14px;
    }
    .cell {
      position: relative;
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      border: 1px solid var(--canvas-border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--canvas-bg) 97%, var(--canvas-subtle));
      box-shadow: 0 1px 1px rgba(31, 35, 40, 0.02);
      transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }
    .cell:hover {
      border-color: color-mix(in srgb, var(--text-color-default, #1f2328) 23%, var(--canvas-border));
      box-shadow: var(--canvas-shadow);
    }
    .cell:focus-within, .cell.selected {
      border-color: var(--canvas-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--canvas-accent) 12%, transparent), var(--canvas-shadow);
    }
    .cell-gutter {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      border-right: 1px solid var(--canvas-border);
      border-radius: 9px 0 0 9px;
      padding-top: 42px;
      background: var(--canvas-subtle);
      color: var(--text-color-muted, #57606a);
      font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace);
      font-size: 11px;
      line-height: 18px;
    }
    .cell:focus-within .cell-gutter {
      background: color-mix(in srgb, var(--canvas-accent) 8%, var(--canvas-bg));
      color: var(--canvas-accent);
    }
    .cell-main {
      min-width: 0;
      overflow: hidden;
      border-radius: 0 9px 9px 0;
    }
    .cell-toolbar {
      display: flex;
      min-height: 38px;
      align-items: center;
      gap: 5px;
      padding: 5px 7px 5px 10px;
      border-bottom: 1px solid var(--canvas-border);
      background: var(--canvas-subtle);
    }
    .cell-kind {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-color-muted, #57606a);
      font-size: 11px;
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .cell-kind::before {
      width: 6px;
      height: 6px;
      border-radius: 2px;
      background: var(--canvas-accent);
      content: "";
    }
    .markdown .cell-kind::before {
      background: #8250df;
    }
    .cell-toolbar select {
      max-width: 105px;
      border: 0;
      border-radius: 5px;
      padding: 3px 5px;
      background: transparent;
      color: var(--text-color-muted, #57606a);
      font-size: 12px;
      cursor: pointer;
    }
    .cell-toolbar select:hover {
      background: var(--canvas-hover);
      color: var(--text-color-default, #1f2328);
    }
    .cell-spacer {
      flex: 1;
    }
    .icon-button {
      display: inline-grid;
      width: 28px;
      height: 28px;
      place-items: center;
      border: 0;
      border-radius: 6px;
      padding: 0;
      background: transparent;
      color: var(--text-color-muted, #57606a);
      cursor: pointer;
    }
    .icon-button:hover:not(:disabled) {
      background: var(--canvas-hover);
      color: var(--text-color-default, #1f2328);
    }
    .icon-button.run {
      color: var(--canvas-accent);
    }
    .icon-button.danger:hover:not(:disabled) {
      background: var(--true-color-red-muted, #ffebe9);
      color: var(--canvas-danger);
    }
    .editor-wrap {
      position: relative;
      background: var(--canvas-bg);
    }
    textarea {
      display: block;
      width: 100%;
      min-height: 96px;
      max-height: 520px;
      resize: none;
      border: 0;
      padding: 14px 16px 16px;
      overflow-y: auto;
      background: transparent;
      color: var(--text-color-default, #1f2328);
      font-family: var(--font-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
      font-size: var(--text-code-block, 13px);
      line-height: 1.6;
      tab-size: 4;
      caret-color: var(--canvas-accent);
    }
    textarea:focus {
      outline: 0;
    }
    textarea::placeholder {
      color: var(--text-color-muted, #57606a);
      opacity: 0.75;
    }
    .markdown textarea, .preview {
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    }
    .preview, .outputs {
      border-top: 1px solid var(--canvas-border);
    }
    .preview {
      padding: 16px 18px;
      background: var(--canvas-subtle);
      color: var(--text-color-default, #1f2328);
    }
    .preview:empty::before {
      color: var(--text-color-muted, #57606a);
      content: "Nothing to preview yet.";
    }
    .preview h1, .preview h2, .preview h3 {
      margin: 0 0 8px;
      line-height: 1.25;
    }
    .preview h1 {
      font-size: 22px;
    }
    .preview h2 {
      font-size: 18px;
    }
    .preview h3 {
      font-size: 15px;
    }
    .preview-label {
      margin-bottom: 8px;
      color: var(--text-color-muted, #57606a);
      font-size: 10px;
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: 0.045em;
      text-transform: uppercase;
    }
    .outputs {
      background: color-mix(in srgb, var(--canvas-bg) 97%, var(--canvas-subtle));
    }
    .output-heading {
      display: flex;
      min-height: 32px;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid var(--canvas-border);
      padding: 5px 12px;
      color: var(--text-color-muted, #57606a);
      font-size: 11px;
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .output-heading svg {
      width: 13px;
      height: 13px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
    }
    .output-list {
      padding: 10px 12px 12px;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--font-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
      font-size: var(--text-code-block, 13px);
    }
    .output {
      position: relative;
      margin-bottom: 7px;
      border: 1px solid color-mix(in srgb, var(--canvas-border) 70%, transparent);
      border-radius: 6px;
      padding: 9px 11px;
      background: var(--canvas-subtle);
    }
    .output:last-child {
      margin-bottom: 0;
    }
    .output.result {
      border-color: color-mix(in srgb, var(--canvas-accent) 18%, var(--canvas-border));
      background: color-mix(in srgb, var(--canvas-accent) 5%, var(--canvas-bg));
    }
    .output.error {
      border-color: color-mix(in srgb, var(--canvas-danger) 22%, var(--canvas-border));
      background: var(--true-color-red-muted, #ffebe9);
      color: var(--true-color-red, #cf222e);
    }
    .add-row {
      display: flex;
      height: 0;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .cell:hover + .add-row, .add-row:hover, .add-row:focus-within {
      opacity: 1;
    }
    .quick-add {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--canvas-border);
      border-radius: 999px;
      padding: 3px 9px;
      background: var(--canvas-bg);
      color: var(--text-color-muted, #57606a);
      box-shadow: 0 2px 8px rgba(31, 35, 40, 0.08);
      font-size: 11px;
      cursor: pointer;
    }
    .quick-add:hover {
      border-color: var(--canvas-accent);
      color: var(--canvas-accent);
    }
    .empty-state {
      display: grid;
      min-height: 320px;
      place-items: center;
      border: 1px dashed var(--canvas-border);
      border-radius: 12px;
      text-align: center;
    }
    .empty-state h2 {
      margin: 0 0 6px;
      font-size: 16px;
    }
    .empty-state p {
      max-width: 360px;
      margin: 0 0 16px;
      color: var(--text-color-muted, #57606a);
    }
    .error-banner {
      display: none;
      align-items: flex-start;
      gap: 10px;
      margin: 0 0 14px 56px;
      border: 1px solid color-mix(in srgb, var(--canvas-danger) 28%, var(--canvas-border));
      border-radius: 8px;
      padding: 9px 11px;
      background: var(--true-color-red-muted, #ffebe9);
      color: var(--canvas-danger);
      font-size: 12px;
    }
    .error-banner.visible {
      display: flex;
    }
    .error-banner strong {
      display: block;
      margin-bottom: 1px;
    }
    .identity-bar {
      min-height: 52px;
      padding: 8px 16px;
      gap: 10px;
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      box-shadow: none;
    }
    .brand-mark svg {
      width: 20px;
      height: 20px;
    }
    .document-identity {
      display: flex;
      min-width: 0;
      flex: 1;
      align-items: center;
      gap: 4px;
    }
    .eyebrow {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 4px;
      margin: 0;
      color: var(--text-color-muted, #57606a);
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
    }
    .eyebrow span:first-child {
      color: var(--fgColor-accent, #0969da);
      font-weight: var(--font-weight-semibold, 600);
    }
    .eyebrow-separator {
      color: var(--text-color-muted, #57606a);
    }
    #workspace-path {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #title {
      width: min(330px, 42vw);
      min-width: 120px;
      height: 30px;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 3px 7px;
      background: transparent;
      font-size: 14px;
      font-weight: var(--font-weight-semibold, 600);
    }
    #title:hover {
      border-color: var(--canvas-border);
    }
    #title:focus {
      border-color: var(--canvas-accent);
      background: var(--canvas-bg);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--canvas-accent) 18%, transparent);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-actions .button {
      min-height: 30px;
    }
    .runtime-select {
      max-width: 180px;
      height: 30px;
      border: 1px solid var(--canvas-border);
      border-radius: 6px;
      padding: 0 26px 0 9px;
      background: var(--canvas-bg);
      color: var(--text-color-default, #1f2328);
      font: inherit;
      font-size: 12px;
    }
    .menu {
      position: relative;
    }
    .menu > summary {
      list-style: none;
    }
    .menu > summary::-webkit-details-marker {
      display: none;
    }
    .menu-popover {
      position: absolute;
      z-index: 20;
      top: calc(100% + 6px);
      right: 0;
      display: grid;
      width: 188px;
      border: 1px solid var(--canvas-border);
      border-radius: 8px;
      padding: 6px;
      background: var(--canvas-bg);
      box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
    }
    .menu-popover button, .menu-popover a {
      display: flex;
      width: 100%;
      min-height: 30px;
      align-items: center;
      border: 0;
      border-radius: 5px;
      padding: 5px 8px;
      background: transparent;
      color: var(--text-color-default, #1f2328);
      font: inherit;
      font-size: 12px;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .menu-popover button:hover, .menu-popover a:hover {
      background: var(--canvas-accent);
      color: #fff;
    }
    .menu-divider {
      height: 1px;
      margin: 5px -6px;
      background: var(--canvas-border);
    }
    .command-bar {
      min-height: 42px;
      padding: 6px 16px;
    }
    .command-bar .button {
      min-height: 28px;
    }
    .content-shell {
      display: grid;
      grid-template-columns: 0 minmax(0, 1fr);
      min-height: calc(100vh - 95px);
      transition: grid-template-columns 160ms ease;
    }
    .content-shell.outline-open {
      grid-template-columns: 240px minmax(0, 1fr);
    }
    .outline {
      position: sticky;
      top: 95px;
      height: calc(100vh - 95px);
      overflow: hidden auto;
      border-right: 1px solid var(--canvas-border);
      background: var(--canvas-subtle);
      opacity: 0;
      visibility: hidden;
      transition: opacity 120ms ease;
    }
    .outline-open .outline {
      opacity: 1;
      visibility: visible;
    }
    .outline-header {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--canvas-border);
      padding: 12px 14px;
      background: var(--canvas-subtle);
      font-size: 12px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .outline-list {
      display: grid;
      gap: 2px;
      padding: 8px;
    }
    .outline-item {
      display: block;
      width: 100%;
      overflow: hidden;
      border: 0;
      border-radius: 5px;
      padding: 6px 8px;
      background: transparent;
      color: var(--text-color-muted, #57606a);
      font: inherit;
      font-size: 12px;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    .outline-item:hover {
      background: color-mix(in srgb, var(--canvas-border) 45%, transparent);
      color: var(--text-color-default, #1f2328);
    }
    .outline-item[data-depth="2"] { padding-left: 20px; }
    .outline-item[data-depth="3"] { padding-left: 32px; }
    .outline-empty {
      padding: 16px;
      color: var(--text-color-muted, #57606a);
      font-size: 12px;
    }
    .outline-backdrop {
      display: none;
    }
    .workspace {
      width: min(100%, 1120px);
      margin: 0 auto;
      padding-top: 22px;
    }
    .notebook-summary, .error-banner {
      margin-left: 48px;
    }
    .markdown-preview-mode .editor-wrap {
      display: none;
    }
    .markdown-edit-mode .preview {
      display: none;
    }
    .preview {
      min-height: 64px;
      padding: 16px 18px 18px;
      background: var(--canvas-bg);
      font-size: 14px;
      line-height: 1.6;
    }
    .preview h1, .preview h2 {
      border-bottom: 1px solid var(--canvas-border);
      padding-bottom: 0.3em;
    }
    .preview h1 { font-size: 2em; }
    .preview h2 { font-size: 1.5em; }
    .preview h3 { font-size: 1.25em; }
    .preview h4 { font-size: 1em; }
    .preview h1, .preview h2, .preview h3, .preview h4 {
      margin: 24px 0 16px;
    }
    .preview h1:first-child, .preview h2:first-child, .preview h3:first-child, .preview h4:first-child {
      margin-top: 0;
    }
    .preview p, .preview ul, .preview ol, .preview blockquote, .preview table, .preview pre {
      margin: 0 0 16px;
    }
    .preview ul, .preview ol {
      padding-left: 2em;
    }
    .preview blockquote {
      border-left: 0.25em solid var(--canvas-border);
      padding-left: 1em;
      color: var(--text-color-muted, #57606a);
    }
    .preview code {
      border-radius: 4px;
      padding: 0.2em 0.4em;
      background: var(--canvas-subtle);
      font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace);
      font-size: 85%;
    }
    .preview pre {
      overflow: auto;
      border-radius: 6px;
      padding: 16px;
      background: var(--canvas-subtle);
    }
    .preview pre code {
      padding: 0;
      background: transparent;
      font-size: 100%;
    }
    .preview table {
      display: block;
      width: max-content;
      max-width: 100%;
      overflow: auto;
      border-collapse: collapse;
    }
    .preview th, .preview td {
      border: 1px solid var(--canvas-border);
      padding: 6px 13px;
    }
    .preview tr:nth-child(2n) {
      background: var(--canvas-subtle);
    }
    .output.rich {
      overflow: auto;
      padding: 0;
      background: #fff;
    }
    .output.rich iframe {
      display: block;
      width: 100%;
      min-height: 160px;
      border: 0;
      background: #fff;
    }
    .output-image {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }
    .cell-progress {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--canvas-accent);
      font-size: 11px;
    }
    .cell-progress::before {
      width: 9px;
      height: 9px;
      border: 2px solid color-mix(in srgb, var(--canvas-accent) 30%, transparent);
      border-top-color: var(--canvas-accent);
      border-radius: 50%;
      animation: spin 650ms linear infinite;
      content: "";
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    dialog {
      width: min(520px, calc(100vw - 32px));
      border: 1px solid var(--canvas-border);
      border-radius: 12px;
      padding: 0;
      background: var(--canvas-bg);
      color: var(--text-color-default, #1f2328);
      box-shadow: 0 16px 48px rgba(31, 35, 40, 0.22);
    }
    dialog::backdrop {
      background: rgba(31, 35, 40, 0.36);
    }
    .dialog-header {
      border-bottom: 1px solid var(--canvas-border);
      padding: 14px 16px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .dialog-body {
      display: grid;
      gap: 10px;
      padding: 16px;
    }
    .dialog-body label {
      font-size: 12px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .dialog-body input, .dialog-body select {
      width: 100%;
      min-height: 34px;
      border: 1px solid var(--canvas-border);
      border-radius: 6px;
      padding: 5px 9px;
      background: var(--canvas-bg);
      color: inherit;
      font: inherit;
    }
    .dialog-body select {
      min-height: 180px;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid var(--canvas-border);
      padding: 12px 16px;
    }
    @media (max-width: 720px) {
      .identity-bar, .command-bar {
        padding-right: 10px;
        padding-left: 10px;
      }
      .kernel, .shortcut, .button-label.optional {
        display: none;
      }
      .command-bar {
        overflow-x: auto;
      }
      .workspace {
        padding: 18px 10px 54px;
      }
      .notebook-summary, .error-banner {
        margin-left: 0;
      }
      .cell {
        grid-template-columns: 36px minmax(0, 1fr);
      }
      .cell-gutter {
        padding-top: 41px;
      }
      .cell-toolbar {
        padding-left: 7px;
      }
      .runtime-select, #open-notebook, .document-identity .eyebrow, .document-identity > .eyebrow-separator {
        display: none;
      }
      #title {
        width: 100%;
      }
      .content-shell, .content-shell.outline-open {
        grid-template-columns: minmax(0, 1fr);
      }
      .outline {
        position: fixed;
        z-index: 30;
        top: 95px;
        left: 0;
        width: min(260px, 84vw);
        height: calc(100vh - 95px);
        border-right: 1px solid var(--canvas-border);
        background: var(--canvas-bg);
        box-shadow: 8px 0 24px rgba(31, 35, 40, 0.18);
        transform: translateX(-100%);
        transition: transform 160ms ease, opacity 120ms ease;
      }
      .outline-open .outline {
        transform: translateX(0);
      }
      .outline-header {
        background: var(--canvas-bg);
      }
      .outline-open .outline-backdrop {
        position: fixed;
        z-index: 29;
        inset: 95px 0 0;
        display: block;
        width: 100%;
        height: auto;
        border: 0;
        padding: 0;
        background: rgba(31, 35, 40, 0.28);
        cursor: default;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  </style>
</head>
<body>
  <header class="app-header">
    <div class="identity-bar">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 3.75h8.5A3.5 3.5 0 0 1 18 7.25v13H9.5A3.5 3.5 0 0 1 6 16.75v-13Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.5 20.25A3.5 3.5 0 0 1 13 16.75h5M9.5 8.25h5M9.5 11.75h3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/></svg>
      </div>
      <div class="document-identity">
        <div class="eyebrow">
          <span>workspace</span>
          <span class="eyebrow-separator">/</span>
          <span id="workspace-path">${escapeHtml(notebookId)}.ipynb</span>
        </div>
        <span class="eyebrow-separator" aria-hidden="true">/</span>
        <input id="title" aria-label="Notebook title" value="Loading..." spellcheck="false" />
      </div>
      <div class="header-actions">
        <select id="runtime-select" class="runtime-select" aria-label="Python runtime" title="Python runtime"></select>
        <button id="open-notebook" class="button" type="button">Open</button>
        <button id="save-notebook" class="button primary" type="button">Save</button>
        <details id="file-menu" class="menu">
          <summary class="icon-button" aria-label="More notebook actions" title="More notebook actions">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a1 1 0 1 0 0 .01M8 8a1 1 0 1 0 0 .01M13 8a1 1 0 1 0 0 .01"/></svg>
          </summary>
          <div class="menu-popover">
            <button id="new-notebook" type="button">New notebook</button>
            <button id="save-as" type="button">Save as...</button>
            <button id="rename-notebook" type="button">Rename...</button>
            <button id="duplicate-notebook" type="button">Duplicate...</button>
            <div class="menu-divider"></div>
            <button id="restart-runtime" type="button">Restart runtime</button>
            <button id="create-checkpoint" type="button">Create checkpoint</button>
            <button id="restore-checkpoint" type="button">Restore checkpoint...</button>
            <div class="menu-divider"></div>
            <a id="download-notebook" href="#" download>Download .ipynb</a>
          </div>
        </details>
      </div>
    </div>
    <div class="command-bar" aria-label="Notebook commands">
      <div class="command-group">
        <button id="toggle-outline" class="button" type="button" aria-pressed="false" title="Toggle outline">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h2M6.5 3.5h7M2.5 8h2M6.5 8h7M2.5 12.5h2M6.5 12.5h7"/></svg>
          <span class="button-label optional">Outline</span>
        </button>
        <button id="undo" class="button" type="button" title="Undo (⌘Z)" aria-label="Undo">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4 3 7.5 6.5 11M3.5 7.5h5a4 4 0 0 1 4 4"/></svg>
        </button>
        <button id="redo" class="button" type="button" title="Redo (⇧⌘Z)" aria-label="Redo">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 4 13 7.5 9.5 11M12.5 7.5h-5a4 4 0 0 0-4 4"/></svg>
        </button>
      </div>
      <span class="command-separator" aria-hidden="true"></span>
      <div class="command-group">
        <button id="run-all" class="button primary" type="button">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5.5 3.5 6 4.5-6 4.5v-9Z"/></svg>
          <span>Run all</span>
        </button>
        <button id="interrupt" class="button" type="button" hidden>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5h7v7h-7z"/></svg>
          <span>Interrupt</span>
        </button>
        <button id="clear" class="button" type="button" title="Clear all outputs" aria-label="Clear all outputs">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6 2.5h4M5 4.5l.5 9h5l.5-9"/></svg>
          <span class="button-label optional">Clear outputs</span>
        </button>
      </div>
      <span class="command-separator" aria-hidden="true"></span>
      <div class="command-group">
        <button id="add-code" class="button" type="button">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          <span>Code</span>
        </button>
        <button id="add-markdown" class="button" type="button">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          <span>Markdown</span>
        </button>
      </div>
      <span class="command-spacer"></span>
      <span id="status" data-tone="busy" role="status" aria-live="polite">Opening notebook</span>
    </div>
  </header>
  <div id="content-shell" class="content-shell">
    <aside class="outline" aria-label="Notebook outline">
      <div class="outline-header">
        <span>Outline</span>
        <button id="close-outline" class="icon-button" type="button" aria-label="Close outline">×</button>
      </div>
      <nav id="outline-list" class="outline-list"></nav>
    </aside>
    <button id="outline-backdrop" class="outline-backdrop" type="button" aria-label="Close outline"></button>
    <main class="workspace">
      <div id="error-banner" class="error-banner" role="alert">
        <div>
          <strong>Something went wrong</strong>
          <span id="error-message"></span>
        </div>
      </div>
      <div class="notebook-summary" aria-live="polite">
        <span id="cell-count">0 cells</span>
        <span class="summary-divider" aria-hidden="true"></span>
        <span id="runtime-label">Isolated Python</span>
        <span class="summary-divider" aria-hidden="true"></span>
        <span id="persistence-label">Autosaved internally</span>
      </div>
      <div id="cells"></div>
    </main>
  </div>
  <dialog id="file-dialog" aria-labelledby="file-dialog-title">
    <form id="file-dialog-form" method="dialog">
      <div id="file-dialog-title" class="dialog-header">Open notebook</div>
      <div class="dialog-body">
        <label id="file-dialog-label" for="file-dialog-path">Workspace path</label>
        <input id="file-dialog-path" type="text" autocomplete="off" placeholder="notebooks/analysis.ipynb" />
        <select id="file-dialog-list" aria-label="Workspace notebooks" hidden></select>
      </div>
      <div class="dialog-actions">
        <button class="button" value="cancel" type="submit">Cancel</button>
        <button id="file-dialog-confirm" class="button primary" value="default" type="submit">Open</button>
      </div>
    </form>
  </dialog>
  <script>
    const status = document.querySelector("#status");
    const title = document.querySelector("#title");
    const cells = document.querySelector("#cells");
    const cellCount = document.querySelector("#cell-count");
    const errorBanner = document.querySelector("#error-banner");
    const errorMessage = document.querySelector("#error-message");
    const runAllButton = document.querySelector("#run-all");
    const interruptButton = document.querySelector("#interrupt");
    const runtimeLabel = document.querySelector("#runtime-label");
    const runtimeSelect = document.querySelector("#runtime-select");
    const workspacePathLabel = document.querySelector("#workspace-path");
    const persistenceLabel = document.querySelector("#persistence-label");
    const contentShell = document.querySelector("#content-shell");
    const outlineList = document.querySelector("#outline-list");
    const fileDialog = document.querySelector("#file-dialog");
    const fileDialogForm = document.querySelector("#file-dialog-form");
    const fileDialogTitle = document.querySelector("#file-dialog-title");
    const fileDialogLabel = document.querySelector("#file-dialog-label");
    const fileDialogPath = document.querySelector("#file-dialog-path");
    const fileDialogList = document.querySelector("#file-dialog-list");
    const fileDialogConfirm = document.querySelector("#file-dialog-confirm");
    const capabilityToken = new URLSearchParams(window.location.hash.slice(1)).get("token");
    let notebook = null;
    const saveTimers = new Map();
    const dirtyCells = new Set();
    const cellBaseSources = new Map();
    const conflictedCells = new Set();
    let dirtyTitle = false;
    let titleConflict = false;
    let titleBase = "";
    let busyCount = 0;
    let runningCellId = null;
    let fileDialogMode = "";
    const markdownModes = new Map();

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function setStatus(text, tone = "success") {
      status.textContent = text;
      status.dataset.tone = tone;
    }

    function showError(error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = message;
      errorBanner.classList.add("visible");
      setStatus("Action failed", "error");
    }

    function clearError() {
      errorBanner.classList.remove("visible");
      errorMessage.textContent = "";
    }

    function setBusy(isBusy, label) {
      busyCount = Math.max(0, busyCount + (isBusy ? 1 : -1));
      runAllButton.disabled = busyCount > 0 || (notebook && notebook.language.toLowerCase() !== "python");
      if (busyCount > 0) {
        setStatus(label || "Working", "busy");
      } else if (errorBanner.classList.contains("visible")) {
        setStatus("Action required", "error");
      } else if (dirtyTitle || dirtyCells.size > 0) {
        setStatus("Unsaved draft", "busy");
      } else {
        setStatus("All changes saved");
      }
    }

    function isMutation(action) {
      return ![
        "get_notebook",
        "interrupt",
        "list_workspace_notebooks",
        "get_runtimes",
        "list_checkpoints",
        "duplicate_workspace",
        "create_checkpoint",
      ].includes(action);
    }

    function mergeRemoteNotebook(remote) {
      if (!notebook) {
        notebook = remote;
        titleBase = remote.title;
        return;
      }
      const drafts = new Map(
        [...cells.querySelectorAll(".cell textarea")]
          .map((editor) => [editor.closest(".cell").dataset.cellId, editor.value]),
      );
      const merged = structuredClone(remote);
      for (const cellId of dirtyCells) {
        const remoteCell = merged.cells.find((cell) => cell.id === cellId);
        const draft = drafts.get(cellId);
        const base = cellBaseSources.get(cellId);
        if (!remoteCell || draft === undefined) {
          continue;
        }
        if (remoteCell.source === draft) {
          dirtyCells.delete(cellId);
          cellBaseSources.delete(cellId);
          conflictedCells.delete(cellId);
          continue;
        }
        if (base !== undefined && remoteCell.source !== base) {
          conflictedCells.add(cellId);
          clearTimeout(saveTimers.get(cellId));
          saveTimers.delete(cellId);
          showError(new Error("A cell changed elsewhere while you were editing. Your draft is preserved; edit it again to intentionally apply it."));
        }
        remoteCell.source = draft;
      }
      if (dirtyTitle) {
        if (remote.title === title.value) {
          dirtyTitle = false;
          titleBase = remote.title;
        } else if (remote.title !== titleBase) {
          titleConflict = true;
          clearTimeout(saveTimers.get("title"));
          saveTimers.delete("title");
          showError(new Error("The notebook title changed elsewhere. Your title draft is preserved."));
        }
        merged.title = title.value;
      } else {
        titleBase = remote.title;
      }
      notebook = merged;
    }

    function acceptMutationResult(action, payload, remote) {
      if (action === "open_workspace" || action === "new_notebook") {
        for (const timer of saveTimers.values()) {
          clearTimeout(timer);
        }
        saveTimers.clear();
        dirtyCells.clear();
        cellBaseSources.clear();
        conflictedCells.clear();
        markdownModes.clear();
        dirtyTitle = false;
        titleConflict = false;
        notebook = null;
      }
      if (action === "update_cell" && payload.cellId) {
        dirtyCells.delete(payload.cellId);
        cellBaseSources.delete(payload.cellId);
        conflictedCells.delete(payload.cellId);
      }
      if (action === "set_title") {
        dirtyTitle = false;
        titleConflict = false;
        titleBase = remote.title;
      }
      mergeRemoteNotebook(remote);
    }

    async function api(action, payload = {}, options = {}) {
      const label = options.label || action.replaceAll("_", " ");
      const isExecution = action === "run_cell" || action === "run_all";
      clearError();
      if (isExecution) {
        interruptButton.hidden = false;
      }
      setBusy(true, label);
      try {
        const requestPayload = { action, ...payload };
        if (isMutation(action) && notebook && requestPayload.expectedRevision === undefined) {
          requestPayload.expectedRevision = notebook.revision;
        }
        const response = await fetch("/api/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Notebook-Token": capabilityToken,
          },
          body: JSON.stringify(requestPayload),
        });
        const data = await response.json();
        if (!response.ok) {
          const error = new Error(data.message || "Canvas action failed");
          error.code = data.code;
          throw error;
        }
        if (data.notebook) {
          if (isMutation(action)) {
            acceptMutationResult(action, payload, data.notebook);
          } else {
            mergeRemoteNotebook(data.notebook);
          }
          if (options.renderResponse !== false) {
            render();
          }
        }
        return data;
      } finally {
        if (isExecution) {
          interruptButton.hidden = true;
        }
        setBusy(false);
      }
    }

    function outputValue(value) {
      return Array.isArray(value) ? value.join("") : value || "";
    }

    function outputText(output) {
      if (output.output_type === "stream") {
        return outputValue(output.text);
      }
      if (output.output_type === "execute_result") {
        return outputValue(output.data?.["text/plain"]);
      }
      if (output.output_type === "error") {
        return [output.ename + ": " + output.evalue, ...(output.traceback || [])].join("\\n");
      }
      return JSON.stringify(output, null, 2);
    }

    function renderInlineMarkdown(value) {
      const codeSpans = [];
      let rendered = escapeHtml(value).replace(/\`([^\`]+)\`/g, (_, code) => {
        const marker = "@@CODE" + codeSpans.length + "@@";
        codeSpans.push("<code>" + code + "</code>");
        return marker;
      });
      rendered = rendered
        .replace(/!\\[([^\\]]*)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+|mailto:[^\\s)]+)\\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
        .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>")
        .replace(/(^|[^*])\\*([^*]+)\\*/g, "$1<em>$2</em>")
        .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
      return rendered.replace(/@@CODE(\\d+)@@/g, (_, index) => codeSpans[Number(index)]);
    }

    function renderMarkdown(source) {
      const lines = String(source || "").replaceAll("\\r\\n", "\\n").split("\\n");
      const html = [];
      let listType = "";
      let inFence = false;
      let fenceLanguage = "";
      let fenceLines = [];
      const closeList = () => {
        if (listType) {
          html.push("</" + listType + ">");
          listType = "";
        }
      };
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const fence = line.match(/^\\s*\`\`\`\\s*([\\w-]*)\\s*$/);
        if (fence) {
          closeList();
          if (inFence) {
            html.push('<pre><code class="language-' + escapeHtml(fenceLanguage) + '">' + escapeHtml(fenceLines.join("\\n")) + "</code></pre>");
            inFence = false;
            fenceLines = [];
          } else {
            inFence = true;
            fenceLanguage = fence[1] || "";
          }
          continue;
        }
        if (inFence) {
          fenceLines.push(line);
          continue;
        }
        if (!line.trim()) {
          closeList();
          continue;
        }
        const nextLine = lines[index + 1] || "";
        if (
          line.includes("|")
          && /^\\s*\\|?\\s*:?-{3,}:?\\s*(\\|\\s*:?-{3,}:?\\s*)+\\|?\\s*$/.test(nextLine)
        ) {
          closeList();
          const headers = line.replace(/^\\s*\\||\\|\\s*$/g, "").split("|").map((cell) => cell.trim());
          const rows = [];
          index += 2;
          while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
            rows.push(lines[index].replace(/^\\s*\\||\\|\\s*$/g, "").split("|").map((cell) => cell.trim()));
            index += 1;
          }
          index -= 1;
          html.push("<table><thead><tr>" + headers.map((cell) => "<th>" + renderInlineMarkdown(cell) + "</th>").join("") + "</tr></thead><tbody>");
          for (const row of rows) {
            html.push("<tr>" + headers.map((_, column) => "<td>" + renderInlineMarkdown(row[column] || "") + "</td>").join("") + "</tr>");
          }
          html.push("</tbody></table>");
          continue;
        }
        const heading = line.match(/^(#{1,4})\\s+(.+)$/);
        if (heading) {
          closeList();
          const level = heading[1].length;
          html.push("<h" + level + ">" + renderInlineMarkdown(heading[2]) + "</h" + level + ">");
          continue;
        }
        const unordered = line.match(/^\\s*[-*+]\\s+(.+)$/);
        const ordered = line.match(/^\\s*\\d+[.)]\\s+(.+)$/);
        if (unordered || ordered) {
          const wantedType = unordered ? "ul" : "ol";
          if (listType !== wantedType) {
            closeList();
            listType = wantedType;
            html.push("<" + listType + ">");
          }
          const item = (unordered || ordered)[1];
          const task = item.match(/^\\[([ xX])\\]\\s*(.*)$/);
          html.push(
            "<li>"
            + (task ? '<input type="checkbox" disabled ' + (task[1].toLowerCase() === "x" ? "checked" : "") + " /> " : "")
            + renderInlineMarkdown(task ? task[2] : item)
            + "</li>",
          );
          continue;
        }
        closeList();
        const quote = line.match(/^>\\s?(.*)$/);
        if (quote) {
          html.push("<blockquote>" + renderInlineMarkdown(quote[1]) + "</blockquote>");
        } else if (/^(-{3,}|\\*{3,}|_{3,})\\s*$/.test(line)) {
          html.push("<hr />");
        } else {
          html.push("<p>" + renderInlineMarkdown(line) + "</p>");
        }
      }
      closeList();
      if (inFence) {
        html.push('<pre><code class="language-' + escapeHtml(fenceLanguage) + '">' + escapeHtml(fenceLines.join("\\n")) + "</code></pre>");
      }
      return html.join("");
    }

    function renderOutput(output) {
      const isError = output.output_type === "error";
      const isResult = output.output_type === "execute_result" || output.output_type === "display_data";
      const data = output.data || {};
      const image = outputValue(data["image/png"]);
      if (image) {
        return '<div class="output rich"><img class="output-image" src="data:image/png;base64,' + image.replace(/[^A-Za-z0-9+/=]/g, "") + '" alt="Python output visualization" /></div>';
      }
      const richHtml = outputValue(data["text/html"]);
      if (richHtml) {
        const documentHtml = '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \\'none\\'; img-src data: https:; style-src \\'unsafe-inline\\'"><style>body{margin:12px;font:13px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1f2328}table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:6px 10px}tr:nth-child(2n){background:#f6f8fa}img{max-width:100%}</style>' + richHtml;
        return '<div class="output rich"><iframe sandbox="" title="Rich Python output" srcdoc="' + escapeHtml(documentHtml) + '"></iframe></div>';
      }
      return '<div class="output ' + (isError ? "error" : isResult ? "result" : "") + '"><pre>' + escapeHtml(outputText(output)) + "</pre></div>";
    }

    function renderOutline() {
      outlineList.innerHTML = "";
      if (!notebook) {
        return;
      }
      const entries = [];
      for (const [index, cell] of notebook.cells.entries()) {
        if (cell.cellType === "markdown") {
          const headings = cell.source.split("\\n")
            .map((line) => line.match(/^(#{1,3})\\s+(.+)$/))
            .filter(Boolean);
          for (const heading of headings) {
            entries.push({ cellId: cell.id, depth: heading[1].length, label: heading[2] });
          }
        }
        if (cell.cellType === "code" && cell.source.trim()) {
          entries.push({
            cellId: cell.id,
            depth: 3,
            label: "Code " + (index + 1) + ": " + cell.source.trim().split("\\n")[0],
          });
        }
      }
      if (entries.length === 0) {
        outlineList.innerHTML = '<div class="outline-empty">Add Markdown headings to build an outline.</div>';
        return;
      }
      for (const entry of entries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "outline-item";
        button.dataset.depth = String(entry.depth);
        button.textContent = entry.label;
        button.addEventListener("click", () => {
          cells.querySelector('[data-cell-id="' + CSS.escape(entry.cellId) + '"]')?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        outlineList.appendChild(button);
      }
    }

    function captureFocus() {
      const active = document.activeElement;
      if (active === title) {
        return { kind: "title", start: title.selectionStart, end: title.selectionEnd };
      }
      const cellElement = active?.closest?.(".cell");
      if (active?.tagName === "TEXTAREA" && cellElement) {
        return {
          kind: "cell",
          cellId: cellElement.dataset.cellId,
          start: active.selectionStart,
          end: active.selectionEnd,
          scrollTop: active.scrollTop,
        };
      }
      return null;
    }

    function restoreFocus(snapshot) {
      if (!snapshot) {
        return;
      }
      const target = snapshot.kind === "title"
        ? title
        : cells.querySelector('[data-cell-id="' + CSS.escape(snapshot.cellId) + '"] textarea');
      if (!target) {
        return;
      }
      target.focus({ preventScroll: true });
      if (typeof snapshot.start === "number") {
        target.setSelectionRange(snapshot.start, snapshot.end);
      }
      if (typeof snapshot.scrollTop === "number") {
        target.scrollTop = snapshot.scrollTop;
      }
    }

    function autoSize(textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(520, Math.max(96, textarea.scrollHeight)) + "px";
    }

    function scheduleSave(cellId, source) {
      clearTimeout(saveTimers.get(cellId));
      const localCell = notebook?.cells.find((cell) => cell.id === cellId);
      if (localCell) {
        if (!dirtyCells.has(cellId)) {
          cellBaseSources.set(cellId, localCell.source);
        }
        localCell.source = source;
      }
      if (conflictedCells.has(cellId)) {
        conflictedCells.delete(cellId);
        const remoteCell = notebook?.cells.find((cell) => cell.id === cellId);
        cellBaseSources.set(cellId, remoteCell?.source ?? "");
      }
      dirtyCells.add(cellId);
      setStatus("Saving changes", "busy");
      saveTimers.set(cellId, setTimeout(() => {
        saveTimers.delete(cellId);
        api("update_cell", { cellId, source }, { label: "Saving changes" })
          .catch(showError);
      }, 450));
    }

    async function persistVisibleCells() {
      if (conflictedCells.size > 0 || titleConflict) {
        throw new Error("Resolve the preserved draft conflict before running the notebook.");
      }
      const titleDraft = title.value;
      const saveTitle = dirtyTitle;
      const editorDrafts = [...cells.querySelectorAll(".cell textarea")].map((editor) => ({
        cellId: editor.closest(".cell").dataset.cellId,
        source: editor.value,
      }));
      for (const timer of saveTimers.values()) {
        clearTimeout(timer);
      }
      saveTimers.clear();
      if (saveTitle) {
        await api("set_title", { title: titleDraft }, { label: "Saving title" });
      }
      for (const draft of editorDrafts) {
        await api("update_cell", draft, {
          label: "Saving notebook",
        });
      }
    }

    function render() {
      if (!notebook) {
        return;
      }
      const focusSnapshot = captureFocus();
      if (document.activeElement !== title) {
        title.value = notebook.title;
      }
      cellCount.textContent = notebook.cells.length + (notebook.cells.length === 1 ? " cell" : " cells");
      runtimeLabel.textContent = notebook.runtimeLabel;
      workspacePathLabel.textContent = notebook.workspacePath || "unsaved notebook";
      workspacePathLabel.title = notebook.workspacePath || "Save this notebook into the workspace";
      persistenceLabel.textContent = notebook.workspacePath ? "Saved to workspace" : "Autosaved internally";
      if ([...runtimeSelect.options].some((option) => option.value === notebook.runtime)) {
        runtimeSelect.value = notebook.runtime;
      }
      runAllButton.disabled = busyCount > 0 || notebook.language.toLowerCase() !== "python";
      renderOutline();
      cells.innerHTML = "";
      if (notebook.cells.length === 0) {
        cells.innerHTML = \`
          <div class="empty-state">
            <div>
              <h2>Start exploring</h2>
              <p>Add a Python code cell or capture context in Markdown.</p>
              <button class="button primary" data-empty-add type="button">Add a code cell</button>
            </div>
          </div>
        \`;
        cells.querySelector("[data-empty-add]").addEventListener("click", () => {
          api("add_cell", { cellType: "code", source: "" }, { label: "Adding cell" }).catch(showError);
        });
        return;
      }
      for (const [cellIndex, cell] of notebook.cells.entries()) {
        const wrapper = document.createElement("section");
        wrapper.className = "cell " + cell.cellType;
        wrapper.dataset.cellId = cell.id;
        const markdownMode = markdownModes.get(cell.id) || (cell.source.trim() ? "preview" : "edit");
        if (cell.cellType === "markdown") {
          wrapper.classList.add(markdownMode === "preview" ? "markdown-preview-mode" : "markdown-edit-mode");
        }
        const outputs = (cell.outputs || []).map(renderOutput).join("");
        const cellLabel = cell.cellType === "code" ? "Python" : cell.cellType === "markdown" ? "Markdown" : "Raw";
        wrapper.innerHTML = \`
          <div class="cell-gutter" aria-label="\${cell.cellType === "code" ? "Execution " + (cell.executionCount ?? "not run") : cellLabel + " cell"}">
            \${cell.cellType === "code" ? "[" + (cell.executionCount ?? " ") + "]" : cell.cellType === "markdown" ? "M" : "R"}
          </div>
          <div class="cell-main">
            <div class="cell-toolbar">
              <span class="cell-kind">\${cellLabel}</span>
              <select aria-label="Cell type">
                <option value="code" \${cell.cellType === "code" ? "selected" : ""}>Code</option>
                <option value="markdown" \${cell.cellType === "markdown" ? "selected" : ""}>Markdown</option>
                <option value="raw" \${cell.cellType === "raw" ? "selected" : ""}>Raw</option>
              </select>
              \${runningCellId === cell.id ? '<span class="cell-progress">Running</span>' : ""}
              <span class="cell-spacer"></span>
              \${cell.cellType === "markdown" ? '<button class="icon-button" data-action="preview" type="button" title="' + (markdownMode === "preview" ? "Edit Markdown" : "Preview Markdown") + '" aria-label="' + (markdownMode === "preview" ? "Edit Markdown" : "Preview Markdown") + '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4S1.5 8 1.5 8ZM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg></button>' : ""}
              <button class="icon-button run" data-action="run" type="button" title="Run from the start through this cell in a fresh process (Shift+Enter)" aria-label="Run through cell \${cellIndex + 1}" \${cell.cellType !== "code" || notebook.language.toLowerCase() !== "python" ? "disabled" : ""}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5.25 3.25 6.5 4.75-6.5 4.75v-9.5Z"/></svg>
              </button>
              <button class="icon-button" data-action="up" type="button" title="Move cell up" aria-label="Move cell up" \${cellIndex === 0 ? "disabled" : ""}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 9 4-4 4 4M8 5v7"/></svg>
              </button>
              <button class="icon-button" data-action="down" type="button" title="Move cell down" aria-label="Move cell down" \${cellIndex === notebook.cells.length - 1 ? "disabled" : ""}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 7 4 4 4-4M8 11V4"/></svg>
              </button>
              <button class="icon-button" data-action="duplicate" type="button" title="Duplicate cell" aria-label="Duplicate cell">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5h7v7h-7zM3.5 5.5h-1v8h8v-1"/></svg>
              </button>
              <button class="icon-button" data-action="add" type="button" title="Add code cell below" aria-label="Add code cell below">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
              </button>
              <button class="icon-button danger" data-action="delete" type="button" title="Delete cell" aria-label="Delete cell">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6 2.5h4M5 4.5l.5 9h5l.5-9"/></svg>
              </button>
            </div>
            <div class="editor-wrap">
              <textarea spellcheck="false" aria-label="\${cellLabel} cell \${cellIndex + 1}" placeholder="\${cell.cellType === "code" ? "Write Python code..." : cell.cellType === "markdown" ? "Write Markdown..." : "Raw notebook content..."}">\${escapeHtml(cell.source)}</textarea>
            </div>
            \${cell.cellType === "markdown" ? '<div class="preview" tabindex="0" aria-label="Rendered Markdown">' + renderMarkdown(cell.source) + "</div>" : ""}
            \${outputs ? '<div class="outputs"><div class="output-heading"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h11v7h-11zM5 7l2 1.5L5 10M8.5 10h2.5"/></svg>Output</div><div class="output-list">' + outputs + "</div></div>" : ""}
          </div>
        \`;
        const textarea = wrapper.querySelector("textarea");
        autoSize(textarea);
        textarea.addEventListener("focus", () => wrapper.classList.add("selected"));
        textarea.addEventListener("blur", () => wrapper.classList.remove("selected"));
        textarea.addEventListener("input", () => {
          if (cell.cellType === "markdown") {
            markdownModes.set(cell.id, "edit");
          }
          autoSize(textarea);
          scheduleSave(cell.id, textarea.value);
        });
        textarea.addEventListener("keydown", async (event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            const start = textarea.selectionStart;
            textarea.setRangeText("    ", start, textarea.selectionEnd, "end");
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            return;
          }
          if (cell.cellType === "code" && event.key === "Enter" && (event.shiftKey || event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            try {
              await api("update_cell", { cellId: cell.id, source: textarea.value }, {
                renderResponse: false,
                label: "Saving cell",
              });
              await api("run_cell", { cellId: cell.id }, { label: "Running cell" });
              if (event.shiftKey) {
                const cellElements = [...cells.querySelectorAll(".cell")];
                const index = cellElements.findIndex((element) => element.dataset.cellId === cell.id);
                const next = cellElements[index + 1]?.querySelector("textarea");
                if (next) {
                  next.focus();
                } else {
                  const added = await api("add_cell", {
                    afterCellId: cell.id,
                    cellType: "code",
                    source: "",
                  }, { label: "Adding cell" });
                  requestAnimationFrame(() => {
                    cells.querySelector('[data-cell-id="' + CSS.escape(added.cellId) + '"] textarea')?.focus();
                  });
                }
              }
            } catch (error) {
              showError(error);
            }
          }
        });
        wrapper.querySelector("select").addEventListener("change", (event) => {
          api("update_cell", { cellId: cell.id, cellType: event.target.value, source: textarea.value }, {
            label: "Changing cell type",
          }).catch(showError);
        });
        wrapper.querySelector('[data-action="run"]').addEventListener("click", () => {
          api("update_cell", { cellId: cell.id, source: textarea.value }, {
            renderResponse: false,
            label: "Saving cell",
          })
            .then(() => api("run_cell", { cellId: cell.id }, { label: "Running cell" }))
            .catch(showError);
        });
        wrapper.querySelector('[data-action="preview"]')?.addEventListener("click", () => {
          markdownModes.set(cell.id, markdownMode === "preview" ? "edit" : "preview");
          render();
          if (markdownMode === "preview") {
            requestAnimationFrame(() => {
              cells.querySelector('[data-cell-id="' + CSS.escape(cell.id) + '"] textarea')?.focus();
            });
          }
        });
        wrapper.querySelector('[data-action="up"]').addEventListener("click", () => {
          api("move_cell", { cellId: cell.id, direction: "up" }, { label: "Moving cell" }).catch(showError);
        });
        wrapper.querySelector('[data-action="down"]').addEventListener("click", () => {
          api("move_cell", { cellId: cell.id, direction: "down" }, { label: "Moving cell" }).catch(showError);
        });
        wrapper.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
          api("duplicate_cell", { cellId: cell.id }, { label: "Duplicating cell" }).catch(showError);
        });
        wrapper.querySelector('[data-action="add"]').addEventListener("click", () => {
          api("add_cell", { afterCellId: cell.id, cellType: "code", source: "" }, {
            label: "Adding cell",
          }).then((data) => requestAnimationFrame(() => {
            cells.querySelector('[data-cell-id="' + CSS.escape(data.cellId) + '"] textarea')?.focus();
          })).catch(showError);
        });
        wrapper.querySelector('[data-action="delete"]').addEventListener("click", () => {
          const hasContent = textarea.value.trim() || (cell.outputs || []).length > 0;
          if (hasContent && !window.confirm("Delete this cell and its output?")) {
            return;
          }
          api("delete_cell", { cellId: cell.id }, { label: "Deleting cell" }).catch(showError);
        });
        cells.appendChild(wrapper);
        const addRow = document.createElement("div");
        addRow.className = "add-row";
        addRow.innerHTML = '<button class="quick-add" type="button" aria-label="Add code cell here">+ Add code</button>';
        addRow.querySelector("button").addEventListener("click", () => {
          api("add_cell", { afterCellId: cell.id, cellType: "code", source: "" }, {
            label: "Adding cell",
          }).then((data) => requestAnimationFrame(() => {
            cells.querySelector('[data-cell-id="' + CSS.escape(data.cellId) + '"] textarea')?.focus();
          })).catch(showError);
        });
        cells.appendChild(addRow);
      }
      restoreFocus(focusSnapshot);
    }

    title.addEventListener("input", () => {
      clearTimeout(saveTimers.get("title"));
      if (titleConflict) {
        titleConflict = false;
        titleBase = notebook?.title ?? "";
      }
      if (notebook) {
        if (!dirtyTitle) {
          titleBase = notebook.title;
        }
        notebook.title = title.value;
      }
      dirtyTitle = true;
      setStatus("Saving title", "busy");
      saveTimers.set("title", setTimeout(() => {
        saveTimers.delete("title");
        api("set_title", { title: title.value }, {
          renderResponse: false,
          label: "Saving title",
        }).catch(showError);
      }, 450));
    });

    function closeFileMenu() {
      document.querySelector("#file-menu").open = false;
    }

    function suggestedNotebookPath(suffix = "") {
      const stem = (title.value || "untitled")
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "untitled";
      return stem + suffix + ".ipynb";
    }

    async function showFileDialog(mode) {
      closeFileMenu();
      fileDialogMode = mode;
      fileDialogPath.hidden = false;
      fileDialogList.hidden = true;
      fileDialogConfirm.disabled = false;
      if (mode === "open") {
        fileDialogTitle.textContent = "Open notebook";
        fileDialogLabel.textContent = "Workspace notebooks";
        fileDialogConfirm.textContent = "Open";
        fileDialogPath.hidden = true;
        fileDialogList.hidden = false;
        const data = await api("list_workspace_notebooks", {}, { label: "Finding notebooks" });
        fileDialogList.innerHTML = data.files.length
          ? data.files.map((file) => '<option value="' + escapeHtml(file) + '">' + escapeHtml(file) + "</option>").join("")
          : '<option value="">No .ipynb files found</option>';
        fileDialogConfirm.disabled = data.files.length === 0;
      } else if (mode === "checkpoint") {
        fileDialogTitle.textContent = "Restore checkpoint";
        fileDialogLabel.textContent = "Saved checkpoints";
        fileDialogConfirm.textContent = "Restore";
        fileDialogPath.hidden = true;
        fileDialogList.hidden = false;
        const data = await api("list_checkpoints", {}, { label: "Loading checkpoints" });
        fileDialogList.innerHTML = data.checkpoints.length
          ? data.checkpoints.map((checkpoint) => {
              const date = new Date(checkpoint.createdAt).toLocaleString();
              return '<option value="' + escapeHtml(checkpoint.checkpointId) + '">' + escapeHtml(checkpoint.label + " · " + date) + "</option>";
            }).join("")
          : '<option value="">No checkpoints yet</option>';
        fileDialogConfirm.disabled = data.checkpoints.length === 0;
      } else {
        const config = {
          save_as: ["Save notebook as", "Workspace-relative .ipynb path", "Save", notebook?.workspacePath || suggestedNotebookPath()],
          rename: ["Rename notebook", "New workspace path", "Rename", notebook?.workspacePath || suggestedNotebookPath()],
          duplicate: ["Duplicate notebook", "Copy workspace path", "Duplicate", suggestedNotebookPath("-copy")],
        }[mode];
        fileDialogTitle.textContent = config[0];
        fileDialogLabel.textContent = config[1];
        fileDialogConfirm.textContent = config[2];
        fileDialogPath.value = config[3];
      }
      fileDialog.showModal();
      requestAnimationFrame(() => (fileDialogPath.hidden ? fileDialogList : fileDialogPath).focus());
    }

    fileDialogForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (event.submitter?.value === "cancel") {
        fileDialog.close();
        return;
      }
      const value = fileDialogPath.hidden ? fileDialogList.value : fileDialogPath.value.trim();
      if (!value) {
        return;
      }
      try {
        if (fileDialogMode === "open") {
          await persistVisibleCells();
          await api("open_workspace", { path: value }, { label: "Opening notebook" });
        } else if (fileDialogMode === "checkpoint") {
          if (!window.confirm("Restore this checkpoint and replace the current notebook state?")) {
            return;
          }
          await api("restore_checkpoint", { checkpointId: value }, { label: "Restoring checkpoint" });
        } else {
          const action = {
            save_as: "save_as",
            rename: "rename_workspace",
            duplicate: "duplicate_workspace",
          }[fileDialogMode];
          await persistVisibleCells();
          await api(action, { path: value }, { label: fileDialogConfirm.textContent + " notebook" });
        }
        fileDialog.close();
      } catch (error) {
        showError(error);
      }
    });

    document.querySelector("#toggle-outline").addEventListener("click", (event) => {
      const open = contentShell.classList.toggle("outline-open");
      event.currentTarget.setAttribute("aria-pressed", String(open));
    });
    document.querySelector("#close-outline").addEventListener("click", () => {
      contentShell.classList.remove("outline-open");
      document.querySelector("#toggle-outline").setAttribute("aria-pressed", "false");
    });
    document.querySelector("#outline-backdrop").addEventListener("click", () => {
      contentShell.classList.remove("outline-open");
      document.querySelector("#toggle-outline").setAttribute("aria-pressed", "false");
      document.querySelector("#toggle-outline").focus();
    });
    document.querySelector("#open-notebook").addEventListener("click", () => {
      showFileDialog("open").catch(showError);
    });
    document.querySelector("#save-notebook").addEventListener("click", async () => {
      try {
        await persistVisibleCells();
        if (notebook?.workspacePath) {
          await api("save_workspace", {}, { label: "Saving to workspace" });
        } else {
          await showFileDialog("save_as");
        }
      } catch (error) {
        showError(error);
      }
    });
    document.querySelector("#save-as").addEventListener("click", () => {
      showFileDialog("save_as").catch(showError);
    });
    document.querySelector("#rename-notebook").addEventListener("click", () => {
      showFileDialog(notebook?.workspacePath ? "rename" : "save_as").catch(showError);
    });
    document.querySelector("#duplicate-notebook").addEventListener("click", () => {
      showFileDialog("duplicate").catch(showError);
    });
    document.querySelector("#new-notebook").addEventListener("click", async () => {
      closeFileMenu();
      try {
        await persistVisibleCells();
        await api("new_notebook", {}, { label: "Creating notebook" });
      } catch (error) {
        showError(error);
      }
    });
    document.querySelector("#download-notebook").addEventListener("click", (event) => {
      event.currentTarget.href = "/download?token=" + encodeURIComponent(capabilityToken);
      closeFileMenu();
    });
    document.querySelector("#create-checkpoint").addEventListener("click", async () => {
      closeFileMenu();
      try {
        await persistVisibleCells();
        const data = await api("create_checkpoint", { label: notebook?.title || "Manual checkpoint" }, {
          label: "Creating checkpoint",
        });
        setStatus("Checkpoint created");
        return data;
      } catch (error) {
        showError(error);
      }
    });
    document.querySelector("#restore-checkpoint").addEventListener("click", () => {
      showFileDialog("checkpoint").catch(showError);
    });
    document.querySelector("#restart-runtime").addEventListener("click", () => {
      closeFileMenu();
      api("restart_runtime", {}, { label: "Restarting runtime" }).catch(showError);
    });
    document.querySelector("#undo").addEventListener("click", () => {
      api("undo", {}, { label: "Undoing change" }).catch(showError);
    });
    document.querySelector("#redo").addEventListener("click", () => {
      api("redo", {}, { label: "Redoing change" }).catch(showError);
    });
    runtimeSelect.addEventListener("change", () => {
      api("set_runtime", { runtime: runtimeSelect.value }, { label: "Changing runtime" }).catch(showError);
    });

    document.querySelector("#add-code").addEventListener("click", () => {
      api("add_cell", { cellType: "code", source: "" }, { label: "Adding code cell" })
        .then((data) => requestAnimationFrame(() => {
          cells.querySelector('[data-cell-id="' + CSS.escape(data.cellId) + '"] textarea')?.focus();
        }))
        .catch(showError);
    });
    document.querySelector("#add-markdown").addEventListener("click", () => {
      api("add_cell", { cellType: "markdown", source: "" }, { label: "Adding Markdown cell" })
        .then((data) => requestAnimationFrame(() => {
          cells.querySelector('[data-cell-id="' + CSS.escape(data.cellId) + '"] textarea')?.focus();
        }))
        .catch(showError);
    });
    runAllButton.addEventListener("click", async () => {
      try {
        await persistVisibleCells();
        await api("run_all", {}, { label: "Running notebook" });
      } catch (error) {
        showError(error);
      }
    });
    document.querySelector("#clear").addEventListener("click", () => {
      api("clear_outputs", {}, { label: "Clearing outputs" }).catch(showError);
    });
    interruptButton.addEventListener("click", () => {
      api("interrupt", {}, { label: "Interrupting execution" }).catch(showError);
    });
    document.addEventListener("keydown", (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      if (document.activeElement?.matches("textarea, input")) {
        return;
      }
      event.preventDefault();
      api(event.shiftKey ? "redo" : "undo", {}, {
        label: event.shiftKey ? "Redoing change" : "Undoing change",
      }).catch(showError);
    });

    const events = new EventSource("/events?token=" + encodeURIComponent(capabilityToken));
    events.addEventListener("notebook", (event) => {
      mergeRemoteNotebook(JSON.parse(event.data));
      render();
      if (busyCount === 0 && !errorBanner.classList.contains("visible")) {
        setStatus("All changes saved");
      }
    });
    events.addEventListener("execution", (event) => {
      const progress = JSON.parse(event.data);
      runningCellId = progress.status === "running" ? progress.cellId : null;
      render();
      if (progress.status === "running") {
        setStatus(progress.message || "Running notebook", "busy");
      }
    });
    events.addEventListener("close", () => events.close());
    events.onerror = () => setStatus("Reconnecting", "busy");

    api("get_notebook", {}, { label: "Opening notebook" })
      .then(() => api("get_runtimes", {}, { label: "Finding runtimes" }))
      .then((data) => {
        runtimeSelect.innerHTML = data.runtimes.length
          ? data.runtimes.map((runtime) => '<option value="' + escapeHtml(runtime.id) + '">' + escapeHtml(runtime.label) + "</option>").join("")
          : '<option value="">Python unavailable</option>';
        runtimeSelect.disabled = data.runtimes.length === 0;
        if (notebook && data.runtimes.some((runtime) => runtime.id === notebook.runtime)) {
          runtimeSelect.value = notebook.runtime;
        }
      })
      .catch(showError);
  </script>
</body>
</html>`;
}

async function startServer(instanceId, notebookId) {
    const ctx = { instanceId, notebookId };
    const entry = {
        eventClients: new Set(),
        notebookId,
        origin: "",
        server: undefined,
        sockets: new Set(),
        token: randomBytes(32).toString("base64url"),
        url: "",
    };
    const server = createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
            if (req.method === "GET" && requestUrl.pathname === "/") {
                setDocumentSecurityHeaders(res);
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                });
                res.end(renderHtml(notebookId));
                return;
            }
            if (req.method === "GET" && requestUrl.pathname === "/favicon.ico") {
                res.writeHead(204, { "Cache-Control": "public, max-age=86400" });
                res.end();
                return;
            }
            if (req.method === "GET" && requestUrl.pathname === "/api/notebook") {
                requireCapability(req, requestUrl, entry);
                const notebook = await loadNotebook(notebookId);
                sendJson(res, 200, { notebookId, notebook: summarizeNotebook(notebook) });
                return;
            }
            if (req.method === "GET" && requestUrl.pathname === "/download") {
                requireCapability(req, requestUrl, entry);
                const notebook = await loadNotebook(notebookId);
                const filename = path.basename(
                    notebook.metadata?.copilot?.workspacePath ?? `${notebookId}.ipynb`,
                ).replaceAll('"', "");
                res.writeHead(200, {
                    "Content-Type": "application/x-ipynb+json; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                });
                res.end(serializeNotebook(notebook));
                return;
            }
            if (req.method === "GET" && requestUrl.pathname === "/events") {
                requireCapability(req, requestUrl, entry);
                res.writeHead(200, {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "X-Content-Type-Options": "nosniff",
                });
                addClient(notebookId, instanceId, res, entry);
                const notebook = await loadNotebook(notebookId);
                res.write(`event: notebook\ndata: ${JSON.stringify(summarizeNotebook(notebook))}\n\n`);
                return;
            }
            if (req.method === "POST" && requestUrl.pathname === "/api/action") {
                requireCapability(req, requestUrl, entry);
                requireSameOrigin(req, entry);
                if (!String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
                    throw new CanvasError("request_content_type_invalid", "Notebook actions require application/json.");
                }
                await handleHttpAction(ctx, req, res);
                return;
            }
            sendJson(res, 404, { message: "Not found" });
        } catch (error) {
            const status = error?.code === "request_unauthorized"
                ? 401
                : error?.code === "request_origin_invalid"
                    ? 403
                    : error?.code === "revision_conflict"
                        ? 409
                        : error instanceof CanvasError
                            ? 400
                            : 500;
            sendJson(res, status, { code: error.code ?? "canvas_error", message: error.message });
        }
    });
    entry.server = server;
    server.on("connection", (socket) => {
        entry.sockets.add(socket);
        socket.on("close", () => entry.sockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.origin = `http://127.0.0.1:${port}`;
    entry.url = `${entry.origin}/#token=${encodeURIComponent(entry.token)}`;
    return entry;
}

async function closeServerEntry(entry) {
    const run = activeRuns.get(entry.notebookId);
    run?.stop("Notebook canvas closed during execution.");
    for (const client of entry.eventClients) {
        if (!client.writableEnded) {
            client.write("event: close\ndata: {}\n\n");
            client.end();
        }
    }
    entry.eventClients.clear();
    await new Promise((resolve) => {
        let resolved = false;
        const finish = () => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        };
        entry.server.close(finish);
        entry.server.closeIdleConnections?.();
        const forceClose = setTimeout(() => {
            for (const socket of entry.sockets) {
                socket.destroy();
            }
            finish();
        }, 750);
        forceClose.unref?.();
    });
}

function declaredNotebookAction(name, description, properties = {}, required = []) {
    return {
        name,
        description,
        inputSchema: {
            type: "object",
            additionalProperties: false,
            required,
            properties: {
                notebookId: { type: "string", pattern: notebookIdPattern },
                ...properties,
            },
        },
        handler: (ctx) => handleCanvasAction(ctx, name, ctx.input),
    };
}

const productActions = [
    declaredNotebookAction(
        "list_workspace_notebooks",
        "List .ipynb files available in the current workspace.",
    ),
    declaredNotebookAction(
        "save_workspace",
        "Save the notebook to its current workspace path.",
    ),
    declaredNotebookAction(
        "save_as",
        "Save a workspace copy of the notebook under a new .ipynb path.",
        {
            path: { type: "string", minLength: 1, maxLength: 240 },
            overwrite: { type: "boolean" },
        },
        ["path"],
    ),
    declaredNotebookAction(
        "open_workspace",
        "Open a workspace .ipynb file in this canvas.",
        { path: { type: "string", minLength: 1, maxLength: 240 } },
        ["path"],
    ),
    declaredNotebookAction(
        "new_notebook",
        "Replace the canvas with a new empty notebook.",
        {
            title: { type: "string", minLength: 1, maxLength: 120 },
        },
    ),
    declaredNotebookAction(
        "rename_workspace",
        "Move the current workspace notebook to a new .ipynb path.",
        {
            path: { type: "string", minLength: 1, maxLength: 240 },
            overwrite: { type: "boolean" },
        },
        ["path"],
    ),
    declaredNotebookAction(
        "duplicate_workspace",
        "Create a workspace copy of the notebook at a new .ipynb path.",
        {
            path: { type: "string", minLength: 1, maxLength: 240 },
            overwrite: { type: "boolean" },
        },
        ["path"],
    ),
    declaredNotebookAction(
        "move_cell",
        "Move a cell one position up or down.",
        {
            cellId: { type: "string", pattern: cellIdPattern },
            direction: { type: "string", enum: ["up", "down"] },
        },
        ["cellId", "direction"],
    ),
    declaredNotebookAction(
        "duplicate_cell",
        "Duplicate a notebook cell directly below the original.",
        { cellId: { type: "string", pattern: cellIdPattern } },
        ["cellId"],
    ),
    declaredNotebookAction("undo", "Undo the most recent notebook mutation."),
    declaredNotebookAction("redo", "Redo the most recently undone notebook mutation."),
    declaredNotebookAction("get_runtimes", "List available local Python runtimes."),
    declaredNotebookAction(
        "set_runtime",
        "Select the Python executable used for future notebook runs.",
        { runtime: { type: "string", enum: ["python3", "python"] } },
        ["runtime"],
    ),
    declaredNotebookAction("restart_runtime", "Interrupt active work and clear outputs for a fresh stateless run."),
    declaredNotebookAction(
        "create_checkpoint",
        "Create a persistent checkpoint of the current notebook.",
        { label: { type: "string", maxLength: 80 } },
    ),
    declaredNotebookAction("list_checkpoints", "List persistent checkpoints for the current notebook."),
    declaredNotebookAction(
        "restore_checkpoint",
        "Restore a persistent checkpoint into the current notebook.",
        { checkpointId: { type: "string", minLength: 1, maxLength: 80 } },
        ["checkpointId"],
    ),
];

const canvas = createCanvas({
    id: "jupyter-notebooks",
    displayName: "Notebook",
    description: "Create notebook cells and run Python code through a fresh constrained process.",
    inputSchema: openInputSchema,
    actions: [
        ...productActions,
        {
            name: "get_notebook",
            description: "Return the current notebook cells, outputs, and backing .ipynb path.",
            inputSchema: notebookActionSchema,
            handler: (ctx) => handleCanvasAction(ctx, "get_notebook", ctx.input),
        },
        {
            name: "set_title",
            description: "Set the notebook title.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["title"],
                properties: {
                    notebookId: { type: "string", pattern: notebookIdPattern },
                    title: { type: "string", minLength: 1, maxLength: 120 },
                },
            },
            handler: (ctx) => handleCanvasAction(ctx, "set_title", ctx.input),
        },
        {
            name: "add_cell",
            description: "Add a code, Markdown, or raw cell, optionally after an existing cell.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["cellType"],
                properties: {
                    notebookId: { type: "string", pattern: notebookIdPattern },
                    afterCellId: { type: "string", pattern: cellIdPattern },
                    cellType: { type: "string", enum: ["code", "markdown", "raw"] },
                    source: { type: "string" },
                },
            },
            handler: (ctx) => handleCanvasAction(ctx, "add_cell", ctx.input),
        },
        {
            name: "update_cell",
            description: "Update a cell source and optionally convert between code, Markdown, and raw.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["cellId"],
                properties: {
                    notebookId: { type: "string", pattern: notebookIdPattern },
                    cellId: { type: "string", pattern: cellIdPattern },
                    cellType: { type: "string", enum: ["code", "markdown", "raw"] },
                    source: { type: "string" },
                },
            },
            handler: (ctx) => handleCanvasAction(ctx, "update_cell", ctx.input),
        },
        {
            name: "delete_cell",
            description: "Delete a notebook cell.",
            inputSchema: cellIdSchema(),
            handler: (ctx) => handleCanvasAction(ctx, "delete_cell", ctx.input),
        },
        {
            name: "run_cell",
            description: "Run code cells from the beginning through the selected cell in a fresh constrained Python process.",
            inputSchema: cellIdSchema(),
            handler: (ctx) => handleCanvasAction(ctx, "run_cell", ctx.input),
        },
        {
            name: "run_all",
            description: "Run all code cells in order in a fresh constrained Python process.",
            inputSchema: notebookActionSchema,
            handler: (ctx) => handleCanvasAction(ctx, "run_all", ctx.input),
        },
        {
            name: "clear_outputs",
            description: "Clear all code cell outputs and execution counts.",
            inputSchema: notebookActionSchema,
            handler: (ctx) => handleCanvasAction(ctx, "clear_outputs", ctx.input),
        },
        {
            name: "interrupt",
            description: "Interrupt the active Python execution for this notebook.",
            inputSchema: notebookActionSchema,
            handler: (ctx) => handleCanvasAction(ctx, "interrupt", ctx.input),
        },
    ],
    open: async (ctx) => {
        await storageReady;
        const notebookId = ctx.input?.notebookId ?? "default";
        await loadNotebook(notebookId, ctx.input?.title);
        let entry = servers.get(ctx.instanceId);
        if (!entry || entry.notebookId !== notebookId) {
            if (entry) {
                await closeServerEntry(entry);
            }
            entry = await startServer(ctx.instanceId, notebookId);
            servers.set(ctx.instanceId, entry);
        }
        return {
            title: "Notebook",
            status: "Ready",
            url: entry.url,
        };
    },
    onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (entry) {
            servers.delete(ctx.instanceId);
            await closeServerEntry(entry);
        }
    },
});

const session = await joinSession({ canvases: [canvas] });
storageReady = initializeStorage(session.workspacePath);
await storageReady;
