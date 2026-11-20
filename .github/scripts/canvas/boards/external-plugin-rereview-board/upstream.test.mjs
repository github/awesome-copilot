import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectUpstream } from "../../../../extensions/external-plugin-rereview-board/lib/upstream.mjs";

const head = "a".repeat(40);
const stable = "b".repeat(40);
const pin = "c".repeat(40);
const plugin = {
    name: "example", version: "1.0.0",
    source: { repo: "owner/example", path: "plugins/example", ref: "v1.0.0", sha: pin },
};
const missing = () => new Error("gh: Not Found (HTTP 404)");
function fixture() {
    const root = "repos/owner/example";
    const routes = new Map([
        [root, { default_branch: "main" }],
        [`${root}/releases/latest`, { tag_name: "repo-v2", name: "Release", published_at: "2026-11-18T00:00:00Z", body: "Fixed compatibility", draft: false, prerelease: false }],
        [`${root}/commits/refs%2Ftags%2Frepo-v2`, { sha: stable }],
        [`${root}/commits/refs%2Fheads%2Fmain`, { sha: head }],
        [`${root}/contents/plugins/example/plugin.json?ref=${stable}`, { name: "example", version: "1.1.0" }],
        [`${root}/contents/plugins/example/plugin.json?ref=${head}`, { name: "example", version: "1.2.0-beta.1" }],
        ...[head, stable].map((sha) => [
            `${root}/compare/${pin}...${sha}?per_page=1`,
            { status: "ahead", ahead_by: 2, behind_by: 0, files: [
                { filename: "plugins/example/plugin.json", status: "modified" },
                { filename: "plugins/another/plugin.json", status: "modified" },
                { filename: "archived/README.md", previous_filename: "plugins/example/README.md", status: "renamed" },
            ] },
        ]),
    ]);
    const calls = [];
    const run = async (args) => {
        calls.push(args);
        const value = routes.get(args[1]);
        if (value === undefined) throw missing();
        if (value instanceof Error) throw value;
        if (typeof value === "string") return value;
        return JSON.stringify(value);
    };
    return { root, routes, calls, run };
}

test("upstream snapshots stable and HEAD manifests at the plugin path, compares the SHA pin, and bounds notes/files", async () => {
    const { root, routes, calls, run } = fixture();
    routes.get(`${root}/releases/latest`).body = "x".repeat(8001);
    const result = await inspectUpstream(plugin, run);
    assert.equal(result.status, "ok");
    assert.equal(result.release.tag, "repo-v2");
    assert.equal(result.stable.manifest.version, "1.1.0", "repository release tags are not plugin manifest versions");
    assert.equal(result.head.manifest.version, "1.2.0-beta.1");
    assert.equal(result.head.sha, head);
    assert.equal(result.head.manifest.matchesPlugin, true);
    assert.match(result.head.manifest.url, new RegExp(`/blob/${head}/plugins/example/plugin.json$`));
    assert.equal(result.release.notes.length, 8000);
    assert.equal(result.release.notesTruncated, true);
    assert.deepEqual(result.comparisons[0].files.map((file) => file.path), ["plugins/example/plugin.json", "archived/README.md"]);
    assert.ok(calls.filter((args) => args[1].includes("/compare/")).every((args) => args[1].includes(pin) && !args[1].includes("v1.0.0")));
    assert.ok(calls.filter((args) => args[1].includes("/contents/")).every((args) => args.includes("Accept: application/vnd.github.raw")));
    assert.deepEqual(await inspectUpstream(plugin, run), result, "unchanged API snapshots must not invalidate saved reviews");
});

test("HEAD inspection still runs without releases and supports legacy manifests without confusing absence with access failure", async () => {
    const { root, routes, run } = fixture();
    routes.delete(`${root}/releases/latest`);
    const manifest = routes.get(`${root}/contents/plugins/example/plugin.json?ref=${head}`);
    routes.delete(`${root}/contents/plugins/example/plugin.json?ref=${head}`);
    routes.set(`${root}/contents/plugins/example/.github/plugin/plugin.json?ref=${head}`, manifest);
    const result = await inspectUpstream(plugin, run);
    assert.equal(result.status, "ok");
    assert.equal(result.release, null);
    assert.equal(result.stable, null);
    assert.equal(result.head.manifest.version, "1.2.0-beta.1");
    assert.equal(result.head.manifest.path, "plugins/example/.github/plugin/plugin.json");
    assert.equal(result.comparisons.length, 1);
    routes.set(`${root}/releases/latest`, new Error("gh: API rate limit exceeded (HTTP 403)"));
    const partial = await inspectUpstream(plugin, run);
    assert.equal(partial.status, "partial");
    assert.match(partial.errors.join("\n"), /Latest stable release:.*403/);
    assert.equal(partial.head.manifest.version, manifest.version);
});

test("a release tag sharing the default branch name never replaces the branch HEAD snapshot", async () => {
    const { root, routes, run } = fixture();
    routes.get(`${root}/releases/latest`).tag_name = "main";
    routes.set(`${root}/commits/refs%2Ftags%2Fmain`, { sha: stable });
    const result = await inspectUpstream(plugin, run);
    assert.equal(result.stable.sha, stable);
    assert.equal(result.head.sha, head);
    assert.equal(result.head.manifest.version, "1.2.0-beta.1");
});

test("invalid manifests, repository access and comparison errors remain visible, never evidence of no updates", async () => {
    const { root, routes, run } = fixture();
    routes.set(`${root}/contents/plugins/example/plugin.json?ref=${head}`, "{bad JSON");
    routes.set(`${root}/compare/${pin}...${stable}?per_page=1`, new Error("gh: Not Found (HTTP 404)"));
    const result = await inspectUpstream(plugin, run);
    assert.equal(result.status, "partial");
    assert.equal(result.head.manifest, null);
    assert.match(result.errors.join("\n"), /Manifest at main/);
    assert.match(result.errors.join("\n"), /Comparison to Latest stable release:.*404/);
    assert.equal(result.comparisons.length, 1);
    routes.set(root, new Error("gh: Resource not accessible (HTTP 403)"));
    const denied = await inspectUpstream(plugin, run);
    assert.equal(denied.status, "error");
    assert.match(denied.errors.join(), /Repository:.*403/);
});

test("monorepo identity mismatches and truncated comparisons are explicit", async () => {
    const { root, routes, run } = fixture();
    routes.set(`${root}/contents/plugins/example/plugin.json?ref=${stable}`, { name: "another-plugin", version: "9.0.0" });
    const comparison = routes.get(`${root}/compare/${pin}...${head}?per_page=1`);
    comparison.files = Array.from({ length: 300 }, (_, id) => ({ filename: `plugins/example/${id}.md`, status: "modified" }));
    const result = await inspectUpstream(plugin, run);
    assert.equal(result.stable.manifest.matchesPlugin, false);
    assert.equal(result.comparisons[1].files.length, 40);
    assert.equal(result.comparisons[1].filesTruncated, true);
    comparison.files = Array.from({ length: 300 }, (_, id) => ({ filename: `another-plugin/${id}.md`, status: "modified" }));
    const filtered = await inspectUpstream(plugin, run);
    assert.equal(filtered.comparisons[1].files.length, 0);
    assert.equal(filtered.comparisons[1].filesTruncated, true, "an API cap cannot establish that the plugin path is unchanged");
});

test("root plugins and ref-only pins work; unsafe sources are rejected before making API calls", async () => {
    const { root, routes, run } = fixture();
    routes.set(`${root}/contents/plugin.json?ref=${head}`, { name: "example", version: "1.3.0" });
    routes.set(`${root}/contents/plugin.json?ref=${stable}`, { name: "example", version: "1.2.0" });
    for (const sha of [head, stable]) routes.set(`${root}/compare/release%2Fv1...${sha}?per_page=1`, {
        status: "ahead", ahead_by: 1, behind_by: 0, files: [],
    });
    const result = await inspectUpstream({ ...plugin, source: { repo: plugin.source.repo, path: "/", ref: "release/v1" } }, run);
    assert.equal(result.status, "ok");
    assert.equal(result.head.manifest.path, "plugin.json");
    assert.ok(result.comparisons.every((entry) => entry.base === "release/v1"));
    for (const source of [
        { repo: "owner/.." }, { repo: "owner/example", path: "../secret" },
        { repo: "owner/example", path: "plugin.json" }, { repo: "owner/example", path: "plugins\\example" },
    ]) {
        const invalid = await inspectUpstream({ ...plugin, source }, () => { throw new Error("Must not call API"); });
        assert.equal(invalid.status, "error");
        assert.ok(!invalid.errors.some((error) => error.includes("Must not call API")));
    }
});
