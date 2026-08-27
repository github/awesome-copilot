#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";
import { readExternalPlugins } from "./external-plugin-validation.mjs";
import { validateLicenseField } from "./lib/license.mjs";
import { AGENT_PLUGIN_SCHEMA_URL, validateAgentPluginManifest, validateAgentPluginMcpConfig } from "./agent-plugin-schema.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");

const AGENT_PLUGINS_SCHEMA = AGENT_PLUGIN_SCHEMA_URL;
const COPILOT_NAMESPACE = "com.github.copilot";
const AWESOME_COPILOT_NAMESPACE = "com.github.awesome-copilot";

// Validation functions
function validateName(name, folderName) {
  const errors = [];
  if (!name || typeof name !== "string") {
    errors.push("name is required and must be a string");
    return errors;
  }
  if (name.length < 1 || name.length > 64) {
    errors.push("name must be between 1 and 64 characters");
  }
  if (!/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(name)) {
    errors.push("name must contain only lowercase letters, numbers, hyphens, and dots (spec §5.5)");
  }
  if (name !== folderName) {
    errors.push(`name "${name}" must match folder name "${folderName}"`);
  }
  return errors;
}

function validateSchema(parsed) {
  if (parsed["$schema"] !== AGENT_PLUGINS_SCHEMA) {
    return `$schema must be "${AGENT_PLUGINS_SCHEMA}"`;
  }
  const schemaErrors = validateAgentPluginManifest(parsed);
  return schemaErrors.length ? `manifest does not conform to Agent Plugins schema: ${schemaErrors.join("; ")}` : null;
}

function validateDescription(description) {
  if (!description || typeof description !== "string") {
    return "description is required and must be a string";
  }
  if (description.length < 1 || description.length > 500) {
    return "description must be between 1 and 500 characters";
  }
  return null;
}

function validateVersion(version) {
  if (!version || typeof version !== "string") {
    return "version is required and must be a string";
  }
  return null;
}

function validateKeywords(keywords) {
  if (keywords === undefined) return null;
  if (!Array.isArray(keywords)) {
    return "keywords must be an array";
  }
  if (keywords.length > 10) {
    return "maximum 10 keywords allowed";
  }
  for (const keyword of keywords) {
    if (typeof keyword !== "string") {
      return "all keywords must be strings";
    }
    if (!/^[a-z0-9-]+$/.test(keyword)) {
      return `keyword "${keyword}" must contain only lowercase letters, numbers, and hyphens`;
    }
    if (keyword.length < 1 || keyword.length > 30) {
      return `keyword "${keyword}" must be between 1 and 30 characters`;
    }
  }
  return null;
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function sortPluginEntries(entries) {
  return [...entries].sort((left, right) => left.localeCompare(right));
}

function parseJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    return { parseError: err.message };
  }
}

function getExtensionFolderNames() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const extensionEntryPoint = path.join(EXTENSIONS_DIR, entry.name, "extension.mjs");
      return fs.existsSync(extensionEntryPoint);
    })
    .map((entry) => entry.name)
    .sort();
}

function validateSpecPaths(plugin) {
  const errors = [];
  const specs = {
    agents: { prefix: "./agents/", suffix: ".md", repoDir: "agents", repoSuffix: ".agent.md" },
    hooks: { prefix: "./hooks/", suffix: "/", repoDir: "hooks", repoFile: "README.md" },
    skills: { prefix: "./skills/", suffix: "/", repoDir: "skills", repoFile: "SKILL.md" },
  };

  for (const [field, spec] of Object.entries(specs)) {
    const arr = plugin.extensions?.[AWESOME_COPILOT_NAMESPACE]?.[field];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) {
      errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field} must be an array`);
      continue;
    }
    if (!arraysEqual(arr, sortPluginEntries(arr))) {
      errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field} must be sorted alphabetically`);
    }
    if (new Set(arr).size !== arr.length) {
      errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field} must not contain duplicate references`);
    }
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (typeof p !== "string") {
        errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] must be a string`);
        continue;
      }
      if (!p.startsWith("./")) {
        errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] must start with "./"`);
        continue;
      }
      if (!p.startsWith(spec.prefix)) {
        errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] must start with "${spec.prefix}"`);
        continue;
      }
      if (!p.endsWith(spec.suffix)) {
        errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] must end with "${spec.suffix}"`);
        continue;
      }
      // Validate the source file exists at repo root
      const basename = p.slice(spec.prefix.length, p.length - spec.suffix.length);
      if (field === "skills") {
        const skillDir = path.join(ROOT_FOLDER, spec.repoDir, basename);
        const skillFile = path.join(skillDir, spec.repoFile);
        if (!fs.existsSync(skillFile)) {
          errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] source not found: ${spec.repoDir}/${basename}/SKILL.md`);
        }
      } else {
        const srcFile = spec.repoFile
          ? path.join(ROOT_FOLDER, spec.repoDir, basename, spec.repoFile)
          : path.join(ROOT_FOLDER, spec.repoDir, basename + spec.repoSuffix);
        if (!fs.existsSync(srcFile)) {
          errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] source not found`);
        } else if (field === "hooks" && !fs.existsSync(path.join(ROOT_FOLDER, spec.repoDir, basename, "hooks.json"))) {
          errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}[${i}] source not found: ${spec.repoDir}/${basename}/hooks.json`);
        }
      }
    }
  }
  return errors;
}

function validateExtensionReferences(plugin, pluginDir) {
  const errors = [];
  const directories = plugin.extensions?.[AWESOME_COPILOT_NAMESPACE]?.extensions;
  if (directories === undefined) {
    return errors;
  }
  if (!Array.isArray(directories)) {
    errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions must be an array`);
    return errors;
  }
  if (!arraysEqual(directories, sortPluginEntries(directories))) {
    errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions entries must be sorted alphabetically`);
  }
  if (new Set(directories).size !== directories.length) {
    errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions must not contain duplicate references`);
  }

  for (const [index, directory] of directories.entries()) {
    const name = typeof directory === "string"
      ? directory.replace(/^\.\/extensions\//, "").replace(/\/$/, "")
      : "";
    if (typeof directory !== "string" || !directory.startsWith("./extensions/") ||
        !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)) {
      errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions[${index}] must be a valid ./extensions/<name> path`);
      continue;
    }
    if (!fs.existsSync(path.join(EXTENSIONS_DIR, name, "extension.mjs"))) {
      errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions[${index}] source not found: extensions/${name}`);
    }
  }

  return errors;
}

export function validateMcpConfig(pluginDir) {
  const errors = [];
  const legacyPath = path.join(pluginDir, ".mcp.json");
  if (fs.existsSync(legacyPath)) {
    errors.push("MCP configuration must live at mcp.json in the plugin root, not .mcp.json");
  }

  const mcpJsonPath = path.join(pluginDir, "mcp.json");
  let mcpStat;
  try {
    mcpStat = fs.lstatSync(mcpJsonPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        fs.readlinkSync(mcpJsonPath);
        errors.push("mcp.json is a dangling symbolic link");
      } catch (readlinkError) {
        if (readlinkError.code !== "EINVAL" && readlinkError.code !== "ENOENT") {
          errors.push(`mcp.json could not be inspected: ${readlinkError.message}`);
        }
      }
      return errors;
    }
    errors.push(`mcp.json could not be inspected: ${error.message}`);
    return errors;
  }

  let pluginRoot;
  let resolvedMcpJsonPath;
  try {
    pluginRoot = fs.realpathSync.native(pluginDir);
    resolvedMcpJsonPath = fs.realpathSync.native(mcpJsonPath);
  } catch (error) {
    if (mcpStat.isSymbolicLink() && error.code === "ENOENT") {
      errors.push("mcp.json is a dangling symbolic link");
    } else {
      errors.push(`mcp.json could not be resolved: ${error.message}`);
    }
    return errors;
  }

  const relativeMcpPath = path.relative(pluginRoot, resolvedMcpJsonPath);
  if (relativeMcpPath === ".." ||
      relativeMcpPath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeMcpPath)) {
    errors.push("mcp.json must resolve to a file inside the plugin root");
    return errors;
  }

  if (!fs.statSync(resolvedMcpJsonPath).isFile()) {
    errors.push("mcp.json must be a regular file");
    return errors;
  }

  const parsed = parseJsonFile(resolvedMcpJsonPath);
  if (parsed.parseError) {
    errors.push(`failed to parse mcp.json: ${parsed.parseError}`);
    return errors;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    errors.push("mcp.json must contain a top-level object");
    return errors;
  }
  errors.push(...validateAgentPluginMcpConfig(parsed, pluginDir).map((message) => `mcp.json ${message}`));

  return errors;
}

export function validateCompositionNamespace(plugin) {
  const errors = [];
  const compositionFields = ["agents", "hooks", "skills"];
  const extensions = plugin.extensions;
  const composition = extensions?.[AWESOME_COPILOT_NAMESPACE];

  if (extensions !== undefined &&
      (typeof extensions !== "object" || extensions === null || Array.isArray(extensions))) {
    errors.push(`extensions must be an object containing "${AWESOME_COPILOT_NAMESPACE}"`);
    return errors;
  }

  if (composition !== undefined &&
      (typeof composition !== "object" || composition === null || Array.isArray(composition))) {
    errors.push(`extensions["${AWESOME_COPILOT_NAMESPACE}"] must be an object`);
    return errors;
  }

  if (extensions && typeof extensions === "object" && !Array.isArray(extensions)) {
    for (const [namespace, value] of Object.entries(extensions)) {
      if (value && typeof value === "object" && !Array.isArray(value) && value.mcpServers !== undefined) {
        errors.push(`extensions["${namespace}"].mcpServers is not supported; declare MCP servers in mcp.json at the plugin root`);
      }
    }
    if (extensions.mcpServers !== undefined) {
      errors.push("extensions.mcpServers is not supported; declare MCP servers in mcp.json at the plugin root");
    }
  }

  for (const field of compositionFields) {
    if (extensions?.[field] !== undefined) {
      errors.push(`extensions.${field} must be moved to extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}`);
    }
  }

  return errors;
}

function validatePlugin(folderName) {
  const pluginDir = path.join(PLUGINS_DIR, folderName);
  const errors = [];
  let parsedPlugin = null;
  const extensionDir = path.join(EXTENSIONS_DIR, folderName);
  const isExtensionPlugin = fs.existsSync(path.join(extensionDir, "extension.mjs"));

  // Rule 1: Must have plugin.json at the plugin root
  const pluginJsonPath = path.join(pluginDir, "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    errors.push("missing required file: plugin.json");
    return errors;
  }

  // Rule 2: Must have README.md
  const readmePath = path.join(pluginDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    errors.push("missing required file: README.md");
  }

  // Parse plugin.json
  let plugin;
  try {
    const raw = fs.readFileSync(pluginJsonPath, "utf-8");
    plugin = JSON.parse(raw);
    parsedPlugin = plugin;
  } catch (err) {
    errors.push(`failed to parse plugin.json: ${err.message}`);
    return { errors, plugin: parsedPlugin };
  }

  // Rule 3: $schema required
  const schemaError = validateSchema(plugin);
  if (schemaError) errors.push(schemaError);

  // Rule 4 & 5: name, description, version
  const nameErrors = validateName(plugin.name, folderName);
  errors.push(...nameErrors);

  const descError = validateDescription(plugin.description);
  if (descError) errors.push(descError);

  const versionError = validateVersion(plugin.version);
  if (versionError) errors.push(versionError);

  // Rule 6: keywords (or tags for backward compat)
  const keywordsError = validateKeywords(plugin.keywords ?? plugin.tags);
  if (keywordsError) errors.push(keywordsError);

  // Rule 5b: license (shared with external plugins). Non-SPDX is a warning, not an error.
  const warnings = [];
  if (plugin.mcpServers !== undefined) {
    errors.push("mcpServers must be declared in mcp.json at the plugin root, not in plugin.json");
  }
  for (const field of ["agents", "hooks", "skills"]) {
    if (plugin[field] !== undefined) {
      errors.push(`${field} must be moved to extensions["${AWESOME_COPILOT_NAMESPACE}"].${field}`);
    }
  }
  errors.push(...validateCompositionNamespace(plugin));
  errors.push(...validateMcpConfig(pluginDir));
  const licenseResult = validateLicenseField(plugin.license, { required: false });
  errors.push(...licenseResult.errors);
  warnings.push(...licenseResult.warnings);

  // Rule 6: agents, hooks, and skills paths
  const specErrors = validateSpecPaths(plugin);
  errors.push(...specErrors);

  const extensionRefErrors = validateExtensionReferences(plugin, pluginDir);
  errors.push(...extensionRefErrors);

  if (isExtensionPlugin) {
    const extension = plugin.extensions;
    const namespace = extension?.[COPILOT_NAMESPACE];
    if (!namespace || namespace.logo !== "assets/preview.png") {
      errors.push(`extensions["${COPILOT_NAMESPACE}"].logo must be exactly "assets/preview.png" for extension plugins`);
    } else {
      validateExtensionScreenshotPath(extensionDir, namespace.logo, `extensions["${COPILOT_NAMESPACE}"].logo`, errors);
    }
  }

  return { errors, warnings, plugin: parsedPlugin };
}

function validateExtensionScreenshotPath(extensionDir, pathValue, fieldName, errors) {
  if (!pathValue || typeof pathValue !== "string") {
    errors.push(`${fieldName} must be a string path`);
    return;
  }

  const normalizedPath = pathValue.replace(/^\.\/+/, "");
  const absolutePath = path.join(extensionDir, normalizedPath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${fieldName} not found: ${normalizedPath}`);
  }
}

// Main validation function
export function isReusableExtensionRegistered(extensionName, pluginDirectoryNames, referencedExtensionNames) {
  return pluginDirectoryNames.has(extensionName) || referencedExtensionNames.has(extensionName);
}

export function validatePlugins() {
  const pluginDirs = fs.existsSync(PLUGINS_DIR)
    ? fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    : [];
  if (pluginDirs.length === 0) {
    console.log("No plugin manifests found - validation skipped");
    return true;
  }

  console.log(`Validating ${pluginDirs.length} plugins...\n`);

  let hasErrors = false;
  const seenNames = new Set();
  const localPluginNames = [];
  const pluginDirectoryNames = new Set(pluginDirs);
  const referencedExtensionNames = new Set();

  for (const dir of pluginDirs) {
    console.log(`Validating ${dir}...`);

    const { errors, warnings, plugin } = validatePlugin(dir);

    if (errors.length > 0) {
      console.error(`❌ ${dir}:`);
      errors.forEach((e) => console.error(`   - ${e}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${dir} is valid`);
    }

    if (warnings?.length > 0) {
      warnings.forEach((w) => console.warn(`⚠️  ${dir}: ${w}`));
    }

    if (plugin?.name) {
      if (seenNames.has(plugin.name)) {
        console.error(`❌ Duplicate plugin name "${plugin.name}"`);
        hasErrors = true;
      } else {
        seenNames.add(plugin.name);
        localPluginNames.push(plugin.name);
      }
    }

    const extensionReferences = plugin?.extensions?.[AWESOME_COPILOT_NAMESPACE]?.extensions;
    if (Array.isArray(extensionReferences)) {
      for (const reference of extensionReferences) {
        if (typeof reference === "string" && reference.startsWith("./extensions/")) {
          referencedExtensionNames.add(reference.replace(/^\.\/extensions\//, "").replace(/\/$/, ""));
        }
      }
    }
  }

  for (const dir of getExtensionFolderNames()) {
    if (!isReusableExtensionRegistered(dir, pluginDirectoryNames, referencedExtensionNames)) {
      console.error(`❌ extension ${dir}: must be referenced by a plugin or have a standalone manifest at plugins/${dir}/plugin.json`);
      hasErrors = true;
    }
  }

  console.log("\nValidating external plugin catalog...");
  const { plugins: externalPlugins, errors: externalErrors, warnings: externalWarnings } = readExternalPlugins({
    localPluginNames,
    policy: "marketplace",
  });

  externalWarnings.forEach((warning) => console.warn(`⚠️  ${warning}`));

  if (externalErrors.length > 0) {
    console.error("❌ external.json:");
    externalErrors.forEach((error) => console.error(`   - ${error}`));
    hasErrors = true;
  } else {
    console.log(`✅ external.json is valid (${externalPlugins.length} external plugins)`);
  }

  if (!hasErrors) {
    console.log(`\n✅ All ${pluginDirs.length} plugins and the external catalog are valid`);
  }

  return !hasErrors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const isValid = validatePlugins();
    if (!isValid) {
      console.error("\n❌ Plugin validation failed");
      process.exit(1);
    }
    console.log("\n🎉 Plugin validation passed");
  } catch (error) {
    console.error(`Error during validation: ${error.message}`);
    process.exit(1);
  }
}
