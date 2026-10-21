import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = { window: {} };
runInNewContext(await readFile(join(here, "assets", "markdown-preview.js"), "utf8"), sandbox);
const { toHtml } = sandbox.window.MarkdownPreview;

test("markdown renders common blocks and inline formatting", () => {
  const html = toHtml("# Title\n\nHello **bold** and `code`.\n\n- a\n- b\n\n1. one\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nx<1\n```");
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<ol><li>one<\/li><\/ol>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /x&lt;1/);
});

test("markdown never emits raw HTML or unsafe links", () => {
  const html = toHtml('<script>alert(1)</script>\n\n[x](javascript:alert(1)) ![i](http://a/b.png) [ok](https://example.com)');
  assert.ok(!html.includes("<script"));
  assert.ok(!/href="javascript/i.test(html));
  assert.ok(!html.includes("<img"));
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
});
