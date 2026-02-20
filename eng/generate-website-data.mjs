#!/usr/bin/env node

/**
 * Generate JSON metadata files for the GitHub Pages website.
 * This script extracts metadata from agents, prompts, instructions, skills, and plugins
 * and writes them to website/data/ for client-side search and display.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    AGENTS_DIR,
    COOKBOOK_DIR,
    HOOKS_DIR,
    INSTRUCTIONS_DIR,
    PLUGINS_DIR,
    PROMPTS_DIR,
    ROOT_FOLDER,
    SKILLS_DIR,
    WORKFLOWS_DIR
} from "./constants.mjs";
import { getGitFileDates } from "./utils/git-dates.mjs";
import {
    parseFrontmatter,
    parseSkillMetadata,
    parseHookMetadata,
    parseWorkflowMetadata,
    parseYamlFile,
} from "./yaml-parser.mjs";

const __filename = fileURLToPath(import.meta.url);

const WEBSITE_DIR = path.join(ROOT_FOLDER, "website");
const WEBSITE_DATA_DIR = path.join(WEBSITE_DIR, "public", "data");
const WEBSITE_SOURCE_DATA_DIR = path.join(WEBSITE_DIR, "data");

/**
 * Ensure the output directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(WEBSITE_DATA_DIR)) {
    fs.mkdirSync(WEBSITE_DATA_DIR, { recursive: true });
  }
}

/**
 * Extract title from filename or frontmatter
 */
function extractTitle(filePath, frontmatter) {
  if (frontmatter?.name) {
    return frontmatter.name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  // Fallback to filename
  const basename = path.basename(filePath);
  const name = basename
    .replace(/\.(agent|prompt|instructions)\.md$/, "")
    .replace(/\.md$/, "");
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate agents metadata
 */
function generateAgentsData(gitDates) {
  const agents = [];
  const files = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".agent.md"));

  // Track all unique values for filters
  const allModels = new Set();
  const allTools = new Set();

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    const frontmatter = parseFrontmatter(filePath);
    const relativePath = path
      .relative(ROOT_FOLDER, filePath)
      .replace(/\\/g, "/");

    const model = frontmatter?.model || null;
    const tools = frontmatter?.tools || [];
    const handoffs = frontmatter?.handoffs || [];

    // Track unique values
    if (model) allModels.add(model);
    tools.forEach((t) => allTools.add(t));

    agents.push({
      id: file.replace(".agent.md", ""),
      title: extractTitle(filePath, frontmatter),
      description: frontmatter?.description || "",
      model: model,
      tools: tools,
      hasHandoffs: handoffs.length > 0,
      handoffs: handoffs.map((h) => ({
        label: h.label || "",
        agent: h.agent || "",
      })),
      mcpServers: frontmatter?.["mcp-servers"]
        ? Object.keys(frontmatter["mcp-servers"])
        : [],
      path: relativePath,
      filename: file,
      lastUpdated: gitDates.get(relativePath) || null,
    });
  }

  // Sort and return with filter metadata
  const sortedAgents = agents.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: sortedAgents,
    filters: {
      models: ["(none)", ...Array.from(allModels).sort()],
      tools: Array.from(allTools).sort(),
    },
  };
}

/**
 * Generate hooks metadata
 */
/**
 * Generate hooks metadata (similar to skills - folder-based)
 */
function generateHooksData(gitDates) {
  const hooks = [];
  
  // Check if hooks directory exists
  if (!fs.existsSync(HOOKS_DIR)) {
    return {
      items: hooks,
      filters: {
        hooks: [],
        tags: [],
      },
    };
  }

  // Get all hook folders (directories)
  const hookFolders = fs.readdirSync(HOOKS_DIR).filter((file) => {
    const filePath = path.join(HOOKS_DIR, file);
    return fs.statSync(filePath).isDirectory();
  });

  // Track all unique values for filters
  const allHookTypes = new Set();
  const allTags = new Set();

  for (const folder of hookFolders) {
    const hookPath = path.join(HOOKS_DIR, folder);
    const metadata = parseHookMetadata(hookPath);
    if (!metadata) continue;

    const relativePath = path
      .relative(ROOT_FOLDER, hookPath)
      .replace(/\\/g, "/");
    const readmeRelativePath = `${relativePath}/README.md`;

    // Track unique values
    (metadata.hooks || []).forEach((h) => allHookTypes.add(h));
    (metadata.tags || []).forEach((t) => allTags.add(t));

    hooks.push({
      id: folder,
      title: metadata.name,
      description: metadata.description,
      hooks: metadata.hooks || [],
      tags: metadata.tags || [],
      assets: metadata.assets || [],
      path: relativePath,
      readmeFile: readmeRelativePath,
      lastUpdated: gitDates.get(readmeRelativePath) || null,
    });
  }

  // Sort and return with filter metadata
  const sortedHooks = hooks.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: sortedHooks,
    filters: {
      hooks: Array.from(allHookTypes).sort(),
      tags: Array.from(allTags).sort(),
    },
  };
}

/**
 * Generate workflows metadata (folder-based, similar to hooks)
 */
function generateWorkflowsData(gitDates) {
  const workflows = [];

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return {
      items: workflows,
      filters: {
        triggers: [],
        tags: [],
      },
    };
  }

  const workflowFolders = fs.readdirSync(WORKFLOWS_DIR).filter((file) => {
    const filePath = path.join(WORKFLOWS_DIR, file);
    return fs.statSync(filePath).isDirectory();
  });

  const allTriggers = new Set();
  const allTags = new Set();

  for (const folder of workflowFolders) {
    const workflowPath = path.join(WORKFLOWS_DIR, folder);
    const metadata = parseWorkflowMetadata(workflowPath);
    if (!metadata) continue;

    const relativePath = path
      .relative(ROOT_FOLDER, workflowPath)
      .replace(/\\/g, "/");
    const readmeRelativePath = `${relativePath}/README.md`;

    (metadata.triggers || []).forEach((t) => allTriggers.add(t));
    (metadata.tags || []).forEach((t) => allTags.add(t));

    workflows.push({
      id: folder,
      title: metadata.name,
      description: metadata.description,
      triggers: metadata.triggers || [],
      tags: metadata.tags || [],
      assets: metadata.assets || [],
      path: relativePath,
      readmeFile: readmeRelativePath,
      lastUpdated: gitDates.get(readmeRelativePath) || null,
    });
  }

  const sortedWorkflows = workflows.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: sortedWorkflows,
    filters: {
      triggers: Array.from(allTriggers).sort(),
      tags: Array.from(allTags).sort(),
    },
  };
}

/**
 * Generate prompts metadata
 */
function generatePromptsData(gitDates) {
  const prompts = [];
  const files = fs
    .readdirSync(PROMPTS_DIR)
    .filter((f) => f.endsWith(".prompt.md"));

  // Track all unique tools for filters
  const allTools = new Set();

  for (const file of files) {
    const filePath = path.join(PROMPTS_DIR, file);
    const frontmatter = parseFrontmatter(filePath);
    const relativePath = path
      .relative(ROOT_FOLDER, filePath)
      .replace(/\\/g, "/");

    const tools = frontmatter?.tools || [];
    tools.forEach((t) => allTools.add(t));

    prompts.push({
      id: file.replace(".prompt.md", ""),
      title: extractTitle(filePath, frontmatter),
      description: frontmatter?.description || "",
      agent: frontmatter?.agent || null,
      model: frontmatter?.model || null,
      tools: tools,
      path: relativePath,
      filename: file,
      lastUpdated: gitDates.get(relativePath) || null,
    });
  }

  const sortedPrompts = prompts.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: sortedPrompts,
    filters: {
      tools: Array.from(allTools).sort(),
    },
  };
}

/**
 * Parse applyTo field into an array of patterns
 */
function parseApplyToPatterns(applyTo) {
  if (!applyTo) return [];

  // Handle array format
  if (Array.isArray(applyTo)) {
    return applyTo.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  // Handle string format (comma-separated)
  if (typeof applyTo === "string") {
    return applyTo
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  return [];
}

/**
 * Extract file extension from a glob pattern
 */
function extractExtensionFromPattern(pattern) {
  // Match patterns like **.ts, **/*.js, *.py, etc.
  const match = pattern.match(/\*\.(\w+)$/);
  if (match) return `.${match[1]}`;

  // Match patterns like **/*.{ts,tsx}
  const braceMatch = pattern.match(/\*\.\{([^}]+)\}$/);
  if (braceMatch) {
    return braceMatch[1].split(",").map((ext) => `.${ext.trim()}`);
  }

  return null;
}

/**
 * Generate instructions metadata
 */
function generateInstructionsData(gitDates) {
  const instructions = [];
  const files = fs
    .readdirSync(INSTRUCTIONS_DIR)
    .filter((f) => f.endsWith(".instructions.md"));

  // Track all unique patterns and extensions for filters
  const allPatterns = new Set();
  const allExtensions = new Set();

  for (const file of files) {
    const filePath = path.join(INSTRUCTIONS_DIR, file);
    const frontmatter = parseFrontmatter(filePath);
    const relativePath = path
      .relative(ROOT_FOLDER, filePath)
      .replace(/\\/g, "/");

    const applyToRaw = frontmatter?.applyTo || null;
    const applyToPatterns = parseApplyToPatterns(applyToRaw);

    // Extract extensions from patterns
    const extensions = [];
    for (const pattern of applyToPatterns) {
      allPatterns.add(pattern);
      const ext = extractExtensionFromPattern(pattern);
      if (ext) {
        if (Array.isArray(ext)) {
          ext.forEach((e) => {
            extensions.push(e);
            allExtensions.add(e);
          });
        } else {
          extensions.push(ext);
          allExtensions.add(ext);
        }
      }
    }

    instructions.push({
      id: file.replace(".instructions.md", ""),
      title: extractTitle(filePath, frontmatter),
      description: frontmatter?.description || "",
      applyTo: applyToRaw,
      applyToPatterns: applyToPatterns,
      extensions: [...new Set(extensions)],
      path: relativePath,
      filename: file,
      lastUpdated: gitDates.get(relativePath) || null,
    });
  }

  const sortedInstructions = instructions.sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return {
    items: sortedInstructions,
    filters: {
      patterns: Array.from(allPatterns).sort(),
      extensions: ["(none)", ...Array.from(allExtensions).sort()],
    },
  };
}

/**
 * Categorize a skill based on its name and description
 */
function categorizeSkill(name, description) {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes("azure") || text.includes("appinsights")) return "Azure";
  if (
    text.includes("github") ||
    text.includes("gh-cli") ||
    text.includes("git-commit") ||
    text.includes("git ")
  )
    return "Git & GitHub";
  if (text.includes("vscode") || text.includes("vs code")) return "VS Code";
  if (
    text.includes("test") ||
    text.includes("qa") ||
    text.includes("playwright")
  )
    return "Testing";
  if (
    text.includes("microsoft") ||
    text.includes("m365") ||
    text.includes("workiq")
  )
    return "Microsoft";
  if (text.includes("cli") || text.includes("command")) return "CLI Tools";
  if (
    text.includes("diagram") ||
    text.includes("plantuml") ||
    text.includes("visual")
  )
    return "Diagrams";
  if (
    text.includes("nuget") ||
    text.includes("dotnet") ||
    text.includes(".net")
  )
    return ".NET";

  return "Other";
}

/**
 * Generate skills metadata
 */
function generateSkillsData(gitDates) {
  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    return { items: [], filters: { categories: [], hasAssets: ["Yes", "No"] } };
  }

  const folders = fs
    .readdirSync(SKILLS_DIR)
    .filter((f) => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());

  const allCategories = new Set();

  for (const folder of folders) {
    const skillPath = path.join(SKILLS_DIR, folder);
    const metadata = parseSkillMetadata(skillPath);

    if (metadata) {
      const relativePath = path
        .relative(ROOT_FOLDER, skillPath)
        .replace(/\\/g, "/");
      const category = categorizeSkill(metadata.name, metadata.description);
      allCategories.add(category);

      // Get all files in the skill folder recursively
      const files = getSkillFiles(skillPath, relativePath);

      // Get last updated from SKILL.md file
      const skillFilePath = `${relativePath}/SKILL.md`;

      skills.push({
        id: folder,
        name: metadata.name,
        title: metadata.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        description: metadata.description,
        assets: metadata.assets,
        hasAssets: metadata.assets.length > 0,
        assetCount: metadata.assets.length,
        category: category,
        path: relativePath,
        skillFile: skillFilePath,
        files: files,
        lastUpdated: gitDates.get(skillFilePath) || null,
      });
    }
  }

  const sortedSkills = skills.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: sortedSkills,
    filters: {
      categories: Array.from(allCategories).sort(),
      hasAssets: ["Yes", "No"],
    },
  };
}

/**
 * Get all files in a skill folder recursively
 */
function getSkillFiles(skillPath, relativePath) {
  const files = [];

  function walkDir(dir, relDir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else {
        // Get file size
        const stats = fs.statSync(fullPath);
        files.push({
          path: `${relativePath}/${relPath}`,
          name: relPath,
          size: stats.size,
        });
      }
    }
  }

  walkDir(skillPath, "");
  return files;
}

/**
 * Generate plugins metadata
 */
function generatePluginsData(gitDates) {
  const plugins = [];

  if (!fs.existsSync(PLUGINS_DIR)) {
    return { items: [], filters: { tags: [] } };
  }

  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of pluginDirs) {
    const pluginDir = path.join(PLUGINS_DIR, dir.name);
    const jsonPath = path.join(pluginDir, ".github/plugin", "plugin.json");

    if (!fs.existsSync(jsonPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const relPath = `plugins/${dir.name}`;
      const dates = gitDates[relPath] || gitDates[`${relPath}/`] || {};

      // Build items list from spec fields (agents, commands, skills)
      const items = [
        ...(data.agents || []).map(p => ({ kind: "agent", path: p })),
        ...(data.commands || []).map(p => ({ kind: "prompt", path: p })),
        ...(data.skills || []).map(p => ({ kind: "skill", path: p })),
      ];

      const tags = data.keywords || data.tags || [];

      plugins.push({
        id: dir.name,
        name: data.name || dir.name,
        description: data.description || "",
        path: relPath,
        tags: tags,
        itemCount: items.length,
        items: items,
        lastUpdated: dates.lastModified || null,
        searchText: `${data.name || dir.name} ${data.description || ""} ${tags.join(" ")}`.toLowerCase(),
      });
    } catch (e) {
      console.warn(`Failed to parse plugin: ${dir.name}`, e.message);
    }
  }

  // Collect all unique tags
  const allTags = [...new Set(plugins.flatMap(p => p.tags))].sort();

  const sortedPlugins = plugins.sort((a, b) => a.name.localeCompare(b.name));

  return {
    items: sortedPlugins,
    filters: { tags: allTags }
  };
}

/**
 * Generate tools metadata from website/data/tools.yml
 */
function generateToolsData() {
  const toolsFile = path.join(WEBSITE_SOURCE_DATA_DIR, "tools.yml");

  if (!fs.existsSync(toolsFile)) {
    console.warn("No tools.yml file found at", toolsFile);
    return { items: [], filters: { categories: [], tags: [] } };
  }

  const data = parseYamlFile(toolsFile);

  if (!data || !data.tools) {
    return { items: [], filters: { categories: [], tags: [] } };
  }

  const allCategories = new Set();
  const allTags = new Set();

  const tools = data.tools.map((tool) => {
    const category = tool.category || "Other";
    allCategories.add(category);

    const tags = tool.tags || [];
    tags.forEach((t) => allTags.add(t));

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description || "",
      category: category,
      featured: tool.featured || false,
      requirements: tool.requirements || [],
      features: tool.features || [],
      links: tool.links || {},
      configuration: tool.configuration || null,
      tags: tags,
    };
  });

  // Sort with featured first, then alphabetically
  const sortedTools = tools.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    items: sortedTools,
    filters: {
      categories: Array.from(allCategories).sort(),
      tags: Array.from(allTags).sort(),
    },
  };
}

/**
 * Generate a combined index for search
 */
function generateSearchIndex(
  agents,
  prompts,
  instructions,
  hooks,
  workflows,
  skills,
  plugins
) {
  const index = [];

  for (const agent of agents) {
    index.push({
      type: "agent",
      id: agent.id,
      title: agent.title,
      description: agent.description,
      path: agent.path,
      lastUpdated: agent.lastUpdated,
      searchText: `${agent.title} ${agent.description} ${agent.tools.join(
        " "
      )}`.toLowerCase(),
    });
  }

  for (const prompt of prompts) {
    index.push({
      type: "prompt",
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      path: prompt.path,
      lastUpdated: prompt.lastUpdated,
      searchText: `${prompt.title} ${prompt.description}`.toLowerCase(),
    });
  }

  for (const instruction of instructions) {
    index.push({
      type: "instruction",
      id: instruction.id,
      title: instruction.title,
      description: instruction.description,
      path: instruction.path,
      lastUpdated: instruction.lastUpdated,
      searchText: `${instruction.title} ${instruction.description} ${
        instruction.applyTo || ""
      }`.toLowerCase(),
    });
  }

  for (const hook of hooks) {
    index.push({
      type: "hook",
      id: hook.id,
      title: hook.title,
      description: hook.description,
      path: hook.readmeFile,
      lastUpdated: hook.lastUpdated,
      searchText: `${hook.title} ${hook.description} ${hook.hooks.join(
        " "
      )} ${hook.tags.join(" ")}`.toLowerCase(),
    });
  }

  for (const workflow of workflows) {
    index.push({
      type: "workflow",
      id: workflow.id,
      title: workflow.title,
      description: workflow.description,
      path: workflow.readmeFile,
      lastUpdated: workflow.lastUpdated,
      searchText: `${workflow.title} ${workflow.description} ${workflow.triggers.join(
        " "
      )} ${workflow.tags.join(" ")}`.toLowerCase(),
    });
  }

  for (const skill of skills) {
    index.push({
      type: "skill",
      id: skill.id,
      title: skill.title,
      description: skill.description,
      path: skill.skillFile,
      lastUpdated: skill.lastUpdated,
      searchText: `${skill.title} ${skill.description}`.toLowerCase(),
    });
  }

  for (const plugin of plugins) {
    index.push({
      type: "plugin",
      id: plugin.id,
      title: plugin.name,
      description: plugin.description,
      path: plugin.path,
      tags: plugin.tags,
      lastUpdated: plugin.lastUpdated,
      searchText: plugin.searchText,
    });
  }

  return index;
}

/**
 * Generate samples/cookbook data from cookbook.yml
 */
function generateSamplesData() {
  const cookbookYamlPath = path.join(COOKBOOK_DIR, "cookbook.yml");

  if (!fs.existsSync(cookbookYamlPath)) {
    console.warn(
      "Warning: cookbook/cookbook.yml not found, skipping samples generation"
    );
    return {
      cookbooks: [],
      totalRecipes: 0,
      totalCookbooks: 0,
      filters: { languages: [], tags: [] },
    };
  }

  const cookbookManifest = parseYamlFile(cookbookYamlPath);
  if (!cookbookManifest || !cookbookManifest.cookbooks) {
    console.warn("Warning: Invalid cookbook.yml format");
    return {
      cookbooks: [],
      totalRecipes: 0,
      totalCookbooks: 0,
      filters: { languages: [], tags: [] },
    };
  }

  const allLanguages = new Set();
  const allTags = new Set();
  let totalRecipes = 0;

  const cookbooks = cookbookManifest.cookbooks.map((cookbook) => {
    // Collect languages
    cookbook.languages.forEach((lang) => allLanguages.add(lang.id));

    // Process recipes and add file paths
    const recipes = cookbook.recipes.map((recipe) => {
      // Collect tags
      if (recipe.tags) {
        recipe.tags.forEach((tag) => allTags.add(tag));
      }

      // Build variants with file paths for each language
      const variants = {};
      cookbook.languages.forEach((lang) => {
        const docPath = `${cookbook.path}/${lang.id}/${recipe.id}.md`;
        const examplePath = `${cookbook.path}/${lang.id}/recipe/${recipe.id}${lang.extension}`;

        // Check if files exist
        const docFullPath = path.join(ROOT_FOLDER, docPath);
        const exampleFullPath = path.join(ROOT_FOLDER, examplePath);

        if (fs.existsSync(docFullPath)) {
          variants[lang.id] = {
            doc: docPath,
            example: fs.existsSync(exampleFullPath) ? examplePath : null,
          };
        }
      });

      totalRecipes++;

      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        tags: recipe.tags || [],
        variants,
      };
    });

    return {
      id: cookbook.id,
      name: cookbook.name,
      description: cookbook.description,
      path: cookbook.path,
      featured: cookbook.featured || false,
      languages: cookbook.languages,
      recipes,
    };
  });

  return {
    cookbooks,
    totalRecipes,
    totalCookbooks: cookbooks.length,
    filters: {
      languages: Array.from(allLanguages).sort(),
      tags: Array.from(allTags).sort(),
    },
  };
}

/**
 * Main function
 */
async function main() {
  console.log("Generating website data...\n");

  ensureDataDir();

  // Load git dates for all resource files (single efficient git command)
  console.log("Loading git history for last updated dates...");
  const gitDates = getGitFileDates(
    ["agents/", "prompts/", "instructions/", "hooks/", "workflows/", "skills/", "plugins/"],
    ROOT_FOLDER
  );
  console.log(`✓ Loaded dates for ${gitDates.size} files\n`);

  // Generate all data
  const agentsData = generateAgentsData(gitDates);
  const agents = agentsData.items;
  console.log(
    `✓ Generated ${agents.length} agents (${agentsData.filters.models.length} models, ${agentsData.filters.tools.length} tools)`
  );

  const hooksData = generateHooksData(gitDates);
  const hooks = hooksData.items;
  console.log(
    `✓ Generated ${hooks.length} hooks (${hooksData.filters.hooks.length} hook types, ${hooksData.filters.tags.length} tags)`
  );

  const workflowsData = generateWorkflowsData(gitDates);
  const workflows = workflowsData.items;
  console.log(
    `✓ Generated ${workflows.length} workflows (${workflowsData.filters.triggers.length} triggers, ${workflowsData.filters.tags.length} tags)`
  );

  const promptsData = generatePromptsData(gitDates);
  const prompts = promptsData.items;
  console.log(
    `✓ Generated ${prompts.length} prompts (${promptsData.filters.tools.length} tools)`
  );

  const instructionsData = generateInstructionsData(gitDates);
  const instructions = instructionsData.items;
  console.log(
    `✓ Generated ${instructions.length} instructions (${instructionsData.filters.extensions.length} extensions)`
  );

  const skillsData = generateSkillsData(gitDates);
  const skills = skillsData.items;
  console.log(
    `✓ Generated ${skills.length} skills (${skillsData.filters.categories.length} categories)`
  );

  const pluginsData = generatePluginsData(gitDates);
  const plugins = pluginsData.items;
  console.log(
    `✓ Generated ${plugins.length} plugins (${pluginsData.filters.tags.length} tags)`
  );

  const toolsData = generateToolsData();
  const tools = toolsData.items;
  console.log(
    `✓ Generated ${tools.length} tools (${toolsData.filters.categories.length} categories)`
  );

  const samplesData = generateSamplesData();
  console.log(
    `✓ Generated ${samplesData.totalRecipes} recipes in ${samplesData.totalCookbooks} cookbooks (${samplesData.filters.languages.length} languages, ${samplesData.filters.tags.length} tags)`
  );

  const searchIndex = generateSearchIndex(
    agents,
    prompts,
    instructions,
    hooks,
    workflows,
    skills,
    plugins
  );
  console.log(`✓ Generated search index with ${searchIndex.length} items`);

  // Write JSON files
  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "agents.json"),
    JSON.stringify(agentsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "hooks.json"),
    JSON.stringify(hooksData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "workflows.json"),
    JSON.stringify(workflowsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "prompts.json"),
    JSON.stringify(promptsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "instructions.json"),
    JSON.stringify(instructionsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "skills.json"),
    JSON.stringify(skillsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "plugins.json"),
    JSON.stringify(pluginsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "tools.json"),
    JSON.stringify(toolsData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "samples.json"),
    JSON.stringify(samplesData, null, 2)
  );

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "search-index.json"),
    JSON.stringify(searchIndex, null, 2)
  );

  // Generate a manifest with counts and timestamps
  const manifest = {
    generated: new Date().toISOString(),
    counts: {
      agents: agents.length,
      prompts: prompts.length,
      instructions: instructions.length,
      skills: skills.length,
      hooks: hooks.length,
      workflows: workflows.length,
      plugins: plugins.length,
      tools: tools.length,
      samples: samplesData.totalRecipes,
      total: searchIndex.length,
    },
  };

  fs.writeFileSync(
    path.join(WEBSITE_DATA_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\n✓ All data written to website/public/data/`);
}

main().catch((err) => {
  console.error("Error generating website data:", err);
  process.exit(1);
});
