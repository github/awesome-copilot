#!/usr/bin/env node

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  AGENTS_DIR,
  INSTRUCTIONS_DIR,
  PLUGINS_DIR,
  ROOT_FOLDER,
  SKILLS_DIR,
} from "./constants.mjs";

const OUTPUT_FILE = path.join(ROOT_FOLDER, ".github/plugin", "update-index.json");

function sha256FromString(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return sha256FromString(content);
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

  return sha256FromString(files.join("\n"));
}

function addResource(resourceMap, resource) {
  resourceMap.set(resource.id, {
    ...resource,
    providers: [],
  });
}

function collectBaseResources() {
  const resourceMap = new Map();

  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter((file) => file.endsWith(".agent.md"))
    .sort();

  for (const fileName of agentFiles) {
    const slug = fileName.replace(/\.agent\.md$/, "");
    const absolutePath = path.join(AGENTS_DIR, fileName);
    const relativePath = normalizePath(path.relative(ROOT_FOLDER, absolutePath));
    addResource(resourceMap, {
      id: `agent/${slug}`,
      type: "agent",
      name: slug,
      sourcePath: relativePath,
      integrity: {
        algorithm: "sha256",
        hash: hashFile(absolutePath),
      },
    });
  }

  const instructionFiles = fs.readdirSync(INSTRUCTIONS_DIR)
    .filter((file) => file.endsWith(".instructions.md"))
    .sort();

  for (const fileName of instructionFiles) {
    const slug = fileName.replace(/\.instructions\.md$/, "");
    const absolutePath = path.join(INSTRUCTIONS_DIR, fileName);
    const relativePath = normalizePath(path.relative(ROOT_FOLDER, absolutePath));
    addResource(resourceMap, {
      id: `instruction/${slug}`,
      type: "instruction",
      name: slug,
      sourcePath: relativePath,
      integrity: {
        algorithm: "sha256",
        hash: hashFile(absolutePath),
      },
    });
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skillName of skillDirs) {
    const skillDirPath = path.join(SKILLS_DIR, skillName);
    const skillFile = path.join(skillDirPath, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      continue;
    }

    const relativePath = normalizePath(path.relative(ROOT_FOLDER, skillDirPath));
    addResource(resourceMap, {
      id: `skill/${skillName}`,
      type: "skill",
      name: skillName,
      sourcePath: relativePath,
      integrity: {
        algorithm: "sha256",
        hash: hashDirectory(skillDirPath),
      },
    });
  }

  return resourceMap;
}

function resolveAgentSlugsFromPlugin(pluginPath, pluginJson) {
  const slugs = new Set();
  const refs = Array.isArray(pluginJson.agents) ? pluginJson.agents : [];

  for (const ref of refs) {
    if (ref === "./agents" || ref === "./agents/") {
      const materializedDir = path.join(pluginPath, "agents");
      if (!fs.existsSync(materializedDir)) {
        continue;
      }
      const files = fs.readdirSync(materializedDir)
        .filter((file) => file.endsWith(".md"));
      for (const fileName of files) {
        slugs.add(fileName.replace(/\.md$/, ""));
      }
      continue;
    }

    if (ref.startsWith("./agents/") && ref.endsWith(".md")) {
      slugs.add(path.basename(ref, ".md"));
    }
  }

  return [...slugs].sort();
}

function resolveSkillSlugsFromPlugin(pluginPath, pluginJson) {
  const slugs = new Set();
  const refs = Array.isArray(pluginJson.skills) ? pluginJson.skills : [];

  for (const ref of refs) {
    if (ref === "./skills" || ref === "./skills/") {
      const materializedDir = path.join(pluginPath, "skills");
      if (!fs.existsSync(materializedDir)) {
        continue;
      }

      const dirs = fs.readdirSync(materializedDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      for (const dirName of dirs) {
        const skillMarker = path.join(materializedDir, dirName, "SKILL.md");
        if (fs.existsSync(skillMarker)) {
          slugs.add(dirName);
        }
      }
      continue;
    }

    if (ref.startsWith("./skills/")) {
      const skillName = ref.replace(/^\.\/skills\//, "").replace(/\/$/, "");
      if (skillName.length > 0) {
        slugs.add(skillName);
      }
    }
  }

  return [...slugs].sort();
}

function attachProvider(resourceMap, resourceId, provider) {
  const resource = resourceMap.get(resourceId);
  if (!resource) {
    return;
  }

  const existing = resource.providers.some((p) => p.plugin === provider.plugin);
  if (!existing) {
    resource.providers.push(provider);
  }
}

function collectPluginMetadata(resourceMap) {
  const plugins = [];

  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const dirName of pluginDirs) {
    const pluginPath = path.join(PLUGINS_DIR, dirName);
    const pluginJsonPath = path.join(pluginPath, ".github/plugin/plugin.json");
    if (!fs.existsSync(pluginJsonPath)) {
      continue;
    }

    const pluginJson = readJson(pluginJsonPath);
    if (!pluginJson || typeof pluginJson.name !== "string") {
      continue;
    }

    const pluginName = pluginJson.name;
    const pluginVersion = typeof pluginJson.version === "string" ? pluginJson.version : "1.0.0";

    const agentSlugs = resolveAgentSlugsFromPlugin(pluginPath, pluginJson);
    const skillSlugs = resolveSkillSlugsFromPlugin(pluginPath, pluginJson);

    for (const slug of agentSlugs) {
      attachProvider(resourceMap, `agent/${slug}`, {
        plugin: pluginName,
        pluginVersion,
      });
    }

    for (const slug of skillSlugs) {
      attachProvider(resourceMap, `skill/${slug}`, {
        plugin: pluginName,
        pluginVersion,
      });
    }

    const providerFingerprints = [];
    for (const slug of agentSlugs) {
      const resource = resourceMap.get(`agent/${slug}`);
      if (resource) {
        providerFingerprints.push(`agent/${slug}:${resource.integrity.hash}`);
      }
    }
    for (const slug of skillSlugs) {
      const resource = resourceMap.get(`skill/${slug}`);
      if (resource) {
        providerFingerprints.push(`skill/${slug}:${resource.integrity.hash}`);
      }
    }

    providerFingerprints.sort();

    plugins.push({
      name: pluginName,
      version: pluginVersion,
      resourceCounts: {
        agents: agentSlugs.length,
        skills: skillSlugs.length,
      },
      integrity: {
        algorithm: "sha256",
        hash: sha256FromString(providerFingerprints.join("\n")),
      },
    });
  }

  return plugins;
}

function generateUpdateIndex() {
  console.log("Generating update-index.json...");

  const resourceMap = collectBaseResources();
  const plugins = collectPluginMetadata(resourceMap);

  const resources = [...resourceMap.values()]
    .map((resource) => ({
      ...resource,
      providers: resource.providers.sort((a, b) => {
        if (a.plugin === b.plugin) {
          return a.pluginVersion.localeCompare(b.pluginVersion);
        }
        return a.plugin.localeCompare(b.plugin);
      }),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const updateIndex = {
    name: "awesome-copilot-update-index",
    schemaVersion: "1.0.0",
    summary: {
      resourceCount: resources.length,
      pluginCount: plugins.length,
    },
    resources,
    plugins,
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updateIndex, null, 2) + "\n", "utf8");

  console.log(`✓ Wrote ${OUTPUT_FILE}`);
  console.log(`  Resources: ${resources.length}`);
  console.log(`  Plugins: ${plugins.length}`);
}

generateUpdateIndex();
