#!/usr/bin/env node

import crypto from "crypto";
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const cwd = process.cwd();
  const defaults = {
    workspace: cwd,
    index: path.join(cwd, ".github/plugin/update-index.json"),
    sourceRoot: null,
    state: path.join(cwd, ".github/.copilot-metadata.json"),
    output: null,
    dryRun: false,
    allowUnknownDrift: false,
    includes: [],
    excludes: [],
    uiSummary: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workspace" && argv[i + 1]) {
      defaults.workspace = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--index" && argv[i + 1]) {
      defaults.index = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--source-root" && argv[i + 1]) {
      defaults.sourceRoot = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--state" && argv[i + 1]) {
      defaults.state = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--output" && argv[i + 1]) {
      defaults.output = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--dry-run") {
      defaults.dryRun = true;
      continue;
    }
    if (arg === "--allow-unknown-drift") {
      defaults.allowUnknownDrift = true;
      continue;
    }
    if (arg === "--include" && argv[i + 1]) {
      defaults.includes.push(...argv[++i].split(",").map((v) => v.trim()).filter(Boolean));
      continue;
    }
    if (arg === "--exclude" && argv[i + 1]) {
      defaults.excludes.push(...argv[++i].split(",").map((v) => v.trim()).filter(Boolean));
      continue;
    }
    if (arg === "--ui-summary") {
      defaults.uiSummary = true;
      continue;
    }
  }

  if (!defaults.sourceRoot) {
    defaults.sourceRoot = path.resolve(path.dirname(defaults.index), "../..");
  }

  return defaults;
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

function readJson(filePath, fallbackValue = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
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
    const absolutePath = path.join(agentsDir, fileName);
    const slug = fileName.replace(/\.agent\.md$/, "");
    installed.push({
      id: `agent/${slug}`,
      type: "agent",
      workspacePath: normalizePath(path.relative(workspacePath, absolutePath)),
      hash: hashFile(absolutePath),
      absolutePath,
    });
  }

  const instructionsDir = path.join(workspacePath, ".github/instructions");
  for (const fileName of listFilesIfExists(instructionsDir, (name) => name.endsWith(".instructions.md"))) {
    const absolutePath = path.join(instructionsDir, fileName);
    const slug = fileName.replace(/\.instructions\.md$/, "");
    installed.push({
      id: `instruction/${slug}`,
      type: "instruction",
      workspacePath: normalizePath(path.relative(workspacePath, absolutePath)),
      hash: hashFile(absolutePath),
      absolutePath,
    });
  }

  const skillsRoot = path.join(workspacePath, ".github/skills");
  if (fs.existsSync(skillsRoot)) {
    const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const skillName of skillDirs) {
      const absolutePath = path.join(skillsRoot, skillName);
      const skillFile = path.join(absolutePath, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        continue;
      }

      installed.push({
        id: `skill/${skillName}`,
        type: "skill",
        workspacePath: normalizePath(path.relative(workspacePath, absolutePath)),
        hash: hashDirectory(absolutePath),
        absolutePath,
      });
    }
  }

  return installed;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      ensureParentDir(destPath);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeMissingFilesAfterSkillCopy(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    return;
  }

  const srcFiles = new Set(
    listAllFilesRecursively(srcDir).map((p) => normalizePath(path.relative(srcDir, p)))
  );

  const destFiles = listAllFilesRecursively(destDir)
    .map((p) => ({
      absolutePath: p,
      relativePath: normalizePath(path.relative(destDir, p)),
    }))
    .sort((a, b) => b.relativePath.localeCompare(a.relativePath));

  for (const destFile of destFiles) {
    if (!srcFiles.has(destFile.relativePath)) {
      fs.unlinkSync(destFile.absolutePath);
    }
  }
}

function getStateMap(state) {
  const map = new Map();
  if (!state || !Array.isArray(state.resources)) {
    return map;
  }

  for (const record of state.resources) {
    if (record && typeof record.id === "string") {
      map.set(record.id, record);
    }
  }

  return map;
}

function targetPathForResource(workspacePath, resource) {
  if (resource.type === "agent") {
    return path.join(workspacePath, ".github/agents", path.basename(resource.sourcePath));
  }
  if (resource.type === "instruction") {
    return path.join(workspacePath, ".github/instructions", path.basename(resource.sourcePath));
  }
  if (resource.type === "skill") {
    const skillName = resource.id.replace(/^skill\//, "");
    return path.join(workspacePath, ".github/skills", skillName);
  }
  return null;
}

function sourcePathForResource(sourceRoot, resource) {
  return path.resolve(sourceRoot, resource.sourcePath);
}

function applyUpdate(sourcePath, targetPath, resourceType) {
  if (resourceType === "skill") {
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      throw new Error(`Source skill directory not found: ${sourcePath}`);
    }

    copyDirRecursive(sourcePath, targetPath);
    removeMissingFilesAfterSkillCopy(sourcePath, targetPath);
    return;
  }

  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  ensureParentDir(targetPath);
  fs.copyFileSync(sourcePath, targetPath);
}

function classifyAction(installed, available, stateRecord, allowUnknownDrift) {
  if (!available) {
    return {
      action: "skip",
      status: "skipped-unmanaged",
      reason: "Resource not found in update index",
    };
  }

  if (installed.hash === available.integrity.hash) {
    return {
      action: "skip",
      status: "skipped-up-to-date",
      reason: "Installed hash matches latest index hash",
    };
  }

  if (!stateRecord || typeof stateRecord.lastManagedHash !== "string") {
    if (allowUnknownDrift) {
      return {
        action: "apply",
        status: "updated-overwrite-unknown-drift",
        reason: "No managed baseline found, overwrite allowed by flag",
      };
    }

    return {
      action: "skip",
      status: "skipped-conflict-unknown-drift",
      reason: "No managed baseline found; skipped to avoid unsafe overwrite",
    };
  }

  if (installed.hash !== stateRecord.lastManagedHash) {
    return {
      action: "skip",
      status: "skipped-conflict-local-modified",
      reason: "Installed hash diverged from managed baseline",
    };
  }

  return {
    action: "apply",
    status: "updated",
    reason: "Installed hash matches managed baseline and differs from latest",
  };
}

function buildInitialState(existingState) {
  if (existingState && typeof existingState === "object") {
    return {
      schemaVersion: "1.0.0",
      resources: Array.isArray(existingState.resources) ? existingState.resources : [],
    };
  }

  return {
    schemaVersion: "1.0.0",
    resources: [],
  };
}

function run(args) {
  const updateIndex = readJson(args.index);
  if (!updateIndex || !Array.isArray(updateIndex.resources)) {
    throw new Error(`Invalid update index at ${args.index}`);
  }

  const existingState = readJson(args.state, null);
  const state = buildInitialState(existingState);
  const stateMap = getStateMap(state);

  const availableById = new Map(updateIndex.resources.map((resource) => [resource.id, resource]));
  const installed = discoverInstalledResources(args.workspace);

  const selectedInstalled = installed.filter((item) => {
    const available = availableById.get(item.id) || null;
    const filterResource = {
      id: item.id,
      type: item.type,
      workspacePath: item.workspacePath,
      providers: available ? available.providers : [],
    };
    return matchesFilters(filterResource, args.includes, args.excludes);
  });
  const filteredOutCount = installed.length - selectedInstalled.length;

  const results = [];

  for (const item of selectedInstalled) {
    const available = availableById.get(item.id) || null;
    const stateRecord = stateMap.get(item.id) || null;
    const decision = classifyAction(item, available, stateRecord, args.allowUnknownDrift);

    const result = {
      id: item.id,
      type: item.type,
      workspacePath: item.workspacePath,
      installedHash: item.hash,
      availableHash: available ? available.integrity.hash : null,
      sourcePath: available ? available.sourcePath : null,
      status: decision.status,
      reason: decision.reason,
      providers: available ? available.providers : [],
    };

    if (decision.action === "apply" && available) {
      const sourcePath = sourcePathForResource(args.sourceRoot, available);
      const targetPath = targetPathForResource(args.workspace, available);

      if (!targetPath) {
        result.status = "failed";
        result.reason = `Unsupported resource type: ${available.type}`;
        results.push(result);
        continue;
      }

      try {
        if (!args.dryRun) {
          applyUpdate(sourcePath, targetPath, available.type);
        }

        const managedRecord = {
          id: item.id,
          type: item.type,
          workspacePath: item.workspacePath,
          sourcePath: available.sourcePath,
          lastManagedHash: available.integrity.hash,
          lastAppliedAt: new Date().toISOString(),
        };
        stateMap.set(item.id, managedRecord);

        result.status = decision.status;
      } catch (error) {
        result.status = "failed";
        result.reason = error.message;
      }
    } else if (available && result.status === "skipped-up-to-date") {
      stateMap.set(item.id, {
        id: item.id,
        type: item.type,
        workspacePath: item.workspacePath,
        sourcePath: available.sourcePath,
        lastManagedHash: available.integrity.hash,
        lastAppliedAt: stateRecord?.lastAppliedAt || null,
      });
    }

    results.push(result);
  }

  state.resources = [...stateMap.values()].sort((a, b) => a.id.localeCompare(b.id));

  const summary = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const report = {
    schemaVersion: "1.0.0",
    workspace: args.workspace,
    index: args.index,
    sourceRoot: args.sourceRoot,
    stateFile: args.state,
    dryRun: args.dryRun,
    allowUnknownDrift: args.allowUnknownDrift,
    filters: {
      include: args.includes,
      exclude: args.excludes,
      filteredOutCount,
    },
    summary,
    resources: results,
  };

  if (!args.dryRun) {
    fs.mkdirSync(path.dirname(args.state), { recursive: true });
    fs.writeFileSync(args.state, JSON.stringify(state, null, 2) + "\n", "utf8");
  }

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, JSON.stringify(report, null, 2) + "\n", "utf8");
  }

  return report;
}

function buildUiSummary(report) {
  const statusCount = report.summary || {};

  const updatedStatuses = new Set(["updated", "updated-overwrite-unknown-drift"]);
  const conflictStatuses = new Set(["skipped-conflict-local-modified", "skipped-conflict-unknown-drift"]);
  const skippedStatuses = new Set(["skipped-up-to-date", "skipped-unmanaged"]);

  const updated = report.resources
    .filter((item) => updatedStatuses.has(item.status))
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

  const skipped = report.resources
    .filter((item) => skippedStatuses.has(item.status))
    .map((item) => ({
      id: item.id,
      workspacePath: item.workspacePath,
      status: item.status,
    }));

  const failed = report.resources
    .filter((item) => item.status === "failed")
    .map((item) => ({
      id: item.id,
      workspacePath: item.workspacePath,
      reason: item.reason,
    }));

  return {
    schemaVersion: "1.0.0",
    mode: "ui-summary",
    context: {
      workspace: report.workspace,
      dryRun: report.dryRun,
      index: report.index,
      filters: report.filters,
    },
    counts: {
      totalSelected: report.resources.length,
      filteredOut: report.filters.filteredOutCount,
      updated: updated.length,
      conflicts: conflicts.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    statusCount,
    buckets: {
      updated,
      conflicts,
      skipped,
      failed,
    },
  };
}

function main() {
  const args = parseArgs(process.argv);
  const report = run(args);

  const finalPayload = args.uiSummary ? buildUiSummary(report) : report;

  console.log(JSON.stringify(finalPayload, null, 2));
}

main();
