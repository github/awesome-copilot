import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildArticleSections,
  stripRedundantHeadingAnchors,
} from "./learning-hub-article.ts";

test("keeps nested headings and callouts inside details and list containers", () => {
  const details = '<details><summary>Optional</summary><h2 id="nested">Nested</h2><div><p>Nested note</p></div><p>End of details</p></details>';
  const list = '<ol><li><p>Step</p><div><p>Nested warning</p></div><img src="/image.webp" alt="Example"><p>End of step</p></li></ol>';
  const sections = buildArticleSections(
    `<h2 id="exercise">Exercise</h2>${details}${list}<div><p>Top-level tip</p></div><h2 id="next">Next</h2><p>Continue</p>`,
    "> [!NOTE]\n> Nested note\n> [!WARNING]\n> Nested warning\n> [!TIP]\n> Top-level tip",
  );
  assert.deepEqual(sections.map((section) => section.id), ["exercise", "next"]);
  const block = sections[0].blocks[0];
  assert.equal(block.type, "html");
  if (block.type === "html") {
    assert.ok(block.html.includes(details));
    assert.ok(block.html.includes(list));
  }
  assert.deepEqual(sections[0].blocks[1], {
    type: "callout", kind: "tip", html: "<p>Top-level tip</p>",
  });
});

test("preserves normal section IDs, callout kinds, and trailing-break behavior", () => {
  const sections = buildArticleSections(
    '<p>Introduction</p><div><p>Note</p></div><h2 id="first">First</h2><p>Body</p><div><p>Warning</p></div><hr>',
    "> [!NOTE]\n> Note\n> [!WARNING]\n> Warning",
  );
  assert.deepEqual(sections.map((section) => section.id), ["introduction", "first"]);
  assert.deepEqual(sections[0].blocks[1], { type: "callout", kind: "note", html: "<p>Note</p>" });
  assert.deepEqual(sections[1].blocks[1], { type: "callout", kind: "caution", html: "<p>Warning</p>" });
  assert.ok(sections[1].blocks[0].type === "html" && !sections[1].blocks[0].html.includes('id="first"'));
  assert.ok(!JSON.stringify(sections).includes("<hr>"));
});

test("removes only empty source anchors that duplicate rendered heading IDs", () => {
  const details = '<details><summary>Optional</summary><h3 id="markdown-fallback">Markdown Fallback</h3><p>Use the fallback.</p></details>';
  const source = `<a id="markdown-fallback"></a><a id="custom-anchor"></a>${details}`;
  assert.equal(
    stripRedundantHeadingAnchors(source),
    `<a id="custom-anchor"></a>${details}`,
  );
});

test("preserves linked anchors, custom attributes, and escaped code samples", () => {
  const html = '<h2 id="same">Same</h2><a id="same" href="/page/">Read more</a><a id="same" class="custom"></a><pre>&lt;a id="same"&gt;&lt;/a&gt;</pre>';
  assert.equal(stripRedundantHeadingAnchors(html), html);
});
