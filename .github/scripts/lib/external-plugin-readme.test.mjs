import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchExternalPluginReadme, loadExternalPluginReadmes } from "./external-plugin-readme.mjs";

const source = { source: "github", repo: "owner/repo", path: "plugins/example", ref: "v1.0.0" };

function fixture(responses) {
  const calls = [];
  const warnings = [];
  return {
    calls,
    warnings,
    options: {
      warn: (message) => warnings.push(message),
      fetchImpl: async (url, options) => {
        calls.push(url);
        assert.equal(options.redirect, "error");
        assert.ok(options.signal);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response ?? new Response("", { status: 404 });
      },
    },
  };
}

test("infers the plugin README and prefers the listing SHA to its ref", async () => {
  const f = fixture([new Response("# Plugin")]);
  const result = await fetchExternalPluginReadme({ ...source, sha: "a".repeat(40) }, f.options);
  assert.equal(result.markdown, "# Plugin");
  assert.equal(result.rawUrl, `https://raw.githubusercontent.com/owner/repo/${"a".repeat(40)}/plugins/example/README.md`);
  assert.equal(result.sourceUrl, `https://github.com/owner/repo/blob/${"a".repeat(40)}/plugins/example/README.md`);
  assert.deepEqual(f.warnings, []);
});

test("uses a root path and HEAD for an unpinned listing", async () => {
  const f = fixture([new Response("# Root")]);
  await fetchExternalPluginReadme({ source: "github", repo: "owner/repo", path: "/" }, f.options);
  assert.deepEqual(f.calls, ["https://raw.githubusercontent.com/owner/repo/HEAD/README.md"]);
});

test("encodes refs and path segments", async () => {
  const f = fixture([new Response("# Plugin")]);
  await fetchExternalPluginReadme({ ...source, path: "plugin docs", ref: "refs/tags/v1+docs" }, f.options);
  assert.equal(f.calls[0], "https://raw.githubusercontent.com/owner/repo/refs%2Ftags%2Fv1%2Bdocs/plugin%20docs/README.md");
});

test("accepts ref-only package-style tags used by the catalog", async () => {
  const f = fixture([new Response("# Radius")]);
  const result = await fetchExternalPluginReadme({ ...source, ref: "radius@0.2.1" }, f.options);
  assert.equal(result.markdown, "# Radius");
  assert.match(f.calls[0], /\/radius%400\.2\.1\/plugins\/example\/README\.md$/);
  assert.deepEqual(f.warnings, []);
});

test("tries common Markdown filename casing before the repository root", async () => {
  const f = fixture([undefined, new Response("# Lowercase")]);
  assert.equal((await fetchExternalPluginReadme(source, f.options)).markdown, "# Lowercase");
  assert.match(f.calls[1], /plugins\/example\/readme\.md$/);
  const root = fixture([undefined, undefined, undefined, new Response("# Root")]);
  await fetchExternalPluginReadme(source, root.options);
  assert.match(root.calls[3], /v1\.0\.0\/README\.md$/);
});

test("logs missing READMEs and retains a null fallback without changing revision", async () => {
  const f = fixture([]);
  assert.equal(await fetchExternalPluginReadme(source, f.options), null);
  assert.equal(f.calls.length, 6);
  assert.ok(f.calls.every((url) => url.includes("/v1.0.0/")));
  assert.match(f.warnings[0], /No Markdown README found/);
});

test("logs HTTP, timeout, and network failures without trying another revision", async () => {
  for (const response of [new Response("", { status: 403 }), new Response("", { status: 500 }), new Error("Timed out"), new Error("Network unavailable")]) {
    const f = fixture([response]);
    assert.equal(await fetchExternalPluginReadme(source, f.options), null);
    assert.equal(f.calls.length, 1);
    assert.match(f.warnings[0], /Could not load/);
  }
});

test("limits declared and streamed response sizes and rejects empty files", async () => {
  for (const response of [
    new Response("large", { headers: { "content-length": String(512 * 1024 + 1) } }),
    new Response("x".repeat(512 * 1024 + 1)),
    new Response(" \n"),
  ]) {
    const f = fixture([response]);
    assert.equal(await fetchExternalPluginReadme(source, f.options), null);
    assert.equal(f.warnings.length, 1);
  }
});

test("does not fetch non-GitHub sources or malformed GitHub paths", async () => {
  const f = fixture([]);
  assert.equal(await fetchExternalPluginReadme({ source: "git" }, f.options), null);
  for (const overrides of [{ repo: "../bad" }, { repo: "host/repo/extra" }, { path: "../outside" }, { path: "/outside" }, { path: "a\\b" }, { path: null }, { path: "a//b" }, { ref: "../main" }, { ref: "." }]) {
    assert.equal(await fetchExternalPluginReadme({ ...source, ...overrides }, f.options), null);
  }
  assert.deepEqual(f.calls, []);
  assert.equal(f.warnings.length, 9);
  assert.ok(f.warnings.every((message) => message.includes("Invalid GitHub source")));
});

test("loads only external plugins with bounded concurrency", async (t) => {
  let active = 0;
  let maximum = 0;
  t.mock.method(globalThis, "fetch", async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return new Response("# Remote");
  });
  const plugins = [
    { id: "built-in", readmeFile: "plugins/built-in/README.md" },
    ...Array.from({ length: 14 }, () => ({ external: true, source })),
  ];
  await loadExternalPluginReadmes(plugins);
  assert.equal(plugins[0].readme, undefined);
  assert.equal(plugins[0].readmeFile, "plugins/built-in/README.md");
  assert.ok(plugins.slice(1).every((plugin) => plugin.readme.markdown === "# Remote"));
  assert.equal(maximum, 6);
});
