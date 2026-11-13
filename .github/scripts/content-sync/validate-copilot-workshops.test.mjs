import assert from "node:assert/strict";
import { test } from "node:test";
import { adaptSourceBody, mapDestinations, requirePublishedSources, validateWorkshops } from "./validate-copilot-workshops.mjs";
import { workshopRedirects } from "../../../website/src/lib/copilot-workshops-redirects.mjs";

const firstSteps = "learning-hub/copilot-workshops/first-steps/copilot-app/";
const cli = "learning-hub/copilot-workshops/cli/";
const languages = ["", "es-es/", "ja-jp/", "ko-kr/", "pt-br/", "zh-cn/"];
const page = `${cli}1-start.md`;
const check = (options = {}) => validateWorkshops({
  pages: new Map([[page, "Lesson"]]), changed: [page], redirects: {}, ...options,
});

test("accepts only frontmatter and link/image adaptations, preserving wording and order", () => {
  const file = `ja-jp/${firstSteps}13-review.md`;
  const source = "---\nauthors: [source]\n---\n## 作業\n\n[Next][next]\n\n[next]: ../../copilot-cli/#setup\n\n![Image](../../../_images/example.svg)\n\n```md\n[Example](../not-a-lesson/)\n```";
  const expected = "## 作業\n\n[Next][next]\n\n[next]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/#setup\n\n![Image](/images/learning-hub/copilot-workshops/example.svg)\n\n```md\n[Example](../not-a-lesson/)\n```";
  assert.equal(adaptSourceBody(source, file), expected);
  const sources = new Map([[page, "---\nauthors: [upstream]\n---\nWarning first.\n\nPublish next."]]);
  assert.deepEqual(check({ pages: new Map([[page, "---\nauthors: [mirror]\n---\nWarning first.\n\nPublish next."]]), sources }), []);
  assert.match(check({ pages: new Map([[page, "Publish next.\n\nWarning first."]]), sources }).join("\n"), /differs from pinned upstream/);
});

test("rejects real replacement characters and missing source files", () => {
  assert.match(check({ pages: new Map([[page, "作\uFFFD業"]]) }).join("\n"), /U\+FFFD/);
  assert.match(check({ sources: new Map() }).join("\n"), /missing pinned upstream source/);
});

test("blocks remote validation until local source corrections have a published revision", () => {
  assert.throws(() => requirePublishedSources({ pendingUpstream: [{ sha: null }] }), /Unpublished workshop source corrections/);
  assert.doesNotThrow(() => requirePublishedSources({ pendingUpstream: [] }));
});

test("checks reference, inline and image destinations without treating code or reference-label prose as links", () => {
  const text = "[Inline](../missing/)\n[Reference][target]\n[target]: /es-es/learning-hub/copilot-workshops/cli/missing/\n![Image](/images/learning-hub/copilot-workshops/deleted.svg)\n[GitHub CLI][gh-cli](`gh`)\n```md\n[Example](../ignored/)\n```";
  const errors = check({ pages: new Map([[page, text]]) });
  assert.equal(errors.length, 3);
  assert.match(errors.join("\n"), /missing lesson destination/);
  assert.match(errors.join("\n"), /missing image/);
  assert.doesNotMatch(errors.join("\n"), /ignored|`gh`/);
  assert.equal(mapDestinations("[Docs](https://example.com/a_(b))", (url) => url), "[Docs](https://example.com/a_(b))");
  const examples = "`[Inline example](../ignore/)`\n~~~md\n[Fenced](../ignore/)\n~~~~\n";
  assert.equal(mapDestinations(examples, () => { throw new Error("Example must not be rewritten"); }), examples);
});

test("catches newly broken inbound image links on unchanged pages, without blocking old unrelated broken links", () => {
  const image = "/images/learning-hub/copilot-workshops/removed.svg";
  const options = { changed: [], pages: new Map([[page, `![Image](${image})\n[Old](../already-missing/)`]]) };
  assert.deepEqual(check(options), []);
  assert.match(check({ ...options, previousAssets: [image] }).join("\n"), /missing image/);
});

test("requires redirects for removed published routes and rejects shadowed, cyclic or dangling redirects", () => {
  const old = `${cli}0-old.md`;
  assert.match(check({ previous: [old] }).join("\n"), /Removed published route/);
  assert.deepEqual(check({ previous: [old], redirects: { [`/${cli}0-old/`]: `/${cli}1-start/` } }), []);
  for (const redirects of [
    { [`/${cli}1-start/`]: `/${cli}1-start/` },
    { "/old/": "/missing/" },
    { "/old/": "/other/", "/other/": "/old/" },
  ]) assert.match(check({ redirects }).join("\n"), /Invalid or shadowed redirect/);
});

test("preserves all review bookmarks and language-picker destinations with explicit English fallbacks", () => {
  const pages = new Map(languages.map((locale) => [`${locale}${firstSteps}13-review.md`, "Review"]));
  pages.set(`${firstSteps}12-deploy-pages.md`, "Deploy");
  pages.set(`ko-kr/${firstSteps}12-deploy-pages.md`, "Deploy");
  const redirects = Object.fromEntries(Object.entries(workshopRedirects).filter(([from]) => from.includes("/first-steps/")));
  const options = {
    pages, changed: [...pages.keys()],
    previous: languages.map((locale) => `${locale}${firstSteps}12-review.md`),
    redirects,
  };
  assert.deepEqual(check(options), []);
  const withoutSpanish = { ...redirects };
  delete withoutSpanish[`/es-es/${firstSteps}12-deploy-pages/`];
  assert.match(check({ ...options, redirects: withoutSpanish }).join("\n"), /language selector has no destination \/es-es/);
});
