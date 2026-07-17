import assert from "node:assert/strict";
import test from "node:test";
import { layoutCommitGraph } from "./graph-layout.mjs";

function commit(sha, parents = []) {
  return { sha, parents };
}

test("lays out a linear history in one lane", () => {
  const graph = layoutCommitGraph([
    commit("c", ["b"]),
    commit("b", ["a"]),
    commit("a"),
  ]);
  assert.equal(graph.maxLanes, 1);
  assert.deepEqual(graph.rows.map((row) => row.laneIndex), [0, 0, 0]);
});

test("creates and rejoins a lane for merge parents", () => {
  const graph = layoutCommitGraph([
    commit("merge", ["main", "topic"]),
    commit("topic", ["base"]),
    commit("main", ["base"]),
    commit("base"),
  ]);
  assert.ok(graph.maxLanes >= 2);
  assert.equal(graph.rows[0].transitions.filter((line) => line.kind === "merge-parent").length, 1);
  assert.equal(graph.rows.at(-1).commit.sha, "base");
});

test("keeps independent branch tips in separate lanes", () => {
  const graph = layoutCommitGraph([
    commit("tip-a", ["base"]),
    commit("tip-b", ["base"]),
    commit("base"),
  ]);
  assert.ok(graph.maxLanes >= 2);
  assert.notEqual(graph.rows[0].color, graph.rows[1].color);
});
