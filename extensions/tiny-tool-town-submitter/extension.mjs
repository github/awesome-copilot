import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import {
    buildIssueBody,
    inspectRepository,
    resolveRepoRoot,
    validateSubmission,
} from "./lib/analyzer.mjs";
import { generateDescriptionOptions } from "./lib/copy-generator.mjs";
import { renderHtml } from "./lib/renderer.mjs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const servers = new Map();
const states = new Map();
const ISSUE_REPOSITORY = "shanselman/TinyToolTown";
const MAX_REQUEST_BYTES = 1024 * 256;
let activeSession;
let copyClient;
let copyClientPromise;
let persisted = { repositories: {} };
let persistenceLoaded = false;

async function runGh(args, cwd) {
    try {
        const { stdout } = await execFileAsync("gh", args, {
            cwd,
            timeout: 30000,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
        });
        return stdout.trim();
    } catch (error) {
        const detail = String(error?.stderr || error?.message || "GitHub CLI command failed.").trim();
        throw new Error(detail);
    }
}

function persistencePath() {
    return activeSession?.workspacePath
        ? join(activeSession.workspacePath, "files", "tiny-tool-town-submitter.json")
        : "";
}

async function loadPersistence() {
    if (persistenceLoaded) return;
    persistenceLoaded = true;
    const path = persistencePath();
    if (!path) return;
    try {
        persisted = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
        if (error?.code !== "ENOENT") {
            await activeSession?.log("Tiny Tool Town Submitter could not load its saved draft.", { level: "warning" });
        }
    }
    if (!persisted || typeof persisted !== "object" || !persisted.repositories) {
        persisted = { repositories: {} };
    }
}

async function savePersistence() {
    const path = persistencePath();
    if (!path) return;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
}

function publicState(state) {
    return {
        repoPath: state.repoPath,
        scannedAt: state.scannedAt,
        metadata: state.metadata,
        facts: state.facts,
        recommendations: state.recommendations,
        themes: state.themes,
        submission: state.submission || null,
    };
}

async function inspect(repoPath, { preserveDraft = true } = {}) {
    await loadPersistence();
    const fresh = await inspectRepository(repoPath);
    const saved = persisted.repositories[fresh.repoPath];
    if (preserveDraft && saved?.metadata) {
        const savedValues = Object.fromEntries(
            Object.entries(saved.metadata).filter(([field, value]) =>
                field === "confirmations"
                || (typeof value === "string" && (value.trim() || !fresh.metadata[field])),
            ),
        );
        fresh.metadata = {
            ...fresh.metadata,
            ...savedValues,
            confirmations: {
                ...fresh.metadata.confirmations,
                ...saved.metadata.confirmations,
            },
        };
    }
    if (saved?.submission) fresh.submission = saved.submission;
    states.set(fresh.repoPath, fresh);
    persisted.repositories[fresh.repoPath] = {
        metadata: fresh.metadata,
        submission: fresh.submission || null,
    };
    await savePersistence();
    return fresh;
}

function repoPathFromContext(ctx) {
    const repoPath = ctx.input?.repoPath || ctx.session?.workingDirectory;
    if (!repoPath) {
        throw new CanvasError(
            "repository_unavailable",
            "The active session did not provide a repository path. Open the canvas from a project session or pass repoPath explicitly.",
        );
    }
    return repoPath;
}

async function stateFor(repoPath) {
    const root = await resolveRepoRoot(repoPath);
    return states.get(root) || inspect(root);
}

function applyMetadata(state, metadata) {
    const allowed = [
        "name",
        "tagline",
        "description",
        "githubUrl",
        "websiteUrl",
        "thumbnailUrl",
        "author",
        "authorGitHub",
        "tags",
        "language",
        "license",
        "theme",
    ];
    for (const field of allowed) {
        if (typeof metadata?.[field] === "string") {
            state.metadata[field] = metadata[field].trim();
        }
    }
    if (metadata?.confirmations && typeof metadata.confirmations === "object") {
        state.metadata.confirmations = {
            freeOpenSource: metadata.confirmations.freeOpenSource === true,
            notEnterpriseSaas: metadata.confirmations.notEnterpriseSaas === true,
            publicAndWorks: metadata.confirmations.publicAndWorks === true,
        };
    }
}

async function persistState(state) {
    persisted.repositories[state.repoPath] = {
        metadata: state.metadata,
        submission: state.submission || null,
    };
    await savePersistence();
}

async function getCopyClient() {
    if (!copyClientPromise) {
        copyClient = new CopilotClient({
            connection: RuntimeConnection.forStdio({
                path: process.env.COPILOT_CLI_PATH || process.execPath,
            }),
            logLevel: "error",
        });
        copyClientPromise = copyClient.start()
            .then(() => copyClient)
            .catch((error) => {
                copyClient = undefined;
                copyClientPromise = undefined;
                throw error;
            });
    }
    return copyClientPromise;
}

async function stopCopyClient() {
    const client = copyClient;
    copyClient = undefined;
    copyClientPromise = undefined;
    if (client) {
        await client.stop();
    }
}

async function generateIsolatedDescriptionOptions(state) {
    const client = await getCopyClient();
    const session = await client.createSession({
        workingDirectory: state.repoPath,
        availableTools: [],
        systemMessage: {
            mode: "append",
            content: "This is an isolated copywriting session. Never use tools or perform side effects. Return only the requested JSON.",
        },
    });
    const sessionId = session.sessionId;
    try {
        return await generateDescriptionOptions(session, structuredClone(state.metadata));
    } finally {
        await session.disconnect();
        try {
            await client.deleteSession(sessionId);
        } catch (error) {
            await activeSession?.log(
                `Tiny Tool Town Submitter could not delete copy session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
                { level: "warning" },
            );
        }
    }
}

function titleFor(metadata) {
    return `[Tool] ${metadata.name.trim()}`;
}

function suppressGitHubMentions(value) {
    return String(value || "").replace(/@(?=[A-Za-z0-9_-])/g, "@\u200B");
}

function publicIssueMetadata(metadata) {
    return Object.fromEntries(
        Object.entries(metadata).map(([field, value]) => [
            field,
            typeof value === "string" ? suppressGitHubMentions(value) : value,
        ]),
    );
}

async function submitIssue(state, metadata, confirmed) {
    if (confirmed !== true) {
        throw new CanvasError("confirmation_required", "Set confirm to true after reviewing the public issue contents.");
    }
    applyMetadata(state, metadata);
    const submissionMetadata = structuredClone(state.metadata);
    const errors = validateSubmission(submissionMetadata, state.facts);
    if (errors.length) {
        throw new CanvasError("submission_invalid", errors.join(" "));
    }

    const search = await runGh([
        "issue",
        "list",
        "--repo",
        ISSUE_REPOSITORY,
        "--state",
        "all",
        "--search",
        `${submissionMetadata.githubUrl} in:body`,
        "--limit",
        "10",
        "--json",
        "number,title,url,state",
    ], state.repoPath);
    const existing = JSON.parse(search || "[]").find((issue) => issue.url);
    if (existing) {
        state.submission = {
            url: existing.url,
            number: existing.number,
            existing: true,
            submittedAt: new Date().toISOString(),
        };
        await persistState(state);
        return { url: existing.url, existing: true, state: publicState(state) };
    }

    const issueMetadata = publicIssueMetadata(submissionMetadata);
    const url = await runGh([
        "issue",
        "create",
        "--repo",
        ISSUE_REPOSITORY,
        "--title",
        titleFor(issueMetadata),
        "--label",
        "new-tool",
        "--body",
        buildIssueBody(issueMetadata),
    ], state.repoPath);
    state.submission = {
        url,
        existing: false,
        submittedAt: new Date().toISOString(),
    };
    await persistState(state);
    return { url, existing: false, state: publicState(state) };
}

async function requestImprovementSession(state, recommendationIds) {
    if (!activeSession) throw new Error("Copilot session is unavailable.");
    const selected = state.recommendations.filter((item) => recommendationIds.includes(item.id));
    if (!selected.length) {
        throw new CanvasError("recommendations_required", "Select at least one current recommendation.");
    }
    const implementationPrompt = [
        "Prepare this repository for a Tiny Tool Town submission.",
        `Repository path: ${state.repoPath}`,
        "",
        "Implement these findings:",
        ...selected.map((item) => `- ${item.title}: ${item.prompt}`),
        "",
        "Preserve unrelated work. Follow repository conventions, add or update directly related documentation and assets, run the existing validation commands, and leave a PR-ready branch state.",
    ].join("\n");
    const sessionRequest = [
        "Create a new local project session in the current project for Tiny Tool Town readiness improvements.",
        "Use the create_session tool with the current project_id, coordinate_with_creator: true, notify_on_idle: once, and name: Tiny Tool readiness.",
        "Set kickoff mode to autopilot and use this exact kickoff prompt:",
        JSON.stringify(implementationPrompt),
        "",
        "After the tool succeeds, reply with a one-line confirmation. Do not implement the findings in this current session.",
    ].join("\n");
    await activeSession.send({
        prompt: sessionRequest,
        mode: "immediate",
        displayPrompt: "Start Tiny Tool readiness session",
    });
    return {
        status: "requested",
        message: `Requested an implementation session for ${selected.length} recommendation${selected.length === 1 ? "" : "s"}.`,
        recommendations: selected.map((item) => item.id),
    };
}

async function readJson(req) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_REQUEST_BYTES) {
            const error = new Error("Request body is too large.");
            error.statusCode = 413;
            throw error;
        }
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        const error = new Error("Request body must be valid JSON.");
        error.statusCode = 400;
        throw error;
    }
}

function sendJson(res, statusCode, value) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(value));
}

async function closeServerEntry(entry) {
    if (!entry?.server?.listening) return;
    await new Promise((resolve, reject) => {
        entry.server.close((error) => error ? reject(error) : resolve());
    });
}

async function closeCanvasServer(instanceId) {
    const entry = servers.get(instanceId);
    if (entry) {
        servers.delete(instanceId);
        await closeServerEntry(entry);
    }
}

async function closeAllCanvasServers() {
    const entries = [...servers.values()];
    servers.clear();
    await Promise.all(entries.map((entry) => closeServerEntry(entry)));
}

async function handleRequest(entry, req, res) {
    const url = new URL(req.url || "/", entry.url);
    if (url.pathname === "/" && req.method === "GET") {
        const nonce = randomUUID().replaceAll("-", "");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader(
            "Content-Security-Policy",
            `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src https: data:; base-uri 'none'; form-action 'none'`,
        );
        res.end(renderHtml(nonce));
        return;
    }
    if (url.searchParams.get("token") !== entry.token) {
        sendJson(res, 403, { error: "Invalid canvas token." });
        return;
    }

    try {
        let state = await stateFor(entry.repoPath);
        if (url.pathname === "/state" && req.method === "GET") {
            sendJson(res, 200, publicState(state));
            return;
        }
        if (url.pathname === "/save" && req.method === "POST") {
            const body = await readJson(req);
            applyMetadata(state, body.metadata);
            await persistState(state);
            sendJson(res, 200, publicState(state));
            return;
        }
        if (url.pathname === "/refresh" && req.method === "POST") {
            const body = await readJson(req);
            applyMetadata(state, body.metadata);
            await persistState(state);
            state = await inspect(entry.repoPath);
            sendJson(res, 200, publicState(state));
            return;
        }
        if (url.pathname === "/generate-descriptions" && req.method === "POST") {
            const body = await readJson(req);
            applyMetadata(state, body.metadata);
            await persistState(state);
            const options = await generateIsolatedDescriptionOptions(state);
            sendJson(res, 200, { options });
            return;
        }
        if (url.pathname === "/submit" && req.method === "POST") {
            const body = await readJson(req);
            sendJson(res, 200, await submitIssue(state, body.metadata, body.confirm));
            return;
        }
        if (url.pathname === "/implement" && req.method === "POST") {
            const body = await readJson(req);
            sendJson(res, 200, await requestImprovementSession(state, body.recommendationIds || []));
            return;
        }
        sendJson(res, 404, { error: "Not found." });
    } catch (error) {
        sendJson(res, error?.statusCode || 400, {
            error: error instanceof Error ? error.message : "Request failed.",
            code: error?.code,
        });
    }
}

async function startServer(instanceId, repoPath) {
    const token = randomUUID();
    const entry = { instanceId, repoPath, token, server: null, url: "" };
    const server = createServer((req, res) => {
        handleRequest(entry, req, res).catch((error) => {
            sendJson(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error." });
        });
    });
    entry.server = server;
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.url = `http://127.0.0.1:${port}/`;
    return entry;
}

const metadataSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        tagline: { type: "string", maxLength: 100 },
        description: { type: "string" },
        githubUrl: { type: "string" },
        websiteUrl: { type: "string" },
        thumbnailUrl: { type: "string" },
        author: { type: "string" },
        authorGitHub: { type: "string" },
        tags: { type: "string" },
        language: { type: "string" },
        license: { type: "string" },
        theme: { type: "string" },
        confirmations: {
            type: "object",
            properties: {
                freeOpenSource: { type: "boolean" },
                notEnterpriseSaas: { type: "boolean" },
                publicAndWorks: { type: "boolean" },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

activeSession = await joinSession({
    canvases: [
        createCanvas({
            id: "tiny-tool-town-submitter",
            displayName: "Tiny Tool Town Submitter",
            description: "Inspect a repository, improve its Tiny Tool Town readiness, submit the listing issue, and launch remediation work.",
            inputSchema: {
                type: "object",
                properties: {
                    repoPath: { type: "string", description: "Repository path to inspect; defaults to the current Git repository." },
                },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "inspect_repository",
                    description: "Re-scan a repository and return Tiny Tool Town metadata and readiness recommendations.",
                    inputSchema: {
                        type: "object",
                        properties: { repoPath: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => publicState(await inspect(repoPathFromContext(ctx), { preserveDraft: false })),
                },
                {
                    name: "update_submission",
                    description: "Update the saved Tiny Tool Town submission draft.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            repoPath: { type: "string" },
                            metadata: metadataSchema,
                        },
                        required: ["metadata"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const state = await stateFor(repoPathFromContext(ctx));
                        applyMetadata(state, ctx.input.metadata);
                        await persistState(state);
                        return publicState(state);
                    },
                },
                {
                    name: "start_improvement_session",
                    description: "Request a dedicated project session to implement selected readiness recommendations.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            repoPath: { type: "string" },
                            recommendationIds: {
                                type: "array",
                                minItems: 1,
                                uniqueItems: true,
                                items: { type: "string" },
                            },
                        },
                        required: ["recommendationIds"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const state = await stateFor(repoPathFromContext(ctx));
                        return requestImprovementSession(state, ctx.input.recommendationIds);
                    },
                },
            ],
            open: async (ctx) => {
                const repoPath = await resolveRepoRoot(repoPathFromContext(ctx));
                await stateFor(repoPath);
                let entry = servers.get(ctx.instanceId);
                if (entry && entry.repoPath !== repoPath) {
                    await closeCanvasServer(ctx.instanceId);
                    entry = null;
                }
                if (!entry) {
                    entry = await startServer(ctx.instanceId, repoPath);
                    servers.set(ctx.instanceId, entry);
                }
                return {
                    title: "Tiny Tool Town Submitter",
                    status: "Repository inspected",
                    url: `${entry.url}?token=${encodeURIComponent(entry.token)}`,
                };
            },
            onClose: async (ctx) => {
                await closeCanvasServer(ctx.instanceId);
            },
        }),
    ],
});

async function shutdownExtension() {
    await Promise.all([
        stopCopyClient(),
        closeAllCanvasServers(),
    ]);
}

activeSession.on("session.shutdown", () => {
    void shutdownExtension().catch((error) => {
        void activeSession?.log(
            `Tiny Tool Town Submitter shutdown cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
            { level: "warning" },
        );
    });
});

process.once("SIGTERM", () => {
    void shutdownExtension().finally(() => process.exit(0));
});
