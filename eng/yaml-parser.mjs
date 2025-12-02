// YAML parser for collection files and frontmatter parsing using vfile-matter
import fs from "fs";
import yaml from "js-yaml";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

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
 * Parse frontmatter from a markdown file using vfile-matter
 * Works with any markdown file that has YAML frontmatter (agents, prompts, instructions)
 * @param {string} filePath - Path to the markdown file
 * @returns {object|null} Parsed frontmatter object or null on error
 */
function parseFrontmatter(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const file = new VFile({ path: filePath, value: content });

      // Parse the frontmatter using vfile-matter
      matter(file);

      // The frontmatter is now available in file.data.matter
      const frontmatter = file.data.matter;

      // Normalize string fields that can accumulate trailing newlines/spaces
      if (frontmatter) {
        if (typeof frontmatter.name === "string") {
          frontmatter.name = frontmatter.name.replace(/[\r\n]+$/g, "").trim();
        }
        if (typeof frontmatter.title === "string") {
          frontmatter.title = frontmatter.title.replace(/[\r\n]+$/g, "").trim();
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
  const frontmatter = parseFrontmatter(filePath);

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

/**
 * Extract full MCP server configs from an agent file
 * @param {string} filePath - Path to the agent file
 * @returns {Array<{name:string,type?:string,command?:string,args?:string[],url?:string,headers?:object}>}
 */
function extractMcpServerConfigs(filePath) {
  const metadata = extractAgentMetadata(filePath);
  if (!metadata || !metadata.mcpServers) return [];
  return Object.entries(metadata.mcpServers).map(([name, cfg]) => {
    // Ensure we don't mutate original cfg
    const copy = { ...cfg };
    return {
      name,
      type: typeof copy.type === "string" ? copy.type : undefined,
      command: typeof copy.command === "string" ? copy.command : undefined,
      args: Array.isArray(copy.args) ? copy.args : undefined,
      url: typeof copy.url === "string" ? copy.url : undefined,
      headers:
        typeof copy.headers === "object" && copy.headers !== null
          ? copy.headers
          : undefined,
    };
  });
}

export {
  parseCollectionYaml,
  parseFrontmatter,
  extractAgentMetadata,
  extractMcpServers,
  extractMcpServerConfigs,
  safeFileOperation,
};
