#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";
import { readExternalPlugins, validateExternalPlugin } from "./external-plugin-validation.mjs";

export const ISSUE_FORM_MARKER = "<!-- external-plugin-submission -->";
export const EXTERNAL_PLUGIN_INTAKE_COMMENT_MARKER = "<!-- external-plugin-intake -->";
export const RERUN_INTAKE_COMMAND = "/rerun-intake";
export const MARK_READY_FOR_REVIEW_COMMAND = "/mark-ready-for-review";
const RERUN_INTAKE_COMMAND_PATTERN = new RegExp(
  `^\\s*${RERUN_INTAKE_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
  "m",
);
const MARK_READY_FOR_REVIEW_COMMAND_PATTERN = new RegExp(
  `^\\s*${MARK_READY_FOR_REVIEW_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
  "m",
);
const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");

// Each entry is a Set of equivalent checklist item texts (new + legacy aliases).
// A submission passes if the checked items contain at least one text from each Set.
const REQUIRED_CHECKLIST_ITEMS = [
  new Set(["The plugin lives in a public GitHub repository."]),
  new Set([
    "The ref and/or sha I provided is immutable (release tag and/or full 40-character commit SHA), not a branch.",
    // Legacy text used in the original issue template
    "The ref I provided is an immutable release tag or full 40-character commit SHA, not a branch.",
  ]),
  new Set(["This submission follows this repository's contribution, security, and responsible AI policies."]),
  new Set(["This plugin is not already listed in the Awesome Copilot marketplace."]),
];

const FIELD_TITLES = Object.freeze({
  pluginName: "Plugin name",
  shortDescription: "Short description",
  githubRepository: "GitHub repository",
  pluginPath: "Plugin path inside the repository",
  immutableRef: "Ref to review",
  immutableSha: "Commit SHA to review",
  version: "Version",
  license: "License identifier",
  authorName: "Author name",
  authorUrl: "Author URL",
  homepageUrl: "Homepage URL",
  keywords: "Keywords",
  additionalNotes: "Additional notes for reviewers",
  submissionChecklist: "Submission checklist",
});

// Legacy field title used in the original issue template (before the ref/sha split)
const LEGACY_FIELD_TITLES = Object.freeze({
  immutableRef: "Immutable ref to review",
});

function normalizeMultilineText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

function stripNoResponse(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeMultilineText(value).trim();
  if (!normalized || normalized === "_No response_") {
    return undefined;
  }

  return normalized;
}

function parseIssueFormSections(body) {
  const normalized = normalizeMultilineText(body);
  const sections = new Map();
  const matches = [...normalized.matchAll(/^###\s+(.+)$/gm)];

  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index][1].trim();
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
    const content = normalized.slice(start, end).trim();
    sections.set(heading, content);
  }

  return sections;
}

function normalizeGitHubRepo(value) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const urlMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  return trimmed.replace(/^github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
}

function parseKeywords(value) {
  const normalized = stripNoResponse(value);
  if (!normalized) {
    return undefined;
  }

  const keywords = normalized
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return keywords.length > 0 ? keywords : undefined;
}

function parseChecklist(value) {
  const checked = new Set();
  const normalized = normalizeMultilineText(value);

  for (const match of normalized.matchAll(/^- \[(x|X)\] (.+)$/gm)) {
    checked.add(match[2].trim());
  }

  return checked;
}

function readLocalPluginNames() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    return [];
  }

  return fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function toSubmissionError(message) {
  return message.replace(/^external\.json\[0\]:\s*/, "submission: ");
}

async function fetchGitHubJson(apiPath, token) {
  const response = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "awesome-copilot-external-plugin-intake",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 404) {
    return { ok: false, status: 404, data: null };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function encodeRepoPath(repo) {
  const [owner, name] = String(repo).split("/");
  return `${encodeURIComponent(owner ?? "")}/${encodeURIComponent(name ?? "")}`;
}

async function validateRemoteRepository(repo, { ref, sha }, errors, warnings, token) {
  const encodedRepo = encodeRepoPath(repo);
  const repositoryResponse = await fetchGitHubJson(`/repos/${encodedRepo}`, token);

  if (!repositoryResponse.ok) {
    if (repositoryResponse.status === 404) {
      errors.push(`submission: GitHub repository "${repo}" was not found`);
    } else {
      errors.push(`submission: could not inspect GitHub repository "${repo}" (HTTP ${repositoryResponse.status})`);
    }
    return;
  }

  if (repositoryResponse.data?.private) {
    errors.push(`submission: GitHub repository "${repo}" must be public`);
  }

  if (repositoryResponse.data?.archived) {
    warnings.push(`submission: GitHub repository "${repo}" is archived`);
  }

  if (sha) {
    if (/^[0-9a-f]{40}$/i.test(sha)) {
      const commitResponse = await fetchGitHubJson(`/repos/${encodedRepo}/commits/${encodeURIComponent(sha)}`, token);
      if (!commitResponse.ok) {
        errors.push(`submission: commit "${sha}" was not found in GitHub repository "${repo}"`);
      }
    }
  }

  if (!ref) {
    return;
  }

  if (/^[0-9a-f]{40}$/i.test(ref)) {
    const commitResponse = await fetchGitHubJson(`/repos/${encodedRepo}/commits/${encodeURIComponent(ref)}`, token);
    if (!commitResponse.ok) {
      errors.push(`submission: commit "${ref}" was not found in GitHub repository "${repo}"`);
    }
    return;
  }

  if (ref.startsWith("refs/heads/") || ["main", "master", "develop", "development", "dev", "trunk"].includes(ref)) {
    return;
  }

  if (ref.startsWith("refs/") && !ref.startsWith("refs/tags/")) {
    return;
  }

  const tagName = ref.startsWith("refs/tags/") ? ref.slice("refs/tags/".length) : ref;
  const tagResponse = await fetchGitHubJson(`/repos/${encodedRepo}/git/ref/tags/${encodeURIComponent(tagName)}`, token);

  if (tagResponse.ok) {
    return;
  }

  if (/^[0-9a-f]+$/i.test(ref) && ref.length !== 40) {
    errors.push('submission: commit SHAs in "Ref to review" must use the full 40-character SHA or be submitted in "Commit SHA to review"');
    return;
  }

  if (!tagResponse.ok) {
    errors.push(`submission: tag "${ref}" was not found in GitHub repository "${repo}"`);
  }
}

export function parseExternalPluginIssueBody(body) {
  const sections = parseIssueFormSections(body);
  const errors = [];

  function requiredField(title) {
    const value = stripNoResponse(sections.get(title));
    if (!value) {
      errors.push(`submission: "${title}" is required`);
    }
    return value;
  }

  const pluginName = requiredField(FIELD_TITLES.pluginName);
  const shortDescription = requiredField(FIELD_TITLES.shortDescription);
  const repoInput = normalizeGitHubRepo(requiredField(FIELD_TITLES.githubRepository));
  // Support both the current field title and the legacy title used before the ref/sha split
  const immutableRef = stripNoResponse(
    sections.get(FIELD_TITLES.immutableRef) ?? sections.get(LEGACY_FIELD_TITLES.immutableRef),
  );
  const immutableSha = stripNoResponse(sections.get(FIELD_TITLES.immutableSha));
  const version = requiredField(FIELD_TITLES.version);
  const license = requiredField(FIELD_TITLES.license);
  const authorName = requiredField(FIELD_TITLES.authorName);

  const pluginPath = stripNoResponse(sections.get(FIELD_TITLES.pluginPath));
  const authorUrl = stripNoResponse(sections.get(FIELD_TITLES.authorUrl));
  const homepageUrl = stripNoResponse(sections.get(FIELD_TITLES.homepageUrl));
  const keywords = parseKeywords(sections.get(FIELD_TITLES.keywords));
  const additionalNotes = stripNoResponse(sections.get(FIELD_TITLES.additionalNotes));
  const checkedItems = parseChecklist(sections.get(FIELD_TITLES.submissionChecklist));

  if (!immutableRef && !immutableSha) {
    errors.push(`submission: one of "${FIELD_TITLES.immutableRef}" or "${FIELD_TITLES.immutableSha}" is required`);
  }

  for (const equivalents of REQUIRED_CHECKLIST_ITEMS) {
    let isChecked = false;
    for (const text of equivalents) {
      if (checkedItems.has(text)) {
        isChecked = true;
        break;
      }
    }
    if (!isChecked) {
      // Report using the canonical (first) text in each equivalents Set
      const [canonical] = equivalents;
      errors.push(`submission: checklist item must be checked: "${canonical}"`);
    }
  }

  const plugin = {
    name: pluginName,
    description: shortDescription,
    version,
    author: {
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    repository: repoInput ? `https://github.com/${repoInput}` : undefined,
    ...(homepageUrl ? { homepage: homepageUrl } : {}),
    ...(license ? { license } : {}),
    ...(keywords ? { keywords } : {}),
    source: {
      source: "github",
      repo: repoInput,
      ...(pluginPath ? { path: pluginPath } : {}),
      ...(immutableRef ? { ref: immutableRef } : {}),
      ...(immutableSha ? { sha: immutableSha } : {}),
    },
  };

  return {
    markerPresent: normalizeMultilineText(body).includes(ISSUE_FORM_MARKER),
    errors,
    plugin,
    additionalNotes,
  };
}

export function parseRerunIntakeCommand(body) {
  return RERUN_INTAKE_COMMAND_PATTERN.test(String(body ?? ""));
}

export function parseMarkReadyForReviewCommand(body) {
  const text = String(body ?? "");
  if (!MARK_READY_FOR_REVIEW_COMMAND_PATTERN.test(text)) {
    return undefined;
  }

  const commandLine = text.split(/\r?\n/).find((line) => MARK_READY_FOR_REVIEW_COMMAND_PATTERN.test(line));
  const reason = commandLine?.replace(MARK_READY_FOR_REVIEW_COMMAND_PATTERN, "").trim();

  return {
    command: MARK_READY_FOR_REVIEW_COMMAND,
    reason: reason || undefined,
  };
}

function normalizeQualityGateResult(rawResult) {
  const defaults = {
    overall_status: "not_run",
    skill_validator_status: "not_run",
    smoke_status: "not_run",
    failure_class: "none",
    summary: "",
    skill_validator_output: "",
    smoke_output: "",
  };

  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) {
    return defaults;
  }

  return {
    ...defaults,
    ...rawResult,
  };
}

function buildQualityGatesCommentSection(qualityResult) {
  const skillState = qualityResult.skill_validator_status || "not_run";
  const smokeState = qualityResult.smoke_status || "not_run";
  const summaryText = String(qualityResult.summary || "").trim() || "_No quality gate details were provided._";

  const sections = [
    "### Quality gate summary",
    "",
    "| Gate | Status |",
    "|---|---|",
    `| skill-validator | ${skillState} |`,
    `| install smoke test | ${smokeState} |`,
    "",
    summaryText,
  ];

  const skillOutput = String(qualityResult.skill_validator_output || "").trim();
  if (skillOutput) {
    sections.push(
      "",
      "<details>",
      "<summary>skill-validator output</summary>",
      "",
      "```text",
      skillOutput,
      "```",
      "",
      "</details>",
    );
  }

  const smokeOutput = String(qualityResult.smoke_output || "").trim();
  if (smokeOutput) {
    sections.push(
      "",
      "<details>",
      "<summary>Install smoke test output</summary>",
      "",
      "```text",
      smokeOutput,
      "```",
      "",
      "</details>",
    );
  }

  return sections.join("\n");
}

function getIntakeStateFromQualityResult(baseResult, qualityResult) {
  if (!baseResult.valid) {
    return "rejected";
  }

  if (qualityResult.failure_class === "submitter_fixes") {
    return "requires-submitter-fixes";
  }

  if (qualityResult.failure_class === "infra") {
    return "awaiting-review";
  }

  return "ready-for-review";
}

function buildMergedIntakeComment(baseResult, qualityResult) {
  if (!baseResult.valid) {
    return baseResult.commentBody;
  }

  const marker = baseResult.commentMarker ?? EXTERNAL_PLUGIN_INTAKE_COMMENT_MARKER;
  const qualitySection = buildQualityGatesCommentSection(qualityResult);

  const intro =
    qualityResult.failure_class === "submitter_fixes"
      ? "## ⚠️ External plugin intake requires submitter fixes"
      : qualityResult.failure_class === "infra"
        ? "## ⚠️ External plugin intake could not complete quality checks"
        : "## ✅ External plugin intake passed";

  const statusLine =
    qualityResult.failure_class === "submitter_fixes"
      ? "This submission passed metadata validation, but quality gates found issues that must be fixed before it can move to maintainer review. Update the issue details or source plugin and then comment `/rerun-intake`."
      : qualityResult.failure_class === "infra"
        ? "This submission passed metadata validation, but the automated quality checks hit an infrastructure issue. A maintainer should rerun intake or use the explicit override command after review."
        : "This submission passed automated intake validation and quality checks and is ready for maintainer review.";

  return [
    marker,
    intro,
    "",
    statusLine,
    "",
    `- **Plugin:** ${baseResult.plugin?.name ?? "unknown"}`,
    `- **Repository:** ${baseResult.plugin?.repository ?? "unknown"}`,
    baseResult.plugin?.source?.ref ? `- **Ref:** ${baseResult.plugin.source.ref}` : undefined,
    baseResult.plugin?.source?.sha ? `- **SHA:** ${baseResult.plugin.source.sha}` : undefined,
    "",
    qualitySection,
    "",
    "### Canonical external.json payload",
    "",
    "```json",
    JSON.stringify(baseResult.plugin ?? {}, null, 2),
    "```",
    baseResult.warnings?.length
      ? ["", "### Warnings", "", ...baseResult.warnings.map((warning) => `- ${warning}`)].join("\n")
      : "",
  ].filter(Boolean).join("\n");
}

export function applyQualityGateResult(baseEvaluation, qualityGateResult) {
  const baseResult = typeof baseEvaluation === "string" ? JSON.parse(baseEvaluation) : baseEvaluation;
  const qualityResult = normalizeQualityGateResult(
    typeof qualityGateResult === "string" ? JSON.parse(qualityGateResult) : qualityGateResult,
  );
  const intakeState = getIntakeStateFromQualityResult(baseResult, qualityResult);

  return {
    ...baseResult,
    qualityGates: qualityResult,
    intakeState,
    commentBody: buildMergedIntakeComment(baseResult, qualityResult),
  };
}

export async function evaluateExternalPluginIssue({ issue, token } = {}) {
  const issueBody = issue?.body ?? "";
  const parsed = parseExternalPluginIssueBody(issueBody);
  const errors = [...parsed.errors];
  const warnings = [];

  const localPluginNames = readLocalPluginNames();
  const { plugins: existingExternalPlugins } = readExternalPlugins({ policy: "marketplace" });
  const duplicateNames = [
    ...localPluginNames,
    ...existingExternalPlugins.map((plugin) => plugin.name).filter(Boolean),
  ];

  const validationResult = validateExternalPlugin(parsed.plugin, 0, { policy: "publicSubmission" });
  errors.push(...validationResult.errors.map(toSubmissionError));
  warnings.push(...validationResult.warnings.map(toSubmissionError));

  if (parsed.plugin?.name) {
    const matchingName = duplicateNames.find(
      (name) => String(name).toLowerCase() === String(parsed.plugin.name).toLowerCase(),
    );
    if (matchingName) {
      errors.push(`submission: plugin name "${parsed.plugin.name}" conflicts with existing plugin "${matchingName}"`);
    }
  }

  if (parsed.plugin?.source?.repo && (parsed.plugin?.source?.ref || parsed.plugin?.source?.sha)) {
    await validateRemoteRepository(parsed.plugin.source.repo, parsed.plugin.source, errors, warnings, token);
  }

  const dedupedErrors = [...new Set(errors)];
  const dedupedWarnings = [...new Set(warnings)];
  const valid = dedupedErrors.length === 0;
  const marker = EXTERNAL_PLUGIN_INTAKE_COMMENT_MARKER;
  const normalizedKeywords = parsed.plugin?.keywords?.length ? parsed.plugin.keywords.join(", ") : "_None provided_";
  const notes = parsed.additionalNotes ?? "_No additional notes provided._";
  const payload = parsed.plugin
    ? [
        "```json",
        JSON.stringify(parsed.plugin, null, 2),
        "```",
      ].join("\n")
    : "```json\n{}\n```";

  const commentBody = valid
    ? [
        marker,
        "## ✅ External plugin intake passed",
        "",
        `This submission passed automated intake validation and is ready for maintainer review.`,
        "",
        `- **Plugin:** ${parsed.plugin.name}`,
        `- **Repository:** ${parsed.plugin.repository}`,
        parsed.plugin.source.ref ? `- **Ref:** ${parsed.plugin.source.ref}` : undefined,
        parsed.plugin.source.sha ? `- **SHA:** ${parsed.plugin.source.sha}` : undefined,
        `- **Keywords:** ${normalizedKeywords}`,
        "",
        "### Canonical external.json payload",
        "",
        payload,
        "",
        "### Reviewer notes",
        "",
        notes,
        dedupedWarnings.length > 0
          ? ["", "### Warnings", "", ...dedupedWarnings.map((warning) => `- ${warning}`)].join("\n")
          : "",
      ].filter(Boolean).join("\n")
    : [
        marker,
        "## ❌ External plugin intake failed",
        "",
        "This submission did not pass automated intake validation, so the issue has been closed.",
        `Edit the issue form to address the fixes below, then have the issue author or a maintainer comment \`${RERUN_INTAKE_COMMAND}\` to re-run intake for this closed submission.`,
        "",
        "### Required fixes",
        "",
        ...dedupedErrors.map((error) => `- ${error}`),
        dedupedWarnings.length > 0
          ? ["", "### Warnings", "", ...dedupedWarnings.map((warning) => `- ${warning}`)].join("\n")
          : "",
      ].filter(Boolean).join("\n");

  return {
    valid,
    intakeState: valid ? "ready-for-review" : "rejected",
    markerPresent: parsed.markerPresent,
    errors: dedupedErrors,
    warnings: dedupedWarnings,
    plugin: parsed.plugin,
    commentBody,
    commentMarker: marker,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const eventPath = process.argv[2];
  if (!eventPath) {
    console.error("Usage: node ./eng/external-plugin-intake.mjs <github-event.json>");
    process.exit(1);
  }

  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const result = await evaluateExternalPluginIssue({ issue: event.issue, token: process.env.GITHUB_TOKEN });
  process.stdout.write(JSON.stringify(result));
}
