const COLORS = [
  "#2f81f7",
  "#f778ba",
  "#d29922",
  "#3fb950",
  "#a371f7",
  "#db6d28",
  "#39c5cf",
  "#f85149",
];

function nextColor(index) {
  return COLORS[index % COLORS.length];
}

export function layoutCommitGraph(commits) {
  let lanes = [];
  let colorIndex = 0;
  let maxLanes = 1;

  const rows = commits.map((commit) => {
    let laneIndex = lanes.findIndex((lane) => lane.sha === commit.sha);
    if (laneIndex === -1) {
      lanes.push({ sha: commit.sha, color: nextColor(colorIndex++) });
      laneIndex = lanes.length - 1;
    }

    const before = lanes.map((lane) => ({ ...lane }));
    const current = before[laneIndex];
    const after = lanes.map((lane) => ({ ...lane }));
    const firstParent = commit.parents[0] || null;

    if (!firstParent) {
      after.splice(laneIndex, 1);
    } else {
      const existingFirstParent = after.findIndex((lane, index) =>
        index !== laneIndex && lane.sha === firstParent
      );
      if (existingFirstParent >= 0) {
        after.splice(laneIndex, 1);
      } else {
        after[laneIndex] = { sha: firstParent, color: current.color };
      }
    }

    for (const parent of commit.parents.slice(1)) {
      if (after.some((lane) => lane.sha === parent)) continue;
      const insertAt = Math.min(laneIndex + 1, after.length);
      after.splice(insertAt, 0, { sha: parent, color: nextColor(colorIndex++) });
    }

    const transitions = [];
    before.forEach((lane, index) => {
      if (index === laneIndex) return;
      const target = after.findIndex((candidate) => candidate.sha === lane.sha);
      if (target >= 0) {
        transitions.push({ from: index, to: target, color: lane.color, kind: "pass" });
      }
    });

    commit.parents.forEach((parent, parentIndex) => {
      const target = after.findIndex((lane) => lane.sha === parent);
      if (target >= 0) {
        transitions.push({
          from: laneIndex,
          to: target,
          color: parentIndex === 0 ? current.color : after[target].color,
          kind: parentIndex === 0 ? "first-parent" : "merge-parent",
        });
      }
    });

    maxLanes = Math.max(maxLanes, before.length, after.length);
    lanes = after;
    return {
      commit,
      laneIndex,
      color: current.color,
      transitions,
      lanesBefore: before.length,
      lanesAfter: after.length,
    };
  });

  return { rows, maxLanes };
}
