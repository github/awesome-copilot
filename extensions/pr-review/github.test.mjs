import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient, mapUnifiedDiff } from "./github.mjs";

const baseSha = "a".repeat(40);
const headSha = "b".repeat(40);

function response(data, headers = {}) {
    return new Response(typeof data === "string" ? data : JSON.stringify(data), {
        status: 200,
        headers: typeof data === "string" ? headers : { "Content-Type": "application/json", ...headers },
    });
}

test("loads full unified patches directly, beyond the per-file preview excerpt", async () => {
    const lines = Array.from({ length: 24 }, (_, index) => `+line ${index + 1}`);
    const diff = [
        "diff --git a/src/feature.js b/src/feature.js",
        "index 1234567..abcdef0 100644",
        "--- a/src/feature.js",
        "+++ b/src/feature.js",
        "@@ -1,0 +1,24 @@",
        ...lines,
        "",
    ].join("\n");
    const requests = [];
    const client = createGitHubClient({
        tokenProvider: async (host) => {
            assert.equal(host, "github.com");
            return ["test-token"];
        },
        fetchImpl: async (url, options) => {
            requests.push({ url: String(url), options });
            if (options.headers.Accept === "application/vnd.github.diff") return response(diff);
            if (String(url).endsWith("/files?per_page=100&page=1")) {
                return response([{
                    filename: "src/feature.js", status: "modified", additions: 24, deletions: 0,
                    patch: ["@@ -1,0 +1,24 @@", ...lines.slice(0, 10)].join("\n"),
                }]);
            }
            return response({
                title: "Synthetic pull request",
                changed_files: 1,
                user: { login: "example" },
                base: { sha: baseSha },
                head: { sha: headSha },
            });
        },
    });

    const result = await client.load("https://github.com/example/project/pull/42");
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].patch, diff.trimEnd());
    assert.equal(result.files[0].patch.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++ ")).length, 24);
    assert.match(result.files[0].patchNote, /Full diff section loaded directly/);
    assert.equal(requests.length, 3);
    assert.ok(requests.every(({ url }) => new URL(url).hostname === "api.github.com"));
    assert.ok(requests.every(({ url }) => new URL(url).pathname.startsWith("/repos/example/project/pulls/42")));
    assert.ok(requests.every(({ options }) => options.headers.Authorization === "Bearer test-token"));
});

test("rejects a missing full diff section when GitHub listed a text patch", async () => {
    const client = createGitHubClient({
        tokenProvider: async () => ["test-token"],
        fetchImpl: async (url, options) => {
            if (options.headers.Accept === "application/vnd.github.diff") return response("");
            if (String(url).endsWith("/files?per_page=100&page=1")) {
                return response([{
                    filename: "src/feature.js", status: "modified", additions: 1, deletions: 0,
                    patch: "@@ -0,0 +1 @@\n+line",
                }]);
            }
            return response({
                title: "Synthetic pull request", changed_files: 1,
                base: { sha: baseSha }, head: { sha: headSha },
            });
        },
    });
    await assert.rejects(
        client.load("https://github.com/example/project/pull/42"),
        /full GitHub diff omitted src\/feature\.js/,
    );
});

test("maps quoted paths and renamed file sections", () => {
    const files = [{ filename: "src/new path.js", previousFilename: "src/old path.js" }];
    const diff = [
        'diff --git "a/src/old path.js" "b/src/new path.js"',
        "similarity index 90%",
        "rename from src/old path.js",
        "rename to src/new path.js",
        "--- a/src/old path.js",
        "+++ b/src/new path.js",
        "@@ -1 +1 @@",
        "-old",
        "+new",
    ].join("\n");
    assert.equal(mapUnifiedDiff(diff, files).get("src/new path.js"), diff);
});

test("bounds downloaded diff size and aborts oversized responses", async () => {
    const client = createGitHubClient({
        tokenProvider: async () => ["test-token"],
        fetchImpl: async (url, options) => {
            if (options.headers.Accept === "application/vnd.github.diff") {
                return response("x".repeat(20 * 1024 * 1024 + 1));
            }
            if (String(url).endsWith("/files?per_page=100&page=1")) return response([]);
            return response({
                title: "Synthetic pull request", changed_files: 0,
                base: { sha: baseSha }, head: { sha: headSha },
            });
        },
    });
    await assert.rejects(
        client.load("https://github.com/example/project/pull/42"),
        /20 MB local snapshot limit/,
    );
});
