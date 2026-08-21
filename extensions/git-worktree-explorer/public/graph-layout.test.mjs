import assert from "node:assert/strict";
import test from "node:test";
import { LANE_COLORS, layoutCommitGraph } from "./graph-layout.mjs";

function luminance(hex) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("lane colors meet 3:1 non-text contrast on light and dark backgrounds", () => {
  for (const color of LANE_COLORS) {
    assert.ok(contrast(color, "#ffffff") >= 3, `${color} on light: ${contrast(color, "#ffffff").toFixed(2)}`);
    assert.ok(contrast(color, "#0d1117") >= 3, `${color} on dark: ${contrast(color, "#0d1117").toFixed(2)}`);
  }
});

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
