import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  codeownersFor,
  evaluateAutoMerge,
  frontMatterFilesFor,
  globToRegExp,
  loadAutoMergeConfig,
  normalizeConfig,
  normalizeLogin,
  parseArgs,
  parseCodeowners,
  recordedAuthorFromPluginJson,
  recordedAuthorsFromFrontMatter,
  renderSummary,
  resourceKeyFor,
} from "./auto-merge.mjs";

const config = normalizeConfig({
  enabled: true,
  eligibility: {
    generated_output: { authors: ["github-actions"], paths: ["README.md", "docs/README.*.md", ".github/plugin/marketplace.json"] },
    resource_owner: { min_merged_prs: 1 },
  },
});

function makePr(overrides = {}) {
  return {
    id: "PR_1",
    number: 42,
    state: "OPEN",
    isDraft: false,
    author: { login: "alice", type: "User" },
    baseRefName: "main",
    headRefOid: "abc123",
    mergeable: "MERGEABLE",
    mergeStateStatus: "BLOCKED",
    reviewDecision: "APPROVED",
    autoMergeRequest: null,
    labels: ["merge-risk:low", "approved"],
    reviews: [{ state: "APPROVED", author: "maintainer", authorType: "User", authorCanPush: true }],
    reviewThreads: [{ isResolved: true }],
    checks: [{ name: "submission-gate", status: "COMPLETED", conclusion: "SUCCESS", completedAt: "2025-01-01T00:00:00Z" }],
    files: [{ path: "skills/foo/SKILL.md", status: "modified" }],
    behindBy: 0,
    ...overrides,
  };
}

const ownerContext = {
  codeowners: parseCodeowners("* @aaronpowell\n/skills/foo/ @alice\n"),
  recordedAuthors: new Map(),
  authorMergedPrCount: 3,
};

function condition(result, id) {
  return result.conditions.find((item) => item.id === id);
}

test("arms when every condition holds for an established resource owner", () => {
  const result = evaluateAutoMerge(makePr(), config, ownerContext);
  assert.equal(result.conditionsOk, true);
  assert.equal(result.eligible, true);
  assert.equal(result.action, "arm");
});

test("each failing condition prevents arming", () => {
  const cases = [
    [{ labels: ["approved"] }, "label:merge-risk:low"],
    [{ labels: ["merge-risk:low", "do-not-merge"] }, "no-blocking-labels"],
    [{ labels: ["merge-risk:low", "merge-risk:high"] }, "no-blocking-labels"],
    [{ checks: [] }, "check:submission-gate"],
    [{ checks: [{ name: "submission-gate", status: "COMPLETED", conclusion: "FAILURE" }] }, "check:submission-gate"],
    [{ reviews: [] }, "approvals"],
    [{ reviews: [{ state: "APPROVED", author: "alice", authorType: "User", authorCanPush: true }] }, "approvals"],
    [{ reviews: [{ state: "APPROVED", author: "helper", authorType: "Bot", authorCanPush: true }] }, "approvals"],
    [{ reviews: [{ state: "APPROVED", author: "drive-by", authorType: "User", authorCanPush: false }] }, "approvals"],
    [{ reviews: [...makePr().reviews, { state: "CHANGES_REQUESTED", author: "bob", authorType: "User", authorCanPush: true }] }, "approvals"],
    [{ reviewThreads: [{ isResolved: false }] }, "threads-resolved"],
    [{ behindBy: 2 }, "up-to-date"],
    [{ mergeStateStatus: "BEHIND" }, "up-to-date"],
    [{ mergeable: "CONFLICTING" }, "up-to-date"],
    [{ behindBy: null }, "up-to-date"],
    [{ isDraft: true }, "open"],
    [{ baseRefName: "staged" }, "base-branch"],
  ];
  for (const [overrides, id] of cases) {
    const result = evaluateAutoMerge(makePr(overrides), config, ownerContext);
    assert.equal(result.action, "none", `expected no action for ${JSON.stringify(overrides)}`);
    assert.equal(condition(result, id).ok, false, `expected ${id} to fail for ${JSON.stringify(overrides)}`);
  }
});

test("uses the most recent run of a required check", () => {
  const checks = [
    { name: "submission-gate", status: "COMPLETED", conclusion: "FAILURE", completedAt: "2025-01-01T00:00:00Z" },
    { name: "submission-gate", status: "COMPLETED", conclusion: "SUCCESS", completedAt: "2025-01-02T00:00:00Z" },
  ];
  assert.equal(evaluateAutoMerge(makePr({ checks }), config, ownerContext).action, "arm");
});

test("resource owner rule rejects non-owners, additions, and new contributors", () => {
  const notOwner = evaluateAutoMerge(makePr({ author: { login: "mallory", type: "User" } }), config, ownerContext);
  assert.equal(notOwner.eligible, false);
  assert.equal(notOwner.action, "none");

  const catchAllOnly = evaluateAutoMerge(
    makePr({ author: { login: "aaronpowell", type: "User" } }),
    config,
    ownerContext,
  );
  assert.equal(catchAllOnly.eligible, false, "the * catch-all rule does not make someone a resource owner");

  const added = evaluateAutoMerge(makePr({ files: [{ path: "skills/foo/new.md", status: "added" }] }), config, ownerContext);
  assert.equal(added.eligible, false);

  const outside = evaluateAutoMerge(makePr({ files: [{ path: "eng/build.mjs", status: "modified" }] }), config, ownerContext);
  assert.equal(outside.eligible, false);

  const external = evaluateAutoMerge(
    makePr({ files: [...makePr().files, { path: "plugins/external.json", status: "modified" }] }),
    config,
    ownerContext,
  );
  assert.equal(external.eligible, false, "external plugin catalog changes always need a maintainer");

  const withGenerated = evaluateAutoMerge(
    makePr({ files: [...makePr().files, { path: "docs/README.skills.md", status: "modified" }] }),
    config,
    ownerContext,
  );
  assert.equal(withGenerated.eligible, true, "regenerated docs may accompany an owner update");

  const onlyGenerated = evaluateAutoMerge(makePr({ files: [{ path: "README.md", status: "modified" }] }), config, ownerContext);
  assert.equal(onlyGenerated.eligibility.find((rule) => rule.rule === "resource_owner").ok, false);

  const newcomer = evaluateAutoMerge(makePr(), config, { ...ownerContext, authorMergedPrCount: 0 });
  assert.equal(newcomer.eligible, false);
});

test("recorded author makes a contributor an owner", () => {
  const context = {
    codeowners: parseCodeowners("* @aaronpowell\n"),
    recordedAuthors: new Map([["skills/foo", ["alice"]]]),
    authorMergedPrCount: 5,
  };
  assert.equal(evaluateAutoMerge(makePr(), config, context).action, "arm");
});

test("generated output rule accepts automation PRs that only touch generated files", () => {
  const pr = makePr({
    author: { login: "github-actions", type: "Bot" },
    files: [
      { path: "README.md", status: "modified" },
      { path: "docs/README.skills.md", status: "modified" },
    ],
  });
  const result = evaluateAutoMerge(pr, config, { codeowners: [], recordedAuthors: new Map() });
  assert.equal(result.eligibility.find((rule) => rule.rule === "generated_output").ok, true);
  assert.equal(result.action, "arm");

  const mixed = evaluateAutoMerge(
    makePr({ author: pr.author, files: [...pr.files, { path: "eng/update-readme.mjs", status: "modified" }] }),
    config,
    { codeowners: [], recordedAuthors: new Map() },
  );
  assert.equal(mixed.eligible, false);
});

test("disarms only auto-merge it armed, except for blocking labels", () => {
  const autoMergeRequest = { enabledAt: "2025-01-01T00:00:00Z", mergeMethod: "SQUASH" };
  const failing = { reviewThreads: [{ isResolved: false }], autoMergeRequest };

  const ours = evaluateAutoMerge(makePr({ ...failing, labels: ["merge-risk:low", "auto-merge-armed"] }), config, ownerContext);
  assert.equal(ours.action, "disarm");

  const manual = evaluateAutoMerge(makePr(failing), config, ownerContext);
  assert.equal(manual.action, "leave");

  const blocked = evaluateAutoMerge(makePr({ autoMergeRequest, labels: ["merge-risk:low", "do-not-merge"] }), config, ownerContext);
  assert.equal(blocked.action, "disarm");

  const keep = evaluateAutoMerge(makePr({ autoMergeRequest, labels: ["merge-risk:low", "auto-merge-armed"] }), config, ownerContext);
  assert.equal(keep.action, "keep");

  const stale = evaluateAutoMerge(makePr({ labels: ["merge-risk:low", "auto-merge-armed"], reviews: [] }), config, ownerContext);
  assert.equal(stale.action, "clear-label");
});

test("CODEOWNERS matching follows GitHub semantics (last match wins)", () => {
  const rules = parseCodeowners([
    "# comment",
    "* @default",
    "/plugins/napkin/ @dvelton",
    "*.md @docs-team # trailing comment",
    "/skills/napkin/ @dvelton",
  ].join("\n"));
  assert.deepEqual(codeownersFor(rules, "plugins/napkin/plugin.json").owners, ["@dvelton"]);
  assert.deepEqual(codeownersFor(rules, "plugins/napkin/README.md").owners, ["@docs-team"]);
  assert.deepEqual(codeownersFor(rules, "skills/napkin/SKILL.md").owners, ["@dvelton"]);
  assert.deepEqual(codeownersFor(rules, "eng/x.mjs").owners, ["@default"]);
  assert.equal(codeownersFor(rules, "plugins/napkin-extra/plugin.json").pattern, "*");
});

test("glob, login, and resource helpers", () => {
  assert.ok(globToRegExp("docs/README.*.md").test("docs/README.skills.md"));
  assert.ok(!globToRegExp("docs/README.*.md").test("docs/sub/README.skills.md"));
  assert.ok(globToRegExp("website/**").test("website/src/data/a.json"));
  assert.ok(globToRegExp("**/SKILL.md").test("SKILL.md"));
  assert.equal(normalizeLogin("@GitHub-Actions[bot]"), "github-actions");
  assert.equal(normalizeLogin("app/github-actions"), "github-actions");
  assert.equal(resourceKeyFor("skills/foo/references/a.md", ["skills"]), "skills/foo");
  assert.equal(resourceKeyFor("agents/x.agent.md", ["agents"]), "agents/x.agent.md");
  assert.equal(resourceKeyFor("README.md", ["skills"]), null);
  assert.deepEqual(recordedAuthorFromPluginJson({ author: { name: "Dan Velton", url: "https://github.com/dvelton" } }), ["dvelton"]);
  assert.deepEqual(recordedAuthorFromPluginJson({ author: { name: "octocat" } }), ["octocat"]);
  assert.deepEqual(recordedAuthorFromPluginJson({}), []);
});

test("config loading applies defaults and stays disabled unless explicitly enabled", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-merge-test-"));
  try {
    const file = path.join(dir, "auto-merge.yml");
    fs.writeFileSync(file, "enabled: 'yes'\nmin_approvals: 2\nblocking_labels: [hold]\n");
    const loaded = loadAutoMergeConfig(file);
    assert.equal(loaded.enabled, false);
    assert.equal(loaded.min_approvals, 2);
    assert.deepEqual(loaded.blocking_labels, ["hold"]);
    assert.deepEqual(loaded.required_checks, ["submission-gate"]);
    assert.equal(loadAutoMergeConfig(path.join(dir, "missing.yml")).enabled, false);
    fs.writeFileSync(file, "merge_method: octopus\n");
    assert.throws(() => loadAutoMergeConfig(file), /merge_method/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("repository config is valid and disabled by default", () => {
  const loaded = loadAutoMergeConfig();
  assert.equal(loaded.enabled, false);
  assert.ok(loaded.required_checks.includes("submission-gate"));
  assert.ok(loaded.required_labels.includes("merge-risk:low"));
  for (const label of ["do-not-merge", "requires-submitter-fixes", "merge-risk:medium", "merge-risk:high"]) {
    assert.ok(loaded.blocking_labels.includes(label), `${label} should block auto-merge`);
  }
});

test("CLI arguments and summary rendering", () => {
  const options = parseArgs(["--pr", "1,2", "--sha", "abc", "--all", "--dry-run", "--repo", "o/r"]);
  assert.deepEqual(options.prs, [1, 2]);
  assert.deepEqual(options.shas, ["abc"]);
  assert.equal(options.all, true);
  assert.equal(options.dryRun, true);
  assert.throws(() => parseArgs(["--pr", "x"]), /positive integers/);
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);

  const result = evaluateAutoMerge(makePr(), config, ownerContext);
  const summary = renderSummary([{ number: 42, result, outcome: "would-arm" }, { number: 7, error: "boom" }], { ...config, enabled: false }, { dryRun: false });
  assert.match(summary, /dry run/);
  assert.match(summary, /#42 \| arm \| would-arm/);
  assert.match(summary, /#7 \| error/);
});

test("CODEOWNERS team entries count only for verified active members", () => {
  const codeowners = parseCodeowners("* @aaronpowell\n/skills/foo/ @github/foo-maintainers\n");
  const base = { codeowners, recordedAuthors: new Map(), authorMergedPrCount: 3 };
  assert.equal(evaluateAutoMerge(makePr(), config, base).eligible, false, "unknown membership fails closed");
  const member = { ...base, teamMemberships: new Map([["@github/foo-maintainers", true]]) };
  assert.equal(evaluateAutoMerge(makePr(), config, member).action, "arm");
  const nonMember = { ...base, teamMemberships: new Map([["@github/foo-maintainers", false]]) };
  assert.equal(evaluateAutoMerge(makePr(), config, nonMember).eligible, false);
});

test("front matter authors are read from GitHub handles, URLs, and github fields only", () => {
  const markdown = [
    "---",
    "name: foo",
    "author: '@Alice'",
    "authors:",
    "  - github: bob",
    "  - url: https://github.com/carol",
    "  - Some Person",
    "metadata:",
    "  author: https://github.com/dave/",
    "---",
    "# Body",
  ].join("\n");
  assert.deepEqual(recordedAuthorsFromFrontMatter(markdown).sort(), ["alice", "bob", "carol", "dave"]);
  assert.deepEqual(recordedAuthorsFromFrontMatter("# No front matter"), []);
  assert.deepEqual(recordedAuthorsFromFrontMatter("---\n: [bad\n---\n"), []);
  assert.deepEqual(frontMatterFilesFor("skills/foo"), ["skills/foo/SKILL.md"]);
  assert.deepEqual(frontMatterFilesFor("hooks/bar"), ["hooks/bar/README.md"]);
  assert.deepEqual(frontMatterFilesFor("agents/x.agent.md"), ["agents/x.agent.md"]);
  assert.deepEqual(frontMatterFilesFor("plugins/foo"), []);
});