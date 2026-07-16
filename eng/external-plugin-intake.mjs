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
const EXTERNAL_CANVAS_KEYWORD = "canvas";
const EXTERNAL_CANVAS_PREVIEW_PATH = "assets/preview.png";
const EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS = Object.freeze([
  ".github/plugin/plugin.json",
  ".plugin/plugin.json",
  "plugin.json",
]);

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

function hasCanvasKeyword(plugin) {
  return (plugin?.keywords ?? []).some(
    (keyword) => String(keyword).trim().toLowerCase() === EXTERNAL_CANVAS_KEYWORD,
  );
}

function normalizeRepoRelativePath(value) {
  const normalized = stripNoResponse(value);
  if (!normalized || normalized === "/") {
    return "";
  }

  return normalized.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function joinRepoPath(...segments) {
  return segments
    .map((segment) => String(segment ?? "").trim())
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
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

function isGitHubRateLimitResponse(response, data) {
  if (response.status === 429 || response.status === 503) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  const message = String(data?.message ?? "").toLowerCase();
  return (
    response.headers.get("retry-after") !== null ||
    response.headers.get("x-ratelimit-remaining") === "0" ||
    message.includes("rate limit") ||
    message.includes("secondary rate limit")
  );
}

function getGitHubApiErrorReason(response, data) {
  const message = String(data?.message ?? "").toLowerCase();

  if (response.status === 429) {
    return "rate limited";
  }

  if (response.status === 503) {
    if (message.includes("secondary rate limit")) {
      return "secondary rate limited";
    }
    return "service unavailable";
  }

  if (response.status === 403 && isGitHubRateLimitResponse(response, data)) {
    if (message.includes("secondary rate limit")) {
      return "secondary rate limited";
    }
    return "rate limited";
  }

  if (response.status === 0) {
    return "network error";
  }

  return response.statusText || `HTTP ${response.status}`;
}

async function fetchGitHubJson(apiPath, token) {
  try {
    const response = await fetch(`https://api.github.com${apiPath}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "awesome-copilot-external-plugin-intake",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.ok) {
      return { kind: "found", ok: true, status: response.status, data };
    }

    if (response.status === 404) {
      return { kind: "notFound", ok: false, status: 404, data: null };
    }

    return {
      kind: "apiError",
      ok: false,
      status: response.status,
      data,
      reason: getGitHubApiErrorReason(response, data),
    };
  } catch (error) {
    return {
      kind: "apiError",
      ok: false,
      status: 0,
      data: null,
      reason: "network error",
      error,
    };
  }
}

function encodeRepoContentPath(value) {
  return String(value)
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchGitHubFile(repo, filePath, ref, token) {
  const encodedRepo = encodeRepoPath(repo);
  const encodedPath = encodeRepoContentPath(filePath);
  return fetchGitHubJson(
    `/repos/${encodedRepo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    token,
  );
}

function decodeGitHubFileContent(fileResponse) {
  const encodedContent = fileResponse?.data?.content;
  if (!encodedContent || typeof encodedContent !== "string") {
    return null;
  }

  const normalized = encodedContent.replace(/\n/g, "");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeRepoPath(repo) {
  const [owner, name] = String(repo).split("/");
  return `${encodeURIComponent(owner ?? "")}/${encodeURIComponent(name ?? "")}`;
}

async function validateRemoteRepository(repo, { ref, sha }, errors, warnings, token) {
  const encodedRepo = encodeRepoPath(repo);
  const repositoryResponse = await fetchGitHubJson(`/repos/${encodedRepo}`, token);

  if (repositoryResponse.kind === "notFound") {
    errors.push(`submission: GitHub repository "${repo}" was not found`);
    return;
  }

  if (repositoryResponse.kind === "apiError") {
    const statusText = repositoryResponse.status ? `HTTP ${repositoryResponse.status}` : "network error";
    warnings.push(
      `submission: could not verify GitHub repository "${repo}" (${statusText}${repositoryResponse.reason ? ` — ${repositoryResponse.reason}` : ""}); a maintainer should re-run intake`,
    );
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
      const commitResponse = await fetchGitHubJson(`/repos/${encodedRepo}/git/commits/${encodeURIComponent(sha)}`, token);
      if (commitResponse.kind === "notFound") {
        errors.push(`submission: commit "${sha}" was not found in GitHub repository "${repo}"`);
      } else if (commitResponse.kind === "apiError") {
        const statusText = commitResponse.status ? `HTTP ${commitResponse.status}` : "network error";
        warnings.push(
          `submission: could not verify commit "${sha}" in GitHub repository "${repo}" (${statusText}${commitResponse.reason ? ` — ${commitResponse.reason}` : ""}); a maintainer should re-run intake`,
        );
      }
    }

  }

  if (!ref) {
    return;
  }

  if (/^[0-9a-f]{40}$/i.test(ref)) {
    const commitResponse = await fetchGitHubJson(`/repos/${encodedRepo}/git/commits/${encodeURIComponent(ref)}`, token);
    if (commitResponse.kind === "notFound") {
      errors.push(`submission: commit "${ref}" was not found in GitHub repository "${repo}"`);
    } else if (commitResponse.kind === "apiError") {
      const statusText = commitResponse.status ? `HTTP ${commitResponse.status}` : "network error";
      warnings.push(
        `submission: could not verify commit "${ref}" in GitHub repository "${repo}" (${statusText}${commitResponse.reason ? ` — ${commitResponse.reason}` : ""}); a maintainer should re-run intake`,
      );
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

  if (tagResponse.kind === "found") {
    return;
  }

  if (/^[0-9a-f]+$/i.test(ref) && ref.length !== 40) {
    errors.push('submission: commit SHAs in "Ref to review" must use the full 40-character SHA or be submitted in "Commit SHA to review"');
    return;
  }

  if (tagResponse.kind === "notFound") {
    errors.push(`submission: tag "${ref}" was not found in GitHub repository "${repo}"`);
  } else if (tagResponse.kind === "apiError") {
    const statusText = tagResponse.status ? `HTTP ${tagResponse.status}` : "network error";
    warnings.push(
      `submission: could not verify tag "${ref}" in GitHub repository "${repo}" (${statusText}${tagResponse.reason ? ` — ${tagResponse.reason}` : ""}); a maintainer should re-run intake`,
    );
  }
}

async function validateCanvasPluginMetadata(plugin, errors, warnings, token) {
  const repo = plugin?.source?.repo;
  const sha = plugin?.source?.sha;
  const ref = plugin?.source?.ref;
  const releaseLocator = sha || ref;
  const releaseLocatorDescription = sha ? `commit "${sha}"` : `ref "${ref}"`;
  const pluginRoot = normalizeRepoRelativePath(plugin?.source?.path);

  if (!releaseLocator) {
    errors.push('submission: plugins tagged with "canvas" must provide "Ref to review" and/or "Commit SHA to review"');
    return;
  }

  if (!repo) {
    return;
  }

  let manifest = null;
  let manifestPath = null;
  let sawManifestApiError = false;

  const manifestCandidates = EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS.map((relativePath) =>
    joinRepoPath(pluginRoot, relativePath),
  );

  for (const candidatePath of manifestCandidates) {
    const response = await fetchGitHubFile(repo, candidatePath, releaseLocator, token);
    if (response.kind === "notFound") {
      continue;
    }

    if (response.kind === "apiError") {
      sawManifestApiError = true;
      continue;
    }

    if (response.data?.type !== "file") {
      continue;
    }

    const decoded = decodeGitHubFileContent(response);
    if (!decoded) {
      errors.push(`submission: could not decode plugin manifest "${candidatePath}" at ${releaseLocatorDescription}`);
      return;
    }

    try {
      manifest = JSON.parse(decoded);
      manifestPath = candidatePath;
      break;
    } catch (error) {
      errors.push(
        `submission: plugin manifest "${candidatePath}" at ${releaseLocatorDescription} is not valid JSON (${error.message})`,
      );
      return;
    }
  }

  if (!manifest) {
    if (sawManifestApiError) {
      warnings.push(
        `submission: could not verify canvas plugin manifest in GitHub repository "${repo}" at ${releaseLocatorDescription}; a maintainer should re-run intake`,
      );
      return;
    }

    const expectedPaths = manifestCandidates.map((candidatePath) => `"${candidatePath}"`).join(", ");
    errors.push(
      `submission: plugins tagged with "canvas" must include a manifest at one of ${expectedPaths} in ${releaseLocatorDescription}`,
    );
    return;
  }

  if (manifest.logo !== EXTERNAL_CANVAS_PREVIEW_PATH) {
    errors.push(
      `submission: plugins tagged with "canvas" must set "logo" to "${EXTERNAL_CANVAS_PREVIEW_PATH}" in "${manifestPath}"`,
    );
  }

  const previewPath = joinRepoPath(pluginRoot, EXTERNAL_CANVAS_PREVIEW_PATH);
  const previewResponse = await fetchGitHubFile(repo, previewPath, releaseLocator, token);
  if (previewResponse.kind === "notFound") {
    errors.push(
      `submission: plugins tagged with "canvas" must include "${EXTERNAL_CANVAS_PREVIEW_PATH}" at ${releaseLocatorDescription}`,
    );
  } else if (previewResponse.kind === "apiError") {
    warnings.push(
      `submission: could not verify "${EXTERNAL_CANVAS_PREVIEW_PATH}" in GitHub repository "${repo}" at ${releaseLocatorDescription}; a maintainer should re-run intake`,
    );
  } else if (previewResponse.data?.type !== "file") {
    errors.push(
      `submission: "${EXTERNAL_CANVAS_PREVIEW_PATH}" must be a file in ${releaseLocatorDescription}`,
    );
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
    vally_lint_status: "not_run",
    smoke_status: "not_run",
    version_match_status: "not_run",
    failure_class: "none",
    summary: "",
    vally_lint_output: "",
    smoke_output: "",
    version_match_output: "",
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
  const vallyState = qualityResult.vally_lint_status || "not_run";
  const smokeState = qualityResult.smoke_status || "not_run";
  const versionMatchState = qualityResult.version_match_status || "not_run";
  const summaryText = String(qualityResult.summary || "").trim() || "_No quality gate details were provided._";

  const sections = [
    "### Quality gate summary",
    "",
    "| Gate | Status |",
    "|---|---|",
    `| vally lint | ${vallyState} |`,
    `| install smoke test | ${smokeState} |`,
    `| version match | ${versionMatchState} |`,
    "",
    summaryText,
  ];

  const vallyOutput = String(qualityResult.vally_lint_output || "").trim();
  if (vallyOutput) {
    sections.push(
      "",
      "<details>",
      "<summary>vally lint output</summary>",
      "",
      "```text",
      vallyOutput,
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

  const versionMatchOutput = String(qualityResult.version_match_output || "").trim();
  if (versionMatchOutput) {
    sections.push(
      "",
      "<details>",
      "<summary>Version match output</summary>",
      "",
      "```text",
      versionMatchOutput,
      "```",
      "",
      "</details>",
    );
  }

  return sections.join("\n");
}

function getIntakeStateFromQualityResult(baseResult, qualityResult) {
  if (!baseResult.valid) {
    return "requires-submitter-fixes";
  }

  if (qualityResult.failure_class === "submitter_fixes") {
    return "requires-submitter-fixes";
  }

  if (qualityResult.failure_class === "infra") {
    return "awaiting-review";
  }

  return "ready-for-review";
}

function buildMergedIntakeComment(baseResult, qualityResult, runId, owner, repo) {
  if (!baseResult.valid) {
    return baseResult.commentBody;
  }

  const marker = baseResult.commentMarker ?? EXTERNAL_PLUGIN_INTAKE_COMMENT_MARKER;
  const qualitySection = buildQualityGatesCommentSection(qualityResult);
  const runLink = runId && owner && repo ? `_[View workflow run](https://github.com/${owner}/${repo}/actions/runs/${runId})_` : "";

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
    baseResult.plugin?.source?.ref ? `- **Ref:** [\`${baseResult.plugin.source.ref.replaceAll('\`', '\\\`')}\`](https://github.com/${encodeRepoPath(baseResult.plugin.source.repo)}/tree/${encodeURIComponent(baseResult.plugin.source.ref).replaceAll("%2F", "/")})` : undefined,
    baseResult.plugin?.source?.sha ? `- **SHA:** [\`${baseResult.plugin.source.sha.replaceAll('\`', '\\\`')}\`](https://github.com/${encodeRepoPath(baseResult.plugin.source.repo)}/tree/${encodeURIComponent(baseResult.plugin.source.sha).replaceAll("%2F", "/")})` : undefined,
    "",
    qualitySection,
    "",
    "",
    "### Canonical external.json payload",
    "",
    "",
    "```json",
    JSON.stringify(baseResult.plugin ?? {}, null, 2),
    "```",
    baseResult.warnings?.length
      ? ["", "### Warnings", "", ...baseResult.warnings.map((warning) => `- ${warning}`)].join("\n")
      : "",
    runLink ? `\n${runLink}` : "",
  ].join("\n");
}

export function applyQualityGateResult(baseEvaluation, qualityGateResult, runId, owner, repo) {
  const baseResult = typeof baseEvaluation === "string" ? JSON.parse(baseEvaluation) : baseEvaluation;
  const qualityResult = normalizeQualityGateResult(
    typeof qualityGateResult === "string" ? JSON.parse(qualityGateResult) : qualityGateResult,
  );
  const intakeState = getIntakeStateFromQualityResult(baseResult, qualityResult);

  return {
    ...baseResult,
    qualityGates: qualityResult,
    intakeState,
    commentBody: buildMergedIntakeComment(baseResult, qualityResult, runId, owner, repo),
  };
}

export async function evaluateExternalPluginIssue({ issue, token, runId, owner, repo } = {}) {
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
  const isCanvasPlugin = hasCanvasKeyword(parsed.plugin);

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

  if (isCanvasPlugin) {
    await validateCanvasPluginMetadata(parsed.plugin, errors, warnings, token);
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

  const runLink = runId && owner && repo ? `_[View workflow run](https://github.com/${owner}/${repo}/actions/runs/${runId})_` : "";

  const commentBody = valid
    ? [
        marker,
        "## ✅ External plugin intake passed",
        "",
        `This submission passed automated intake validation and is ready for maintainer review.`,
        "",
        `- **Plugin:** ${parsed.plugin.name}`,
        `- **Repository:** ${parsed.plugin.repository}`,
        parsed.plugin.source.ref ? `- **Ref:** [\`${parsed.plugin.source.ref.replaceAll('\`', '\\\`')}\`](https://github.com/${encodeRepoPath(parsed.plugin.source.repo)}/tree/${encodeURIComponent(parsed.plugin.source.ref).replaceAll("%2F", "/")})` : undefined,
        parsed.plugin.source.sha ? `- **SHA:** [\`${parsed.plugin.source.sha.replaceAll('\`', '\\\`')}\`](https://github.com/${encodeRepoPath(parsed.plugin.source.repo)}/tree/${encodeURIComponent(parsed.plugin.source.sha).replaceAll("%2F", "/")})` : undefined,
        `- **Keywords:** ${normalizedKeywords}`,
        "",
        "",
        "### Canonical external.json payload",
        "",
        "",
        payload,
        "",
        "### Reviewer notes",
        "",
        "",
        notes,
        dedupedWarnings.length > 0
          ? ["", "### Warnings", "", ...dedupedWarnings.map((warning) => `- ${warning}`)].join("\n")
          : "",
        runLink ? `\n${runLink}` : "",
      ].join("\n")
    : [
        marker,
        "## ⚠️ External plugin intake requires submitter fixes",
        "",
        "This submission did not pass automated intake validation and cannot move to maintainer review yet.",
        `Edit the issue form to address the fixes below. Intake reruns automatically when the issue is edited, or the issue author/maintainer can comment \`${RERUN_INTAKE_COMMAND}\` to re-run on demand.`,
        "",
        "### Required fixes",
        "",
        ...dedupedErrors.map((error) => `- ${error}`),
        dedupedWarnings.length > 0
          ? ["", "### Warnings", "", ...dedupedWarnings.map((warning) => `- ${warning}`)].join("\n")
          : "",
        runLink ? `\n${runLink}` : "",
      ].join("\n");

  return {
    valid,
    intakeState: valid ? "ready-for-review" : "requires-submitter-fixes",
    markerPresent: parsed.markerPresent,
    errors: dedupedErrors,
    warnings: dedupedWarnings,
    plugin: parsed.plugin,
    isCanvasPlugin,
    commentBody,
    commentMarker: marker,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const eventPath = process.argv[2];
  if (!eventPath) {
    console.error("Usage: node ./eng/external-plugin-intake.mjs <github-event.json> [runId] [owner] [repo]");
    process.exit(1);
  }

  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const runId = process.argv[3];
  const owner = process.argv[4];
  const repo = process.argv[5];
  const result = await evaluateExternalPluginIssue({ issue: event.issue, token: process.env.GITHUB_TOKEN, runId, owner, repo });
  process.stdout.write(JSON.stringify(result));
}
