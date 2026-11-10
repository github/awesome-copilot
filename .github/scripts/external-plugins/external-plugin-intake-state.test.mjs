import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyExternalPluginIntakeEvaluation,
  markExternalPluginIntakeAwaitingReview,
  syncExternalPluginIntakeLabels,
} from "./external-plugin-intake-state.mjs";

function mockGitHub(currentLabels) {
  const labels = new Set(currentLabels);
  const operations = [];
  return {
    labels,
    operations,
    async paginate() {
      return [...labels].map((name) => ({ name }));
    },
    rest: {
      issues: {
        listLabelsOnIssue() {},
        async addLabels({ labels: addedLabels }) {
          operations.push(["add", addedLabels]);
          for (const name of addedLabels) labels.add(name);
        },
        async removeLabel({ name }) {
          operations.push(["remove", name]);
          labels.delete(name);
        },
        async listComments() {
          return { data: [] };
        },
        async createComment() {},
      },
    },
  };
}

test("a fresh intake evaluation clears the manual override label", async () => {
  const github = mockGitHub([
    "external-plugin",
    "ready-for-review",
    "first party",
    "intake-manually-overridden",
  ]);

  await applyExternalPluginIntakeEvaluation({
    github,
    owner: "github",
    repo: "awesome-copilot",
    issueNumber: 1,
    evaluation: {
      intakeState: "ready-for-review",
      reviewSignals: { repository: { ownershipLabel: "first party" } },
      commentMarker: "<!-- external-plugin-intake -->",
      commentBody: "Intake result",
    },
  });

  assert.deepEqual(github.labels, new Set(["external-plugin", "ready-for-review", "first party"]));
});

for (const state of ["ready-for-review", "requires-submitter-fixes", "awaiting-review", "rejected"]) {
  for (const ownershipLabel of ["first party", "third party", null, undefined]) {
    test(`intake syncs ${ownershipLabel ?? "no ownership label"} in ${state} state`, async () => {
      const github = mockGitHub(["external-plugin", "first party", "third party", "unrelated"]);
      const { desiredLabels } = await applyExternalPluginIntakeEvaluation({
        github,
        owner: "github",
        repo: "awesome-copilot",
        issueNumber: 1,
        evaluation: {
          intakeState: state,
          isCanvasPlugin: true,
          reviewSignals: { repository: { ownershipLabel } },
          commentMarker: "<!-- external-plugin-intake -->",
          commentBody: "Intake result",
        },
      });

      const expected = ["external-plugin", state, "external-plugin-canvas"];
      if (ownershipLabel) expected.push(ownershipLabel);
      assert.deepEqual(desiredLabels, new Set(expected));
      assert.deepEqual(github.labels, new Set([...expected, "unrelated"]));
    });
  }
}

test("state-only label sync preserves ownership labels for maintainer overrides and PR checks", async () => {
  const github = mockGitHub(["external-plugin", "requires-submitter-fixes", "first party"]);
  await syncExternalPluginIntakeLabels({
    github,
    owner: "github",
    repo: "awesome-copilot",
    issueNumber: 1,
    desiredLabels: new Set(["external-plugin", "ready-for-review"]),
  });

  assert.deepEqual(github.labels, new Set(["external-plugin", "ready-for-review", "first party"]));
});

test("marking intake pending removes stale state labels but preserves ownership, canvas, and unrelated labels", async () => {
  const github = mockGitHub([
    "external-plugin",
    "external-plugin-canvas",
    "first party",
    "ready-for-review",
    "requires-submitter-fixes",
    "rejected",
    "unrelated",
  ]);

  await markExternalPluginIntakeAwaitingReview({
    github,
    owner: "github",
    repo: "awesome-copilot",
    issueNumber: 1,
  });

  assert.deepEqual(
    github.labels,
    new Set(["external-plugin", "external-plugin-canvas", "first party", "awaiting-review", "unrelated"]),
  );
  const readyRemoval = github.operations.findIndex(([action, name]) => action === "remove" && name === "ready-for-review");
  const pendingAddition = github.operations.findIndex(
    ([action, labels]) => action === "add" && labels.includes("awaiting-review"),
  );
  assert.ok(pendingAddition >= 0 && readyRemoval > pendingAddition);
});
