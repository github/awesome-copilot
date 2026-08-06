#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import { Writable } from "stream";
import { spawnSync } from "child_process";
import { runLint, LintConsoleReporter } from "@microsoft/vally";
import { evaluateRefShaConsistency, normalizeCommitSha } from "./lib/external-plugin-source-ref-sha.mjs";
import { validateAgentPluginManifest } from "./agent-plugin-schema.mjs";

const MAX_OUTPUT_LENGTH = 12000;
const AGENT_PLUGIN_SCHEMA_URL = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_PLUGIN_ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const AGENT_PLUGIN_NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const EXTERNAL_CANVAS_KEYWORD = "canvas";

const INFRA_ERROR_PATTERNS = [
  /\b401\b/,
  /\b403\b/,
  /authentication (required|failed|error)/,
  /unauthenticated/,
  /unauthorized/,
  /not logged in/,
  /please (log in|authenticate|sign in)/,
  /invalid (access |auth )?token/,
  /credentials? (are )?expired/,
  /dns.*(resolve|lookup|fail)/,
  /network.*unreachable/,
  /connection (refused|reset)/,
  /\btimeout\b/,
  /enotfound/,
  /econnrefused/,
  /etimedout/,
];

function truncateOutput(value) {
  const normalized = String(value ?? "").replace(/\x1b\[[0-9;]*m/g, "").trim();
  if (normalized.length <= MAX_OUTPUT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_OUTPUT_LENGTH)}\n...output truncated...`;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });

  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: truncateOutput(result.stdout),
    stderr: truncateOutput(result.stderr),
    output: truncateOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`),
    error: result.error ? String(result.error.message ?? result.error) : "",
  };
}

function normalizePluginPath(pluginPath) {
  if (!pluginPath || pluginPath === "/") {
    return "";
  }

  const normalized = String(pluginPath).trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return "";
  }

  if (normalized.includes("..") || normalized.includes("\\")) {
    throw new Error(`Invalid plugin path "${pluginPath}"`);
  }

  return normalized;
}

function hasCanvasKeyword(plugin) {
  return (plugin?.keywords ?? []).some(
    (keyword) => String(keyword).trim().toLowerCase() === EXTERNAL_CANVAS_KEYWORD,
  );
}

function resolveFetchSpec(pluginSource) {
  if (pluginSource.sha) {
    return pluginSource.sha;
  }

  if (!pluginSource.ref) {
    throw new Error("source.ref or source.sha is required for quality gates");
  }

  const ref = String(pluginSource.ref).trim();
  if (!ref) {
    throw new Error("source.ref or source.sha is required for quality gates");
  }

  if (ref.startsWith("refs/")) {
    return ref;
  }

  return ref;
}

function classifySmokeFailure(output) {
  const normalized = String(output ?? "").toLowerCase();
  if (INFRA_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "infra_error";
  }

  return "fail";
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cloneSubmissionRepository(workDir, plugin) {
  const repoDir = path.join(workDir, "submission");
  ensureDirectory(repoDir);

  const sourceRepo = plugin.source?.repo;
  const fetchSpec = resolveFetchSpec(plugin.source ?? {});

  const init = runCommand("git", ["init", "-q"], { cwd: repoDir });
  if (init.exitCode !== 0) {
    throw new Error(`git init failed: ${init.output}`);
  }

  const addRemote = runCommand("git", ["remote", "add", "origin", `https://github.com/${sourceRepo}.git`], { cwd: repoDir });
  if (addRemote.exitCode !== 0) {
    throw new Error(`git remote add failed: ${addRemote.output}`);
  }

  const fetch = runCommand("git", ["fetch", "--depth=1", "origin", fetchSpec], { cwd: repoDir });
  if (fetch.exitCode !== 0) {
    throw new Error(`git fetch failed for ${fetchSpec}: ${fetch.output}`);
  }

  const checkout = runCommand("git", ["checkout", "--detach", "FETCH_HEAD"], { cwd: repoDir });
  if (checkout.exitCode !== 0) {
    throw new Error(`git checkout failed: ${checkout.output}`);
  }

  return {
    repoDir,
    fetchSpec,
  };
}

// Ordered list of candidate locations for plugin.json, from most to least specific.
// Both the Copilot CLI and many external repos use nested conventions. We read the
// manifest ourselves so skill paths can be resolved from the plugin root consistently,
// regardless of where the manifest lives.
// NOTE: Keep in sync with EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS in external-plugin-validation.mjs
const PLUGIN_JSON_CANDIDATES = [
  [".github", "plugin", "plugin.json"],
  [".plugin", "plugin.json"],
  ["plugin.json"],
];

function toPosixPath(...segments) {
  return segments
    .filter((segment) => segment !== undefined && segment !== null && String(segment).length > 0)
    .map((segment) => String(segment).replace(/\\/g, "/"))
    .join("/");
}

function findPluginJson(pluginRoot) {
  for (const segments of PLUGIN_JSON_CANDIDATES) {
    const candidate = path.join(pluginRoot, ...segments);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

  }
  return null;
}

function inspectAgentPluginSpecCompliance(pluginRoot) {
      const pluginJsonPath = findPluginJson(pluginRoot);
      if (!pluginJsonPath) {
        return {
          status: "warning",
          output: "No plugin.json found in a recognized location. Agent Plugins v1.0.0 expects plugin.json at the plugin root.",
        };
      }

      const rootPluginJsonPath = path.join(pluginRoot, "plugin.json");
      const issues = [];
      if (pluginJsonPath !== rootPluginJsonPath) {
        issues.push(`manifest location is "${path.relative(pluginRoot, pluginJsonPath)}"; expected "plugin.json" at plugin root`);
      }

      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
      } catch (error) {
        return {
          status: "warning",
          output: `plugin.json is not valid JSON: ${error.message}`,
        };
      }

      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        issues.push("plugin.json top-level value must be a JSON object");
      } else {
        if (manifest.$schema !== AGENT_PLUGIN_SCHEMA_URL) {
          issues.push(`$schema should be "${AGENT_PLUGIN_SCHEMA_URL}"`);
        }

        const pluginName = manifest.name;
        if (typeof pluginName !== "string") {
          issues.push('required field "name" must be a string');
        } else {
          if (pluginName.length < 1 || pluginName.length > 64) {
            issues.push('field "name" must be 1-64 characters');
          }
          if (!AGENT_PLUGIN_NAME_PATTERN.test(pluginName)) {
            issues.push('field "name" does not match Agent Plugins naming constraints');
          }
        }

        const requiredStringFields = ["version", "description"];
        for (const field of requiredStringFields) {
          if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
            issues.push(`required field "${field}" must be a non-empty string`);
          }
        }

        const optionalStringFields = ["homepage", "repository", "license"];
        for (const field of optionalStringFields) {
          if (manifest[field] !== undefined && typeof manifest[field] !== "string") {
            issues.push(`field "${field}" must be a string when provided`);
          }
        }

        if (manifest.author !== undefined) {
          if (!manifest.author || typeof manifest.author !== "object" || Array.isArray(manifest.author)) {
            issues.push('field "author" must be an object when provided');
          } else {
            const allowedAuthorFields = new Set(["name", "email", "url"]);
            for (const authorField of Object.keys(manifest.author)) {
              if (!allowedAuthorFields.has(authorField)) {
                issues.push(`field "author.${authorField}" is not allowed`);
              } else if (typeof manifest.author[authorField] !== "string") {
                issues.push(`field "author.${authorField}" must be a string`);
              }
            }
          }
        }

        if (manifest.keywords !== undefined) {
          if (!Array.isArray(manifest.keywords)) {
            issues.push('field "keywords" must be an array of strings when provided');
          } else if (manifest.keywords.some((entry) => typeof entry !== "string")) {
            issues.push('field "keywords" must contain only strings');
          }
        }

        if (manifest.extensions !== undefined) {
          if (!manifest.extensions || typeof manifest.extensions !== "object" || Array.isArray(manifest.extensions)) {
            issues.push('field "extensions" must be an object when provided');
          } else {
            for (const [namespace, value] of Object.entries(manifest.extensions)) {
              if (!value || typeof value !== "object" || Array.isArray(value)) {
                issues.push(`field "extensions.${namespace}" must be an object`);
              }
            }
          }
        }

        for (const field of Object.keys(manifest)) {
          if (!AGENT_PLUGIN_ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
            issues.push(`top-level field "${field}" is not part of Agent Plugins v1.0.0`);
          }
        }
      }

      if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
        issues.push(...validateAgentPluginManifest(manifest).map((error) => `schema validation: ${error}`));
      }

      if (issues.length === 0) {
        return {
          status: "pass",
          output: `Agent Plugins v1.0.0 manifest checks passed for ${path.relative(pluginRoot, pluginJsonPath) || "plugin.json"}.`,
        };
      }

      return {
        status: "warning",
        output: [
          "Agent Plugins v1.0.0 manifest warnings:",
          ...issues.map((issue) => `- ${issue}`),
        ].join("\n"),
      };
}

function buildVallyLintArgs(pluginRoot) {
  const pluginJsonPath = findPluginJson(pluginRoot);
  if (!pluginJsonPath) {
    // No recognised plugin.json location — lint the whole plugin root and let
    // vally surface the real error to the submitter.
    return [pluginRoot];
  }

  let pluginJson;
  try {
    pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  } catch {
    // Malformed plugin.json — fall back to linting the full root.
    return [pluginRoot];
  }

  // Collect skill directory paths from plugin.json.
  const skillPaths = [].concat(pluginJson.skills ?? [])
    .map((s) => path.resolve(pluginRoot, s))
    .filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());

  if (skillPaths.length > 0) {
    return skillPaths;
  }

  // No resolvable skill directories — lint the full plugin root so vally can
  // surface the specific validation error to the submitter.
  return [pluginRoot];
}

async function runVallyLintGate(pluginRoot) {
  try {
    const targets = buildVallyLintArgs(pluginRoot);

    let combinedOutput = "";
    let anyFailure = false;

    for (const target of targets) {
      const chunks = [];
      const captureStream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      const result = await runLint({ rootPath: target });
      const reporter = new LintConsoleReporter({ verbose: true, stream: captureStream });
      await reporter.report(result);

      combinedOutput += chunks.join("") + "\n";
      if (!result.passed) {
        anyFailure = true;
      }
    }

    return {
      status: anyFailure ? "fail" : "pass",
      output: truncateOutput(combinedOutput),
    };
  } catch (error) {
    return {
      status: "infra_error",
      output: truncateOutput(error.message),
    };
  }
}

function buildEphemeralMarketplace(workDir, plugin) {
  const marketplaceDir = path.join(workDir, "marketplace");
  ensureDirectory(marketplaceDir);

  const marketplace = {
    name: "external-plugin-intake",
    metadata: {
      description: "Temporary marketplace for external plugin intake smoke tests",
      version: "1.0.0",
      pluginRoot: ".",
    },
    owner: {
      name: "awesome-copilot-intake",
      email: "noreply@github.com",
    },
    plugins: [plugin],
  };

  fs.writeFileSync(path.join(marketplaceDir, "marketplace.json"), `${JSON.stringify(marketplace, null, 2)}\n`);
  return marketplaceDir;
}

function runInstallSmokeGate(workDir, plugin) {
  if (runCommand("bash", ["-lc", "command -v copilot"]).exitCode !== 0) {
    return {
      status: "infra_error",
      output: "copilot CLI is not available on this runner.",
    };
  }

  try {
    const homeDir = path.join(workDir, "copilot-home");
    ensureDirectory(homeDir);
    const marketplaceDir = buildEphemeralMarketplace(workDir, plugin);

    const env = {
      ...process.env,
      HOME: homeDir,
      XDG_CONFIG_HOME: path.join(homeDir, ".config"),
      XDG_CACHE_HOME: path.join(homeDir, ".cache"),
      XDG_DATA_HOME: path.join(homeDir, ".local", "share"),
    };

    const marketplaceAdd = runCommand("copilot", ["plugin", "marketplace", "add", marketplaceDir], { env });
    if (marketplaceAdd.exitCode !== 0) {
      const status = classifySmokeFailure(marketplaceAdd.output);
      return { status, output: marketplaceAdd.output };
    }

    const install = runCommand("copilot", ["plugin", "install", `${plugin.name}@external-plugin-intake`], { env });
    if (install.exitCode !== 0) {
      const status = classifySmokeFailure(install.output);
      return { status, output: install.output };
    }

    const installedPluginPath = path.join(homeDir, ".copilot", "installed-plugins", "external-plugin-intake", plugin.name);
    if (!fs.existsSync(installedPluginPath)) {
      return {
        status: "fail",
        output: `Plugin installed but install directory was not found at ${installedPluginPath}`,
      };
    }
    const pluginManifestPath = findPluginJson(installedPluginPath);
    if (!pluginManifestPath) {
      return {
        status: "fail",
        output: `Plugin installed but no plugin.json was found in any recognized location under ${installedPluginPath}`,
      };
    }

    return {
      status: "pass",
      output: `Install smoke test succeeded. Verified ${pluginManifestPath}.`,
    };
  } catch (error) {
    return {
      status: "infra_error",
      output: truncateOutput(error.message),
    };
  }
}

function isMissingPathAtLocator(output) {
  const normalized = String(output ?? "").toLowerCase();
  return (
    normalized.includes("does not exist in") ||
    normalized.includes("exists on disk, but not in") ||
    (normalized.includes("path '") && normalized.includes("not in"))
  );
}

// Resolves the git object a locator's content should be read from.
//
// A locator can be a commit SHA, a short tag name (e.g. "v1.1.247"), or a
// fully-qualified tag ref. `git fetch origin <locator>` only updates FETCH_HEAD;
// it does NOT create a local `refs/tags/<name>`, so `git show <tag>:...` dies with
// "invalid object name". Reading through FETCH_HEAD (or HEAD for the already
// checked-out primary) sidesteps that without having to classify the locator.
function resolveLocatorReadRef(repoDir, locator, primaryFetchSpec) {
  if (locator === primaryFetchSpec) {
    // The primary locator was fetched and checked out at HEAD when the submission
    // was cloned, so its content is readable via HEAD without another fetch.
    return { status: "pass", readRef: "HEAD", output: "" };
  }

  const result = runCommand("git", ["fetch", "--depth=1", "origin", locator], { cwd: repoDir });
  if (result.exitCode === 0) {
    // FETCH_HEAD points at whatever was just fetched. At most one non-primary
    // locator is fetched per gate and it is read immediately below, so FETCH_HEAD
    // is not clobbered before use.
    return { status: "pass", readRef: "FETCH_HEAD", output: "" };
  }

  const status = classifySmokeFailure(result.output);
  return {
    status,
    readRef: null,
    output: `git fetch failed for "${locator}": ${result.output}`,
  };
}

function readPluginManifestAtLocator(repoDir, readRef, locator, normalizedPluginPath) {
  const manifestCandidates = PLUGIN_JSON_CANDIDATES.map((segments) =>
    toPosixPath(normalizedPluginPath, ...segments)
  );

  for (const manifestPath of manifestCandidates) {
    const showResult = runCommand("git", ["show", `${readRef}:${manifestPath}`], { cwd: repoDir });
    if (showResult.exitCode === 0) {
      const rawShow = spawnSync("git", ["show", `${readRef}:${manifestPath}`], { cwd: repoDir, encoding: "utf8" });
      const rawStdout = String(rawShow.stdout ?? "");

      try {
        return {
          kind: "found",
          manifestPath,
          manifest: JSON.parse(rawStdout),
        };
      } catch (error) {
        return {
          kind: "invalid",
          manifestPath,
          message: `Invalid JSON in "${manifestPath}" at "${locator}": ${error.message}`,
        };
      }

    }

    if (isMissingPathAtLocator(showResult.output)) {
      continue;
    }

    return {
      kind: "infra_error",
      message: `Unable to read "${manifestPath}" at "${locator}": ${showResult.output}`,
    };
  }

  return {
    kind: "not_found",
    message: `No plugin.json found at "${locator}". Expected one of: ${manifestCandidates.join(", ")}`,
  };
}

function resolveCommitShaAtReadRef(repoDir, readRef, locator) {
  const revParse = runCommand("git", ["rev-parse", `${readRef}^{commit}`], { cwd: repoDir });
  if (revParse.exitCode !== 0) {
    return {
      status: "fail",
      commitSha: null,
      output: `source.ref "${locator}" does not identify a commit (it may point to a tag object, tree, or blob); only commit-backed refs are supported`,
    };
  }

  const commitSha = normalizeCommitSha(revParse.stdout);
  if (!commitSha) {
    return {
      status: "infra_error",
      commitSha: null,
      output: `Unable to parse commit SHA for "${locator}" from "${readRef}".`,
    };
  }

  return {
    status: "pass",
    commitSha,
    output: "",
  };
}

export function runRefShaConsistencyGate(repoDir, plugin, primaryFetchSpec) {
  const sourceRef = typeof plugin?.source?.ref === "string" ? plugin.source.ref.trim() : "";
  const sourceSha = typeof plugin?.source?.sha === "string" ? plugin.source.sha.trim() : "";
  if (!sourceRef || !sourceSha) {
    return {
      status: "not_run",
      output: "Ref/SHA consistency gate skipped because one of source.ref or source.sha was not provided.",
    };
  }

  const refResult = resolveLocatorReadRef(repoDir, sourceRef, primaryFetchSpec);
  if (refResult.status === "fail") {
    return {
      status: "fail",
      output: refResult.output,
    };
  }

  if (refResult.status === "infra_error") {
    return {
      status: "infra_error",
      output: refResult.output,
    };
  }

  const commitResult = resolveCommitShaAtReadRef(repoDir, refResult.readRef, sourceRef);
  if (commitResult.status !== "pass") {
    return commitResult;
  }

  const consistency = evaluateRefShaConsistency({
    ref: sourceRef,
    sha: sourceSha,
    resolvedRefCommitSha: commitResult.commitSha,
  });
  if (!consistency.comparable) {
    return {
      status: "not_run",
      output: "Ref/SHA consistency gate skipped because source.sha is not a full 40-character commit SHA.",
    };
  }

  if (!consistency.matches) {
    return {
      status: "fail",
      output: `source.ref "${sourceRef}" resolves to "${consistency.normalizedRefCommitSha}", which does not match source.sha "${sourceSha}".`,
    };
  }

  return {
    status: "pass",
    output: `source.ref "${sourceRef}" resolves to the same commit as source.sha "${sourceSha}".`,
  };
}

export function runVersionMatchGate(repoDir, plugin, primaryFetchSpec) {
  const expectedVersion = String(plugin?.version ?? "").trim();
  const normalizedPluginPath = normalizePluginPath(plugin?.source?.path || "/");
  const locators = [plugin?.source?.ref, plugin?.source?.sha]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, values) => values.indexOf(value) === index);

  if (locators.length === 0) {
    return {
      status: "not_run",
      output: "Version match gate skipped because neither source.ref nor source.sha was provided.",
    };
  }

  const messages = [];
  let hasFailure = false;
  let hasInfraError = false;

  for (const locator of locators) {
    const refResult = resolveLocatorReadRef(repoDir, locator, primaryFetchSpec);
    if (refResult.status === "fail") {
      hasFailure = true;
      messages.push(`- ${locator}: ${refResult.output}`);
      continue;
    }

    if (refResult.status === "infra_error") {
      hasInfraError = true;
      messages.push(`- ${locator}: ${refResult.output}`);
      continue;
    }

    const manifestResult = readPluginManifestAtLocator(repoDir, refResult.readRef, locator, normalizedPluginPath);
    if (manifestResult.kind === "not_found" || manifestResult.kind === "invalid") {
      hasFailure = true;
      messages.push(`- ${locator}: ${manifestResult.message}`);
      continue;
    }

    if (manifestResult.kind === "infra_error") {
      hasInfraError = true;
      messages.push(`- ${locator}: ${manifestResult.message}`);
      continue;
    }

    const actualVersion = String(manifestResult.manifest?.version ?? "").trim();
    if (!actualVersion) {
      hasFailure = true;
      messages.push(`- ${locator}: "${manifestResult.manifestPath}" is missing a non-empty "version" field.`);
      continue;
    }

    if (actualVersion !== expectedVersion) {
      hasFailure = true;
      messages.push(
        `- ${locator}: external.json version "${expectedVersion}" does not match "${manifestResult.manifestPath}" version "${actualVersion}".`
      );
      continue;
    }

    messages.push(`- ${locator}: matched version "${expectedVersion}" at "${manifestResult.manifestPath}".`);
  }

  if (hasFailure) {
    return {
      status: "fail",
      output: messages.join("\n"),
    };
  }

  if (hasInfraError) {
    return {
      status: "infra_error",
      output: messages.join("\n"),
    };
  }

  return {
    status: "pass",
    output: messages.join("\n"),
  };
}

function checkPathExistsAtLocator(repoDir, readRef, locator, repoPath, expectedType) {
  const result = runCommand("git", ["cat-file", "-e", `${readRef}:${repoPath}`], { cwd: repoDir });
  if (result.exitCode === 0) {
    if (!expectedType) {
      return { exists: true, output: "" };
    }

    const typeResult = runCommand("git", ["cat-file", "-t", `${readRef}:${repoPath}`], { cwd: repoDir });
    if (typeResult.exitCode !== 0) {
      return {
        exists: false,
        output: `Unable to verify path "${repoPath}" type at "${locator}": ${typeResult.output}`,
      };
    }

    const actualType = String(typeResult.stdout ?? "").trim();
    if (actualType !== expectedType) {
      return {
        exists: false,
        output: "",
        kindMismatch: true,
        actualType,
      };
    }

    return { exists: true, output: "" };
  }

  const normalizedOutput = String(result.output ?? "").toLowerCase();
  if (
    normalizedOutput.includes("not a valid object name")
    || normalizedOutput.includes("path '")
    || normalizedOutput.includes("does not exist")
  ) {
    return { exists: false, output: "" };
  }

  return {
    exists: false,
    output: `Unable to verify path "${repoPath}" at "${locator}": ${result.output}`,
  };
}

function listTreeEntries(repoDir, readRef, locator, treePath, { recursive = false } = {}) {
  // Parse the full, untruncated tree listing directly. runCommand()/truncateOutput()
  // would cap stdout at MAX_OUTPUT_LENGTH and silently drop later entries, and the
  // default (non-"-z") output quotes unusual names; "-z" gives raw, NUL-delimited records.
  // "-r -t" recurses in a single process and still lists intermediate tree objects, so a
  // whole subtree can be inspected without spawning one git process per candidate path.
  const args = recursive
    ? ["ls-tree", "-r", "-t", "-z", `${readRef}:${treePath}`]
    : ["ls-tree", "-z", `${readRef}:${treePath}`];
  const result = spawnSync("git", args, {
    cwd: repoDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const detail = truncateOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    return {
      entries: [],
      output: `Unable to list directory "${treePath}" at "${locator}": ${detail}`,
    };
  }

  const entries = [];
  for (const record of String(result.stdout ?? "").split("\0")) {
    if (!record) {
      continue;
    }

    const tabIndex = record.indexOf("\t");
    if (tabIndex === -1) {
      continue;
    }

    const meta = record.slice(0, tabIndex).trim().split(/\s+/);
    const name = record.slice(tabIndex + 1);
    if (!name) {
      continue;
    }

    entries.push({ type: meta[1] ?? "", name });
  }

  return { entries, output: "" };
}

function locateCanvasEntryPoint(repoDir, readRef, locator, extensionsDir) {
  // Enumerate the extensions subtree with a single recursive git process rather than
  // spawning a git cat-file per candidate directory, so discovery stays bounded no matter
  // how many folders an untrusted repository packs under "extensions/". "-r" yields paths
  // relative to extensionsDir, so nested entry points appear as "<name>/extension.mjs".
  const listing = listTreeEntries(repoDir, readRef, locator, extensionsDir, { recursive: true });
  if (listing.output) {
    return { entryPoint: null, output: listing.output };
  }

  let flatIsBlob = false;
  let flatIsTree = false;
  let nestedEntryPoint = null;
  for (const entry of listing.entries) {
    if (entry.name === "extension.mjs") {
      if (entry.type === "blob") {
        flatIsBlob = true;
      } else if (entry.type === "tree") {
        flatIsTree = true;
      }
      continue;
    }

    const segments = entry.name.split("/");
    if (segments.length === 2 && segments[1] === "extension.mjs" && entry.type === "blob" && !nestedEntryPoint) {
      nestedEntryPoint = toPosixPath(extensionsDir, segments[0], "extension.mjs");
    }
  }

  if (flatIsBlob) {
    return { entryPoint: toPosixPath(extensionsDir, "extension.mjs"), output: "" };
  }
  if (nestedEntryPoint) {
    return { entryPoint: nestedEntryPoint, output: "" };
  }

  return { entryPoint: null, output: "", flatKindMismatch: flatIsTree };
}

export function runCanvasStructureGate(repoDir, plugin, primaryFetchSpec) {
  if (!hasCanvasKeyword(plugin)) {
    return {
      status: "not_run",
      output: "Canvas structure gate skipped because plugin is not tagged with \"canvas\".",
    };
  }

  const normalizedPluginPath = normalizePluginPath(plugin?.source?.path || "/");
  const locators = [plugin?.source?.ref, plugin?.source?.sha]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, values) => values.indexOf(value) === index);

  if (locators.length === 0) {
    return {
      status: "not_run",
      output: "Canvas structure gate skipped because neither source.ref nor source.sha was provided.",
    };
  }

  const extensionsDir = toPosixPath(normalizedPluginPath, "extensions");
  const extensionEntryPoint = toPosixPath(extensionsDir, "extension.mjs");

  let hasFailure = false;
  let hasInfraError = false;
  const messages = [];

  for (const locator of locators) {
    const refResult = resolveLocatorReadRef(repoDir, locator, primaryFetchSpec);
    if (refResult.status === "fail") {
      hasFailure = true;
      messages.push(`- ${locator}: ${refResult.output}`);
      continue;
    }

    if (refResult.status === "infra_error") {
      hasInfraError = true;
      messages.push(`- ${locator}: ${refResult.output}`);
      continue;
    }

    const readRef = refResult.readRef;

    const extensionDirCheck = checkPathExistsAtLocator(repoDir, readRef, locator, extensionsDir, "tree");
    if (extensionDirCheck.output) {
      hasInfraError = true;
      messages.push(`- ${locator}: ${extensionDirCheck.output}`);
      continue;
    }
    if (!extensionDirCheck.exists) {
      hasFailure = true;
      if (extensionDirCheck.kindMismatch) {
        messages.push(`- ${locator}: "${extensionsDir}" must be a directory.`);
      } else {
        messages.push(`- ${locator}: missing required canvas extension directory "${extensionsDir}".`);
      }
      continue;
    }

    const extensionEntryCheck = locateCanvasEntryPoint(repoDir, readRef, locator, extensionsDir);
    if (extensionEntryCheck.output) {
      hasInfraError = true;
      messages.push(`- ${locator}: ${extensionEntryCheck.output}`);
      continue;
    }
    if (!extensionEntryCheck.entryPoint) {
      hasFailure = true;
      if (extensionEntryCheck.flatKindMismatch) {
        messages.push(`- ${locator}: "${extensionEntryPoint}" must be a file.`);
      } else {
        messages.push(
          `- ${locator}: missing required canvas extension entry point "${extensionEntryPoint}" (or a nested "${extensionsDir}/<extension>/extension.mjs").`,
        );
      }
      continue;
    }

    messages.push(`- ${locator}: found "${extensionsDir}" with entry point "${extensionEntryCheck.entryPoint}".`);
  }

  if (hasInfraError) {
    return {
      status: "infra_error",
      output: messages.join("\n"),
    };
  }

  if (hasFailure) {
    return {
      status: "fail",
      output: messages.join("\n"),
    };
  }

  return {
    status: "pass",
    output: messages.join("\n"),
  };
}

function toOverallStatus(states) {
  if (states.includes("infra_error")) {
    return "infra_error";
  }
  if (states.includes("fail")) {
    return "fail";
  }
  if (states.every((state) => state === "not_run")) {
    return "not_run";
  }
  return "pass";
}

function toFailureClass(overallStatus) {
  if (overallStatus === "infra_error") {
    return "infra";
  }
  if (overallStatus === "fail") {
    return "submitter_fixes";
  }
  return "none";
}

export async function runExternalPluginQualityGates(plugin) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-quality-"));
  const result = {
    overall_status: "not_run",
    vally_lint_status: "not_run",
    smoke_status: "not_run",
    spec_compliance_status: "not_run",
    version_match_status: "not_run",
    ref_sha_consistency_status: "not_run",
    canvas_structure_status: "not_run",
    failure_class: "none",
    summary: "",
    vally_lint_output: "",
    smoke_output: "",
    spec_compliance_output: "",
    version_match_output: "",
    ref_sha_consistency_output: "",
    canvas_structure_output: "",
  };

  try {
    const { repoDir, fetchSpec } = cloneSubmissionRepository(workDir, plugin);
    const normalizedPluginPath = normalizePluginPath(plugin.source?.path || "/");
    const pluginRoot = normalizedPluginPath ? path.join(repoDir, normalizedPluginPath) : repoDir;

    if (!fs.existsSync(pluginRoot) || !fs.statSync(pluginRoot).isDirectory()) {
      result.vally_lint_status = "fail";
      result.smoke_status = "fail";
      result.spec_compliance_status = "warning";
      result.version_match_status = "fail";
      result.ref_sha_consistency_status = "not_run";
      result.canvas_structure_status = hasCanvasKeyword(plugin) ? "fail" : "not_run";
      result.overall_status = "fail";
      result.failure_class = "submitter_fixes";
      result.summary = `Plugin path "${plugin.source?.path || "/"}" was not found in the submitted repository snapshot.`;
      result.spec_compliance_output = result.summary;
      result.version_match_output = result.summary;
      if (hasCanvasKeyword(plugin)) {
        result.canvas_structure_output = result.summary;
      }
      return result;
    }

    const specResult = inspectAgentPluginSpecCompliance(pluginRoot);
    result.spec_compliance_status = specResult.status;
    result.spec_compliance_output = specResult.output;

    const versionMatchResult = runVersionMatchGate(repoDir, plugin, fetchSpec);
    result.version_match_status = versionMatchResult.status;
    result.version_match_output = versionMatchResult.output;

    const refShaConsistencyResult = runRefShaConsistencyGate(repoDir, plugin, fetchSpec);
    result.ref_sha_consistency_status = refShaConsistencyResult.status;
    result.ref_sha_consistency_output = refShaConsistencyResult.output;

    const canvasStructureResult = runCanvasStructureGate(repoDir, plugin, fetchSpec);
    result.canvas_structure_status = canvasStructureResult.status;
    result.canvas_structure_output = canvasStructureResult.output;

    const vallyResult = await runVallyLintGate(pluginRoot);
    result.vally_lint_status = vallyResult.status;
    result.vally_lint_output = vallyResult.output;

    const smokeResult = runInstallSmokeGate(workDir, plugin);
    result.smoke_status = smokeResult.status;
    result.smoke_output = smokeResult.output;

    result.overall_status = toOverallStatus([
      result.vally_lint_status,
      result.smoke_status,
      result.version_match_status,
      result.ref_sha_consistency_status,
      result.canvas_structure_status,
    ]);
    result.failure_class = toFailureClass(result.overall_status);
    result.summary = [
      `- spec compliance: ${result.spec_compliance_status}`,
      `- vally lint: ${result.vally_lint_status}`,
      `- install smoke test: ${result.smoke_status}`,
      `- version match: ${result.version_match_status}`,
      `- ref/sha consistency: ${result.ref_sha_consistency_status}`,
      `- canvas structure: ${result.canvas_structure_status}`,
      `- overall: ${result.overall_status}`,
    ].join("\n");

    return result;
  } catch (error) {
    result.overall_status = "infra_error";
    result.failure_class = "infra";
    result.summary = truncateOutput(error.message);
    result.vally_lint_output = truncateOutput(error.stack || error.message);
    return result;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function parseCliArgs(argv) {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args["plugin-json"]) {
    console.error("Usage: node ./eng/external-plugin-quality-gates.mjs --plugin-json '<json>'");
    process.exit(1);
  }

  const plugin = JSON.parse(args["plugin-json"]);
  const result = await runExternalPluginQualityGates(plugin);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
