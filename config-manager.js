const fs = require("fs");
const path = require("path");

const { parseConfigYamlContent } = require("./apply-config");
const { objectToYaml, generateConfigHeader, getAvailableItems } = require("./generate-config");

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
    project.output_directory = ".github";
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
 * Generate a stable hash of configuration for comparison
 * @param {Object} config - Configuration object
 * @returns {string} Stable hash string
 */
function generateConfigHash(config) {
  const crypto = require('crypto');

  // Create a stable representation by sorting all keys recursively
  function stableStringify(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';

    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `"${key}":${stableStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
  }

  const stableJson = stableStringify(config);
  return crypto.createHash('sha256').update(stableJson).digest('hex').substring(0, 16);
}

/**
 * Compute effective item states respecting explicit overrides over collections
 * 
 * This function builds membership maps per section and returns effectively enabled items with reasons.
 * It uses the following precedence rules:
 * 1. Explicit true/false overrides everything (highest priority)
 * 2. If undefined and enabled by collection, use true
 * 3. Otherwise, use false (disabled)
 * 
 * @param {Object} config - Configuration object with sections
 * @returns {Object} Effective states for each section with { itemName: { enabled: boolean, reason: string } }
 *                   Reason can be: 'explicit', 'collection', or 'disabled'
 */
function computeEffectiveItemStates(config) {
  const { parseCollectionYaml } = require("./yaml-parser");

  const effectiveStates = {
    prompts: {},
    instructions: {},
    chatmodes: {}
  };

  // Build membership maps: Map<itemName, Set<collectionName>> per section for O(1) lookups
  const collectionEnabledItems = {
    prompts: new Set(),
    instructions: new Set(),
    chatmodes: new Set()
  };

  // Identify enabled collections per section
  if (config.collections) {
    for (const [collectionName, enabled] of Object.entries(config.collections)) {
      if (enabled === true) {
        const collectionPath = path.join(__dirname, "collections", `${collectionName}.collection.yml`);
        if (fs.existsSync(collectionPath)) {
          const collection = parseCollectionYaml(collectionPath);
          if (collection && collection.items) {
            collection.items.forEach(item => {
              // Extract item name from path - remove directory and all extensions
              const itemName = path.basename(item.path).replace(/\.(prompt|instructions|chatmode)\.md$/, '');

              if (item.kind === "prompt") {
                collectionEnabledItems.prompts.add(itemName);
              } else if (item.kind === "instruction") {
                collectionEnabledItems.instructions.add(itemName);
              } else if (item.kind === "chat-mode") {
                collectionEnabledItems.chatmodes.add(itemName);
              }
            });
          }
        }
      }
    }
  }

  // For each section, compute effective states using precedence rules
  for (const section of ["prompts", "instructions", "chatmodes"]) {
    const sectionConfig = config[section] || {};
    const collectionEnabled = collectionEnabledItems[section];

    // Get all available items for this section
    const availableItems = getAllAvailableItems(section);

    for (const itemName of availableItems) {
      const explicitValue = sectionConfig[itemName];
      const isEnabledByCollection = collectionEnabled.has(itemName);

      // Precedence rules:
      // 1. If explicitly set to true or false, use that value
      // 2. If undefined and enabled by collection, use true
      // 3. Otherwise, use false

      let enabled = false;
      let reason = "disabled";

      if (explicitValue === true) {
        enabled = true;
        reason = "explicit";
      } else if (explicitValue === false) {
        enabled = false;
        reason = "explicit";
      } else if (explicitValue === undefined && isEnabledByCollection) {
        enabled = true;
        reason = "collection";
      }

      effectiveStates[section][itemName] = { enabled, reason };
    }
  }

  return effectiveStates;
}

/**
 * Get sets of effectively enabled items with reasons - optimized for performance lookups
 * 
 * This function satisfies the acceptance criteria by returning Sets for O(1) lookups
 * while maintaining the precedence rules defined in computeEffectiveItemStates.
 * 
 * @param {Object} config - Configuration object with sections
 * @returns {Object} Sets of enabled items: { prompts: Set<string>, instructions: Set<string>, chatmodes: Set<string> }
 *                   Each Set contains only the names of effectively enabled items for O(1) lookup performance
 */
function getEffectivelyEnabledItems(config) {
  const effectiveStates = computeEffectiveItemStates(config);
  
  const result = {
    prompts: new Set(),
    instructions: new Set(),
    chatmodes: new Set()
  };

  for (const section of ["prompts", "instructions", "chatmodes"]) {
    for (const itemName in effectiveStates[section]) {
      if (effectiveStates[section][itemName].enabled) {
        result[section].add(itemName);
      }
    }
  }
  return result;
}

/**
 * Toggle a collection's enabled state without modifying individual item flags
 * 
 * This function implements the core requirement from TASK-003:
 * - Only modifies the collection's enabled flag
 * - Never writes to per-item flags (e.g., config.prompts[item] = enabled)  
 * - Returns summary information for CLI feedback
 * - Preserves all existing explicit per-item overrides
 * 
 * @param {Object} config - Configuration object with collections section
 * @param {string} name - Collection name to toggle
 * @param {boolean} enabled - Desired enabled state for the collection
 * @returns {Object} Summary object with delta information for CLI feedback
 */
function toggleCollection(config, name, enabled) {
  // Validate inputs
  if (!config || typeof config !== 'object') {
    throw new Error('Config object is required');
  }
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name is required');
  }
  if (typeof enabled !== 'boolean') {
    throw new Error('Enabled state must be a boolean');
  }

  // Ensure collections section exists
  if (!config.collections) {
    config.collections = {};
  }

  // Get current state
  const currentState = Boolean(config.collections[name]);
  
  // Check if collection exists (has a .collection.yml file)
  const collectionPath = path.join(__dirname, "collections", `${name}.collection.yml`);
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection '${name}' does not exist`);
  }

  // If state is already the desired state, return early
  if (currentState === enabled) {
    return {
      changed: false,
      collectionName: name,
      currentState: currentState,
      newState: enabled,
      delta: { enabled: [], disabled: [] },
      message: `Collection '${name}' is already ${enabled ? 'enabled' : 'disabled'}.`
    };
  }

  // Compute effective states before the change
  const effectiveStatesBefore = computeEffectiveItemStates(config);

  // CORE REQUIREMENT: Only modify the collection's enabled flag
  // Never write to per-item flags (config.prompts[item] = enabled)
  config.collections[name] = enabled;

  // Compute effective states after the change
  const effectiveStatesAfter = computeEffectiveItemStates(config);

  // Calculate delta summary for CLI feedback
  const delta = { enabled: [], disabled: [] };
  for (const sectionName of ["prompts", "instructions", "chatmodes"]) {
    for (const item of getAllAvailableItems(sectionName)) {
      const beforeState = effectiveStatesBefore[sectionName]?.[item]?.enabled || false;
      const afterState = effectiveStatesAfter[sectionName]?.[item]?.enabled || false;
      
      if (!beforeState && afterState) {
        delta.enabled.push(`${sectionName}/${item}`);
      } else if (beforeState && !afterState) {
        delta.disabled.push(`${sectionName}/${item}`);
      }
    }
  }

  return {
    changed: true,
    collectionName: name,
    currentState: currentState,
    newState: enabled,
    delta,
    message: `${enabled ? 'Enabled' : 'Disabled'} collection '${name}'.`
  };
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
  computeEffectiveItemStates,
  getEffectivelyEnabledItems,
  generateConfigHash,
  toggleCollection
};
