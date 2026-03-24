#!/usr/bin/env node

import crypto from "crypto";
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const args = {
    workspace: process.cwd(),
    index: path.join(process.cwd(), ".github/plugin/update-index.json"),
    state: null,
    output: null,
    includes: [],
    excludes: [],
    uiSummary: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workspace" && argv[i + 1]) {
      args.workspace = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--index" && argv[i + 1]) {
      args.index = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--state" && argv[i + 1]) {
      args.state = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--output" && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--include" && argv[i + 1]) {
      args.includes.push(...argv[++i].split(",").map((v) => v.trim()).filter(Boolean));
      continue;
    }
    if (arg === "--exclude" && argv[i + 1]) {
      args.excludes.push(...argv[++i].split(",").map((v) => v.trim()).filter(Boolean));
      continue;
    }
    if (arg === "--ui-summary") {
      args.uiSummary = true;
      continue;
    }
  }

  return args;
}

function getSearchableFields(resource) {
  return [
    resource.id,
    resource.type,
    resource.workspacePath,
    ...resource.providers.map((p) => p.plugin),
  ];
}

function matchesSelector(resource, selector) {
  const value = selector.trim();
  if (!value) {
    return false;
  }

  const fields = getSearchableFields(resource);

  if (resource.id === value) {
    return true;
  }

  if (value.startsWith("exact:")) {
    const query = value.slice("exact:".length);
    return fields.some((item) => item === query);
  }

  if (value.startsWith("prefix:")) {
    const query = value.slice("prefix:".length);
    return fields.some((item) => item.startsWith(query));
  }

  if (value.startsWith("regex:")) {
    const pattern = value.slice("regex:".length);
    try {
      const regex = new RegExp(pattern);
      return fields.some((item) => regex.test(item));
    } catch {
      return false;
    }
  }

  if (value.startsWith("type:")) {
    return resource.type === value.slice("type:".length);
  }

  if (value.startsWith("provider:")) {
    const provider = value.slice("provider:".length);
    return resource.providers.some((p) => p.plugin === provider);
  }

  if (value.startsWith("path:")) {
    const pathQuery = value.slice("path:".length);
    return resource.workspacePath.includes(pathQuery);
  }

  return fields.some((item) => item.includes(value));
}

function matchesFilters(resource, includes, excludes) {
  const includeMatch = includes.length === 0 || includes.some((selector) => matchesSelector(resource, selector));
  if (!includeMatch) {
    return false;
  }

  return !excludes.some((selector) => matchesSelector(resource, selector));
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function listAllFilesRecursively(rootDir) {
  const results = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listAllFilesRecursively(entryPath));
    } else {
      results.push(entryPath);
    }
  }
  return results;
}

function hashDirectory(dirPath) {
  const files = listAllFilesRecursively(dirPath)
    .map((filePath) => {
      const rel = normalizePath(path.relative(dirPath, filePath));
      const fileHash = hashFile(filePath);
      return `${rel}:${fileHash}`;
    })
    .sort();

  return sha256(files.join("\n"));
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function readJson(filePath, fallbackValue = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

function listFilesIfExists(dirPath, filterFn) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && filterFn(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function discoverInstalledResources(workspacePath) {
  const installed = [];

  const agentsDir = path.join(workspacePath, ".github/agents");
  for (const fileName of listFilesIfExists(agentsDir, (name) => name.endsWith(".agent.md"))) {
    const slug = fileName.replace(/\.agent\.md$/, "");
    installed.push({
      id: `agent/${slug}`,
      type: "agent",
      path: normalizePath(path.relative(workspacePath, path.join(agentsDir, fileName))),
      hash: hashFile(path.join(agentsDir, fileName)),
    });
  }

  const instructionsDir = path.join(workspacePath, ".github/instructions");
  for (const fileName of listFilesIfExists(instructionsDir, (name) => name.endsWith(".instructions.md"))) {
    const slug = fileName.replace(/\.instructions\.md$/, "");
    installed.push({
      id: `instruction/${slug}`,
      type: "instruction",
      path: normalizePath(path.relative(workspacePath, path.join(instructionsDir, fileName))),
      hash: hashFile(path.join(instructionsDir, fileName)),
    });
  }

  const skillsRoot = path.join(workspacePath, ".github/skills");
  if (fs.existsSync(skillsRoot)) {
    const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const skillName of skillDirs) {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        continue;
      }
      installed.push({
        id: `skill/${skillName}`,
        type: "skill",
        path: normalizePath(path.relative(workspacePath, path.join(skillsRoot, skillName))),
        hash: hashDirectory(path.join(skillsRoot, skillName)),
      });
    }
  }

  return installed;
}

function getStateRecord(state, resourceId) {
  if (!state || !Array.isArray(state.resources)) {
    return null;
  }
  return state.resources.find((item) => item.id === resourceId) || null;
}

function classifyResource(installed, available, stateRecord) {
  if (!available) {
    return {
      status: "unmanaged",
      reason: "Resource not found in update index",
    };
  }

  if (installed.hash === available.integrity.hash) {
    return {
      status: "up-to-date",
      reason: "Installed hash matches latest index hash",
    };
  }

  if (!stateRecord || typeof stateRecord.lastManagedHash !== "string") {
    return {
      status: "update-available-unknown-drift",
      reason: "Hash mismatch and no managed-state baseline found",
    };
  }

  if (installed.hash !== stateRecord.lastManagedHash) {
    return {
      status: "conflict-local-modified",
      reason: "Installed hash diverged from managed baseline",
    };
  }

  return {
    status: "update-available-safe",
    reason: "Installed hash matches managed baseline and differs from latest",
  };
}

function buildReport(args) {
  const updateIndex = readJson(args.index);
  if (!updateIndex || !Array.isArray(updateIndex.resources)) {
    throw new Error(`Invalid update index: ${args.index}`);
  }

  const state = args.state ? readJson(args.state, null) : null;

  const availableById = new Map(updateIndex.resources.map((resource) => [resource.id, resource]));
  const installed = discoverInstalledResources(args.workspace);

  const allResults = installed.map((item) => {
    const available = availableById.get(item.id) || null;
    const stateRecord = getStateRecord(state, item.id);
    const classification = classifyResource(item, available, stateRecord);

    return {
      id: item.id,
      type: item.type,
      workspacePath: item.path,
      installedHash: item.hash,
      availableHash: available ? available.integrity.hash : null,
      sourcePath: available ? available.sourcePath : null,
      providers: available ? available.providers : [],
      status: classification.status,
      reason: classification.reason,
    };
  });

  const results = allResults.filter((item) => matchesFilters(item, args.includes, args.excludes));
  const filteredOutCount = allResults.length - results.length;

  const summary = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return {
    schemaVersion: "1.0.0",
    workspace: args.workspace,
    index: args.index,
    usedState: args.state,
    filters: {
      include: args.includes,
      exclude: args.excludes,
      filteredOutCount,
    },
    summary,
    resources: results,
  };
}

function buildUiSummary(report) {
  const statusCount = report.summary || {};

  const readyStatuses = new Set(["update-available-safe", "update-available-unknown-drift"]);
  const conflictStatuses = new Set(["conflict-local-modified", "update-available-unknown-drift"]);

  const readyToUpdate = report.resources
    .filter((item) => readyStatuses.has(item.status))
    .map((item) => ({
      id: item.id,
      type: item.type,
      workspacePath: item.workspacePath,
      status: item.status,
      providers: item.providers.map((p) => p.plugin),
    }));

  const conflicts = report.resources
    .filter((item) => conflictStatuses.has(item.status))
    .map((item) => ({
      id: item.id,
      workspacePath: item.workspacePath,
      status: item.status,
      reason: item.reason,
    }));

  const unmanaged = report.resources
    .filter((item) => item.status === "unmanaged")
    .map((item) => ({
      id: item.id,
      workspacePath: item.workspacePath,
    }));

  return {
    schemaVersion: "1.0.0",
    mode: "ui-summary",
    context: {
      workspace: report.workspace,
      index: report.index,
      filters: report.filters,
    },
    counts: {
      totalSelected: report.resources.length,
      filteredOut: report.filters.filteredOutCount,
      upToDate: statusCount["up-to-date"] || 0,
      readyToUpdate: readyToUpdate.length,
      conflicts: conflicts.length,
      unmanaged: unmanaged.length,
    },
    buckets: {
      readyToUpdate,
      conflicts,
      unmanaged,
    },
  };
}

function main() {
  const args = parseArgs(process.argv);
  const report = buildReport(args);

  const finalPayload = args.uiSummary ? buildUiSummary(report) : report;

  const output = JSON.stringify(finalPayload, null, 2);

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, output + "\n", "utf8");
    console.log(`Wrote update report: ${args.output}`);
  } else {
    console.log(output);
  }
}

main();
