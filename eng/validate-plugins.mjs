#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";
import { readExternalPlugins } from "./external-plugin-validation.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");

const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const COPILOT_NAMESPACE = "com.github.copilot";

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
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)) {
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
  return null;
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
    skills: { prefix: "./skills/", suffix: "/", repoDir: "skills", repoFile: "SKILL.md" },
  };

  for (const [field, spec] of Object.entries(specs)) {
    const arr = plugin[field];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) {
      errors.push(`${field} must be an array`);
      continue;
    }
    if (!arraysEqual(arr, sortPluginEntries(arr))) {
      errors.push(`${field} must be sorted alphabetically`);
    }
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (typeof p !== "string") {
        errors.push(`${field}[${i}] must be a string`);
        continue;
      }
      if (!p.startsWith("./")) {
        errors.push(`${field}[${i}] must start with "./"`);
        continue;
      }
      if (!p.startsWith(spec.prefix)) {
        errors.push(`${field}[${i}] must start with "${spec.prefix}"`);
        continue;
      }
      if (!p.endsWith(spec.suffix)) {
        errors.push(`${field}[${i}] must end with "${spec.suffix}"`);
        continue;
      }
      // Validate the source file exists at repo root
      const basename = p.slice(spec.prefix.length, p.length - spec.suffix.length);
      if (field === "skills") {
        const skillDir = path.join(ROOT_FOLDER, spec.repoDir, basename);
        const skillFile = path.join(skillDir, spec.repoFile);
        if (!fs.existsSync(skillFile)) {
          errors.push(`${field}[${i}] source not found: ${spec.repoDir}/${basename}/SKILL.md`);
        }
      } else {
        const srcFile = path.join(ROOT_FOLDER, spec.repoDir, basename + spec.repoSuffix);
        if (!fs.existsSync(srcFile)) {
          errors.push(`${field}[${i}] source not found: ${spec.repoDir}/${basename}${spec.repoSuffix}`);
        }
      }
    }
  }
  return errors;
}

function validateExtensionReferences(pluginDir) {
  const errors = [];
  const referencesPath = path.join(pluginDir, ".github/plugin/extensions.json");
  if (!fs.existsSync(referencesPath)) {
    return errors;
  }

  const references = parseJsonFile(referencesPath);
  if (references.parseError) {
    errors.push(`failed to parse extensions.json: ${references.parseError}`);
    return errors;
  }
  if (!Array.isArray(references)) {
    errors.push("extensions.json must contain an array of extension names");
    return errors;
  }
  if (!arraysEqual(references, sortPluginEntries(references))) {
    errors.push("extensions.json entries must be sorted alphabetically");
  }

  for (const [index, name] of references.entries()) {
    if (typeof name !== "string" || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)) {
      errors.push(`extensions.json[${index}] must be a valid extension name`);
      continue;
    }
    if (!fs.existsSync(path.join(EXTENSIONS_DIR, name, "extension.mjs"))) {
      errors.push(`extensions.json[${index}] source not found: extensions/${name}`);
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

  // Rule 1: Must have .github/plugin/plugin.json
  const pluginJsonPath = path.join(pluginDir, ".github/plugin", "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    errors.push("missing required file: .github/plugin/plugin.json");
    return errors;
  }

  // Rule 2: Must have README.md
  const readmePath = path.join(pluginDir, "README.md");
  if (!fs.existsSync(readmePath) && !isExtensionPlugin) {
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

  // Rule 6: agents, commands, skills paths
  const specErrors = validateSpecPaths(plugin);
  errors.push(...specErrors);

  const extensionRefErrors = validateExtensionReferences(pluginDir);
  errors.push(...extensionRefErrors);

  if (isExtensionPlugin) {
    const extension = plugin.extensions;
    const namespace = extension?.[folderName];
    if (!namespace || namespace.logo !== "assets/preview.png") {
      errors.push(`extensions["${folderName}"].logo must be exactly "assets/preview.png" for extension plugins`);
    } else {
      validateExtensionScreenshotPath(extensionDir, namespace.logo, `extensions["${folderName}"].logo`, errors);
    }
  }

  return { errors, plugin: parsedPlugin };
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
function validatePlugins() {
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

  for (const dir of pluginDirs) {
    console.log(`Validating ${dir}...`);

    const { errors, plugin } = validatePlugin(dir);

    if (errors.length > 0) {
      console.error(`❌ ${dir}:`);
      errors.forEach((e) => console.error(`   - ${e}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${dir} is valid`);
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
  }

  for (const dir of getExtensionFolderNames()) {
    const pluginJsonPath = path.join(PLUGINS_DIR, dir, ".github/plugin/plugin.json");
    if (!fs.existsSync(pluginJsonPath)) {
      console.error(`❌ extension ${dir}: missing plugin manifest at plugins/${dir}/.github/plugin/plugin.json`);
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

// Run validation
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
