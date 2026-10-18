import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { createServer } from "vite";

const website = fileURLToPath(new URL("..", import.meta.url));
const originalCwd = process.cwd();
process.chdir(website);
const server = await createServer({
  root: website,
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
after(async () => {
  await server.close();
  process.chdir(originalCwd);
});
const { renderResourceMarkdown, readResourceMarkdown } = await server.ssrLoadModule("/src/lib/detail-page.ts");
const { finalizePluginReadme, renderPluginReadme } = await server.ssrLoadModule("/src/lib/plugin-readme.ts");
const urls = {
  linkBaseUrl: "https://github.com/owner/repo/blob/v1/plugins/example/README.md",
  imageBaseUrl: "https://raw.githubusercontent.com/owner/repo/v1/plugins/example/README.md",
};

test("remote README uses the existing sanitizer, including raw HTML", () => {
  const { markdownHtml } = renderResourceMarkdown(`# Plugin

## Documentation

<script>readmeAttack()</script>
<img src="image.png" onerror="readmeAttack()">
<a href="javascript:readmeAttack()">Unsafe</a>
<a href="https://example.com/docs" target="_blank">Safe</a>
<picture><source srcset="./dark.png 1x"><img src="./image.png" srcset="./image-2x.png 2x"></picture>
<style>body { position: fixed; inset: 0; z-index: 999999; }</style>
<div style="position: fixed; inset: 0; z-index: 999999">Overlay</div>
`, urls);
  assert.match(markdownHtml, /Documentation/);
  assert.doesNotMatch(markdownHtml, /<h1\b|<script\b|<style\b|style=|onerror|javascript:|readmeAttack/);
  assert.match(markdownHtml, /rel="noopener noreferrer"/);
  assert.match(markdownHtml, /src="https:\/\/raw.githubusercontent.com\/owner\/repo\/v1\/plugins\/example\/image.png"/);
  assert.doesNotMatch(markdownHtml, /srcset=/);
});

test("sanitizes again after accessibility processing to prevent attribute injection", () => {
  const { markdownHtml } = renderResourceMarkdown(
    '<div title="<pre onmouseover=alert(1) data-x=x">Documentation</div>',
    urls,
  );
  assert.match(markdownHtml, /Documentation/);
  assert.doesNotMatch(markdownHtml, /onmouseover/i);
});

test("sanitizes the final HTML after table-of-contents processing", () => {
  const { markdownHtml } = renderResourceMarkdown(
    '<div title="<h2 onmouseover=alert(1) data-x=x>Heading</h2>">Documentation</div>\n\n<style>body{background:red}</style>\n<div style="position:fixed">Overlay</div>',
    urls,
  );
  const finalHtml = finalizePluginReadme(markdownHtml, urls);
  assert.match(finalHtml, /Documentation/);
  assert.doesNotMatch(finalHtml, /onmouseover|<style\b|style=/i);
});

test("final URL rewriting failures leave README empty for the source fallback", () => {
  const warnings = [];
  const finalHtml = renderPluginReadme(
    `<div title="<h2>Heading</h2><a href='//['>Link</a>">Documentation</div>`,
    urls,
    (error) => warnings.push(error),
  );
  assert.equal(finalHtml, "");
  assert.equal(warnings.length, 1);
});

test("rendering errors leave README empty for the source fallback", () => {
  const finalHtml = renderPluginReadme("---\ntitle: [\n---\n# Broken", urls, () => {});
  assert.equal(finalHtml, "");
});

test("resolves relative Markdown links, reference images, and raw HTML links upstream", () => {
  const { markdownHtml } = renderResourceMarkdown(`[Guide](../../docs/guide.md)
[Section](#install)
![Image][image]

[image]: ./assets/preview.png

<a href="./LICENSE">License</a>
<img src="/assets/logo.png">
[Root guide](/docs/guide.md)
[External](//example.com/docs)
![External image](//example.com/image.png)
`, urls);
  assert.match(markdownHtml, /href="https:\/\/github.com\/owner\/repo\/blob\/v1\/docs\/guide.md"/);
  assert.match(markdownHtml, /href="#install"/);
  assert.match(markdownHtml, /src="https:\/\/raw.githubusercontent.com\/owner\/repo\/v1\/plugins\/example\/assets\/preview.png"/);
  assert.match(markdownHtml, /href="https:\/\/github.com\/owner\/repo\/blob\/v1\/plugins\/example\/LICENSE"/);
  assert.match(markdownHtml, /src="https:\/\/raw.githubusercontent.com\/owner\/repo\/v1\/assets\/logo.png"/);
  assert.match(markdownHtml, /href="https:\/\/github.com\/owner\/repo\/blob\/v1\/docs\/guide.md"/);
  assert.match(markdownHtml, /href="https:\/\/example.com\/docs"/);
  assert.match(markdownHtml, /src="https:\/\/example.com\/image.png"/);
});

test("rejects both JavaScript frontmatter language names without executing code", () => {
  for (const language of ["js", "javascript"]) {
    const sentinel = `readmeFrontmatterExecuted_${language}`;
    assert.equal(globalThis[sentinel], undefined);
    assert.throws(() => renderResourceMarkdown(
      `---${language}\n(globalThis.${sentinel} = true, {})\n---\n## Body`,
      urls,
    ), /JavaScript frontmatter is not supported/);
    assert.equal(globalThis[sentinel], undefined);
  }
});

test("keeps YAML and JSON frontmatter supported", () => {
  for (const frontmatter of ["\ntitle: Plugin", 'json\n{"title":"Plugin"}']) {
    const result = renderResourceMarkdown(`---${frontmatter}\n---\n## Body`, urls);
    assert.match(result.markdownHtml, /Body/);
    assert.doesNotMatch(result.markdownHtml, /title/);
  }
});

test("root-relative URLs preserve an encoded tag and repository revision", () => {
  const { markdownHtml } = renderResourceMarkdown("[Guide](/docs/guide.md)\n![Logo](/logo.png)", {
    linkBaseUrl: urls.linkBaseUrl.replace("/v1/", "/refs%2Ftags%2Fradius%400.2.1/"),
    imageBaseUrl: urls.imageBaseUrl.replace("/v1/", "/refs%2Ftags%2Fradius%400.2.1/"),
  });
  assert.match(markdownHtml, /href="https:\/\/github.com\/owner\/repo\/blob\/refs%2Ftags%2Fradius%400\.2\.1\/docs\/guide.md"/);
  assert.match(markdownHtml, /src="https:\/\/raw.githubusercontent.com\/owner\/repo\/refs%2Ftags%2Fradius%400\.2\.1\/logo.png"/);
});

test("catalog records omit README bodies while detail data retains them", async () => {
  const { plugins } = await server.ssrLoadModule("/src/lib/site-data.ts");
  const data = JSON.parse(fs.readFileSync(path.join(website, "public", "data", "plugins.json"), "utf8"));
  assert.ok(data.items.some((item) => item.readme?.markdown));
  assert.equal(plugins.length, data.items.length);
  assert.ok(plugins.every((item) => !Object.hasOwn(item, "readme")));
});

test("generated catalog does not send README bodies to the browser", () => {
  const html = fs.readFileSync(path.join(website, "dist", "plugins", "index.html"), "utf8");
  const island = html.match(/<astro-island\b[^>]*component-export="PluginsCatalog"[^>]*>/)?.[0];
  assert.ok(island, "plugin catalog must be hydrated");
  assert.doesNotMatch(island, /&quot;readme&quot;:/);
});

test("relative URL rewriting does not leak into local rendering", () => {
  renderResourceMarkdown("[Remote](./guide.md)", urls);
  assert.throws(() => renderResourceMarkdown("[Remote](./guide.md)", {
    ...urls,
    linkBaseUrl: "invalid URL",
  }));
  assert.match(renderResourceMarkdown("[Local](./guide.md)").markdownHtml, /href="\.\/guide.md"/);
  assert.match(
    renderResourceMarkdown('<img src="./image.png" srcset="./image-2x.png 2x">').markdownHtml,
    /srcset="\.\/image-2x\.png 2x"/,
  );
  assert.match(finalizePluginReadme('<div style="color:red"><style>body { color: red; }</style>Local</div>'), /style="color:red"|<style>/);
  assert.match(renderResourceMarkdown("---\ntitle: Plugin\n---\n## Body", urls).markdownHtml, /Body/);
  assert.throws(() => renderResourceMarkdown("---\ntitle: [\n---\n# Broken", urls));
});

test("local README loading still uses the same renderer", () => {
  const data = JSON.parse(fs.readFileSync(path.join(website, "public", "data", "plugins.json"), "utf8"));
  const item = data.items.find((entry) => !entry.external && entry.readmeFile);
  assert.ok(readResourceMarkdown(item.readmeFile).markdownHtml);
});

test("generated external pages render remote READMEs or the source fallback", () => {
  const data = JSON.parse(fs.readFileSync(path.join(website, "public", "data", "plugins.json"), "utf8"));
  const remote = data.items.filter((item) => item.external && item.readme);
  assert.ok(remote.length > 1, "README support must cover more than Excel MCP");
  for (const item of data.items.filter((item) => item.external)) {
    const html = fs.readFileSync(path.join(website, "dist", "plugin", item.id, "index.html"), "utf8");
    assert.match(html, /Review the source before installing/);
    if (item.readme) {
      assert.match(item.readme.rawUrl, /^https:\/\/raw\.githubusercontent\.com\//);
      const renderedHtml = renderPluginReadme(item.readme.markdown, {
        linkBaseUrl: item.readme.sourceUrl,
        imageBaseUrl: item.readme.rawUrl,
      });
      if (renderedHtml.trim()) {
        assert.ok(!html.includes("A README could not be loaded."), item.id);
        const paragraph = renderedHtml.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/)?.[0];
        if (paragraph) assert.ok(html.includes(paragraph), `${item.id}: upstream README content missing`);
      } else {
        assert.ok(html.includes("A README could not be loaded."), item.id);
      }
    } else {
      assert.ok(html.includes("A README could not be loaded."), item.id);
    }
  }
});
