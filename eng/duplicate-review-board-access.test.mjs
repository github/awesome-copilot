import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const extensionDirectory = fileURLToPath(new URL("../.github/extensions/duplicate-review-board/", import.meta.url));
const reportBody = `#### Group 1: Testing

- [ ] Reviewed - these are intentionally separate

| Resource | Type | Description |
|----------|------|-------------|
| \`agents/testing.agent.md\` | Agent | Test agent |
| \`skills/testing/SKILL.md\` | Skill | Test skill |

**Why flagged:** Similar test scope.

---
`;
const issues = new Map([12, 13].map((number) => [number, {
    number,
    title: "Duplicate Resource Review",
    html_url: `https://github.com/github/awesome-copilot/issues/${number}`,
    state: "open",
    body: reportBody,
}]));
const privateNote = "PRIVATE_NOTE_SENTINEL_65b9";
const privateDraftTitle = "PRIVATE_DRAFT_TITLE_SENTINEL_91aa";
const privateDraftBody = "PRIVATE_DRAFT_BODY_SENTINEL_3c42";

async function loadExtension(t) {
    const root = await mkdtemp(path.resolve(".duplicate-review-board-access-test-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    let canvas;
    const starts = [];
    const sdk = {
        createCanvas: (definition) => definition,
        CanvasError: class extends Error {
            constructor(code, message) { super(message); this.code = code; }
        },
        joinSession: async (options) => {
            [canvas] = options.canvases;
            return {
                workspacePath: root,
                log() {},
                rpc: {
                    tasks: {
                        startAgent: async (request) => {
                            starts.push(request);
                            return { agentId: "access-test-agent" };
                        },
                    },
                },
            };
        },
    };
    const context = vm.createContext();
    const filename = path.join(extensionDirectory, "extension.mjs");
    const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
        context,
        initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
    });
    await module.link(async (specifier) => {
        const exports = specifier === "@github/copilot-sdk/extension" ? sdk :
            specifier === "./lib/github.mjs" ? {
                createGitHub: () => ({
                    list: async () => [...issues.values()].map(({ number, title, state, html_url }) => ({ number, title, state, url: html_url })),
                    get: async (number) => {
                        const issue = issues.get(number);
                        if (!issue) throw new Error("No matching report.");
                        return structuredClone(issue);
                    },
                    content: async (file) => `contents of ${file}`,
                }),
            } : await import(specifier.startsWith(".") ? pathToFileURL(path.resolve(extensionDirectory, specifier)).href : specifier);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const act = async (name, input = {}) => {
        const target = canvas.actions.find((entry) => entry.name === name);
        assert.ok(target, `canvas action ${name} is not exposed`);
        return target.handler({ instanceId: "access-test-panel", input });
    };
    t.after(() => canvas.onClose({ instanceId: "access-test-panel" }));
    return { canvas, act, starts };
}

async function post(url, token, route, input) {
    const response = await fetch(new URL(`api/${route}`, url), {
        method: "POST",
        headers: { "content-type": "application/json", "x-board-token": token },
        body: JSON.stringify(input),
    });
    return { response, body: await response.json() };
}

test("agent-callable board actions omit private notes and drafts while the HTTP UI retains them", async (t) => {
    const { canvas, act, starts } = await loadExtension(t);
    await act("import_report", { number: 12 });
    const item = (await act("get_board")).items[0];
    const opened = await canvas.open({ instanceId: "access-test-panel", input: {} });
    const html = await (await fetch(opened.url)).text();
    const token = /name="board-token" content="([^"]+)"/.exec(html)?.[1];
    assert.ok(token, "UI receives its loopback API token");

    const update = await post(opened.url, token, "update", {
        number: 12,
        id: item.id,
        column: "deferred",
        note: privateNote,
        draft: { title: privateDraftTitle, body: privateDraftBody },
        expectedRevision: item.revision,
    });
    assert.equal(update.response.status, 200);

    const fullUi = await (await fetch(new URL("api/board", opened.url), {
        headers: { "x-board-token": token },
    })).json();
    assert.equal(fullUi.items[0].note, privateNote);
    assert.deepEqual(fullUi.items[0].draft, { title: privateDraftTitle, body: privateDraftBody });

    const safeResults = [];
    safeResults.push(await act("get_board"));
    safeResults.push(await act("list_reports"));
    safeResults.push(await act("import_report", { number: 12 }));
    safeResults.push(await act("select_report", { number: 12 }));
    safeResults.push(await act("read_resource", { number: 12, id: item.id, path: "agents/testing.agent.md" }));

    const queued = await act("start_review", { number: 12, id: item.id });
    safeResults.push(queued);
    assert.equal(starts.length, 1);
    assert.ok(![privateNote, privateDraftTitle, privateDraftBody].some((secret) => starts[0].prompt.includes(secret)));

    safeResults.push(await act("record_review", {
        number: 12, id: item.id, queueId: queued.queueId,
        recommendation: "separate", rationale: "The evidence supports keeping these resources separate.",
    }));
    const failedQueue = await act("start_review", { number: 12, id: item.id });
    safeResults.push(failedQueue);
    safeResults.push(await act("fail_review", {
        number: 12, id: item.id, queueId: failedQueue.queueId, error: "Review failed for the test.",
    }));

    const serialized = JSON.stringify(safeResults);
    for (const secret of [privateNote, privateDraftTitle, privateDraftBody]) {
        assert.equal(serialized.includes(secret), false, `agent actions must not expose ${secret}`);
    }

    const finalUi = await (await fetch(new URL("api/board", opened.url), {
        headers: { "x-board-token": token },
    })).json();
    assert.equal(finalUi.items[0].note, privateNote);
    assert.deepEqual(finalUi.items[0].draft, { title: privateDraftTitle, body: privateDraftBody });
});

test("agent action errors do not include local private note or draft fields", async (t) => {
    const { act } = await loadExtension(t);
    await act("import_report", { number: 12 });
    const item = (await act("get_board")).items[0];
    await assert.rejects(act("record_review", {
        number: 12, id: item.id, queueId: "not-the-current-queue",
        recommendation: "separate", rationale: privateNote,
    }), (error) => {
        assert.equal(error.code, "duplicate_board_error");
        assert.ok(![privateNote, privateDraftTitle, privateDraftBody].some((secret) => error.message.includes(secret)));
        return /Stale review result/.test(error.message);
    });
});
