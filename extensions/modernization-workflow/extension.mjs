import { basename } from "node:path";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { createInstanceServer, pushState } from "./lib/server.mjs";
import {
    configureWorkflow,
    getWorkflowState,
    refreshWorkflow,
    resolveWorkspace,
    setStepStatus,
} from "./lib/state.mjs";

const instances = new Map();
let sessionRef;
let workingDirectory = process.cwd();

function instance(ctx) {
    const value = instances.get(ctx.instanceId);
    if (!value) throw new CanvasError("not_open", "Open the Modernization Workflow canvas first.");
    return value;
}

async function updateInstance(rec, operation) {
    const state = await operation(rec.workspace, rec.stateId);
    await pushState(rec, state);
    return state;
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "modernization-workflow",
            displayName: "Modernization Workflow",
            description: "Track and guide a Modernize CLI Assess, Plan, and Execute workflow from real repository artifacts.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    workspace: { type: "string", description: "Absolute local application repository path." },
                    stateId: {
                        type: "string",
                        pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$",
                        description: "Stable workflow identifier used for persisted state.",
                    },
                    language: { type: "string", enum: ["auto", "dotnet", "java", "cpp"] },
                    source: { type: "string" },
                    goal: { type: "string" },
                    upgradeTarget: { type: "string" },
                    planName: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$" },
                },
            },
            actions: [
                {
                    name: "get_workflow_state",
                    description: "Return the current workflow configuration, generated commands, artifacts, and step progress.",
                    handler: async (ctx) => {
                        const rec = instance(ctx);
                        return getWorkflowState(rec.workspace, rec.stateId);
                    },
                },
                {
                    name: "configure_workflow",
                    description: "Configure the source, language, modernization goal, and plan name.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            language: { type: "string", enum: ["auto", "dotnet", "java", "cpp"] },
                            source: { type: "string", minLength: 1 },
                            goal: { type: "string", minLength: 1 },
                            upgradeTarget: { type: "string" },
                            planName: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$" },
                            delegate: { type: "string", enum: ["local", "cloud"] },
                        },
                    },
                    handler: async (ctx) => {
                        const rec = instance(ctx);
                        return updateInstance(rec, (workspace, stateId) =>
                            configureWorkflow(workspace, stateId, ctx.input ?? {}));
                    },
                },
                {
                    name: "set_step_status",
                    description: "Set an Assess, Plan, or Execute step to pending, active, complete, or blocked.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["step", "status"],
                        properties: {
                            step: { type: "string", enum: ["assess", "plan", "execute"] },
                            status: { type: "string", enum: ["pending", "active", "complete", "blocked"] },
                        },
                    },
                    handler: async (ctx) => {
                        const rec = instance(ctx);
                        return updateInstance(rec, (workspace, stateId) =>
                            setStepStatus(workspace, stateId, ctx.input.step, ctx.input.status));
                    },
                },
                {
                    name: "refresh_from_artifacts",
                    description: "Re-scan the repository and update progress from Modernize CLI output artifacts.",
                    handler: async (ctx) => {
                        const rec = instance(ctx);
                        return updateInstance(rec, refreshWorkflow);
                    },
                },
            ],
            open: async (ctx) => {
                const workspace = resolveWorkspace(ctx.input?.workspace, workingDirectory);
                const stateId = ctx.input?.stateId ?? "default";
                let rec = instances.get(ctx.instanceId);

                if (rec && (rec.workspace !== workspace || rec.stateId !== stateId)) {
                    for (const client of rec.clients) client.end();
                    await new Promise((resolve) => rec.server.close(resolve));
                    instances.delete(ctx.instanceId);
                    rec = null;
                }

                if (!rec) {
                    rec = await createInstanceServer({
                        workspace,
                        stateId,
                        initialConfig: ctx.input ?? {},
                        onConfigure: (input) => configureWorkflow(workspace, stateId, input),
                        onSetStep: (step, status) => setStepStatus(workspace, stateId, step, status),
                        onRefresh: () => refreshWorkflow(workspace, stateId),
                    });
                    instances.set(ctx.instanceId, rec);
                }

                return {
                    title: "Modernization Workflow",
                    status: basename(workspace),
                    url: rec.url,
                };
            },
            onClose: async (ctx) => {
                const rec = instances.get(ctx.instanceId);
                if (!rec) return;
                instances.delete(ctx.instanceId);
                for (const client of rec.clients) client.end();
                await new Promise((resolve) => rec.server.close(resolve));
            },
        }),
    ],
    hooks: {
        onSessionStart: async (input) => {
            if (input.workingDirectory) workingDirectory = input.workingDirectory;
            return {
                additionalContext:
                    "When a user is modernizing an application, use the Modernization Workflow canvas to make Assess, Plan, and Execute progress visible. Refresh it after Modernize CLI commands change repository artifacts.",
            };
        },
    },
});

sessionRef = session;

session.on("session.idle", async () => {
    for (const rec of instances.values()) {
        const state = await refreshWorkflow(rec.workspace, rec.stateId);
        await pushState(rec, state);
    }
});

await session.log("Modernization Workflow canvas ready", { ephemeral: true });
