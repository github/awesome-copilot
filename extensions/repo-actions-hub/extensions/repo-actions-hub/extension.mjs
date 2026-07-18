import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const instanceEntries = new Map();

const OPEN_INPUT_SCHEMA = {
    type: "object",
    properties: {
        repo: {
            type: "string",
            description: "Optional owner/repo override. Defaults to the repository for the current workspace.",
        },
        workflowLimit: {
            type: "integer",
            minimum: 1,
            maximum: 200,
            description: "Maximum workflows to load.",
            default: 100,
        },
        runLimit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            description: "Maximum recent runs to load.",
            default: 25,
        },
    },
    additionalProperties: false,
};

const RUN_WORKFLOW_INPUT_SCHEMA = {
    type: "object",
    properties: {
        workflowId: {
            oneOf: [{ type: "string" }, { type: "integer" }],
            description: "Workflow file name, workflow name, or workflow database ID.",
        },
        ref: {
            type: "string",
            description: "Optional branch or tag ref to dispatch.",
        },
        inputs: {
            type: "object",
            description: "Optional workflow_dispatch inputs.",
            additionalProperties: {
                oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
            },
        },
    },
    required: ["workflowId"],
    additionalProperties: false,
};

let currentWorkingDirectory;

const session = await joinSession({
    hooks: {
        onSessionStart: async (input) => {
            updateWorkingDirectory(input?.workingDirectory);
        },
        onUserPromptSubmitted: async (input) => {
            updateWorkingDirectory(input?.workingDirectory);
        },
        onPreToolUse: async (input) => {
            updateWorkingDirectory(input?.workingDirectory);
        },
    },
    canvases: [
        createCanvas({
            id: "repo-actions-hub",
            displayName: "Repo Actions Hub",
            description: "Browse GitHub Actions workflows for the current repository, inspect recent runs, and trigger workflow_dispatch runs.",
            inputSchema: OPEN_INPUT_SCHEMA,
            actions: [
                {
                    name: "get_state",
                    description: "Return the current workflow and recent run state for the canvas repository.",
                    handler: async (ctx) => {
                        const entry = requireInstance(ctx.instanceId);
                        return await ensureState(entry, false);
                    },
                },
                {
                    name: "refresh",
                    description: "Refresh workflows and recent runs for the canvas repository.",
                    handler: async (ctx) => {
                        const entry = requireInstance(ctx.instanceId);
                        return await refreshInstance(entry);
                    },
                },
                {
                    name: "get_workflow_details",
                    description: "Inspect a workflow and report whether it supports workflow_dispatch along with any declared inputs.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            workflowId: {
                                oneOf: [{ type: "string" }, { type: "integer" }],
                            },
                        },
                        required: ["workflowId"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const entry = requireInstance(ctx.instanceId);
                        return await getWorkflowDetails(entry, ctx.input.workflowId);
                    },
                },
                {
                    name: "run_workflow",
                    description: "Trigger a workflow_dispatch run for a workflow in the current repository.",
                    inputSchema: RUN_WORKFLOW_INPUT_SCHEMA,
                    handler: async (ctx) => {
                        const entry = requireInstance(ctx.instanceId);
                        return await triggerWorkflow(entry, ctx.input);
                    },
                },
            ],
            open: async (ctx) => {
                const config = normalizeOpenInput(ctx.input);
                let entry = instanceEntries.get(ctx.instanceId);

                if (!entry) {
                    entry = await startServer(ctx.instanceId, config);
                    instanceEntries.set(ctx.instanceId, entry);
                } else {
                    entry.config = config;
                }

                try {
                    await refreshInstance(entry);
                } catch (error) {
                    throw toCanvasError(error);
                }

                return {
                    title: "Repo Actions Hub",
                    status: entry.state?.repo?.nameWithOwner ?? "Loading repository",
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = instanceEntries.get(ctx.instanceId);
                if (!entry) {
                    return;
                }

                instanceEntries.delete(ctx.instanceId);

                for (const client of entry.clients) {
                    client.end();
                }

                await new Promise((resolve) => entry.server.close(resolve));
            },
        }),
    ],
});

function requireInstance(instanceId) {
    const entry = instanceEntries.get(instanceId);
    if (!entry) {
        throw new CanvasError("canvas_instance_missing", `No canvas instance is open for '${instanceId}'.`);
    }
    return entry;
}

function updateWorkingDirectory(workingDirectory) {
    if (typeof workingDirectory === "string" && workingDirectory.trim()) {
        currentWorkingDirectory = workingDirectory;
    }
}

function normalizeOpenInput(input) {
    return {
        repo: typeof input?.repo === "string" && input.repo.trim() ? input.repo.trim() : undefined,
        workflowLimit: Number.isInteger(input?.workflowLimit) ? input.workflowLimit : 100,
        runLimit: Number.isInteger(input?.runLimit) ? input.runLimit : 25,
    };
}

async function startServer(instanceId, config) {
    const entry = {
        instanceId,
        config,
        clients: new Set(),
        server: null,
        url: "",
        state: null,
    };

    entry.server = createServer((req, res) => {
        handleRequest(entry, req, res).catch((error) => {
            writeJson(res, 500, { error: error.message || "Request failed." });
        });
    });

    await new Promise((resolve) => entry.server.listen(0, "127.0.0.1", resolve));
    const address = entry.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.url = `http://127.0.0.1:${port}/`;
    return entry;
}

async function handleRequest(entry, req, res) {
    const url = new URL(req.url || "/", entry.url);

    if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml(entry.instanceId));
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
        const state = await ensureState(entry, url.searchParams.get("refresh") === "1");
        writeJson(res, 200, state);
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/refresh") {
        const state = await refreshInstance(entry);
        writeJson(res, 200, state);
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/workflow") {
        const workflowId = url.searchParams.get("id");
        if (!workflowId) {
            throw new CanvasError("workflow_id_required", "A workflow id is required.");
        }
        const details = await getWorkflowDetails(entry, workflowId);
        writeJson(res, 200, details);
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/run-details") {
        const runId = url.searchParams.get("id");
        if (!runId) {
            throw new CanvasError("run_id_required", "A run id is required.");
        }
        const details = await getRunDetails(entry, runId);
        writeJson(res, 200, details);
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
        const input = await readJsonBody(req);
        const result = await triggerWorkflow(entry, input);
        writeJson(res, 200, result);
        return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        });
        res.write("\n");
        entry.clients.add(res);
        if (entry.state) {
            sendEvent(res, "state", entry.state);
        }
        req.on("close", () => entry.clients.delete(res));
        return;
    }

    writeJson(res, 404, { error: "Not found." });
}

async function ensureState(entry, forceRefresh) {
    if (!entry.state || forceRefresh) {
        return await refreshInstance(entry);
    }
    return entry.state;
}

async function refreshInstance(entry) {
    const repo = await resolveRepoContext(entry.config.repo);
    const [workflows, runs] = await Promise.all([
        listWorkflows(repo, entry.config.workflowLimit),
        listRuns(repo, entry.config.runLimit),
    ]);

    const latestRunsByWorkflowId = new Map();
    for (const run of runs) {
        const workflowKey = String(run.workflowDatabaseId ?? "");
        if (workflowKey && !latestRunsByWorkflowId.has(workflowKey)) {
            latestRunsByWorkflowId.set(workflowKey, run);
        }
    }

    entry.state = {
        repo,
        workflows: workflows
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((workflow) => ({
                ...workflow,
                latestRun: latestRunsByWorkflowId.get(String(workflow.id)) ?? null,
            })),
        runs,
        updatedAt: new Date().toISOString(),
    };

    broadcast(entry, "state", entry.state);
    return entry.state;
}

async function resolveRepoContext(explicitRepo) {
    const workingDirectory = await getActiveWorkingDirectory();

    if (!workingDirectory && !explicitRepo) {
        throw new CanvasError("workspace_unavailable", "No repository working directory is attached to this session yet.");
    }

    const args = ["repo", "view"];
    if (explicitRepo) {
        args.push(explicitRepo);
    }
    args.push("--json", "nameWithOwner,defaultBranchRef,url");

    const { stdout } = await runGh(args, { cwd: workingDirectory });
    const repo = JSON.parse(stdout);
    const defaultBranch = repo.defaultBranchRef?.name || "main";

    return {
        nameWithOwner: repo.nameWithOwner,
        defaultBranch,
        url: repo.url,
        cwd: workingDirectory,
    };
}

async function getActiveWorkingDirectory() {
    if (currentWorkingDirectory) {
        return currentWorkingDirectory;
    }

    const snapshot = await session.rpc.metadata.snapshot();
    updateWorkingDirectory(snapshot?.workingDirectory);
    return currentWorkingDirectory;
}

async function listWorkflows(repo, limit) {
    const { stdout } = await runGh(
        [
            "workflow",
            "list",
            "--all",
            "--json",
            "id,name,path,state",
            "-L",
            String(limit),
            "-R",
            repo.nameWithOwner,
        ],
        { cwd: repo.cwd }
    );

    return JSON.parse(stdout);
}

async function listRuns(repo, limit) {
    const { stdout } = await runGh(
        [
            "run",
            "list",
            "--all",
            "--json",
            "attempt,conclusion,createdAt,databaseId,displayTitle,event,headBranch,headSha,name,number,startedAt,status,updatedAt,url,workflowDatabaseId,workflowName",
            "-L",
            String(limit),
            "-R",
            repo.nameWithOwner,
        ],
        { cwd: repo.cwd }
    );

    return JSON.parse(stdout);
}

async function getWorkflowDetails(entry, workflowId) {
    const state = await ensureState(entry, false);
    const repo = state.repo;
    const key = String(workflowId);
    const workflow = state.workflows.find((candidate) => String(candidate.id) === key || candidate.name === key || candidate.path === key);

    if (!workflow) {
        throw new CanvasError("workflow_not_found", `Workflow '${workflowId}' was not found in ${repo.nameWithOwner}.`);
    }

    const { stdout } = await runGh(
        ["workflow", "view", String(workflow.id), "--yaml", "--ref", repo.defaultBranch, "-R", repo.nameWithOwner],
        { cwd: repo.cwd }
    );

    const dispatch = parseWorkflowDispatch(stdout);
    const recentRuns = state.runs.filter((run) => String(run.workflowDatabaseId) === String(workflow.id)).slice(0, 10);

    return {
        repo,
        workflow,
        dispatch,
        recentRuns,
        workflowFileUrl: toWorkflowFileUrl(repo, workflow.path),
        yaml: stdout,
    };
}

async function getRunDetails(entry, runId) {
    const state = await ensureState(entry, false);
    const repo = state.repo;
    const key = String(runId);
    const knownRun = state.runs.find((candidate) => String(candidate.databaseId) === key);

    const { stdout } = await runGh(
        [
            "run",
            "view",
            key,
            "--json",
            "attempt,conclusion,createdAt,databaseId,displayTitle,event,headBranch,headSha,jobs,name,number,startedAt,status,updatedAt,url,workflowDatabaseId,workflowName",
            "-R",
            repo.nameWithOwner,
        ],
        { cwd: repo.cwd }
    );

    const run = JSON.parse(stdout);
    return {
        repo,
        run,
        workflow: state.workflows.find((candidate) => String(candidate.id) === String(run.workflowDatabaseId)) ?? null,
        summary: knownRun ?? null,
    };
}

async function triggerWorkflow(entry, input) {
    const state = await ensureState(entry, false);
    const workflowId = input?.workflowId;
    if (!workflowId && workflowId !== 0) {
        throw new CanvasError("workflow_id_required", "A workflow id is required.");
    }

    const workflowDetails = await getWorkflowDetails(entry, workflowId);
    if (!workflowDetails.dispatch.supported) {
        throw new CanvasError(
            "workflow_dispatch_unsupported",
            `Workflow '${workflowDetails.workflow.name}' does not declare workflow_dispatch.`
        );
    }

    const ref = typeof input?.ref === "string" && input.ref.trim() ? input.ref.trim() : state.repo.defaultBranch;
    const inputs = sanitizeInputs(input?.inputs);
    const args = ["workflow", "run", String(workflowDetails.workflow.id), "--ref", ref, "-R", state.repo.nameWithOwner];

    for (const [key, value] of Object.entries(inputs)) {
        args.push("-f", `${key}=${String(value)}`);
    }

    const { stdout } = await runGh(args, {
        cwd: state.repo.cwd,
    });

    await session.log(`Triggered workflow '${workflowDetails.workflow.name}' on ${state.repo.nameWithOwner}.`, {
        ephemeral: true,
    });

    await refreshInstance(entry);

    return {
        message: stdout.trim() || `Triggered workflow '${workflowDetails.workflow.name}'.`,
        workflow: workflowDetails.workflow,
        ref,
        inputs,
    };
}

function sanitizeInputs(inputs) {
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
        return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(inputs)) {
        if (typeof key !== "string" || !key.trim()) {
            continue;
        }
        if (["string", "number", "boolean"].includes(typeof value)) {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

function parseWorkflowDispatch(yaml) {
    const lines = yaml.replace(/\r/g, "").split("\n");
    const onBlock = findYamlBlock(lines, "on");
    if (!onBlock) {
        return { supported: false, inputs: [] };
    }

    const inlineValue = onBlock.inlineValue.trim();
    if (inlineValue && inlineContainsWorkflowDispatch(inlineValue)) {
        return { supported: true, inputs: [] };
    }

    const workflowDispatchBlock = findChildBlock(lines, onBlock.startIndex, onBlock.indent, "workflow_dispatch");
    if (!workflowDispatchBlock) {
        return { supported: false, inputs: [] };
    }

    const inputsBlock = findChildBlock(lines, workflowDispatchBlock.startIndex, workflowDispatchBlock.indent, "inputs");
    if (!inputsBlock) {
        return { supported: true, inputs: [] };
    }

    return {
        supported: true,
        inputs: parseInputs(lines, inputsBlock.startIndex, inputsBlock.indent),
    };
}

function inlineContainsWorkflowDispatch(value) {
    if (!value) {
        return false;
    }

    if (value.includes("workflow_dispatch")) {
        return true;
    }

    return false;
}

function findYamlBlock(lines, key) {
    const matcher = new RegExp(`^\\s*["']?${escapeRegExp(key)}["']?\\s*:\\s*(.*)$`);

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(matcher);
        if (!match) {
            continue;
        }

        return {
            startIndex: index,
            indent: countIndent(lines[index]),
            inlineValue: match[1] ?? "",
        };
    }

    return null;
}

function findChildBlock(lines, parentIndex, parentIndent, key) {
    const matcher = new RegExp(`^\\s*["']?${escapeRegExp(key)}["']?\\s*:\\s*(.*)$`);

    for (let index = parentIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line.trim() || line.trim().startsWith("#")) {
            continue;
        }

        const indent = countIndent(line);
        if (indent <= parentIndent) {
            break;
        }

        const match = line.match(matcher);
        if (!match || indent <= parentIndent) {
            continue;
        }

        return {
            startIndex: index,
            indent,
            inlineValue: match[1] ?? "",
        };
    }

    return null;
}

function parseInputs(lines, inputsIndex, inputsIndent) {
    const inputs = [];
    let currentInput = null;
    let optionCollector = null;

    for (let index = inputsIndex + 1; index < lines.length; index += 1) {
        const rawLine = lines[index];
        const trimmed = rawLine.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const indent = countIndent(rawLine);
        if (indent <= inputsIndent) {
            break;
        }

        if (indent === inputsIndent + 2 && /^[A-Za-z0-9_.-]+\s*:/.test(trimmed)) {
            if (currentInput) {
                inputs.push(currentInput);
            }

            currentInput = {
                name: trimmed.slice(0, trimmed.indexOf(":")).trim(),
                description: "",
                required: false,
                default: "",
                type: "string",
                options: [],
            };
            optionCollector = null;
            continue;
        }

        if (!currentInput) {
            continue;
        }

        if (trimmed === "options:") {
            optionCollector = currentInput.options;
            continue;
        }

        if (optionCollector && trimmed.startsWith("- ")) {
            optionCollector.push(unquote(trimmed.slice(2).trim()));
            continue;
        }

        optionCollector = null;

        const separatorIndex = trimmed.indexOf(":");
        if (separatorIndex === -1) {
            continue;
        }

        const property = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (property === "description") {
            currentInput.description = unquote(value);
        } else if (property === "required") {
            currentInput.required = value === "true";
        } else if (property === "default") {
            currentInput.default = unquote(value);
        } else if (property === "type") {
            currentInput.type = unquote(value) || "string";
        }
    }

    if (currentInput) {
        inputs.push(currentInput);
    }

    return inputs;
}

function countIndent(line) {
    let indent = 0;
    while (indent < line.length && line[indent] === " ") {
        indent += 1;
    }
    return indent;
}

function unquote(value) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toWorkflowFileUrl(repo, workflowPath) {
    const normalizedPath = String(workflowPath || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
    const encodedPath = normalizedPath
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `${repo.url}/blob/${encodeURIComponent(repo.defaultBranch)}/${encodedPath}`;
}

function runGh(args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn("gh", args, {
            cwd: options.cwd,
            windowsHide: true,
            env: {
                ...process.env,
                GH_PAGER: "cat",
            },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            reject(new Error(stderr.trim() || stdout.trim() || `gh exited with code ${code}`));
        });

        if (options.stdin) {
            child.stdin.write(options.stdin);
        }
        child.stdin.end();
    });
}

function broadcast(entry, eventName, payload) {
    for (const client of entry.clients) {
        sendEvent(client, eventName, payload);
    }
}

function sendEvent(res, eventName, payload) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeJson(res, statusCode, payload) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new CanvasError("invalid_json", "Request body must be valid JSON."));
            }
        });
        req.on("error", reject);
    });
}

function toCanvasError(error) {
    if (error instanceof CanvasError) {
        return error;
    }
    return new CanvasError("repo_actions_error", error?.message || "Canvas operation failed.");
}

function renderHtml(instanceId) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Repo Actions Hub</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      background: var(--background-color-default, #ffffff);
      color: var(--text-color-default, #1f2328);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--text-body-medium, 14px);
      line-height: var(--leading-body-medium, 20px);
    }
    button, input, textarea, select {
      font: inherit;
    }
    a {
      color: var(--true-color-blue, #0969da);
    }
    .layout {
      min-height: 100vh;
    }
    .panel {
      padding: 20px;
    }
    .content-grid {
      display: grid;
      grid-template-columns: minmax(420px, 1.2fr) minmax(320px, 0.8fr);
      gap: 16px;
      align-items: start;
    }
    .section-header {
      margin: 0 0 12px;
    }
    .section-header h2 {
      margin: 0 0 4px;
      font-size: 20px;
      line-height: 1.3;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .toolbar-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .segmented-control {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 999px;
      background: color-mix(in srgb, var(--background-color-default, #ffffff) 96%, var(--text-color-default, #1f2328) 4%);
    }
    .segment-button {
      border: 0;
      background: transparent;
      color: var(--text-color-muted, #656d76);
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .segment-button.active {
      background: var(--true-color-blue, #0969da);
      color: var(--color-white, #ffffff);
    }
    .mobile-only {
      display: none;
    }
    .button {
      border: 1px solid var(--border-color-default, #d0d7de);
      background: var(--background-color-default, #ffffff);
      color: inherit;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
    }
    .button.primary {
      background: var(--true-color-blue, #0969da);
      border-color: var(--true-color-blue, #0969da);
      color: var(--color-white, #ffffff);
    }
    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .muted {
      color: var(--text-color-muted, #656d76);
    }
    .repo-card, .card {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      background: color-mix(in srgb, var(--background-color-default, #ffffff) 95%, var(--text-color-default, #1f2328) 5%);
    }
    .repo-card h1 {
      margin: 0 0 4px;
      font-size: var(--text-title-large, 26px);
      line-height: var(--leading-title-large, 32px);
    }
    .workflow-list, .run-list, .inspector-list {
      display: grid;
      gap: 10px;
    }
    .workflow-item, .run-item, .inspector-card, .job-card {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 10px;
      padding: 12px;
      display: grid;
      gap: 8px;
    }
    .workflow-header, .run-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .workflow-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 12px;
      border: 1px solid var(--border-color-default, #d0d7de);
      white-space: nowrap;
    }
    .pill.success { background: var(--true-color-blue-muted, #ddf4ff); color: var(--true-color-blue, #0969da); }
    .pill.failure { background: var(--true-color-red-muted, #ffebe9); color: var(--true-color-red, #cf222e); }
    .pill.warning { background: #fff8c5; color: #9a6700; }
    .pill.running { background: #ddf4ff; color: #0969da; }
    .pill.neutral { background: rgba(175, 184, 193, 0.2); color: inherit; }
    .meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--text-color-muted, #656d76);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .summary .card {
      margin: 0;
      padding: 12px;
    }
    .tab-panel[hidden] {
      display: none !important;
    }
    .inspector-dialog-body {
      padding: 18px;
      display: grid;
      gap: 12px;
    }
    .inspector-dialog-content {
      display: grid;
      gap: 12px;
      max-height: min(70vh, 800px);
      overflow: auto;
    }
    .inspector-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .inspector-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .detail-item {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 8px;
      padding: 10px;
      background: color-mix(in srgb, var(--background-color-default, #ffffff) 97%, var(--text-color-default, #1f2328) 3%);
    }
    .detail-item strong {
      display: block;
      margin-bottom: 4px;
    }
    .code-block {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: auto;
      max-height: 260px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border-color-default, #d0d7de);
      background: color-mix(in srgb, var(--background-color-default, #ffffff) 94%, var(--text-color-default, #1f2328) 6%);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 12px;
      line-height: 1.5;
    }
    .step-list {
      display: grid;
      gap: 6px;
      margin-top: 4px;
    }
    .step-item {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 8px;
      padding: 8px 10px;
      display: grid;
      gap: 4px;
    }
    .empty {
      padding: 24px;
      text-align: center;
      color: var(--text-color-muted, #656d76);
      border: 1px dashed var(--border-color-default, #d0d7de);
      border-radius: 10px;
    }
    .inline-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    dialog {
      width: min(720px, calc(100vw - 24px));
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 12px;
      padding: 0;
      background: var(--background-color-default, #ffffff);
      color: inherit;
    }
    dialog::backdrop {
      background: rgba(0, 0, 0, 0.35);
    }
    .dialog-body {
      padding: 18px;
      display: grid;
      gap: 12px;
    }
    .field {
      display: grid;
      gap: 6px;
    }
    .field input, .field textarea, .field select {
      width: 100%;
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 8px;
      padding: 8px 10px;
      background: var(--background-color-default, #ffffff);
      color: inherit;
    }
    textarea {
      min-height: 100px;
      resize: vertical;
      font-family: var(--font-mono, Consolas, monospace);
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .status-message {
      min-height: 20px;
      color: var(--text-color-muted, #656d76);
      margin-bottom: 12px;
    }
    .status-message.error {
      color: var(--true-color-red, #cf222e);
    }
    @media (max-width: 1100px) {
      .layout {
        min-height: auto;
      }
      .content-grid {
        grid-template-columns: 1fr;
      }
      .mobile-only {
        display: inline-flex;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <section class="panel">
      <div class="toolbar">
        <div>
          <h1 style="margin: 0 0 4px;">Repo Actions Hub</h1>
          <div class="muted">Browse workflows and recent runs for this repository.</div>
        </div>
        <div class="toolbar-actions">
          <button class="button" id="refresh-button">Refresh</button>
        </div>
      </div>
      <div class="segmented-control mobile-only" role="tablist" aria-label="Repo actions hub sections" style="margin-bottom: 16px;">
        <button class="segment-button active" id="tab-actions" type="button" role="tab" aria-selected="true" aria-controls="actions-panel">Actions</button>
        <button class="segment-button" id="tab-runs" type="button" role="tab" aria-selected="false" aria-controls="runs-panel">Recent runs</button>
      </div>
      <div id="repo"></div>
      <div class="status-message" id="status-message"></div>
      <div class="content-grid">
        <div id="actions-panel" class="tab-panel" role="tabpanel" aria-labelledby="tab-actions">
          <div class="section-header">
            <h2>Actions</h2>
            <div class="muted">Browse workflows, inspect details, and start manual runs.</div>
          </div>
          <div id="workflows"></div>
        </div>
        <div id="runs-panel" class="tab-panel" role="tabpanel" aria-labelledby="tab-runs">
          <div class="section-header">
            <h2>Recent runs</h2>
            <div class="muted">Review the latest workflow activity and open detailed run results.</div>
          </div>
          <div id="runs"></div>
        </div>
      </div>
    </section>
  </div>

  <dialog id="inspector-dialog">
    <div class="inspector-dialog-body">
      <div class="dialog-actions" style="justify-content: space-between;">
        <strong>Details</strong>
        <button class="button" type="button" id="close-inspector">Close</button>
      </div>
      <div id="inspector-dialog-content" class="inspector-dialog-content"></div>
    </div>
  </dialog>

  <dialog id="run-dialog">
    <form method="dialog" class="dialog-body" id="run-form">
      <div>
        <h3 id="dialog-title" style="margin: 0 0 4px;">Run workflow</h3>
        <div class="muted" id="dialog-subtitle"></div>
      </div>
      <div id="dialog-support-message" class="status-message"></div>
      <label class="field">
        <span>Ref</span>
        <input id="workflow-ref" name="ref" placeholder="main" />
      </label>
      <div id="workflow-input-fields"></div>
      <label class="field">
        <span>Extra JSON inputs</span>
        <textarea id="workflow-json-inputs" placeholder='{"name":"value"}'></textarea>
      </label>
      <div class="dialog-actions">
        <button class="button" value="cancel" type="button" id="cancel-run">Cancel</button>
        <button class="button primary" value="default" type="submit" id="submit-run">Run workflow</button>
      </div>
    </form>
  </dialog>

  <script>
    const state = {
      repoState: null,
      activeWorkflow: null,
      activeWorkflowDetails: null,
      activeRunDetails: null,
      activeTab: "actions",
      inspector: { type: "empty", payload: null },
    };

    const elements = {
      repo: document.getElementById("repo"),
      actionsPanel: document.getElementById("actions-panel"),
      workflows: document.getElementById("workflows"),
      inspectorDialog: document.getElementById("inspector-dialog"),
      inspectorDialogContent: document.getElementById("inspector-dialog-content"),
      closeInspector: document.getElementById("close-inspector"),
      runsPanel: document.getElementById("runs-panel"),
      runs: document.getElementById("runs"),
      tabActions: document.getElementById("tab-actions"),
      tabRuns: document.getElementById("tab-runs"),
      refreshButton: document.getElementById("refresh-button"),
      statusMessage: document.getElementById("status-message"),
      runDialog: document.getElementById("run-dialog"),
      runForm: document.getElementById("run-form"),
      dialogTitle: document.getElementById("dialog-title"),
      dialogSubtitle: document.getElementById("dialog-subtitle"),
      dialogSupportMessage: document.getElementById("dialog-support-message"),
      workflowRef: document.getElementById("workflow-ref"),
      workflowInputFields: document.getElementById("workflow-input-fields"),
      workflowJsonInputs: document.getElementById("workflow-json-inputs"),
      submitRun: document.getElementById("submit-run"),
      cancelRun: document.getElementById("cancel-run"),
    };

    elements.refreshButton.addEventListener("click", () => refresh(true));
    elements.closeInspector.addEventListener("click", () => elements.inspectorDialog.close());
    elements.cancelRun.addEventListener("click", () => elements.runDialog.close());
    elements.runForm.addEventListener("submit", onSubmitRun);
    elements.tabActions.addEventListener("click", () => setActiveTab("actions"));
    elements.tabRuns.addEventListener("click", () => setActiveTab("runs"));
    window.matchMedia("(max-width: 1100px)").addEventListener("change", () => syncTabVisibility());

    async function request(path, options = {}) {
      const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (!response.ok) {
        let message = "Request failed.";
        try {
          const payload = await response.json();
          message = payload.error || message;
        } catch {}
        throw new Error(message);
      }

      return await response.json();
    }

    async function refresh(force) {
      setStatus("Refreshing…");
      try {
        const repoState = await request("/api/state" + (force ? "?refresh=1" : ""));
        applyState(repoState);
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Refresh failed.", true);
      }
    }

    function applyState(repoState) {
      state.repoState = repoState;
      renderRepo(repoState);
      renderWorkflows(repoState.workflows || []);
      renderRuns(repoState.runs || []);
      syncTabVisibility();
    }

    function renderRepo(repoState) {
      const repo = repoState.repo;
      const counts = summarize(repoState);
      elements.repo.innerHTML = \`
        <div class="repo-card">
          <h1>\${escapeHtml(repo.nameWithOwner)}</h1>
          <div class="meta">
            <span>Default branch: <strong>\${escapeHtml(repo.defaultBranch)}</strong></span>
            <a href="\${escapeAttribute(repo.url)}" target="_blank" rel="noreferrer">Open repository</a>
            <span>Updated \${escapeHtml(formatDate(repoState.updatedAt))}</span>
          </div>
          <div class="summary">
            <div class="card"><strong>\${counts.workflowCount}</strong><div class="muted">Workflows</div></div>
            <div class="card"><strong>\${counts.runningCount}</strong><div class="muted">Running or queued</div></div>
            <div class="card"><strong>\${counts.failureCount}</strong><div class="muted">Recent failures</div></div>
          </div>
        </div>
      \`;
    }

    function renderWorkflows(workflows) {
      if (!workflows.length) {
        elements.workflows.innerHTML = '<div class="empty">No workflows found.</div>';
        return;
      }

      elements.workflows.innerHTML = \`
        <div class="workflow-list">
          \${workflows.map((workflow) => {
            const latestRun = workflow.latestRun;
            return \`
              <article class="workflow-item">
                <div class="workflow-header">
                  <div>
                    <strong>\${escapeHtml(workflow.name)}</strong>
                    <div class="meta">
                      <span>\${escapeHtml(workflow.path)}</span>
                      <span class="pill neutral">\${escapeHtml(workflow.state)}</span>
                    </div>
                  </div>
                  <div class="workflow-actions">
                    <button class="button" data-action="details" data-workflow-id="\${workflow.id}">Details</button>
                    <button class="button primary" data-action="run" data-workflow-id="\${workflow.id}">Run</button>
                  </div>
                </div>
                \${latestRun ? \`
                  <div class="meta">
                    <span>\${renderStatusPill(latestRun.status, latestRun.conclusion)}</span>
                    <span>#\${latestRun.number}</span>
                    <span>\${escapeHtml(latestRun.event)}</span>
                    <span>\${escapeHtml(latestRun.headBranch || "n/a")}</span>
                    <span>\${escapeHtml(formatDate(latestRun.createdAt))}</span>
                    <a href="\${escapeAttribute(latestRun.url)}" target="_blank" rel="noreferrer">Open run</a>
                  </div>
                  <div class="inline-actions">
                    <button class="button" data-run-id="\${latestRun.databaseId}" data-run-source="workflow">See run</button>
                  </div>
                \` : '<div class="muted">No recent runs loaded for this workflow.</div>'}
              </article>
            \`;
          }).join("")}
        </div>
      \`;

      elements.workflows.querySelectorAll("button[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const workflowId = button.getAttribute("data-workflow-id");
          const action = button.getAttribute("data-action");
          if (action === "run") {
            openRunDialog(workflowId);
          } else {
            openDetails(workflowId);
          }
        });
      });

      elements.workflows.querySelectorAll("button[data-run-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const runId = button.getAttribute("data-run-id");
          openRunDetails(runId);
        });
      });
    }

    function renderRuns(runs) {
      if (!runs.length) {
        elements.runs.innerHTML = '<div class="empty">No recent workflow runs found.</div>';
        return;
      }

      elements.runs.innerHTML = \`
        <div class="run-list">
          \${runs.map((run) => \`
            <article class="run-item">
              <div class="run-header">
                <div>
                  <strong>\${escapeHtml(run.workflowName || run.name || "Workflow run")}</strong>
                  <div class="meta">
                    <span>#\${run.number}</span>
                    <span>\${escapeHtml(run.event)}</span>
                    <span>\${escapeHtml(run.headBranch || "n/a")}</span>
                  </div>
                </div>
                \${renderStatusPill(run.status, run.conclusion)}
              </div>
              <div class="meta">
                <span>\${escapeHtml(run.displayTitle || "")}</span>
                <span>Started \${escapeHtml(formatDate(run.startedAt || run.createdAt))}</span>
              </div>
              <div class="inline-actions">
                <button class="button" data-run-id="\${run.databaseId}">See run</button>
                <a class="button" href="\${escapeAttribute(run.url)}" target="_blank" rel="noreferrer">Open on GitHub</a>
              </div>
            </article>
          \`).join("")}
        </div>
      \`;

      elements.runs.querySelectorAll("button[data-run-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const runId = button.getAttribute("data-run-id");
          openRunDetails(runId);
        });
      });
    }

    async function openDetails(workflowId) {
      setStatus("Loading workflow details…");
      try {
        const details = await request("/api/workflow?id=" + encodeURIComponent(workflowId));
        state.activeWorkflow = details.workflow;
        state.activeWorkflowDetails = details;
        state.activeRunDetails = null;
        state.inspector = { type: "workflow", payload: details };
        renderInspector();
        showInspectorDialog();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Failed to load details.", true);
      }
    }

    async function openRunDetails(runId) {
      setStatus("Loading run details…");
      try {
        const details = await request("/api/run-details?id=" + encodeURIComponent(runId));
        state.activeRunDetails = details;
        state.inspector = { type: "run", payload: details };
        renderInspector();
        showInspectorDialog();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Failed to load run details.", true);
      }
    }

    async function openRunDialog(workflowId) {
      setStatus("Loading workflow details…");
      try {
        const details = await request("/api/workflow?id=" + encodeURIComponent(workflowId));
        state.activeWorkflow = details.workflow;
        state.activeWorkflowDetails = details;
        elements.dialogTitle.textContent = "Run " + details.workflow.name;
        elements.dialogSubtitle.textContent = details.workflow.path;
        elements.workflowRef.value = state.repoState?.repo?.defaultBranch || "";
        elements.workflowJsonInputs.value = "";
        renderWorkflowInputs(details.dispatch.inputs || []);

        if (!details.dispatch.supported) {
          elements.dialogSupportMessage.textContent = "This workflow does not declare workflow_dispatch, so GitHub cannot start it manually.";
          elements.dialogSupportMessage.className = "status-message error";
          elements.submitRun.disabled = true;
        } else {
          elements.dialogSupportMessage.textContent = details.dispatch.inputs.length
            ? "Fill in any workflow_dispatch inputs and submit."
            : "This workflow can be dispatched without inputs.";
          elements.dialogSupportMessage.className = "status-message";
          elements.submitRun.disabled = false;
        }

        setStatus("");
        elements.runDialog.showModal();
      } catch (error) {
        setStatus(error.message || "Failed to load workflow details.", true);
      }
    }

    function renderWorkflowInputs(inputs) {
      if (!inputs.length) {
        elements.workflowInputFields.innerHTML = "";
        return;
      }

      elements.workflowInputFields.innerHTML = inputs.map((input) => {
        const label = input.required ? input.name + " *" : input.name;
        const description = input.description ? '<div class="muted">' + escapeHtml(input.description) + '</div>' : "";
        if ((input.type === "choice" || input.options?.length) && input.options.length) {
          return \`
            <label class="field">
              <span>\${escapeHtml(label)}</span>
              <select data-input-name="\${escapeAttribute(input.name)}">
                <option value=""></option>
                \${input.options.map((option) => '<option value="' + escapeAttribute(option) + '">' + escapeHtml(option) + '</option>').join("")}
              </select>
              \${description}
            </label>
          \`;
        }
        return \`
          <label class="field">
            <span>\${escapeHtml(label)}</span>
            <input data-input-name="\${escapeAttribute(input.name)}" value="\${escapeAttribute(input.default || "")}" />
            \${description}
          </label>
        \`;
      }).join("");
    }

    async function onSubmitRun(event) {
      event.preventDefault();
      if (!state.activeWorkflow) {
        return;
      }

      setStatus("Triggering workflow…");
      try {
        const inputs = collectInputs();
        const payload = {
          workflowId: state.activeWorkflow.id,
          ref: elements.workflowRef.value.trim(),
          inputs,
        };
        const result = await request("/api/run", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setStatus(result.message || "Workflow triggered.");
        if (state.activeWorkflowDetails && String(state.activeWorkflowDetails.workflow?.id) === String(state.activeWorkflow.id)) {
          await openDetails(state.activeWorkflow.id);
        }
        elements.runDialog.close();
        await refresh(true);
      } catch (error) {
        setStatus(error.message || "Failed to run workflow.", true);
      }
    }

    function collectInputs() {
      const formInputs = {};
      elements.workflowInputFields.querySelectorAll("[data-input-name]").forEach((element) => {
        const key = element.getAttribute("data-input-name");
        const value = String(element.value || "").trim();
        if (key && value) {
          formInputs[key] = value;
        }
      });

      const rawJson = elements.workflowJsonInputs.value.trim();
      if (!rawJson) {
        return formInputs;
      }

      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Extra JSON inputs must be an object.");
      }

      return { ...formInputs, ...parsed };
    }

    function renderInspector() {
      const inspector = state.inspector;
      if (!inspector || inspector.type === "empty" || !inspector.payload) {
        const emptyMarkup = '<div class="empty">Select a workflow detail view or a workflow run to inspect it here.</div>';
        elements.inspectorDialogContent.innerHTML = emptyMarkup;
        return;
      }

      if (inspector.type === "workflow") {
        renderWorkflowInspector(inspector.payload);
        return;
      }

      if (inspector.type === "run") {
        renderRunInspector(inspector.payload);
        return;
      }
      const emptyMarkup = '<div class="empty">Nothing selected.</div>';
      elements.inspectorDialogContent.innerHTML = emptyMarkup;
    }

    function renderWorkflowInspector(details) {
      const dispatchText = details.dispatch.supported ? "workflow_dispatch enabled" : "workflow_dispatch not declared";
      const inputMarkup = details.dispatch.inputs.length
        ? '<div class="inspector-list">' + details.dispatch.inputs.map((input) => \`
            <div class="detail-item">
              <strong>\${escapeHtml(input.name)}</strong>
              <div class="muted">\${escapeHtml(input.description || "No description")}</div>
              <div class="meta">
                <span>Type: \${escapeHtml(input.type || "string")}</span>
                <span>Required: \${input.required ? "yes" : "no"}</span>
                \${input.default ? '<span>Default: ' + escapeHtml(input.default) + '</span>' : ""}
              </div>
            </div>
          \`).join("") + '</div>'
        : '<div class="empty">This workflow does not declare any workflow_dispatch inputs.</div>';

      const recentRunsMarkup = details.recentRuns.length
        ? '<div class="inspector-list">' + details.recentRuns.map((run) => \`
            <div class="detail-item">
              <div class="workflow-header">
                <div>
                  <strong>Run #\${run.number}</strong>
                  <div class="meta">
                    <span>\${escapeHtml(run.event)}</span>
                    <span>\${escapeHtml(run.headBranch || "n/a")}</span>
                    <span>\${escapeHtml(formatDate(run.startedAt || run.createdAt))}</span>
                  </div>
                </div>
                \${renderStatusPill(run.status, run.conclusion)}
              </div>
              <div class="inline-actions">
                <button class="button" data-inspector-run-id="\${run.databaseId}">See run</button>
                <a class="button" href="\${escapeAttribute(run.url)}" target="_blank" rel="noreferrer">Open on GitHub</a>
              </div>
            </div>
          \`).join("") + '</div>'
        : '<div class="empty">No recent runs are available for this workflow in the current canvas dataset.</div>';

      const markup = \`
        <div class="inspector-card">
          <div class="inspector-header">
            <div>
              <div class="muted">Workflow details</div>
              <h3 style="margin: 0 0 4px;">\${escapeHtml(details.workflow.name)}</h3>
              <div class="meta">
                <span>\${escapeHtml(details.workflow.path)}</span>
                <span class="pill neutral">\${escapeHtml(details.workflow.state)}</span>
              </div>
            </div>
            <div class="inspector-actions">
              <button class="button primary" data-inspector-run-workflow-id="\${details.workflow.id}">Run workflow</button>
              <a class="button" href="\${escapeAttribute(details.workflowFileUrl)}" target="_blank" rel="noreferrer">Open on GitHub</a>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Dispatch</strong>
              <div>\${escapeHtml(dispatchText)}</div>
            </div>
            <div class="detail-item">
              <strong>Recent runs in view</strong>
              <div>\${escapeHtml(String(details.recentRuns.length))}</div>
            </div>
          </div>
          <div>
            <strong>Dispatch inputs</strong>
            <div style="margin-top: 8px;">\${inputMarkup}</div>
          </div>
          <div>
            <strong>Recent runs</strong>
            <div style="margin-top: 8px;">\${recentRunsMarkup}</div>
          </div>
          <div>
            <strong>Workflow YAML</strong>
            <pre class="code-block">\${escapeHtml(details.yaml || "")}</pre>
          </div>
        </div>
      \`;
      updateInspectorMarkup(markup, bindWorkflowInspectorEvents);
    }

    function renderRunInspector(details) {
      const run = details.run;
      const workflow = details.workflow;
      const jobsMarkup = (run.jobs || []).length
        ? '<div class="inspector-list">' + run.jobs.map((job) => \`
            <div class="job-card">
              <div class="workflow-header">
                <div>
                  <strong>\${escapeHtml(job.name)}</strong>
                  <div class="meta">
                    <span>Job #\${escapeHtml(String(job.databaseId))}</span>
                    <span>\${escapeHtml(formatDate(job.startedAt))}</span>
                  </div>
                </div>
                \${renderStatusPill(job.status, job.conclusion)}
              </div>
              <div class="step-list">
                \${(job.steps || []).map((step) => \`
                  <div class="step-item">
                    <div class="workflow-header">
                      <strong>\${escapeHtml(step.number + ". " + step.name)}</strong>
                      \${renderStatusPill(step.status, step.conclusion)}
                    </div>
                    <div class="meta">
                      <span>Started \${escapeHtml(formatDate(step.startedAt))}</span>
                      <span>Completed \${escapeHtml(formatDate(step.completedAt))}</span>
                    </div>
                  </div>
                \`).join("")}
              </div>
              <div class="inline-actions">
                <a class="button" href="\${escapeAttribute(job.url)}" target="_blank" rel="noreferrer">Open job on GitHub</a>
              </div>
            </div>
          \`).join("") + '</div>'
        : '<div class="empty">No jobs were returned for this workflow run.</div>';

      const markup = \`
        <div class="inspector-card">
          <div class="inspector-header">
            <div>
              <div class="muted">Workflow run details</div>
              <h3 style="margin: 0 0 4px;">\${escapeHtml(run.workflowName || run.name || "Workflow run")} #\${escapeHtml(String(run.number))}</h3>
              <div class="meta">
                <span>\${escapeHtml(run.displayTitle || "")}</span>
                <span>\${escapeHtml(run.event)}</span>
                <span>\${escapeHtml(run.headBranch || "n/a")}</span>
              </div>
            </div>
            <div class="inspector-actions">
              \${workflow ? '<button class="button" data-inspector-workflow-id="' + workflow.id + '">Workflow details</button>' : ""}
              <a class="button primary" href="\${escapeAttribute(run.url)}" target="_blank" rel="noreferrer">Open on GitHub</a>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Status</strong>
              <div>\${renderStatusPill(run.status, run.conclusion)}</div>
            </div>
            <div class="detail-item">
              <strong>Attempt</strong>
              <div>\${escapeHtml(String(run.attempt || 1))}</div>
            </div>
            <div class="detail-item">
              <strong>Created</strong>
              <div>\${escapeHtml(formatDate(run.createdAt))}</div>
            </div>
            <div class="detail-item">
              <strong>Updated</strong>
              <div>\${escapeHtml(formatDate(run.updatedAt))}</div>
            </div>
            <div class="detail-item">
              <strong>Commit</strong>
              <div><code>\${escapeHtml((run.headSha || "").slice(0, 12) || "n/a")}</code></div>
            </div>
            <div class="detail-item">
              <strong>Run ID</strong>
              <div><code>\${escapeHtml(String(run.databaseId))}</code></div>
            </div>
          </div>
          <div>
            <strong>Jobs and steps</strong>
            <div style="margin-top: 8px;">\${jobsMarkup}</div>
          </div>
        </div>
      \`;
      updateInspectorMarkup(markup, bindRunInspectorEvents);
    }

    function updateInspectorMarkup(markup, binder) {
      elements.inspectorDialogContent.innerHTML = markup;
      binder(elements.inspectorDialogContent);
    }

    function bindWorkflowInspectorEvents(container) {
      container.querySelectorAll("button[data-inspector-run-id]").forEach((button) => {
        button.addEventListener("click", () => openRunDetails(button.getAttribute("data-inspector-run-id")));
      });
      const runWorkflowButton = container.querySelector("button[data-inspector-run-workflow-id]");
      if (runWorkflowButton) {
        runWorkflowButton.addEventListener("click", () => openRunDialog(runWorkflowButton.getAttribute("data-inspector-run-workflow-id")));
      }
    }

    function bindRunInspectorEvents(container) {
      const workflowButton = container.querySelector("button[data-inspector-workflow-id]");
      if (workflowButton) {
        workflowButton.addEventListener("click", () => openDetails(workflowButton.getAttribute("data-inspector-workflow-id")));
      }
    }

    function setActiveTab(tabName) {
      state.activeTab = tabName;
      syncTabVisibility();
    }

    function syncTabVisibility() {
      if (isWideScreen()) {
        elements.actionsPanel.hidden = false;
        elements.runsPanel.hidden = false;
        elements.tabActions.classList.toggle("active", true);
        elements.tabRuns.classList.toggle("active", false);
        elements.tabActions.setAttribute("aria-selected", "true");
        elements.tabRuns.setAttribute("aria-selected", "false");
        return;
      }

      const activeTab = state.activeTab || "actions";
      const actionsActive = activeTab === "actions";
      elements.actionsPanel.hidden = !actionsActive;
      elements.runsPanel.hidden = actionsActive;
      elements.tabActions.classList.toggle("active", actionsActive);
      elements.tabRuns.classList.toggle("active", !actionsActive);
      elements.tabActions.setAttribute("aria-selected", actionsActive ? "true" : "false");
      elements.tabRuns.setAttribute("aria-selected", actionsActive ? "false" : "true");
    }

    function isWideScreen() {
      return window.matchMedia("(min-width: 1101px)").matches;
    }

    function showInspectorDialog() {
      if (!elements.inspectorDialog.open) {
        elements.inspectorDialog.showModal();
      }
    }

    function summarize(repoState) {
      const runs = repoState.runs || [];
      return {
        workflowCount: (repoState.workflows || []).length,
        runningCount: runs.filter((run) => run.status !== "completed").length,
        failureCount: runs.filter((run) => run.conclusion && !["success", "neutral", "skipped"].includes(run.conclusion)).length,
      };
    }

    function renderStatusPill(status, conclusion) {
      const normalizedConclusion = conclusion || "";
      const normalizedStatus = status || "";
      let tone = "neutral";
      let label = normalizedStatus;

      if (normalizedStatus !== "completed") {
        tone = "running";
      } else if (normalizedConclusion === "success") {
        tone = "success";
        label = "success";
      } else if (["failure", "timed_out", "startup_failure"].includes(normalizedConclusion)) {
        tone = "failure";
        label = normalizedConclusion;
      } else if (["action_required", "cancelled", "stale"].includes(normalizedConclusion)) {
        tone = "warning";
        label = normalizedConclusion;
      } else if (normalizedConclusion) {
        tone = "neutral";
        label = normalizedConclusion;
      }

      return '<span class="pill ' + tone + '">' + escapeHtml(label || "unknown") + '</span>';
    }

    function formatDate(value) {
      if (!value) {
        return "unknown";
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleString();
    }

    function setStatus(message, isError) {
      elements.statusMessage.textContent = message || "";
      elements.statusMessage.className = isError ? "status-message error" : "status-message";
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    const events = new EventSource("/events");
    events.addEventListener("state", (event) => {
      try {
        applyState(JSON.parse(event.data));
      } catch {}
    });
    events.addEventListener("error", () => {
      setStatus("Live updates disconnected. Use Refresh to reload state.", true);
    });

    refresh(false);
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
