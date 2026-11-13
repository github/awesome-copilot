import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";
import { AdoError } from "./adapter.mjs";
import { canvasId, createHub, profileId } from "./hub.mjs";
import { schemas, validateAction } from "./schemas.mjs";
import { startServer } from "./server.mjs";
const hubs = new Map(), instances = new Map();
let session;
const getHub = id => { if (!hubs.has(id)) hubs.set(id, createHub(id)); return hubs.get(id); };
const log = async code => { if (session) await session.log(`Azure DevOps Team load: ${code}`, { level: "error" }); };
const handled = fn => async ctx => {
    try { return await fn(ctx); }
    catch (e) { await log(e.code || "extension_error"); throw new CanvasError(e instanceof AdoError ? e.code : "extension_error", e instanceof AdoError ? e.message : "The canvas could not complete this request. Check extension diagnostics."); }
};
const descriptions = {
    get_state: "Read the selected scope, open work counts, details, freshness and coverage.",
    discover: "Discover authorised organisations, projects, repositories and Azure DevOps people. No remote writes.",
    resolve_people: "Resolve selected directory descriptors to Azure DevOps identity GUIDs.",
    refresh: "Refresh work items using project state categories and active PRs with individual reviewer votes.",
    set_tracking: "Save local scope and threshold using the revision from get_state. No Azure DevOps writes.",
};
function forInstance(ctx) {
    const entry = instances.get(ctx.instanceId);
    if (!entry) throw new AdoError("not_open", "Open the canvas instance before invoking its actions.");
    return getHub(entry.profile);
}
session = await joinSession({ canvases: [createCanvas({
    id: canvasId,
    displayName: "Azure DevOps Team load",
    description: "Browse each person's open Azure DevOps work and unassigned items with explicit scope, freshness and coverage.",
    inputSchema: { type: "object", properties: { profile: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,64}$" } }, additionalProperties: false },
    actions: Object.entries(schemas).map(([name, inputSchema]) => ({
        name, description: descriptions[name], inputSchema,
        handler: handled(ctx => forInstance(ctx).perform(name, validateAction(name, ctx.input ?? {}))),
    })),
    open: handled(async ctx => {
        const input = ctx.input ?? {};
        if (Object.keys(input).some(k => k !== "profile")) throw new AdoError("invalid_input", "Only profile is accepted by open.");
        const profile = profileId(input.profile);
        const existing = instances.get(ctx.instanceId);
        if (existing && existing.profile !== profile) throw new AdoError("conflict", "Use a new instanceId to open a different profile.");
        const hub = getHub(profile);
        await hub.perform("get_state");
        if (!existing) instances.set(ctx.instanceId, { profile, server: await startServer((name, input) => hub.perform(name, validateAction(name, input)), log) });
        return { title: "Azure DevOps Team load", url: instances.get(ctx.instanceId).server.url };
    }),
    onClose: handled(async ctx => {
        const entry = instances.get(ctx.instanceId);
        if (entry) { await entry.server.close(); instances.delete(ctx.instanceId); }
    }),
})] });
