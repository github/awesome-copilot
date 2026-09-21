import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { marked } from "marked";

// Node's native TS support needs extensions; Astro/Vite imports omit them.
const lib = new URL("../src/lib/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(lib) && specifier.startsWith(".")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const { resolveMarkdownImage, resolveMarkdownSrcset } =
  await import("../src/lib/markdown-images.ts");
const { sanitizeHtml } = await import("../src/lib/sanitize-html.ts");
const { readResourceMarkdown } = await import("../src/lib/detail-page.ts");

const revision = "a".repeat(40);
const rawBase = `https://raw.githubusercontent.com/github/awesome-copilot/${revision}`;
const source = {
  rawBase,
  filePath: "extensions/pr-artifact-explorer/README.md",
};
const render = (markdown, provenance = source) =>
  sanitizeHtml(marked.parse(markdown, { async: false }), provenance);

test("standalone documentation images receive the shared spacing marker", () => {
  for (const markdown of [
    "![Preview](assets/preview.png)",
    "[![Preview](assets/preview.png)](https://example.com)",
    '<picture><source srcset="assets/preview.png"><img src="assets/preview.png" alt="Preview"></picture>',
    '<a href="https://example.com"><picture><img src="assets/preview.png" alt="Preview"></picture></a>',
  ]) {
    const html = render(markdown);
    assert.match(html, /<img\b[^>]*data-markdown-block-image=""/);
    assert.equal(sanitizeHtml(html), html, "Repeated sanitization preserves block classification");
  }
  assert.match(readResourceMarkdown(source.filePath, source).markdownHtml,
    /<img\b[^>]*data-markdown-block-image=""/);
});

test("inline icons, text, and badge rows do not receive block image spacing", () => {
  for (const markdown of [
    "Click ![Icon](assets/preview.png) to continue.",
    "**Before** ![Icon](assets/preview.png) **after**",
    "[![Build](assets/preview.png)](https://example.com) [![Version](assets/preview.png)](https://example.com)",
    '<span><img src="assets/preview.png" alt="Icon"></span>',
    '<div>Click <img src="assets/preview.png" alt="Icon"> to continue.</div>',
    '<p>Click <img src="assets/preview.png" data-markdown-block-image="" alt="Icon"> to continue.</p>',
  ]) {
    assert.doesNotMatch(render(markdown), /data-markdown-block-image/);
  }
});

test("raw HTML image rows do not receive standalone-image margins", () => {
  for (const tag of ["div", "section", "article", "li"]) {
    for (const images of [
      '<img src="assets/one.png"><img src="assets/two.png">',
      '<a href="https://example.com"><img src="assets/one.png"></a><picture><img src="assets/two.png"></picture>',
    ]) {
      assert.doesNotMatch(render(`<${tag}>${images}</${tag}>`), /data-markdown-block-image/);
    }
    assert.match(render(`<${tag}><img src="assets/one.png"></${tag}>`), /data-markdown-block-image/);
  }
  assert.doesNotMatch(sanitizeHtml('<img src="/one.png"><img src="/two.png">'), /data-markdown-block-image/);
});

test("relative images resolve against the document directory and revision", () => {
  for (const [input, expected] of [
    ["assets/preview.png", "extensions/pr-artifact-explorer/assets/preview.png"],
    ["./assets/preview.png", "extensions/pr-artifact-explorer/assets/preview.png"],
    ["../shared/image.png", "extensions/shared/image.png"],
    ["../../shared/image.png", "shared/image.png"],
    ["assets/a b.png?raw=true#dark", "extensions/pr-artifact-explorer/assets/a%20b.png?raw=true#dark"],
    ["assets/a%20b.png", "extensions/pr-artifact-explorer/assets/a%20b.png"],
  ]) {
    assert.equal(resolveMarkdownImage(input, source), `${rawBase}/${expected}`);
  }
});

test("site-root, absolute, and already pinned assets retain their destinations", () => {
  for (const url of [
    "/images/learning-hub/example.png",
    "https://example.com/image.png?q=1#preview",
    "http://example.com/image.png",
    `${rawBase}/extensions/pr-artifact-explorer/assets/preview.png`,
    "https://github.com/user-attachments/assets/image-id",
    "https://github.com/owner/repo/blob/feature/branch/image.png?raw=true",
  ]) {
    assert.equal(resolveMarkdownImage(url, null), url);
  }
  assert.equal(resolveMarkdownImage("//example.com/image.png", null), "https://example.com/image.png");
});

test("only unambiguous commit-pinned embedded blob URLs become raw URLs", () => {
  const blob = `https://github.com/owner/repo/blob/${revision}/docs/image.png?raw=true#dark`;
  assert.equal(
    resolveMarkdownImage(blob, source),
    `https://raw.githubusercontent.com/owner/repo/${revision}/docs/image.png?raw=true#dark`,
  );
  const html = render(`[An image link](${blob})\n\n![An embedded image](${blob})`);
  assert.ok(html.includes(`href="${blob}"`));
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.ok(html.includes('alt="An embedded image"'));
});

test("external documents use explicit remote provenance, not the local cache path", () => {
  const external = {
    rawBase: `https://raw.githubusercontent.com/third-party/plugin/${revision}`,
    filePath: "packages/canvas/docs/README.md",
  };
  const result = readResourceMarkdown(source.filePath, external);
  assert.ok(result.markdownHtml.includes(
    `src="${external.rawBase}/packages/canvas/docs/assets/preview.png"`,
  ));
  assert.ok(!/src(?:set)?="https:\/\/raw\.githubusercontent\.com\/github\/awesome-copilot/.test(
    result.markdownHtml,
  ));
  assert.equal(
    resolveMarkdownImage("../image.png", {
      ...external,
      rawBase: "https://raw.githubusercontent.com/third-party/plugin/release%2Fv1",
    }),
    "https://raw.githubusercontent.com/third-party/plugin/release%2Fv1/packages/canvas/image.png",
  );
});

test("Artifact Explorer README rewrites img and both themed picture sources", () => {
  const { markdownHtml } = readResourceMarkdown(source.filePath, source);
  const assets = `${rawBase}/extensions/pr-artifact-explorer/assets`;
  assert.ok(markdownHtml.includes(`src="${assets}/preview.png"`));
  assert.ok(markdownHtml.includes(`srcset="${assets}/preview-dark.png"`));
  assert.ok(markdownHtml.includes(`srcset="${assets}/preview.png"`));
  assert.ok(markdownHtml.includes('alt="Artifact Explorer showing pull request workflow artifacts'));
  assert.ok(!markdownHtml.includes("<h1"));
  // Fallback locales reuse this render, not their URL as the source.
  for (const route of ["/extension/pr-artifact-explorer/", "/ko-kr/extension/pr-artifact-explorer/"]) {
    assert.equal(
      new URL(`${assets}/preview.png`, `https://awesome-copilot.github.com${route}`).href,
      `${assets}/preview.png`,
    );
  }
});

test("curated plugin parent-relative images and markdown syntax are resolved", () => {
  const { markdownHtml } = readResourceMarkdown("plugins/napkin/README.md");
  assert.ok(markdownHtml.includes(
    'src="https://raw.githubusercontent.com/github/awesome-copilot/main/skills/napkin/assets/step1-activate.svg"',
  ));
  assert.ok(render('![A & B](assets/preview.png "Preview")').includes(
    `src="${rawBase}/extensions/pr-artifact-explorer/assets/preview.png" alt="A &amp; B" title="Preview"`,
  ));
});

test("file previews use each selected file path even when contents are identical", () => {
  for (const filePath of [
    "skills/example/docs/guide.md",
    "skills/example/other/guide.md",
    "cookbook/copilot-sdk/nodejs/guide.md",
  ]) {
    const directory = filePath.slice(0, filePath.lastIndexOf("/"));
    assert.ok(render("![Diagram](./diagram.png)", { rawBase, filePath }).includes(
      `src="${rawBase}/${directory}/diagram.png"`,
    ));
  }
});

test("srcset handles descriptors, whitespace, parent paths, and commas in URLs", () => {
  assert.equal(
    resolveMarkdownSrcset("assets/a.png 1x, ../b.png 2x", source),
    `${rawBase}/extensions/pr-artifact-explorer/assets/a.png 1x, ${rawBase}/extensions/b.png 2x`,
  );
  assert.equal(
    resolveMarkdownSrcset("/images/a.png 320w, https://example.com/a,b.png 640w", source),
    "/images/a.png 320w, https://example.com/a,b.png 640w",
  );
  assert.equal(
    resolveMarkdownSrcset("assets/a.png, \n assets/b.png", source),
    `${rawBase}/extensions/pr-artifact-explorer/assets/a.png, ${rawBase}/extensions/pr-artifact-explorer/assets/b.png`,
  );
});

test("unsafe URLs and ambiguous or escaping provenance fail explicitly", () => {
  for (const url of [
    "javascript:alert(1)", "data:image/png;base64,AA", "file:///tmp/a.png",
    "vbscript:bad", "java\nscript:bad", "\\\\evil.test\\a.png", "",
    "../../../outside.png", "%2e%2e/%2e%2e/%2e%2e/outside.png",
  ]) {
    assert.throws(() => resolveMarkdownImage(url, source));
  }
  assert.throws(() => resolveMarkdownImage("image.png", null), /no document source/);
  for (const invalidSource of [
    { ...source, rawBase: "https://github.com/owner/repo/tree/main" },
    { ...source, rawBase: "https://raw.githubusercontent.com/owner/repo" },
    { ...source, rawBase: "https://raw.githubusercontent.com/owner/repo/feature/branch" },
    { ...source, filePath: "../README.md" },
  ]) {
    assert.throws(() => resolveMarkdownImage("image.png", invalidSource));
  }
});

test("final markup stays sanitized, preserves alt/links, and isolates render sources", (t) => {
  const warnings = [];
  t.mock.method(console, "warn", (message) => warnings.push(message));
  const html = render(`
<picture><source srcset="javascript:bad 1x"><img src="javascript&#58;bad" alt="Keep me" onerror="bad()"></picture>
<img src="data:image/png;base64,AA" alt="No data">
<script>alert(1)</script>
<a href="javascript:bad" target="_blank">Unsafe link</a>
<a href="assets/preview.png" target="_blank">Ordinary image link</a>`);
  assert.ok(!/javascript|data:image|onerror|<script/.test(html));
  assert.ok(html.includes('alt="Keep me"'));
  assert.ok(html.includes('href="assets/preview.png"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.equal(warnings.length, 3);
  assert.ok(warnings.every((warning) => warning.includes(source.filePath)));
  assert.ok(!render("![Missing source](relative.png)", null).includes("src="));
  assert.ok(render("![Known source](relative.png)").includes(`src="${rawBase}/`));
  // The Learning Hub path, which has no repository provenance, is unchanged.
  assert.ok(sanitizeHtml('<img src="/images/learning-hub/a.png" alt="Lesson">').includes(
    'src="/images/learning-hub/a.png"',
  ));
  assert.ok(sanitizeHtml('<img src="untouched.png">').includes('src="untouched.png"'));
});
