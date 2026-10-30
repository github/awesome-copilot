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

// Runs inside the sandbox with a hard timeout so a parser regression fails the test instead of hanging it.
function boundedHtml(source) {
  sandbox.input = source;
  return runInNewContext("window.MarkdownPreview.toHtml(input)", sandbox, { timeout: 3000 });
}

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

test("list items containing line separators render instead of hanging the parser", () => {
  assert.match(boundedHtml("- first\u2028second"), /<ul><li>first\u2028second<\/li><\/ul>/);
  assert.match(boundedHtml("1. hello\u2029world\n2. next"), /<ol><li>hello\u2029world<\/li><li>next<\/li><\/ol>/);
});

test("emphasis rules never rewrite link destinations", () => {
  const html = boundedHtml("[source](https://github.com/o/r/blob/main/__init__.py) and [**b**](https://e.com/a_b_c) __bold__");
  assert.match(html, /href="https:\/\/github.com\/o\/r\/blob\/main\/__init__.py"/);
  assert.match(html, /href="https:\/\/e.com\/a_b_c"[^>]*><strong>b<\/strong><\/a>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.ok(!html.includes('href="https://github.com/o/r/blob/main/<strong>'));
});

test("placeholder control characters in the source cannot forge markup", () => {
  const html = boundedHtml("text \u00010\u0001 \u00000\u0000 \u0002");
  assert.ok(!html.includes("undefined"));
  assert.ok(!html.includes("</a>"));
});

test("code spans follow exact backtick-run matching and stay linear on unmatched runs", () => {
  assert.match(boundedHtml("a `x` b ``y ` z`` c"), /<code>x<\/code>.*<code>y ` z<\/code>/);
  assert.match(boundedHtml("a ``not closed `x`"), /``not closed <code>x<\/code>/);
  const started = Date.now();
  const html = boundedHtml(`text ${"`".repeat(200_000)}`);
  assert.ok(Date.now() - started < 1500, "long unmatched backtick runs stay fast");
  assert.ok(html.startsWith("<p>text "));
});