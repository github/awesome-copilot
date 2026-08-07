import fs from "fs";
import path from "path";

const AWESOME_COPILOT_NAMESPACE = "com.github.awesome-copilot";

function extensionIdFromReference(reference) {
  if (typeof reference !== "string" || !reference.startsWith("./extensions/")) {
    return null;
  }

  return reference.replace(/^\.\/extensions\//, "").replace(/\/$/, "");
}

export function buildExtensionPluginOwners(pluginEntries) {
  const owners = new Map();
  const sortedEntries = [...pluginEntries].sort((a, b) =>
    a.directoryName.localeCompare(b.directoryName)
  );

  for (const { directoryName, manifest } of sortedEntries) {
    const pluginName =
      typeof manifest?.name === "string" && manifest.name.trim()
        ? manifest.name.trim()
        : directoryName;
    const extensionIds = new Set([directoryName]);
    const references =
      manifest?.extensions?.[AWESOME_COPILOT_NAMESPACE]?.extensions;

    if (Array.isArray(references)) {
      for (const reference of references) {
        const extensionId = extensionIdFromReference(reference);
        if (extensionId) {
          extensionIds.add(extensionId);
        }
      }
    }

    for (const extensionId of extensionIds) {
      const pluginNames = owners.get(extensionId) ?? [];
      if (!pluginNames.includes(pluginName)) {
        pluginNames.push(pluginName);
      }
      owners.set(extensionId, pluginNames);
    }
  }

  return owners;
}

export function readExtensionPluginOwners(pluginsDir) {
  if (!fs.existsSync(pluginsDir)) {
    return new Map();
  }

  const pluginEntries = fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(pluginsDir, entry.name, "plugin.json");
      if (!fs.existsSync(manifestPath)) {
        return null;
      }

      return {
        directoryName: entry.name,
        manifest: JSON.parse(fs.readFileSync(manifestPath, "utf-8")),
      };
    })
    .filter(Boolean);

  return buildExtensionPluginOwners(pluginEntries);
}

export function resolveExtensionPluginName(extensionId, owners) {
  const pluginNames = owners.get(extensionId) ?? [];
  return (
    pluginNames.find((pluginName) => pluginName === extensionId) ??
    pluginNames[0] ??
    extensionId
  );
}
