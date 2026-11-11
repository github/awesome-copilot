import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ROOT_FOLDER } from "../lib/constants.mjs";
import { generateAgentsData, generateSamplesData } from "./generate-website-data.mjs";

function createAgent(t, toolsField) {
  const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-agents-"));
  t.after(() => fs.rmSync(agentsDir, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(agentsDir, "sample.agent.md"),
    `---\nname: Sample\ndescription: Sample agent\n${toolsField}\n---\n`
  );
  return agentsDir;
}

for (const [name, field, expected] of [
  ["scalar MCP wildcard", "tools: new-relic-mcp-server/*", ["new-relic-mcp-server/*"]],
  ["comma-separated tools", "tools: ' read, new-relic-mcp-server/*, edit, '", ["read", "new-relic-mcp-server/*", "edit"]],
  ["YAML list", "tools:\n  - read\n  - new-relic-mcp-server/*", ["read", "new-relic-mcp-server/*"]],
  ["omitted tools", "", []],
  ["empty list", "tools: []", []],
  ["empty string", "tools: ''", []],
  ["null tools", "tools:", []],
]) {
  test(`generates agent tools and filter facets for ${name}`, (t) => {
    const agentsDir = createAgent(t, field);
    const data = generateAgentsData(new Map(), agentsDir);

    assert.equal(data.items.length, 1);
    assert.deepEqual(data.items[0].tools, expected);
    assert.deepEqual(data.filters.tools, [...expected].sort());
  });
}

for (const field of [
  "tools: false",
  "tools: 42",
  "tools: {read: true}",
  "tools: [read, 42]",
]) {
  test(`reports invalid ${field} with the source filename`, (t) => {
    const agentsDir = createAgent(t, field);

    assert.throws(() => generateAgentsData(new Map(), agentsDir), {
      name: "TypeError",
      message: /Invalid tools in .*sample\.agent\.md: expected a string or an array of strings/,
    });
  });
}

function createCookbook(t, exampleFiles = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "website-cookbook-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const recipe = { id: "pr-visualization", name: "PR Visualization", description: "Visualize pull requests" };
  const cookbook = {
    id: "sample", name: "Sample", description: "Sample cookbook", path: "cookbook/sample",
    languages: [{ id: "java", name: "Java", extension: ".java" }],
    recipes: [recipe],
  };
  fs.mkdirSync(path.join(root, "cookbook/sample/java"), { recursive: true });
  fs.writeFileSync(path.join(root, "cookbook/cookbook.yml"), JSON.stringify({ cookbooks: [cookbook] }));
  fs.writeFileSync(path.join(root, "cookbook/sample/java/pr-visualization.md"), "# PR Visualization\n");
  for (const filename of exampleFiles) {
    const target = path.join(root, "cookbook/sample/java/recipe", filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "example\n");
  }
  return root;
}

for (const filename of ["pr-visualization.java", "pr_visualization.java", "PRVisualization.java"]) {
  test(`preserves the actual example filename ${filename}`, (t) => {
    const root = createCookbook(t, [filename, "unrelated.java", "PRVisualization.txt"]);
    const variant = generateSamplesData(root).cookbooks[0].recipes[0].variants.java;
    assert.equal(variant.example, `cookbook/sample/java/recipe/${filename}`);
  });
}

test("prefers the exact example filename over normalized aliases", (t) => {
  const root = createCookbook(t, ["pr-visualization.java", "PRVisualization.java"]);
  const variant = generateSamplesData(root).cookbooks[0].recipes[0].variants.java;
  assert.equal(variant.example, "cookbook/sample/java/recipe/pr-visualization.java");
});

test("reports ambiguous example filenames instead of selecting one", (t) => {
  const root = createCookbook(t, ["pr_visualization.java", "PRVisualization.java"]);
  assert.throws(() => generateSamplesData(root), /Ambiguous.*pr-visualization.*java/);
});

test("keeps valid file symlinks and ignores broken links and directories", (t) => {
  const root = createCookbook(t, ["example.source"]);
  const recipeDir = path.join(root, "cookbook/sample/java/recipe");
  fs.mkdirSync(path.join(recipeDir, "PRVisualization.java"));
  try {
    fs.symlinkSync(path.join(recipeDir, "example.source"), path.join(recipeDir, "pr-visualization.java"));
    fs.symlinkSync(path.join(recipeDir, "absent.source"), path.join(recipeDir, "pr_visualization.java"));
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    t.skip(`File symlinks unavailable: ${error.code}`);
    return;
  }
  const variant = generateSamplesData(root).cookbooks[0].recipes[0].variants.java;
  assert.equal(variant.example, "cookbook/sample/java/recipe/pr-visualization.java");
  fs.unlinkSync(path.join(recipeDir, "pr-visualization.java"));
  assert.equal(generateSamplesData(root).cookbooks[0].recipes[0].variants.java.example, null);
});

test("ignores unrelated cyclic links when resolving code examples", (t) => {
  const root = createCookbook(t, ["pr-visualization.java"]);
  const loop = path.join(root, "cookbook/sample/java/recipe/unrelated.java");
  try {
    fs.symlinkSync(loop, loop, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    t.skip(`Directory links unavailable: ${error.code}`);
    return;
  }
  const variant = generateSamplesData(root).cookbooks[0].recipes[0].variants.java;
  assert.equal(variant.example, "cookbook/sample/java/recipe/pr-visualization.java");
});

test("keeps document-only variants and does not resolve external recipe files", (t) => {
  const root = createCookbook(t);
  assert.equal(generateSamplesData(root).cookbooks[0].recipes[0].variants.java.example, null);
  const manifestPath = path.join(root, "cookbook/cookbook.yml");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  Object.assign(manifest.cookbooks[0].recipes[0], { external: true, url: "https://example.com/recipe" });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const recipe = generateSamplesData(root).cookbooks[0].recipes[0];
  assert.equal(recipe.external, true);
  assert.equal(recipe.url, "https://example.com/recipe");
  assert.deepEqual(recipe.variants, {});
});

test("publishes every Copilot SDK recipe document with its existing code example", () => {
  const root = ROOT_FOLDER;
  const cookbook = generateSamplesData(root).cookbooks.find((entry) => entry.id === "copilot-sdk");
  const cookbookPath = path.join(root, cookbook.path);
  const documents = fs.readdirSync(cookbookPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((language) => fs.readdirSync(path.join(cookbookPath, language.name))
      .filter((filename) => filename.endsWith(".md") && filename !== "README.md")
      .map((filename) => `${cookbook.path}/${language.name}/${filename}`));
  const variants = cookbook.recipes.flatMap((recipe) => Object.values(recipe.variants));
  assert.deepEqual(variants.map((variant) => variant.doc).sort(), documents.sort());
  for (const variant of variants) {
    assert.ok(variant.example, `Missing code example for ${variant.doc}`);
    assert.ok(fs.statSync(path.join(root, variant.example)).isFile(), variant.example);
  }
});

test("keeps the cookbook index language list aligned with the manifest", () => {
  const root = ROOT_FOLDER;
  const cookbook = generateSamplesData(root).cookbooks.find((entry) => entry.id === "copilot-sdk");
  const index = fs.readFileSync(path.join(root, "cookbook/README.md"), "utf8");
  const entry = index.split("\n").find((line) => line.includes("](copilot-sdk/)"));
  const advertised = entry.match(/Recipes for (.+)/)[1]
    .split(/,\s*(?:and\s+)?|\s+and\s+/).map((name) => name.trim()).sort();
  const published = cookbook.languages.map((language) => language.name.split(" /")[0].split(" (")[0]).sort();
  assert.deepEqual(advertised, published);
});
