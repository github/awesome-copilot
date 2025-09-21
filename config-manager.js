const fs = require("fs");
const path = require("path");

const { parseConfigYamlContent } = require("./apply-config");
const { objectToYaml, generateConfigHeader, getAvailableItems } = require("./generate-config");
const { parseCollectionYaml } = require("./yaml-parser");

const DEFAULT_CONFIG_PATH = "awesome-copilot.config.yml";
const SECTION_METADATA = {
  prompts: { dir: "prompts", ext: ".prompt.md", label: "Prompts", singular: "prompt" },
  instructions: { dir: "instructions", ext: ".instructions.md", label: "Instructions", singular: "instruction" },
  chatmodes: { dir: "chatmodes", ext: ".chatmode.md", label: "Chat Modes", singular: "chat mode" },
  collections: { dir: "collections", ext: ".collection.yml", label: "Collections", singular: "collection" }
};
const CONFIG_SECTIONS = Object.keys(SECTION_METADATA);

function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const rawContent = fs.readFileSync(configPath, "utf8");
  const { header, body } = splitHeaderAndBody(rawContent);
  const parsed = parseConfigYamlContent(body || "");
  const config = ensureConfigStructure(parsed || {});

  return { config, header };
}

function saveConfig(configPath, config, header) {
  const ensuredConfig = ensureConfigStructure(config || {});
  const sortedConfig = sortConfigSections(ensuredConfig);
  const yamlContent = objectToYaml(sortedConfig);
  const headerContent = formatHeader(header);

  fs.writeFileSync(configPath, headerContent + yamlContent);
}

function splitHeaderAndBody(content) {
  const lines = content.split("\n");
  const headerLines = [];
  let firstBodyIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      headerLines.push(lines[i]);
      firstBodyIndex = i + 1;
    } else {
      firstBodyIndex = i;
      break;
    }
  }

  const header = headerLines.join("\n");
  const body = lines.slice(firstBodyIndex).join("\n");

  return { header, body };
}

function ensureConfigStructure(config) {
  const sanitized = typeof config === "object" && config !== null ? { ...config } : {};

  if (!sanitized.version) {
    sanitized.version = "1.0";
  }

  const project = typeof sanitized.project === "object" && sanitized.project !== null ? { ...sanitized.project } : {};
  if (project.output_directory === undefined) {
    project.output_directory = ".awesome-copilot";
  }
  sanitized.project = project;

  CONFIG_SECTIONS.forEach(section => {
    sanitized[section] = sanitizeSection(sanitized[section]);
  });

  return sanitized;
}

function sanitizeSection(section) {
  if (!section || typeof section !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(section)) {
    sanitized[key] = toBoolean(value);
  }

  return sanitized;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return Boolean(value);
}

function sortConfigSections(config) {
  const sorted = { ...config };

  CONFIG_SECTIONS.forEach(section => {
    sorted[section] = sortObjectKeys(sorted[section]);
  });

  return sorted;
}

function sortObjectKeys(obj) {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

function formatHeader(existingHeader) {
  const header = existingHeader && existingHeader.trim().length > 0
    ? existingHeader
    : generateConfigHeader();

  let normalized = header;

  if (!normalized.endsWith("\n")) {
    normalized += "\n";
  }
  if (!normalized.endsWith("\n\n")) {
    normalized += "\n";
  }

  return normalized;
}

function countEnabledItems(section = {}) {
  return Object.values(section).filter(Boolean).length;
}

function getAllAvailableItems(type) {
  const meta = SECTION_METADATA[type];

  if (!meta) {
    return [];
  }

  return getAvailableItems(path.join(__dirname, meta.dir), meta.ext);
}

/**
 * Get individual items from a collection
 */
function getCollectionItems(collectionName) {
  const collectionPath = path.join(__dirname, "collections", `${collectionName}.collection.yml`);
  if (!fs.existsSync(collectionPath)) {
    return { prompts: [], instructions: [], chatmodes: [] };
  }

  const collection = parseCollectionYaml(collectionPath);
  if (!collection || !collection.items) {
    return { prompts: [], instructions: [], chatmodes: [] };
  }

  const result = { prompts: [], instructions: [], chatmodes: [] };
  
  collection.items.forEach(item => {
    const filePath = item.path;
    const filename = path.basename(filePath);
    
    if (filename.endsWith('.prompt.md')) {
      const name = filename.replace('.prompt.md', '');
      result.prompts.push(name);
    } else if (filename.endsWith('.instructions.md')) {
      const name = filename.replace('.instructions.md', '');
      result.instructions.push(name);
    } else if (filename.endsWith('.chatmode.md')) {
      const name = filename.replace('.chatmode.md', '');
      result.chatmodes.push(name);
    }
  });

  return result;
}

/**
 * Update individual items when a collection is toggled
 */
function updateCollectionItems(config, collectionName, enabled) {
  const items = getCollectionItems(collectionName);
  const configCopy = { ...config };
  
  // Ensure sections exist
  CONFIG_SECTIONS.forEach(section => {
    if (!configCopy[section]) {
      configCopy[section] = {};
    }
  });

  // Update individual items
  items.prompts.forEach(prompt => {
    configCopy.prompts[prompt] = enabled;
  });
  
  items.instructions.forEach(instruction => {
    configCopy.instructions[instruction] = enabled;
  });
  
  items.chatmodes.forEach(chatmode => {
    configCopy.chatmodes[chatmode] = enabled;
  });

  return configCopy;
}

/**
 * Get which collections contain specific items
 */
function getItemToCollectionsMap() {
  const map = {};
  const collectionsDir = path.join(__dirname, "collections");
  
  if (!fs.existsSync(collectionsDir)) {
    return map;
  }

  const collectionFiles = fs.readdirSync(collectionsDir)
    .filter(file => file.endsWith('.collection.yml'));

  collectionFiles.forEach(file => {
    const collectionName = file.replace('.collection.yml', '');
    const collectionPath = path.join(collectionsDir, file);
    const collection = parseCollectionYaml(collectionPath);
    
    if (collection && collection.items) {
      collection.items.forEach(item => {
        const filename = path.basename(item.path);
        let itemName;
        
        if (filename.endsWith('.prompt.md')) {
          itemName = filename.replace('.prompt.md', '');
          if (!map[itemName]) map[itemName] = { section: 'prompts', collections: [] };
          map[itemName].collections.push(collectionName);
        } else if (filename.endsWith('.instructions.md')) {
          itemName = filename.replace('.instructions.md', '');
          if (!map[itemName]) map[itemName] = { section: 'instructions', collections: [] };
          map[itemName].collections.push(collectionName);
        } else if (filename.endsWith('.chatmode.md')) {
          itemName = filename.replace('.chatmode.md', '');
          if (!map[itemName]) map[itemName] = { section: 'chatmodes', collections: [] };
          map[itemName].collections.push(collectionName);
        }
      });
    }
  });

  return map;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  CONFIG_SECTIONS,
  SECTION_METADATA,
  loadConfig,
  saveConfig,
  splitHeaderAndBody,
  ensureConfigStructure,
  sortObjectKeys,
  countEnabledItems,
  getAllAvailableItems,
  getCollectionItems,
  updateCollectionItems,
  getItemToCollectionsMap
};
