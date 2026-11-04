// Run: node --test website/scripts/search.test.mjs
// Uses the existing Vite/esbuild toolchain to load the production TS adapters.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, sep } from "node:path";
import { build } from "esbuild";
import * as pagefind from "pagefind";

const directory = await mkdtemp(fileURLToPath(new URL(".search-test-", import.meta.url)));
after(async () => {
  await pagefind.close();
  await rm(directory, { recursive: true });
});

async function load(relative, name) {
  const outfile = join(directory, `${name}.mjs`);
  const result = await build({
    entryPoints: [fileURLToPath(new URL(relative, import.meta.url))],
    outfile, bundle: true, write: false, format: "esm", platform: "node",
    packages: "external", define: { "import.meta.env.BASE_URL": '"/"' },
  });
  await writeFile(outfile, result.outputFiles[0].contents);
  return import(pathToFileURL(outfile).href);
}

const { buildSearchIndex, categoryOf, filterSearchItemsByLocale, hrefKey, mergeSearchItems, CATEGORY_LABELS } =
  await load("../src/components/brand/searchIndex.ts", "index");
const { currentSearchLocale, pagefindItem, searchPagefind } =
  await load("../src/components/brand/pagefindSearch.ts", "adapter");
const { prepareSearchHtml, default: pagefindResources } =
  await load("../src/integrations/pagefind-resources.ts", "integration");

const item = (href, category = "Extensions", description = "") => ({
  href, category, title: "Shared name", description,
});

test("canonical URL formatting merges, but case, types, IDs and anchors stay distinct", () => {
  assert.equal(hrefKey("https://awesome-copilot.github.com/skill/%61gent/index.html"), hrefKey("/skill/agent/"));
  assert.equal(hrefKey("/skill//agent/"), hrefKey("/skill/agent"));
  assert.notEqual(hrefKey("/skill/Agent/"), hrefKey("/skill/agent/"));
  assert.notEqual(hrefKey("/skill/a%2Fb/"), hrefKey("/skill/a/b/"));
  assert.notEqual(hrefKey("/skill/agent/#one"), hrefKey("/skill/agent/#two"));
  assert.notEqual(hrefKey("/skills/?page=1"), hrefKey("/skills/?page=2"));
  assert.equal(mergeSearchItems([
    item("/skill/one/"), item("/skill/two/"), item("/plugin/one/"),
  ]).length, 3);
});

test("static duplicates and provider duplicates prefer the rich typed record", () => {
  const rich = item("/extension/pr-artifact-explorer/", "Extensions", "Explore PR artifacts");
  const merged = mergeSearchItems([
    item("/extension/pr-artifact-explorer", "Pages"),
    rich, { ...rich },
    { ...item("/ko-kr/extension/pr-artifact-explorer/"), canonicalHref: rich.href },
  ]);
  assert.deepEqual(merged, [rich]);
});

test("actual translations and unknown locale identities are never guessed away", () => {
  const path = "/learning-hub/copilot-workshops/app/";
  assert.equal(mergeSearchItems([
    { ...item(path, "Articles"), locale: "en" },
    { ...item(`/es-es${path}`, "Articles"), locale: "es-es" },
    item(`/ja-jp${path}`, "Articles"),
  ]).length, 3);
  assert.equal(categoryOf(`/es-es${path}`), "Articles");
  assert.equal(categoryOf("/site/ko-kr/extension/example/", "/site/"), "Extensions");
  assert.equal(categoryOf("/extensions/"), "Pages");
});

test("canvas aliases share one record and preserve extension routes and IDs", () => {
  const index = buildSearchIndex([{
    type: "extension", id: "my-canvas", title: "Canvas", description: "Canvas extension",
  }], "/site/");
  assert.equal(index.filter((entry) => entry.href === "/site/extensions/").length, 1);
  assert.equal(index.find((entry) => entry.href === "/site/extensions/").title, "Extensions");
  assert.equal(index.at(-1).href, "/site/extension/my-canvas/");
  assert.equal(index.at(-1).category, "Extensions");
  assert.equal(CATEGORY_LABELS.Extensions, "Extensions");
});

test("locale scope uses content metadata, canonical fallbacks, and the configured base path", () => {
  const english = item("/site/skill/example/", "Skills");
  const spanish = { ...item("/site/es-es/learning-hub/example/", "Articles"), locale: "es-es" };
  const japanese = item("/site/ja-jp/learning-hub/example/", "Articles");
  const fallback = { ...item("/site/ko-kr/extension/example/"), locale: "en" };
  const canonicalFallback = { ...item("/site/es-es/skill/other/"), canonicalHref: "/site/skill/other/" };
  const all = [english, spanish, japanese, fallback, canonicalFallback];
  assert.deepEqual(filterSearchItemsByLocale(all, "en", "/site/"), [english, fallback, canonicalFallback]);
  assert.deepEqual(filterSearchItemsByLocale(all, "ES-es", "/site/"), [spanish]);
  assert.deepEqual(filterSearchItemsByLocale(all, "ja-jp", "/site/"), [japanese]);
  assert.deepEqual(filterSearchItemsByLocale(all, "ko-kr", "/site/"), []);
});

test("Pagefind uses canonical metadata and actual content locale, retaining exact resource titles", () => {
  const hit = pagefindItem({
    url: "/ko-kr/extension/pr-artifact-explorer/",
    meta: {
      canonical: "/extension/pr-artifact-explorer/", locale: "en",
      resourceTitle: "My title — Plugin", description: "Curated context",
    },
    excerpt: "<mark>Uncurated</mark>",
  });
  assert.equal(hit.href, "/extension/pr-artifact-explorer/");
  assert.equal(hit.title, "My title — Plugin");
  assert.equal(hit.description, "Curated context");
  assert.equal(hit.category, "Extensions");
  assert.equal(hit.locale, "en");
  assert.equal(pagefindItem({ url: "/skill/x/", excerpt: "<mark>Text</mark>" }).description.trim(), "Text");
});

test("Extension and legacy Canvas suffixes retain the Extensions display category", () => {
  for (const suffix of ["Extension", "Canvas"]) {
    const hit = pagefindItem({
      url: "/extension/pr-artifact-explorer/",
      meta: { title: `Artifact Explorer — ${suffix}` },
    });
    assert.equal(hit.title, "Artifact Explorer");
    assert.equal(hit.category, "Extensions");
    assert.equal(CATEGORY_LABELS[hit.category], "Extensions");
    assert.equal(hit.href, "/extension/pr-artifact-explorer/");
  }
  const catalog = pagefindItem({
    url: "/extensions/",
    meta: { title: "Extensions" },
  });
  assert.equal(catalog.title, "Extensions");
  assert.equal(catalog.category, "Pages");
  assert.equal(catalog.href, "/extensions/");
});

test("Pagefind result limits apply after dedupe and locale filtering", async () => {
  const fixture = join(directory, "pagefind");
  await mkdir(fixture);
  await writeFile(join(fixture, "pagefind.js"), `
    export async function search(term) {
      if (term === "locale-miss" || term === "duplicates") {
        globalThis.pagefindInspections = 0;
        return { results: Array.from({ length: 200 }, () => ({
          data: async () => {
            globalThis.pagefindInspections++;
            return { url: "/skill/one/", meta: { locale: "en" } };
          }
        })) };
      }
      if (term === "localized") {
        return { results: [
          { url: "/skill/english/", meta: { locale: "en" } },
          { url: "/es-es/skill/english-fallback/", meta: { locale: "en" } },
          ...Array.from({ length: 3 }, () => ({
            url: "/es-es/learning-hub/one/", meta: { locale: "es-es" }
          })),
          { url: "/es-es/learning-hub/two/", meta: { locale: "es-es" } }
        ].map(entry => ({ data: async () => entry })) };
      }
      return { results: [
        ...Array.from({ length: 5 }, () => "/skill/one/"), "/plugin/two/"
      ].map(url => ({ data: async () => ({ url, meta: { title: "Same name" } }) })) };
    }
  `);
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = {};
  globalThis.document = { documentElement: { dataset: {
    basePath: `${pathToFileURL(directory).href}/`,
  } } };
  try {
    const items = await searchPagefind("same", 2);
    assert.deepEqual(items.map((item) => item.href), ["/skill/one/", "/plugin/two/"]);
    globalThis.document.documentElement.lang = "es-es";
    assert.equal(currentSearchLocale(), "es-es");
    const localized = await searchPagefind("localized", 2);
    assert.deepEqual(localized.map((item) => item.href), [
      "/es-es/learning-hub/one/", "/es-es/learning-hub/two/",
    ]);
    assert.deepEqual(await searchPagefind("locale-miss", 7, "es-es"), []);
    assert.equal(globalThis.pagefindInspections, 48, "Locale misses stop at the scan budget, even mid-batch");
    assert.equal((await searchPagefind("duplicates", 7, "en")).length, 1);
    assert.equal(globalThis.pagefindInspections, 48, "Duplicate hits cannot cause unbounded scanning");
    globalThis.document.documentElement.lang = "en";
    assert.equal(currentSearchLocale(), "en");
  } finally {
    delete globalThis.pagefindInspections;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

const html = (canonical, lang = "en") => `<!doctype html><html lang="${lang}">
  <head><title>Shared name</title>
  <link rel="canonical" href="https://awesome-copilot.github.com${canonical}">
  <meta name="description" content="Useful &amp; specific context"></head>
  <body data-pagefind-body><header>Shared chrome sentinel</header>
  <main><h1>Shared name</h1><p>Resource content</p></main>
  <footer>Shared footer sentinel</footer></body></html>`;
const options = { locales: ["en", "ko-kr", "es-es"], defaultLocale: "en" };

test("built fallback resource AND self-canonical learning rewrites are excluded", () => {
  assert.equal(prepareSearchHtml(
    html("/extension/pr-artifact-explorer/"),
    "/ko-kr/extension/pr-artifact-explorer/", options,
  ), null);
  assert.equal(prepareSearchHtml(
    html("/ko-kr/learning-hub/github-copilot-app/"),
    "/ko-kr/learning-hub/github-copilot-app/", options,
  ), null);
  assert.equal(prepareSearchHtml(
    html("/site/ko-kr/learning-hub/github-copilot-app/"),
    "/site/ko-kr/learning-hub/github-copilot-app/", { ...options, base: "/site/" },
  ), null);
});

test("real translated HTML keeps its own canonical identity and language", () => {
  const url = "/es-es/learning-hub/copilot-workshops/app/";
  const prepared = prepareSearchHtml(html(url, "es-es"), url, options);
  assert.equal(prepared.url, url);
  assert.match(prepared.content, /data-pagefind-meta="locale\[content\]" content="es-es"/);
  assert.match(prepared.content, /<main data-pagefind-body>/);
  assert.doesNotMatch(prepared.content, /<body data-pagefind-body/);
  assert.throws(() => prepareSearchHtml("<html></html>", "/", options), /Missing content language/);
  assert.equal(prepareSearchHtml('<meta name="robots" content="noindex">', "/hooks/", options), null);
});

test("real Pagefind parses enriched HTML metadata without adding a duplicate custom record", async () => {
  const url = "/extension/pr-artifact-explorer/";
  const record = {
    type: "extension", id: "pr-artifact-explorer", title: 'Artifact "Explorer"',
    description: "Useful & specific context", path: "extensions/pr-artifact-explorer",
    searchText: "unique-keyword",
  };
  const prepared = prepareSearchHtml(html(url), url, options, record);
  const response = await pagefind.createIndex();
  assert.deepEqual(response.errors, []);
  const result = await response.index.addHTMLFile(prepared);
  assert.deepEqual(result.errors, []);
  assert.equal(result.file.meta.resourceTitle, record.title);
  assert.equal(result.file.meta.description, record.description);
  assert.equal(result.file.meta.canonical, url);
  assert.equal(result.file.meta.locale, "en");
  await response.index.deleteIndex();
});

for (const state of ["missing", "invalid JSON"]) {
  test(`integration fails explicitly when generated search data is ${state}`, async () => {
    const fixture = await mkdtemp(join(directory, "missing-data-"));
    if (state === "invalid JSON") {
      await mkdir(join(fixture, "data"));
      await writeFile(join(fixture, "data", "search-index.json"), "{invalid");
    }
    const messages = [];
    const logger = {
      info: (message) => messages.push(message),
      warn: (message) => messages.push(message),
      error: (message) => messages.push(message),
      fork() { return this; },
    };
    const integration = pagefindResources();
    await assert.rejects(
      integration.hooks["astro:build:done"]({
        dir: pathToFileURL(`${fixture}${sep}`), logger,
      }),
      (error) => {
        assert.match(error.message, /Failed to build Pagefind search index/);
        if (state === "missing") {
          assert.equal(error.cause.code, "ENOENT");
          assert.match(error.cause.path, /search-index\.json$/);
        } else {
          assert.ok(error.cause instanceof SyntaxError);
        }
        return true;
      },
    );
    assert.ok(messages.every((message) => !/skipping|Added 0|Search index built/.test(message)));
  });
}
