// Safe read-tool selection for the MCP smoke harness.
//
// We never blindly call the first tool a server advertises — many servers lead
// with mutating tools (SendMail, CreateItem, DeleteMessage). This module picks a
// tool that is safe to call automatically: read-only by name, with an input
// schema we can satisfy using benign placeholder values. If nothing qualifies,
// the caller records the server as SKIPPED (tools proven to load, no call made).

// Curated overrides keyed by a predicate over the server identity. Use this when
// the heuristic would skip a server that actually has a known-safe read tool, or
// when we want to pin a specific tool/argument set. `tool` must match a tool name
// from tools/list; `args` is merged over the auto-filled args.
const CURATED = [
    {
        name: "Microsoft Learn Docs",
        match: (s) => /learn|docs/i.test(s.apiName) || /learn|docs/i.test(s.displayName),
        tool: "microsoft_docs_search",
        args: { query: "azure connectors", question: "what are azure connectors" },
    },
    {
        name: "WorkIQ Teams",
        match: (s) => /teams/i.test(s.apiName) || /teams/i.test(s.displayName),
        tool: "ListTeams",
        args: {},
    },
    {
        // SearchMessagesQueryParameters declares queryParameters optional, but the
        // server enforces "queryParameters OR nextLink required" — a cross-field
        // rule the JSON schema doesn't express, so the no-arg heuristic call fails.
        // Pin a benign read-only OData query that returns at most one message.
        name: "WorkIQ Mail",
        match: (s) => /outlookmail/i.test(s.apiName) || /mail/i.test(s.displayName),
        tool: "SearchMessagesQueryParameters",
        args: { queryParameters: "?$top=1" },
    },
    {
        // copilot_chat is the only tool Work IQ Copilot exposes. Its name doesn't
        // match the read-only heuristic, so without this pin the harness would skip
        // the call. A benign one-sentence question is a safe read-style call.
        name: "WorkIQ Copilot",
        match: (s) => /copilotchat/i.test(s.apiName) || /copilot/i.test(s.displayName),
        tool: "copilot_chat",
        args: { message: "What is Microsoft Azure? Answer in one sentence." },
    },
    {
        // Word advertises CreateDocument/AddComment/ReplyToComment (all mutating)
        // and GetDocumentContent, which needs a real document on a drive this
        // tenant can't resolve ("Invalid hostname for this tenancy" — a backend
        // config issue, not an argument problem). No safe no-arg read tool exists,
        // so prove the tools load and skip the call instead of a false failure.
        name: "WorkIQ Word",
        match: (s) => /wordmcp/i.test(s.apiName) || /^word\b/i.test(s.displayName || ""),
        skip: true,
        reason: "no safe no-arg read tool (GetDocumentContent needs a real document + a tenant drive)",
    },
];

const READ_ONLY_NAME = /^(list|get|search|read|find|describe|show|fetch|lookup|query|count)/i;

// Names that look read-only but are known to mutate or are too risky to auto-run.
const DENY_NAME = /(send|create|update|delete|remove|add|set|post|put|patch|write|upload|move|copy|rename|share|invite|reply|forward|draft|flag|ingest|execute|run|trigger)/i;

function isFillableSchema(schema) {
    if (!schema || typeof schema !== "object") return true;
    const required = Array.isArray(schema.required) ? schema.required : [];
    const props = schema.properties || {};
    for (const key of required) {
        const prop = props[key];
        if (!prop) return false; // required but undescribed → can't satisfy safely
        if (!fillValue(prop, key).ok) return false;
    }
    return true;
}

// Produce a benign placeholder for a single property schema.
function fillValue(prop, key) {
    if (!prop || typeof prop !== "object") return { ok: true, value: "test" };
    if (prop.default !== undefined) return { ok: true, value: prop.default };
    if (Array.isArray(prop.enum) && prop.enum.length > 0) return { ok: true, value: prop.enum[0] };

    const type = Array.isArray(prop.type) ? prop.type.find((t) => t !== "null") : prop.type;
    switch (type) {
        case "string": {
            if (/mail|email|upn|recipient|to|address/i.test(key)) return { ok: true, value: "test@example.com" };
            if (/url|uri|link/i.test(key)) return { ok: true, value: "https://example.com" };
            if (/query|search|q|term|keyword|text|question|prompt/i.test(key)) return { ok: true, value: "azure" };
            return { ok: true, value: "test" };
        }
        case "number":
        case "integer":
            return { ok: true, value: 1 };
        case "boolean":
            return { ok: true, value: false };
        default:
            // object/array/unknown required input → we can't safely fabricate it.
            return { ok: false };
    }
}

// Build the argument object for a tool from its required input schema.
function buildArgs(tool) {
    const schema = tool.inputSchema || tool.input_schema || {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    const props = schema.properties || {};
    const args = {};
    for (const key of required) {
        const filled = fillValue(props[key] || {}, key);
        if (!filled.ok) return { ok: false };
        args[key] = filled.value;
    }
    return { ok: true, args };
}

// Pick a safe tool to call for a server.
// server: { apiName, displayName, configName }
// tools:  the array returned by tools/list
// → { tool, args, source } | null   (null means "no safe tool, record SKIPPED")
export function pickSafeTool(server, tools) {
    if (!Array.isArray(tools) || tools.length === 0) return null;
    const byName = new Map(tools.map((t) => [t.name, t]));

    // 1. Curated override: a skip directive, or a pinned tool if it's advertised.
    for (const entry of CURATED) {
        if (!entry.match(server)) continue;
        if (entry.skip) {
            return { skip: true, reason: entry.reason || "curated skip", source: "curated-skip" };
        }
        if (byName.has(entry.tool)) {
            const tool = byName.get(entry.tool);
            const built = buildArgs(tool);
            const base = built.ok ? built.args : {};
            return { tool: entry.tool, args: { ...base, ...entry.args }, source: "curated" };
        }
    }

    // 2. Heuristic. Two passes, preferring tools we can call with NO fabricated
    //    arguments — a required `id`/`resourceId` filled with a placeholder will
    //    pass the schema check but fail at runtime (fake message id, fake
    //    resource). A read tool with no required args is both safer and far more
    //    likely to actually succeed, so try those first.
    const candidate = (tool, requireEmpty) => {
        const nm = tool.name || "";
        const annotations = tool.annotations || {};
        if (annotations.readOnlyHint !== true || annotations.destructiveHint === true) return null;
        if (!READ_ONLY_NAME.test(nm)) return null;
        if (DENY_NAME.test(nm)) return null;
        const schema = tool.inputSchema || tool.input_schema || {};
        const required = Array.isArray(schema.required) ? schema.required : [];
        if (requireEmpty && required.length > 0) return null;
        if (!isFillableSchema(schema)) return null;
        const built = buildArgs(tool);
        if (!built.ok) return null;
        return { tool: nm, args: built.args, source: requireEmpty ? "heuristic-noargs" : "heuristic" };
    };

    for (const tool of tools) {
        const pick = candidate(tool, true);
        if (pick) return pick;
    }
    for (const tool of tools) {
        const pick = candidate(tool, false);
        if (pick) return pick;
    }

    return null;
}

export const _internals = { buildArgs, isFillableSchema, fillValue, READ_ONLY_NAME, DENY_NAME };
