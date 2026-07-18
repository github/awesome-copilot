import { test } from "node:test";
import assert from "node:assert/strict";

import { pickSafeTool, _internals } from "./safe-tools.mjs";

test("curated servers pin known-safe tools and arguments", () => {
    const learn = pickSafeTool(
        { apiName: "learn", displayName: "Microsoft Learn" },
        [{
            name: "microsoft_docs_search",
            inputSchema: {
                type: "object",
                required: ["query", "question"],
                properties: {
                    query: { type: "string" },
                    question: { type: "string" },
                },
            },
        }],
    );
    assert.deepEqual(learn, {
        tool: "microsoft_docs_search",
        args: { query: "azure connectors", question: "what are azure connectors" },
        source: "curated",
    });

    const mail = pickSafeTool(
        { apiName: "outlookmail", displayName: "Mail" },
        [{ name: "SearchMessagesQueryParameters", inputSchema: { type: "object", properties: {} } }],
    );
    assert.deepEqual(mail, {
        tool: "SearchMessagesQueryParameters",
        args: { queryParameters: "?$top=1" },
        source: "curated",
    });
});

test("curated unsafe servers are skipped without selecting a tool", () => {
    const result = pickSafeTool(
        { apiName: "wordmcp", displayName: "Word" },
        [{ name: "GetDocumentContent", inputSchema: { type: "object", required: ["documentId"] } }],
    );
    assert.equal(result.skip, true);
    assert.equal(result.source, "curated-skip");
    assert.match(result.reason, /no safe no-arg read tool/);
});

test("deny-list terms beat read-looking prefixes", () => {
    const result = pickSafeTool(
        { apiName: "generic", displayName: "Generic" },
        [
            { name: "GetAndDeleteMessage", annotations: { readOnlyHint: true }, inputSchema: { type: "object" } },
            { name: "ListAndSendMail", annotations: { readOnlyHint: true }, inputSchema: { type: "object" } },
            { name: "SearchRecords", annotations: { readOnlyHint: true }, inputSchema: { type: "object" } },
        ],
    );
    assert.deepEqual(result, { tool: "SearchRecords", args: {}, source: "heuristic-noargs" });
});

test("schema filling uses benign values and rejects complex required input", () => {
    const built = _internals.buildArgs({
        inputSchema: {
            required: ["recipientEmail", "resourceUrl", "query", "count", "enabled", "kind", "preset"],
            properties: {
                recipientEmail: { type: "string" },
                resourceUrl: { type: "string" },
                query: { type: "string" },
                count: { type: "integer" },
                enabled: { type: "boolean" },
                kind: { type: "string", enum: ["summary", "full"] },
                preset: { type: "string", default: "safe" },
            },
        },
    });
    assert.deepEqual(built, {
        ok: true,
        args: {
            recipientEmail: "test@example.com",
            resourceUrl: "https://example.com",
            query: "azure",
            count: 1,
            enabled: false,
            kind: "summary",
            preset: "safe",
        },
    });
    assert.deepEqual(
        _internals.buildArgs({
            input_schema: {
                required: ["payload"],
                properties: { payload: { type: "object" } },
            },
        }),
        { ok: false },
    );
});

test("heuristics prefer no-argument reads and return null when none are safe", () => {
    const preferred = pickSafeTool(
        { apiName: "generic", displayName: "Generic" },
        [
            {
                name: "GetRecord",
                inputSchema: {
                    required: ["query"],
                    properties: { query: { type: "string" } },
                },
            },
            { name: "ListRecords", annotations: { readOnlyHint: true }, inputSchema: { type: "object" } },
        ],
    );
    assert.deepEqual(preferred, { tool: "ListRecords", args: {}, source: "heuristic-noargs" });
    assert.equal(
        pickSafeTool(
            { apiName: "generic", displayName: "Generic" },
            [
                { name: "CreateRecord", inputSchema: { type: "object" } },
                {
                    name: "GetRecord",
                    inputSchema: {
                        required: ["payload"],
                        properties: { payload: { type: "array" } },
                    },
                },
            ],
        ),
        null,
    );
    assert.equal(pickSafeTool({ apiName: "generic", displayName: "Generic" }, []), null);
});

test("heuristics require an explicit read-only non-destructive annotation", () => {
    assert.equal(
        pickSafeTool(
            { apiName: "generic", displayName: "Generic" },
            [
                { name: "GetAndArchiveMessage", inputSchema: { type: "object" } },
                { name: "ListAndApproveRequests", inputSchema: { type: "object" } },
            ],
        ),
        null,
    );
    assert.equal(
        pickSafeTool(
            { apiName: "generic", displayName: "Generic" },
            [{ name: "ListRecords", annotations: { readOnlyHint: true, destructiveHint: true }, inputSchema: { type: "object" } }],
        ),
        null,
    );
});
