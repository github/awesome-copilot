// YAML parser for collection files and agent frontmatter
const fs = require("fs");
const yaml = require("js-yaml");

function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Parse a collection YAML file (.collection.yml)
 * Collections are pure YAML files without frontmatter delimiters
 * @param {string} filePath - Path to the collection file
 * @returns {object|null} Parsed collection object or null on error
 */
function parseCollectionYaml(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");

      // Collections are pure YAML files, parse directly with js-yaml
      return yaml.load(content, { schema: yaml.JSON_SCHEMA });
    },
    filePath,
    null
  );
}

/**
 * Parse agent frontmatter from an agent markdown file (.agent.md)
 * Agent files use standard markdown frontmatter with --- delimiters
 * @param {string} filePath - Path to the agent file
 * @returns {object|null} Parsed agent frontmatter or null on error
 */
function parseAgentFrontmatter(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      // Agent files use standard markdown frontmatter format
      // Find the YAML frontmatter between --- delimiters
      let yamlStart = -1;
      let yamlEnd = -1;
      let delimiterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        if (trimmed === "---") {
          delimiterCount++;
          if (delimiterCount === 1) {
            yamlStart = i + 1;
          } else if (delimiterCount === 2) {
            yamlEnd = i;
            break;
          }
        }
      }

      if (yamlStart === -1 || yamlEnd === -1) {
        throw new Error(
          "Could not find YAML frontmatter delimiters (---) in agent file"
        );
      }

      // Extract YAML content between delimiters
      const yamlContent = lines.slice(yamlStart, yamlEnd).join("\n");

      // Parse YAML directly with js-yaml
      const frontmatter = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA });

      // Normalize string fields that can accumulate trailing newlines/spaces
      if (frontmatter) {
        if (typeof frontmatter.name === "string") {
          frontmatter.name = frontmatter.name.replace(/[\r\n]+$/g, "").trim();
        }
        if (typeof frontmatter.description === "string") {
          // Remove only trailing whitespace/newlines; preserve internal formatting
          frontmatter.description = frontmatter.description.replace(
            /[\s\r\n]+$/g,
            ""
          );
        }
      }

      return frontmatter;
    },
    filePath,
    null
  );
}

/**
 * Extract agent metadata including MCP server information
 * @param {string} filePath - Path to the agent file
 * @returns {object|null} Agent metadata object with name, description, tools, and mcp-servers
 */
function extractAgentMetadata(filePath) {
  const frontmatter = parseAgentFrontmatter(filePath);

  if (!frontmatter) {
    return null;
  }

  return {
    name: typeof frontmatter.name === "string" ? frontmatter.name : null,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : null,
    tools: frontmatter.tools || [],
    mcpServers: frontmatter["mcp-servers"] || {},
  };
}

/**
 * Extract MCP server names from an agent file
 * @param {string} filePath - Path to the agent file
 * @returns {string[]} Array of MCP server names
 */
function extractMcpServers(filePath) {
  const metadata = extractAgentMetadata(filePath);

  if (!metadata || !metadata.mcpServers) {
    return [];
  }

  return Object.keys(metadata.mcpServers);
}

module.exports = {
  parseCollectionYaml,
  parseAgentFrontmatter,
  extractAgentMetadata,
  extractMcpServers,
  safeFileOperation,
};
