export const EXTERNAL_PLUGIN_INTAKE_LABELS = Object.freeze({
  "external-plugin": {
    color: "FEF2C0",
    description: "Public external plugin submission",
  },
  "external-plugin-canvas": {
    color: "1D76DB",
    description: "External plugin submission includes a canvas extension",
  },
  "awaiting-review": {
    color: "FBCA04",
    description: "Submission is waiting for automated intake validation",
  },
  "ready-for-review": {
    color: "0E8A16",
    description: "Submission passed intake validation and is ready for maintainer review",
  },
  "requires-submitter-fixes": {
    color: "D93F0B",
    description: "Submission has quality-gate findings that submitter must fix before maintainer review",
  },
  approved: {
    color: "1D76DB",
    description: "Submission was approved by a maintainer",
  },
  rejected: {
    color: "B60205",
    description: "Submission was rejected by a maintainer",
  },
});

const EXTERNAL_PLUGIN_INTAKE_SYNC_LABELS = Object.freeze([
  "external-plugin",
  "external-plugin-canvas",
  "awaiting-review",
  "ready-for-review",
  "requires-submitter-fixes",
  "rejected",
]);

async function removeLabel({ github, owner, repo, issueNumber, name }) {
  try {
    await github.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name,
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
}

export async function syncExternalPluginIntakeLabels({ github, owner, repo, issueNumber, desiredLabels }) {
  const currentLabels = await github.paginate(github.rest.issues.listLabelsOnIssue, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const currentManagedLabels = currentLabels
    .map((label) => label.name)
    .filter((name) => EXTERNAL_PLUGIN_INTAKE_SYNC_LABELS.includes(name));

  const labelsToAdd = [...desiredLabels].filter((name) => !currentManagedLabels.includes(name));
  const labelsToRemove = currentManagedLabels.filter((name) => !desiredLabels.has(name));

  if (labelsToAdd.length > 0) {
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: labelsToAdd,
    });
  }

  for (const name of labelsToRemove) {
    await removeLabel({ github, owner, repo, issueNumber, name });
  }
}

export async function upsertExternalPluginIntakeComment({
  github,
  owner,
  repo,
  issueNumber,
  marker,
  body,
}) {
  const { data: comments } = await github.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const existingComment = comments.find(
    (comment) => comment.user?.login === "github-actions[bot]" && comment.body?.includes(marker)
  );

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
    return;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function applyExternalPluginIntakeEvaluation({
  github,
  owner,
  repo,
  issueNumber,
  evaluation,
}) {
  const state = evaluation.intakeState ?? (evaluation.valid ? "ready-for-review" : "requires-submitter-fixes");
  const desiredLabelsByState = {
    "ready-for-review": new Set(["external-plugin", "ready-for-review"]),
    "requires-submitter-fixes": new Set(["external-plugin", "requires-submitter-fixes"]),
    "awaiting-review": new Set(["external-plugin", "awaiting-review"]),
    rejected: new Set(["external-plugin", "rejected"]),
  };
  const desiredLabels = desiredLabelsByState[state] ?? desiredLabelsByState.rejected;
  if (evaluation.isCanvasPlugin) {
    desiredLabels.add("external-plugin-canvas");
  }

  await syncExternalPluginIntakeLabels({
    github,
    owner,
    repo,
    issueNumber,
    desiredLabels,
  });

  await upsertExternalPluginIntakeComment({
    github,
    owner,
    repo,
    issueNumber,
    marker: evaluation.commentMarker,
    body: evaluation.commentBody,
  });

  return { desiredLabels };
}
