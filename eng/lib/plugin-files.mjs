import fs from "node:fs";
import path from "node:path";

const AWESOME_COPILOT_NAMESPACE = "com.github.awesome-copilot";
const FIELD_NAME = `extensions["${AWESOME_COPILOT_NAMESPACE}"].pluginFiles`;

function isWithinRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function inspectPluginFiles(plugin, pluginDir) {
  const value = plugin.extensions?.[AWESOME_COPILOT_NAMESPACE]?.pluginFiles;
  if (value === undefined) {
    return { entries: [], errors: [] };
  }
  if (!Array.isArray(value)) {
    return { entries: [], errors: [`${FIELD_NAME} must be an array`] };
  }

  const errors = [];
  const entries = [];
  const sorted = [...value].sort((left, right) =>
    typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right)
      : 0
  );
  if (value.some((entry, index) => entry !== sorted[index])) {
    errors.push(`${FIELD_NAME} must be sorted alphabetically`);
  }
  if (new Set(value).size !== value.length) {
    errors.push(`${FIELD_NAME} must not contain duplicate references`);
  }

  const pluginRoot = fs.realpathSync(pluginDir);
  for (let index = 0; index < value.length; index++) {
    const reference = value[index];
    const entryName = `${FIELD_NAME}[${index}]`;
    if (typeof reference !== "string") {
      errors.push(`${entryName} must be a string`);
      continue;
    }
    if (!reference.startsWith("./")) {
      errors.push(`${entryName} must start with "./"`);
      continue;
    }
    if (reference.includes("\\")) {
      errors.push(`${entryName} must use forward slashes`);
      continue;
    }

    const relativePath = reference.slice(2);
    const isDirectoryReference = relativePath.endsWith("/");
    const segments = relativePath.replace(/\/$/, "").split("/");
    if (segments.length === 0 || segments.some((segment) => !segment || segment === "." || segment === "..")) {
      errors.push(`${entryName} must be a normalized path within the plugin root`);
      continue;
    }

    const targetPath = path.resolve(pluginDir, ...segments);
    if (!isWithinRoot(pluginRoot, targetPath)) {
      errors.push(`${entryName} must stay within the plugin root`);
      continue;
    }
    if (!fs.existsSync(targetPath)) {
      errors.push(`${entryName} source not found: ${reference}`);
      continue;
    }

    let realTarget;
    try {
      realTarget = fs.realpathSync(targetPath);
    } catch (error) {
      errors.push(`${entryName} could not be resolved: ${error.message}`);
      continue;
    }
    if (!isWithinRoot(pluginRoot, realTarget)) {
      errors.push(`${entryName} must not resolve outside the plugin root`);
      continue;
    }

    const stats = fs.statSync(targetPath);
    if (isDirectoryReference && !stats.isDirectory()) {
      errors.push(`${entryName} ends with "/" but does not reference a directory`);
      continue;
    }
    if (!isDirectoryReference && stats.isDirectory()) {
      errors.push(`${entryName} references a directory and must end with "/"`);
      continue;
    }

    entries.push({ reference, path: targetPath, isDirectory: stats.isDirectory() });
  }

  return { entries, errors };
}
