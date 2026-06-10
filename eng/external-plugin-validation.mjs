import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

export const EXTERNAL_PLUGINS_FILE = path.join(ROOT_FOLDER, "plugins", "external.json");

export const EXTERNAL_PLUGIN_POLICIES = Object.freeze({
  marketplace: Object.freeze({
    allowedSourceTypes: ["github"],
    requireAuthor: true,
    requireRepository: true,
    requireKeywords: true,
    requireLicense: false,
    requireImmutableLocator: false,
  }),
  publicSubmission: Object.freeze({
    allowedSourceTypes: ["github"],
    requireAuthor: true,
    requireRepository: true,
    requireKeywords: true,
    requireLicense: true,
    requireImmutableLocator: true,
  }),
});

// NOTE: Keep in sync with PLUGIN_JSON_CANDIDATES in external-plugin-quality-gates.mjs
const EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS = Object.freeze([
  "plugin.json",
  ".github/plugin/plugin.json",
  ".plugins/plugin.json",
]);

function resolvePolicy(policy) {
  if (!policy) {
    return EXTERNAL_PLUGIN_POLICIES.marketplace;
  }

  if (typeof policy === "string") {
    const resolved = EXTERNAL_PLUGIN_POLICIES[policy];
    if (!resolved) {
      throw new Error(`Unknown external plugin validation policy "${policy}"`);
    }

    return resolved;
  }

  return {
    ...EXTERNAL_PLUGIN_POLICIES.marketplace,
    ...policy,
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePluginName(name, prefix, errors) {
  if (!isNonEmptyString(name)) {
    errors.push(`${prefix}: "name" is required and must be a non-empty string`);
    return;
  }

  if (name.length > 50) {
    errors.push(`${prefix}: "name" must be 50 characters or fewer`);
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push(`${prefix}: "name" must contain only lowercase letters, numbers, and hyphens`);
  }
}

function validateDescription(description, prefix, errors) {
  if (!isNonEmptyString(description)) {
    errors.push(`${prefix}: "description" is required and must be a non-empty string`);
    return;
  }

  if (description.length > 500) {
    errors.push(`${prefix}: "description" must be 500 characters or fewer`);
  }
}

function validateVersion(version, prefix, errors) {
  if (!isNonEmptyString(version)) {
    errors.push(`${prefix}: "version" is required and must be a non-empty string`);
    return;
  }

  if (version.length > 100) {
    errors.push(`${prefix}: "version" must be 100 characters or fewer`);
  }
}

function validateKeywords(keywords, prefix, errors, warnings, required) {
  if (keywords === undefined) {
    if (required) {
      errors.push(`${prefix}: "keywords" is required and must be an array of lowercase tags`);
    }
    return;
  }

  if (!Array.isArray(keywords)) {
    errors.push(`${prefix}: "keywords" must be an array`);
    return;
  }

  if (keywords.length > 10) {
    errors.push(`${prefix}: "keywords" must contain no more than 10 entries`);
  }

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (!isNonEmptyString(keyword)) {
      errors.push(`${prefix}: "keywords[${i}]" must be a non-empty string`);
      continue;
    }

    if (!/^[a-z0-9-]+$/.test(keyword)) {
      errors.push(`${prefix}: "keywords[${i}]" must contain only lowercase letters, numbers, and hyphens`);
    }

    if (keyword.length > 30) {
      errors.push(`${prefix}: "keywords[${i}]" must be 30 characters or fewer`);
    }
  }

  if (keywords.length === 0) {
    if (required) {
      errors.push(`${prefix}: "keywords" must contain at least one entry`);
    } else {
      warnings.push(`${prefix}: "keywords" is empty; at least one keyword is recommended for discovery`);
    }
  }
}

function validateHttpsUrl(value, fieldName, prefix, errors, options = {}) {
  if (!isNonEmptyString(value)) {
    errors.push(`${prefix}: "${fieldName}" must be a non-empty string`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${prefix}: "${fieldName}" must be a valid URL`);
    return;
  }

  if (parsed.protocol !== "https:") {
    errors.push(`${prefix}: "${fieldName}" must use https`);
  }

  if (options.githubOnly && parsed.hostname !== "github.com") {
    errors.push(`${prefix}: "${fieldName}" must point to https://github.com/...`);
  }
}

function validateAuthor(author, prefix, errors, required) {
  if (author === undefined) {
    if (required) {
      errors.push(`${prefix}: "author" is required`);
    }
    return;
  }

  if (!author || typeof author !== "object" || Array.isArray(author)) {
    errors.push(`${prefix}: "author" must be an object`);
    return;
  }

  if (!isNonEmptyString(author.name)) {
    errors.push(`${prefix}: "author.name" is required and must be a non-empty string`);
  }

  if (author.url !== undefined) {
    validateHttpsUrl(author.url, "author.url", prefix, errors);
  }
}

function validateLicense(license, prefix, errors, required) {
  if (license === undefined) {
    if (required) {
      errors.push(`${prefix}: "license" is required`);
    }
    return;
  }

  if (!isNonEmptyString(license)) {
    errors.push(`${prefix}: "license" must be a non-empty string`);
  }
}

function validateRepository(repository, prefix, errors, required) {
  if (repository === undefined) {
    if (required) {
      errors.push(`${prefix}: "repository" is required`);
    }
    return;
  }

  validateHttpsUrl(repository, "repository", prefix, errors, { githubOnly: true });
}

function validateHomepage(homepage, prefix, errors) {
  if (homepage === undefined) {
    return;
  }

  validateHttpsUrl(homepage, "homepage", prefix, errors);
}

function formatExpectedPluginRootMessage() {
  return EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS.map((manifestPath) => `"${manifestPath}"`).join(", ");
}

function validateRelativePath(pathValue, prefix, errors) {
  if (!isNonEmptyString(pathValue)) {
    errors.push(`${prefix}: "source.path" must be a non-empty string when provided`);
    return;
  }

  if (pathValue === "/") {
    return;
  }

  const normalized = path.posix.normalize(pathValue);
  const segments = pathValue.split("/");

  if (pathValue.startsWith("/") || pathValue.startsWith("../") || normalized !== pathValue || segments.includes("..")) {
    errors.push(`${prefix}: "source.path" must be a safe relative path inside the repository`);
  }

  if (pathValue.includes("\\")) {
    errors.push(`${prefix}: "source.path" must use forward slashes`);
  }

  if (normalized === ".") {
    errors.push(`${prefix}: "source.path" must be "/" for the repository root or a plugin root directory relative to the repository root`);
  }

  if (path.posix.basename(normalized) === "plugin.json") {
    errors.push(
      `${prefix}: "source.path" must point to the plugin root directory, not the manifest file; relative to "source.path", expected one of ${formatExpectedPluginRootMessage()}`
    );
  }
}

function validateImmutableRef(ref, prefix, errors) {
  if (!isNonEmptyString(ref)) {
    errors.push(`${prefix}: "source.ref" must be a non-empty string when provided`);
    return;
  }

  if (ref.startsWith("refs/heads/")) {
    errors.push(`${prefix}: "source.ref" must be a tag or commit SHA, not a branch ref`);
    return;
  }

  if (["main", "master", "develop", "development", "dev", "trunk"].includes(ref)) {
    errors.push(`${prefix}: "source.ref" must be a tag or commit SHA, not a branch name`);
  }

  if (ref.startsWith("refs/") && !ref.startsWith("refs/tags/")) {
    errors.push(`${prefix}: "source.ref" must be a tag ref or commit SHA`);
  }

  if (/^[0-9a-f]+$/i.test(ref) && ref.length !== 40) {
    errors.push(`${prefix}: "source.ref" must be a full 40-character commit SHA when referencing a commit`);
  }
}

function validateCommitSha(sha, prefix, errors) {
  if (!isNonEmptyString(sha)) {
    errors.push(`${prefix}: "source.sha" must be a non-empty string when provided`);
    return;
  }

  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    errors.push(`${prefix}: "source.sha" must be a full 40-character commit SHA`);
  }
}

function validateGitHubSource(source, prefix, errors, requireImmutableLocator) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push(`${prefix}: "source" must be an object`);
    return;
  }

  if (source.source !== "github") {
    errors.push(`${prefix}: "source.source" must be "github"`);
  }

  if (!isNonEmptyString(source.repo)) {
    errors.push(`${prefix}: "source.repo" is required and must be a non-empty string`);
  } else if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo)) {
    errors.push(`${prefix}: "source.repo" must be in "owner/repo" format`);
  }

  if (source.path !== undefined) {
    validateRelativePath(source.path, prefix, errors);
  }

  if (source.ref !== undefined) {
    validateImmutableRef(source.ref, prefix, errors);
  }

  if (source.sha !== undefined) {
    validateCommitSha(source.sha, prefix, errors);
  }

  if (requireImmutableLocator && source.ref === undefined && source.sha === undefined) {
    errors.push(`${prefix}: one of "source.ref" or "source.sha" is required for public external plugin submissions`);
  }
}

export function validateExternalPlugin(plugin, index, options = {}) {
  const policy = resolvePolicy(options.policy ?? options);
  const errors = [];
  const warnings = [];
  const prefix = `external.json[${index}]`;

  if (!plugin || typeof plugin !== "object" || Array.isArray(plugin)) {
    return {
      errors: [`${prefix}: entry must be an object`],
      warnings,
    };
  }

  validatePluginName(plugin.name, prefix, errors);
  validateDescription(plugin.description, prefix, errors);
  validateVersion(plugin.version, prefix, errors);
  validateAuthor(plugin.author, prefix, errors, policy.requireAuthor);
  validateRepository(plugin.repository, prefix, errors, policy.requireRepository);
  validateHomepage(plugin.homepage, prefix, errors);
  validateLicense(plugin.license, prefix, errors, policy.requireLicense);
  validateKeywords(plugin.keywords ?? plugin.tags, prefix, errors, warnings, policy.requireKeywords);

  if (plugin.tags !== undefined && plugin.keywords === undefined) {
    warnings.push(`${prefix}: prefer "keywords" over legacy "tags"`);
  }

  if (!plugin.source) {
    errors.push(`${prefix}: "source" is required`);
  } else if (typeof plugin.source === "string") {
    errors.push(`${prefix}: "source" must be an object (local file paths are not allowed for external plugins)`);
  } else if (!policy.allowedSourceTypes.includes(plugin.source.source)) {
    errors.push(`${prefix}: "source.source" must be one of: ${policy.allowedSourceTypes.join(", ")}`);
  } else if (plugin.source.source === "github") {
    validateGitHubSource(plugin.source, prefix, errors, policy.requireImmutableLocator);
  }

  return { errors, warnings };
}

export function validateExternalPlugins(plugins, options = {}) {
  const policy = resolvePolicy(options.policy ?? options);
  const errors = [];
  const warnings = [];
  const localNames = new Map(
    (options.localPluginNames ?? []).map((name) => [String(name).toLowerCase(), String(name)])
  );
  const seenExternalNames = new Map();

  if (!Array.isArray(plugins)) {
    return {
      errors: ["external.json must contain an array"],
      warnings,
    };
  }

  plugins.forEach((plugin, index) => {
    const result = validateExternalPlugin(plugin, index, { policy });
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (!isNonEmptyString(plugin?.name)) {
      return;
    }

    const normalizedName = plugin.name.toLowerCase();
    const duplicateIndex = seenExternalNames.get(normalizedName);
    if (duplicateIndex !== undefined) {
      errors.push(`external.json[${index}]: duplicate plugin name "${plugin.name}" already used by external.json[${duplicateIndex}]`);
    } else {
      seenExternalNames.set(normalizedName, index);
    }

    const localDuplicate = localNames.get(normalizedName);
    if (localDuplicate) {
      errors.push(`external.json[${index}]: plugin name "${plugin.name}" conflicts with local plugin "${localDuplicate}"`);
    }
  });

  return { errors, warnings };
}

export function readExternalPlugins(options = {}) {
  const filePath = options.filePath ?? EXTERNAL_PLUGINS_FILE;

  if (!fs.existsSync(filePath)) {
    return {
      plugins: [],
      errors: [],
      warnings: [],
    };
  }

  let plugins;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    plugins = JSON.parse(content);
  } catch (error) {
    return {
      plugins: [],
      errors: [`Error reading ${path.basename(filePath)}: ${error.message}`],
      warnings: [],
    };
  }

  const { errors, warnings } = validateExternalPlugins(plugins, options);
  return { plugins, errors, warnings };
}
