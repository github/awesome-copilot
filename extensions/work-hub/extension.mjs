import { createServer } from "node:http";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import {
    MOODS,
    BUSYNESS,
    MINUTE_OPTIONS,
    FOCUS_INTENTS,
    collectDashboardState,
    setFocusContext,
    listAvailableRepos,
    setTrackedRepos,
    addRepos,
    removeRepos,
    readConfig,
    getItemDetail,
    runItemAction,
    setCopilotSession,
} from "./data.mjs";
import { renderHtml } from "./renderer.mjs";

let sessionRef = null;

const servers = new Map();

function writeJson(res, value, status = 200) {
    const body = JSON.stringify(value);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store" });
    res.end(body);
}

function writeHtml(res, html) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 64 * 1024) {
                reject(new Error("Request body is too large."));
                req.destroy();
            }
        });
        req.on("end", () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error(`Invalid JSON body: ${error.message}`));
            }
        });
        req.on("error", reject);
    });
}

function normalizePromptText(value) {
    return String(value || "").replace(/\r?\n/g, " ").trim();
}

function escapePromptValue(value) {
    return normalizePromptText(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function broadcast(entry, event, data) {
    const body = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of entry.clients) {
        try {
            client.write(body);
        } catch {
            entry.clients.delete(client);
            try {
                client.end();
            } catch {
                // Ignore cleanup failures for already-disconnected SSE clients.
            }
        }
    }
}

async function requestItemSession(input = {}) {
    const repo = normalizePromptText(input.repo);
    const number = Number(input.number);
    const type = input.type === "pr" ? "pr" : "issue";
    const title = normalizePromptText(String(input.title || "").slice(0, 160));
    if (!repo.includes("/") || !number) throw new Error("A repo slug and number are required.");
    if (!sessionRef) throw new Error("Session bridge is unavailable.");

    const requested = ["implement", "spec", "cloud"].includes(input.mode) ? input.mode : "plan";
    if (requested === "cloud" && type !== "issue") throw new Error("Cloud session assignment is available for issues only.");

    const ref = type === "pr" ? "pull request" : "issue";
    const mode = requested === "spec" && type === "pr" ? "plan" : requested;
    const safeRepo = escapePromptValue(repo);
    const safeTitleSuffix = title ? ` ("${escapePromptValue(title)}")` : "";
    let prompt;
    let label;
    if (mode === "cloud") {
        prompt = `Create a cloud coding session for issue #${number} in "${safeRepo}"${safeTitleSuffix}. Do not create a local session. First call list_projects and find the configured project whose GitHub repo is exactly "${safeRepo}". If no configured project exists, tell me plainly that this repo is not configured for cloud sessions. If it exists, call create_session with execution_location "cloud", notify_on_idle "once", a short name based on issue #${number}, and kickoff mode "autopilot". The kickoff prompt should tell the cloud agent to read the GitHub issue, understand the requirements, implement the fix end-to-end in that repository, run the existing validation, and report blockers or the resulting PR/session status.`;
        label = "cloud";
    } else if (mode === "implement") {
        prompt = `Open a new coding session for ${ref} #${number} in "${safeRepo}"${safeTitleSuffix}. Use the appropriate session-creation tool for the "${safeRepo}" project in interactive/implementation mode, and have it begin implementing the ${ref} directly (reading the ${ref} first for context).`;
        label = "build";
    } else if (mode === "spec") {
        prompt = `Open a new coding session for issue #${number} in "${safeRepo}"${safeTitleSuffix}. Use the appropriate session-creation tool for the "${safeRepo}" project in plan mode. Do NOT implement code — instead have it refine and sharpen the issue's specification: read the issue, clarify goals, scope, acceptance criteria, edge cases, and open questions, then propose an updated, well-structured spec and offer to post it back as a comment on the issue.`;
        label = "spec-refinement";
    } else {
        prompt = `Open a new coding session for ${ref} #${number} in "${safeRepo}"${safeTitleSuffix}. Use the appropriate session-creation tool for the "${safeRepo}" project, kick it off in plan mode, and have it start by understanding the ${ref} and proposing an implementation plan.`;
        label = "planning";
    }
    await sessionRef.send(prompt);
    return { ok: true, message: `Requested a ${mode === "cloud" ? "cloud coding" : label} session for ${repo} #${number}.` };
}

async function handleRequest(entry, req, res) {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const p = url.pathname;
    try {
        if (req.method === "GET" && p === "/") return writeHtml(res, renderHtml());
        if (req.method === "GET" && p === "/api/state") return writeJson(res, await collectDashboardState(url.searchParams.get("force") === "1"));
        if (req.method === "GET" && p === "/api/available-repos") return writeJson(res, await listAvailableRepos(url.searchParams.get("force") === "1"));

        if (req.method === "POST" && p === "/api/refresh") {
            const model = await collectDashboardState(true);
            broadcast(entry, "state", { generatedAt: model.generatedAt });
            return writeJson(res, model);
        }
        if (req.method === "POST" && p === "/api/focus") {
            await setFocusContext(await readBody(req));
            const model = await collectDashboardState(true);
            broadcast(entry, "state", { generatedAt: model.generatedAt });
            return writeJson(res, model);
        }
        if (req.method === "POST" && p === "/api/repos/add") {
            const input = await readBody(req);
            await addRepos(input.repos || input.slug || input.slugs);
            return writeJson(res, await readConfig());
        }
        if (req.method === "POST" && p === "/api/repos/remove") {
            const input = await readBody(req);
            await removeRepos(input.slug || input.slugs);
            return writeJson(res, await readConfig());
        }
        if (req.method === "POST" && p === "/api/repos/set") {
            const input = await readBody(req);
            await setTrackedRepos(input.repos || input.slugs, input.onboarded !== false);
            return writeJson(res, await readConfig());
        }
        if (req.method === "GET" && p === "/api/item") {
            return writeJson(res, await getItemDetail({
                repo: url.searchParams.get("repo"),
                type: url.searchParams.get("type"),
                number: url.searchParams.get("number"),
            }));
        }
        if (req.method === "POST" && p === "/api/item/action") {
            const input = await readBody(req);
            const result = await runItemAction(input);
            broadcast(entry, "state", { generatedAt: new Date().toISOString() });
            return writeJson(res, result);
        }
        if (req.method === "POST" && p === "/api/item/session") {
            const input = await readBody(req);
            return writeJson(res, await requestItemSession(input));
        }

        if (req.method === "POST" && p === "/api/session/jump") {
            const input = await readBody(req);
            const id = String(input.sessionId || "");
            if (!id) throw new Error("A sessionId is required.");
            if (!sessionRef) throw new Error("Session bridge is unavailable.");
            const repo = normalizePromptText(input.repo);
            const branch = normalizePromptText(input.branch);
            const where = repo ? ` in ${repo}` : "";
            const branchNote = branch ? ` on branch "${escapePromptValue(branch)}"` : "";
            const prompt = `I want to jump to my active coding session${where}${branchNote} to triage it. Call list_sessions_and_chats, find the session whose project_repo matches "${escapePromptValue(repo)}"${branch ? ` and whose path/branch matches "${escapePromptValue(branch)}"` : ""}, then call navigate_to with that session's id. (The session-store id is ${id}, but use the id from list_sessions_and_chats since the app navigation id can differ.) If no matching session is found, tell me it may have been closed.`;
            await sessionRef.send(prompt);
            return writeJson(res, { ok: true, message: "Jumping to that session…" });
        }

        if (req.method === "POST" && p === "/api/session/cleanup") {
            const input = await readBody(req);
            if (!sessionRef) throw new Error("Session bridge is unavailable.");
            const list = Array.isArray(input.sessions) ? input.sessions.filter((s) => s && s.repo) : [];
            if (!list.length) throw new Error("No sessions were provided to clean up.");
            const lines = list.slice(0, 40).map((s, i) => `${i + 1}. repo "${escapePromptValue(s.repo)}"${s.branch ? `, branch "${escapePromptValue(s.branch)}"` : ""}${s.summary ? ` — summary "${escapePromptValue(s.summary)}"` : ""}${s.ageLabel ? ` (last active "${escapePromptValue(s.ageLabel)}" ago)` : ""}${s.archived ? " [ARCHIVED: worktree already removed]" : ""}`).join("\n");
            const prompt = `I want to clean up ${list.length} old coding session${list.length === 1 ? "" : "s"} from Work Hub. For each one below, call list_sessions_and_chats and match the real app session by project_repo (and branch/path where given), then show me exactly which app sessions you'll delete and ask me to confirm before calling delete_item. Never delete without my explicit confirmation, and skip any that don't clearly match or that appear to have uncommitted work worth keeping. Items marked [ARCHIVED] no longer have a worktree and are very likely already closed — if you can't find a matching live session for one, tell me it's already gone rather than treating it as an error.\n\nSessions to clean up:\n${lines}`;
            await sessionRef.send(prompt);
            return writeJson(res, { ok: true, message: `Requested cleanup of ${list.length} session${list.length === 1 ? "" : "s"} (pending your confirmation).` });
        }

        if (req.method === "GET" && p === "/events") {
            res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
            entry.clients.add(res);
            res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
            req.on("close", () => entry.clients.delete(res));
            return;
        }
        writeJson(res, { error: "Not found" }, 404);
    } catch (error) {
        writeJson(res, { error: error.message || "Request failed" }, 500);
    }
}

async function startServer(instanceId) {
    const entry = { server: null, url: "", clients: new Set(), instanceId };
    const server = createServer((req, res) => handleRequest(entry, req, res));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.server = server;
    entry.url = `http://127.0.0.1:${port}/`;
    return entry;
}

sessionRef = await joinSession({
    canvases: [
        createCanvas({
            id: "work-hub",
            displayName: "Work Hub",
            description: "Generic cross-repo command center with onboarding, configurable repos/projects, repo health, and focus recommendations.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    mood: { type: "string", enum: MOODS },
                    minutes: { type: "number", enum: MINUTE_OPTIONS },
                    busyness: { type: "string", enum: BUSYNESS },
                    focusIntent: { type: "string", enum: FOCUS_INTENTS },
                },
            },
            actions: [
                {
                    name: "refresh",
                    description: "Refresh GitHub, local git, session, and recommendation data for Work Hub.",
                    inputSchema: { type: "object", additionalProperties: false, properties: { force: { type: "boolean" } } },
                    handler: async (ctx) => collectDashboardState(ctx.input?.force !== false),
                },
                {
                    name: "get_state",
                    description: "Return the current Work Hub dashboard state, using the short cache when fresh.",
                    inputSchema: { type: "object", additionalProperties: false, properties: {} },
                    handler: async () => collectDashboardState(false),
                },
                {
                    name: "set_focus_context",
                    description: "Set mood, available time, and busyness, then return updated focus recommendations.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["mood", "minutes", "busyness"],
                        properties: {
                            mood: { type: "string", enum: MOODS },
                            minutes: { type: "number", enum: MINUTE_OPTIONS },
                            busyness: { type: "string", enum: BUSYNESS },
                            focusIntent: { type: "string", enum: FOCUS_INTENTS },
                        },
                    },
                    handler: async (ctx) => {
                        if (!ctx.input || typeof ctx.input !== "object") throw new CanvasError("invalid_focus_context", "Focus context input is required.");
                        await setFocusContext(ctx.input);
                        return collectDashboardState(true);
                    },
                },
                {
                    name: "assign_issue_to_cloud_session",
                    description: "Ask the host agent to create a cloud coding session for a GitHub issue.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["repo", "number"],
                        properties: {
                            repo: { type: "string" },
                            number: { type: "number" },
                            title: { type: "string" },
                        },
                    },
                    handler: async (ctx) => requestItemSession({ ...ctx.input, type: "issue", mode: "cloud" }),
                },
                {
                    name: "list_available_repos",
                    description: "Discover repositories from your GitHub account that can be tracked in the hub.",
                    inputSchema: { type: "object", additionalProperties: false, properties: { force: { type: "boolean" } } },
                    handler: async (ctx) => listAvailableRepos(Boolean(ctx.input?.force)),
                },
                {
                    name: "set_tracked_repos",
                    description: "Replace the tracked repository list with the provided owner/repo slugs.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            slugs: { type: "array", items: { type: "string" } },
                            repos: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["slug"],
                                    properties: { slug: { type: "string" }, path: { type: "string" }, weight: { type: "number" } },
                                },
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const repos = ctx.input?.repos || ctx.input?.slugs || [];
                        if (!repos.length) throw new CanvasError("invalid_repo", "Provide slugs or repos to track.");
                        await setTrackedRepos(repos);
                        return collectDashboardState(true);
                    },
                },
                {
                    name: "add_repo",
                    description: "Track one or more repositories by owner/repo slug.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            slug: { type: "string" },
                            slugs: { type: "array", items: { type: "string" } },
                            repos: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["slug"],
                                    properties: { slug: { type: "string" }, path: { type: "string" }, weight: { type: "number" } },
                                },
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const slugs = ctx.input?.repos || ctx.input?.slugs || (ctx.input?.slug ? [ctx.input.slug] : []);
                        if (!slugs.length) throw new CanvasError("invalid_repo", "Provide a slug or slugs to add.");
                        await addRepos(slugs);
                        return collectDashboardState(true);
                    },
                },
                {
                    name: "remove_repo",
                    description: "Stop tracking one or more repositories by owner/repo slug.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            slug: { type: "string" },
                            slugs: { type: "array", items: { type: "string" } },
                        },
                    },
                    handler: async (ctx) => {
                        const slugs = ctx.input?.slugs || (ctx.input?.slug ? [ctx.input.slug] : []);
                        if (!slugs.length) throw new CanvasError("invalid_repo", "Provide a slug or slugs to remove.");
                        await removeRepos(slugs);
                        return collectDashboardState(true);
                    },
                },
            ],
            open: async (ctx) => {
                if (ctx.input && Object.keys(ctx.input).length > 0) await setFocusContext(ctx.input);
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Work Hub", status: "Cross-repo command center", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) return;
                servers.delete(ctx.instanceId);
                for (const client of entry.clients) client.end();
                await new Promise((resolve) => entry.server.close(() => resolve()));
            },
        }),
    ],
});
setCopilotSession(sessionRef);
