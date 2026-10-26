import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { BoardStore } from "../.github/extensions/duplicate-review-board/lib/state.mjs";
import { createGitHub } from "../.github/extensions/duplicate-review-board/lib/github.mjs";
import { Publisher } from "../.github/extensions/duplicate-review-board/lib/publish.mjs";

const reportBody = `### Summary

### Potential Duplicates

#### Group 1: Testing

- [ ] Reviewed - these are intentionally separate

| Resource | Type | Description |
|----------|------|-------------|
| \`agents/testing.agent.md\` | Agent | Test agent |
| \`instructions/testing.instructions.md\` | Instruction | Test instruction |

**Why flagged:** Same test scope.

---`;
const reportIssue = {
    number: 12,
    title: "Duplicate Resource Review",
    html_url: "https://github.com/github/awesome-copilot/issues/12",
    state: "open",
    labels: [{ name: "duplicate-review" }],
    body: reportBody,
};

async function fixture(t) {
    const root = await mkdtemp(path.resolve(".duplicate-review-board-provenance-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const store = await new BoardStore(path.join(root, "board.json")).load();
    await store.import(reportIssue);
    const item = store.snapshot().items[0];
    await store.update(12, item.id, {
        column: "consolidate",
        note: "",
        draft: item.draft,
        expectedRevision: item.revision,
    });
    return { store, id: item.id };
}

function mockGitHub({ issues = [], trustedAuthors = [], permissions = {} } = {}) {
    const calls = [];
    const writes = [];
    const permissionByAuthor = new Map([
        ...trustedAuthors.map((login) => [login, "write"]),
        ...Object.entries(permissions),
    ]);
    const run = async (args, input) => {
        calls.push(args);
        const endpoint = args[1];
        if (endpoint === "repos/github/awesome-copilot/issues?state=all&per_page=100") {
            return JSON.stringify([issues]);
        }
        if (endpoint === "repos/github/awesome-copilot/issues/12") return JSON.stringify(reportIssue);
        if (endpoint.startsWith("repos/github/awesome-copilot/collaborators/")) {
            const login = decodeURIComponent(endpoint.split("/").at(-2));
            const permission = permissionByAuthor.get(login);
            if (!permission) throw new Error("HTTP 404: Not Found");
            return JSON.stringify({ permission });
        }
        if (endpoint === "repos/github/awesome-copilot/issues" && args.includes("--method")) {
            const payload = JSON.parse(input);
            writes.push(payload);
            return JSON.stringify({
                ...payload,
                html_url: "https://github.com/github/awesome-copilot/issues/99",
            });
        }
        throw new Error(`Unexpected mocked GitHub request: ${args.join(" ")}`);
    };
    return { github: createGitHub(run), calls, writes };
}

test("marker matches require a verified write-capable author and deduplicate permission checks", async () => {
    const marker = "<!-- duplicate-review-board:group-id -->";
    const issues = [
        { number: 1, body: marker, user: { login: "untrusted" } },
        { number: 2, body: marker, user: { login: "maintainer" } },
        { number: 3, body: marker, user: { login: "maintainer" } },
        { number: 4, body: "unrelated", user: { login: "untrusted" } },
        { number: 5, body: marker },
        { number: 6, body: marker, user: { login: "triager" } },
    ];
    const { github, calls } = mockGitHub({
        issues,
        trustedAuthors: ["maintainer"],
        permissions: { triager: "triage" },
    });

    assert.deepEqual((await github.find(marker)).map((issue) => issue.number), [2, 3]);
    assert.equal(calls.filter((args) => args[1].includes("/collaborators/")).length, 3);
});

test("permission verification errors do not authorize publishing past an unknown marker match", async () => {
    const marker = "<!-- duplicate-review-board:group-id -->";
    const github = createGitHub(async (args) => {
        if (args[1].includes("/collaborators/")) throw new Error("HTTP 403: Rate limit exceeded");
        return JSON.stringify([[{ body: marker, user: { login: "unknown" } }]]);
    });
    await assert.rejects(github.find(marker), /403/);
});

test("an unrelated author's copied marker cannot block a new consolidation issue", async (t) => {
    const { store, id } = await fixture(t);
    const marker = `<!-- duplicate-review-board:${id} -->`;
    const { github, writes } = mockGitHub({
        issues: [{ number: 88, body: `Copied marker ${marker}`, user: { login: "untrusted" } }],
    });
    const publisher = new Publisher(store, github);
    const preview = publisher.preview(12, id);

    await publisher.publish(preview.token);

    assert.equal(writes.length, 1);
    assert.equal(store.item(12, id).publication.status, "published");
});

test("reconcile does not save a receipt for a copied marker from an untrusted author", async (t) => {
    const { store, id } = await fixture(t);
    const marker = `<!-- duplicate-review-board:${id} -->`;
    const { github } = mockGitHub({
        issues: [{ number: 88, body: `Copied marker ${marker}`, user: { login: "untrusted" } }],
    });
    const publisher = new Publisher(store, github);

    await assert.rejects(publisher.reconcile(12, id), /Found 0 matching tracking issues/);
    assert.equal(store.item(12, id).publication, null);
});

test("a historical issue by a verified write-capable author still blocks duplicates and reconciles", async (t) => {
    const { store, id } = await fixture(t);
    const marker = `<!-- duplicate-review-board:${id} -->`;
    const issue = {
        number: 88,
        body: `Existing tracking issue ${marker}`,
        user: { login: "maintainer" },
        html_url: "https://github.com/github/awesome-copilot/issues/88",
    };
    const { github, writes } = mockGitHub({ issues: [issue], trustedAuthors: ["maintainer"] });
    const publisher = new Publisher(store, github);
    const preview = publisher.preview(12, id);

    await assert.rejects(publisher.publish(preview.token), /already exists/);
    assert.equal(writes.length, 0);
    await publisher.reconcile(12, id);
    assert.equal(store.item(12, id).publication.status, "published");
    assert.equal(store.item(12, id).publication.url, "https://github.com/github/awesome-copilot/issues/88");
});
