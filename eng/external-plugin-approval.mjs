#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";
import {
  EXTERNAL_PLUGINS_FILE,
  readExternalPlugins,
  validateExternalPlugins,
} from "./external-plugin-validation.mjs";
import { evaluateExternalPluginIssue } from "./external-plugin-intake.mjs";

export const DECISION_COMMANDS = Object.freeze({
  approve: "/approve",
  reject: "/reject",
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

export function parseDecisionCommand(body) {
  const match = String(body ?? "").match(/(?:^|\n)\s*\/(approve|reject)(?=\s|$)([\s\S]*)$/i);
  if (!match) {
    return undefined;
  }

  const command = match[1].toLowerCase();
  const reason = match[2]?.trim() || undefined;

  return {
    command,
    reason: command === "reject" ? reason : undefined,
  };
}

export function slugifyPluginName(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "external-plugin";
}

function readLocalPluginNames() {
  const pluginsDir = path.join(ROOT_FOLDER, "plugins");
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  return fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function pluginsMatch(left, right) {
  const leftName = normalizeValue(left?.name);
  const rightName = normalizeValue(right?.name);
  const leftRepo = normalizeValue(left?.source?.repo);
  const rightRepo = normalizeValue(right?.source?.repo);
  const leftPath = normalizePathValue(left?.source?.path);
  const rightPath = normalizePathValue(right?.source?.path);
  const leftRepository = normalizeRepositoryUrl(left?.repository);
  const rightRepository = normalizeRepositoryUrl(right?.repository);

  if (leftName && rightName && leftName === rightName) {
    return true;
  }

  const repoMatches = leftRepo && rightRepo && leftRepo === rightRepo;
  const repositoryMatches = leftRepository && rightRepository && leftRepository === rightRepository;
  const pathKnown = Boolean(leftPath || rightPath);
  const pathMatches = leftPath === rightPath;

  if ((repoMatches || repositoryMatches) && pathKnown && pathMatches) {
    return true;
  }

  return false;
}

export function upsertExternalPlugin(plugin, { filePath = EXTERNAL_PLUGINS_FILE } = {}) {
  const { plugins, errors } = readExternalPlugins({
    filePath,
    localPluginNames: readLocalPluginNames(),
    policy: "marketplace",
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const updatedPlugins = [...plugins];
  const existingIndex = updatedPlugins.findIndex((existingPlugin) => pluginsMatch(existingPlugin, plugin));
  const action = existingIndex === -1 ? "inserted" : "updated";

  if (existingIndex === -1) {
    updatedPlugins.push(plugin);
  } else {
    updatedPlugins[existingIndex] = plugin;
  }

  updatedPlugins.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  const { errors: validationErrors } = validateExternalPlugins(updatedPlugins, {
    localPluginNames: readLocalPluginNames(),
    policy: "marketplace",
  });

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("\n"));
  }

  const changed = JSON.stringify(updatedPlugins) !== JSON.stringify(plugins);
  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(updatedPlugins, null, 2)}\n`);
  }

  return {
    action,
    changed,
    plugin,
  };
}

function readCliArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }

    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }

  return args;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const [command, eventPath] = process.argv.slice(2);

  if (command !== "approve" || !eventPath) {
    console.error("Usage: node ./eng/external-plugin-approval.mjs approve <github-event.json> [--file <path>]");
    process.exit(1);
  }

  const args = readCliArgs(process.argv.slice(4));
  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const evaluation = await evaluateExternalPluginIssue({
    issue: event.issue,
    token: process.env.GITHUB_TOKEN,
  });

  if (!evaluation.valid) {
    console.error(evaluation.errors.join("\n"));
    process.exit(1);
  }

  const result = upsertExternalPlugin(evaluation.plugin, { filePath: args.file });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
