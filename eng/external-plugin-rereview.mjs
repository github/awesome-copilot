#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EXTERNAL_PLUGINS_FILE, readExternalPlugins } from "./external-plugin-validation.mjs";
import { parseExternalPluginIssueBody } from "./external-plugin-intake.mjs";

export const REREVIEW_REPORT_MARKER = "<!-- external-plugin-rereview-report -->";

export const REREVIEW_LABELS = Object.freeze({
  due: "re-review-due",
  followUp: "re-review-follow-up",
  removed: "removed",
});

export const REREVIEW_COMMANDS = Object.freeze({
  keep: "/re-review-keep",
  needsChanges: "/re-review-needs-changes",
  remove: "/re-review-remove",
});

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRepositoryUrl(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
}

function normalizePathValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function stripIssueTitlePrefix(title) {
  return String(title ?? "")
    .trim()
    .replace(/^\[\s*external plugin\s*\]\s*:\s*/i, "")
    .replace(/^(external plugin(?: submission)?|public external plugin)(?:\s*[:-]\s*|\s+)/i, "")
    .trim();
}

function firstMatch(body, patterns) {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function fallbackSubmissionData(issue) {
  const body = String(issue?.body ?? "");
  const title = stripIssueTitlePrefix(issue?.title);
  const sourceRepo = firstMatch(body, [
    /https:\/\/github\.com\/([^/\s]+\/[^/\s)]+)/i,
    /\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/,
  ]);

  return {
    pluginName: title || undefined,
    sourceRepo: sourceRepo ? normalizeRepositoryUrl(sourceRepo) : undefined,
    repository: sourceRepo ? `https://github.com/${normalizeRepositoryUrl(sourceRepo)}` : undefined,
  };
}

export function extractSubmissionData(issue) {
  const parsed = parseExternalPluginIssueBody(issue?.body ?? "");
  const fallback = fallbackSubmissionData(issue);
  const plugin = parsed.plugin ?? {};

  return {
    pluginName: plugin.name ?? fallback.pluginName,
    sourceRepo: plugin.source?.repo ?? fallback.sourceRepo,
    sourcePath: plugin.source?.path,
    repository: plugin.repository ?? fallback.repository,
    ref: plugin.source?.ref,
  };
}

function pluginMatchesSubmission(plugin, submission) {
  const pluginName = normalizeValue(plugin?.name);
  const submissionName = normalizeValue(submission.pluginName);
  const pluginRepo = normalizeValue(plugin?.source?.repo);
  const submissionRepo = normalizeValue(submission.sourceRepo);
  const pluginPath = normalizePathValue(plugin?.source?.path);
  const submissionPath = normalizePathValue(submission.sourcePath);
  const pluginRepository = normalizeRepositoryUrl(plugin?.repository);
  const submissionRepository = normalizeRepositoryUrl(submission.repository);

  const nameMatch = pluginName && submissionName && pluginName === submissionName;
  const repoMatch = pluginRepo && submissionRepo && pluginRepo === submissionRepo;
  const repositoryMatch = pluginRepository && submissionRepository && pluginRepository === submissionRepository;
  const pathProvided = Boolean(submissionPath);
  const pathMatch = pluginPath === submissionPath;

  if (nameMatch && pathProvided) {
    return pathMatch && (repoMatch || repositoryMatch || !submissionRepo);
  }

  if (nameMatch && (repoMatch || repositoryMatch || !submissionRepo)) {
    return true;
  }

  if ((repoMatch || repositoryMatch) && pathProvided) {
    return pathMatch && (!submissionName || nameMatch);
  }

  if ((repoMatch || repositoryMatch) && submissionName && nameMatch) {
    return true;
  }

  return false;
}

export function matchExternalPluginForIssue(issue, plugins) {
  const submission = extractSubmissionData(issue);
  const exactMatch = plugins.find((plugin) => pluginMatchesSubmission(plugin, submission));
  if (exactMatch) {
    return {
      plugin: exactMatch,
      submission,
      matchReason: "exact",
    };
  }

  const byName = submission.pluginName
    ? plugins.find((plugin) => normalizeValue(plugin?.name) === normalizeValue(submission.pluginName))
    : undefined;
  if (byName) {
    return {
      plugin: byName,
      submission,
      matchReason: "name",
    };
  }

  const repoMatches = submission.sourceRepo
    ? plugins.filter((plugin) => normalizeValue(plugin?.source?.repo) === normalizeValue(submission.sourceRepo))
    : [];
  if (repoMatches.length === 1) {
    return {
      plugin: repoMatches[0],
      submission,
      matchReason: "repo",
    };
  }

  return {
    plugin: undefined,
    submission,
    matchReason: "none",
  };
}

export function parseRereviewCommand(body) {
  const match = String(body ?? "").match(/(?:^|\n)\s*\/re-review-(keep|needs-changes|remove)(?=\s|$)/i);
  if (!match) {
    return undefined;
  }

  switch (match[1].toLowerCase()) {
    case "keep":
      return "keep";
    case "needs-changes":
      return "needs-changes";
    case "remove":
      return "remove";
    default:
      return undefined;
  }
}

export function slugifyPluginName(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "external-plugin";
}

export function removePluginFromExternalJson({ pluginName, sourceRepo, filePath = EXTERNAL_PLUGINS_FILE } = {}) {
  const { plugins, errors } = readExternalPlugins({ filePath, policy: "marketplace" });
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const normalizedPluginName = normalizeValue(pluginName);
  const normalizedSourceRepo = normalizeValue(sourceRepo);
  const matchIndex = plugins.findIndex((plugin) => {
    const nameMatches = normalizedPluginName && normalizeValue(plugin?.name) === normalizedPluginName;
    const repoMatches = normalizedSourceRepo && normalizeValue(plugin?.source?.repo) === normalizedSourceRepo;

    if (normalizedPluginName && normalizedSourceRepo) {
      return nameMatches && repoMatches;
    }

    return Boolean(nameMatches || repoMatches);
  });

  if (matchIndex === -1) {
    throw new Error(`Could not find external plugin "${pluginName || sourceRepo}" in ${path.relative(process.cwd(), filePath)}`);
  }

  const updatedPlugins = [...plugins];
  const [removedPlugin] = updatedPlugins.splice(matchIndex, 1);
  fs.writeFileSync(filePath, `${JSON.stringify(updatedPlugins, null, 2)}\n`);

  return removedPlugin;
}

function readCliArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    args[key.slice(2)] = value;
    index += 1;
  }

  return args;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const [command] = process.argv.slice(2);

  if (command !== "remove") {
    console.error("Usage: node ./eng/external-plugin-rereview.mjs remove --plugin-name <name> [--source-repo <owner/repo>] [--file <path>]");
    process.exit(1);
  }

  const args = readCliArgs(process.argv.slice(3));

  if (!args["plugin-name"] && !args["source-repo"]) {
    console.error("Provide --plugin-name or --source-repo when removing an external plugin.");
    process.exit(1);
  }

  const removedPlugin = removePluginFromExternalJson({
    pluginName: args["plugin-name"],
    sourceRepo: args["source-repo"],
    filePath: args.file,
  });

  process.stdout.write(`${JSON.stringify(removedPlugin, null, 2)}\n`);
}
