// YAML parser for frontmatter parsing using vfile-matter
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
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

/**
 * Parse SKILL.md frontmatter and list bundled assets in a skill folder
 * @param {string} skillPath - Path to skill folder
 * @returns {object|null} Skill metadata with name, description, and assets array
 */
function parseSkillMetadata(skillPath) {
  return safeFileOperation(
    () => {
      const skillFile = path.join(skillPath, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        return null;
      }

      const frontmatter = parseFrontmatter(skillFile);

      // Validate required fields
      if (!frontmatter?.name || !frontmatter?.description) {
        console.warn(
          `Invalid skill at ${skillPath}: missing name or description in frontmatter`
        );
        return null;
      }

      // List bundled assets (all files except SKILL.md), recursing through subdirectories
      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
          } else {
            const relativePath = path.relative(skillPath, filePath);
            if (relativePath !== "SKILL.md") {
              // Normalize path separators to forward slashes for cross-platform consistency
              arrayOfFiles.push(relativePath.replace(/\\/g, "/"));
            }
          }
        });

        return arrayOfFiles;
      };

      const assets = getAllFiles(skillPath).sort();

      return {
        name: frontmatter.name,
        description: frontmatter.description,
        assets,
        path: skillPath,
      };
    },
    skillPath,
    null
  );
}

/**
 * Parse hook metadata from a hook folder (similar to skills)
 * @param {string} hookPath - Path to the hook folder
 * @returns {object|null} Hook metadata or null on error
 */
function parseHookMetadata(hookPath) {
  return safeFileOperation(
    () => {
      const readmeFile = path.join(hookPath, "README.md");
      if (!fs.existsSync(readmeFile)) {
        return null;
      }

      const frontmatter = parseFrontmatter(readmeFile);

      // Validate required fields
      if (!frontmatter?.name || !frontmatter?.description) {
        console.warn(
          `Invalid hook at ${hookPath}: missing name or description in frontmatter`
        );
        return null;
      }

      // Extract hook events from hooks.json if it exists
      let hookEvents = [];
      const hooksJsonPath = path.join(hookPath, "hooks.json");
      if (fs.existsSync(hooksJsonPath)) {
        try {
          const hooksJsonContent = fs.readFileSync(hooksJsonPath, "utf8");
          const hooksConfig = JSON.parse(hooksJsonContent);
          // Extract all hook event names from the hooks object
          if (hooksConfig.hooks && typeof hooksConfig.hooks === "object") {
            hookEvents = Object.keys(hooksConfig.hooks);
          }
        } catch (error) {
          console.warn(
            `Failed to parse hooks.json at ${hookPath}: ${error.message}`
          );
        }
      }

      // List bundled assets (all files except README.md), recursing through subdirectories
      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
          } else {
            const relativePath = path.relative(hookPath, filePath);
            if (relativePath !== "README.md") {
              // Normalize path separators to forward slashes for cross-platform consistency
              arrayOfFiles.push(relativePath.replace(/\\/g, "/"));
            }
          }
        });

        return arrayOfFiles;
      };

      const assets = getAllFiles(hookPath).sort();

      return {
        name: frontmatter.name,
        description: frontmatter.description,
        hooks: hookEvents,
        tags: frontmatter.tags || [],
        assets,
        path: hookPath,
      };
    },
    hookPath,
    null
  );
}

/**
 * Parse workflow metadata from a workflow folder
 * @param {string} workflowPath - Path to the workflow folder
 * @returns {object|null} Workflow metadata or null on error
 */
function parseWorkflowMetadata(workflowPath) {
  return safeFileOperation(
    () => {
      const readmeFile = path.join(workflowPath, "README.md");
      if (!fs.existsSync(readmeFile)) {
        return null;
      }

      const frontmatter = parseFrontmatter(readmeFile);

      // Validate required fields
      if (!frontmatter?.name || !frontmatter?.description) {
        console.warn(
          `Invalid workflow at ${workflowPath}: missing name or description in frontmatter`
        );
        return null;
      }

      // Extract triggers from frontmatter if present
      const triggers = frontmatter.triggers || [];

      // List bundled assets (all files except README.md), recursing through subdirectories
      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
          } else {
            const relativePath = path.relative(workflowPath, filePath);
            if (relativePath !== "README.md") {
              arrayOfFiles.push(relativePath.replace(/\\/g, "/"));
            }
          }
        });

        return arrayOfFiles;
      };

      const assets = getAllFiles(workflowPath).sort();

      return {
        name: frontmatter.name,
        description: frontmatter.description,
        triggers,
        tags: frontmatter.tags || [],
        assets,
        path: workflowPath,
      };
    },
    workflowPath,
    null
  );
}

/**
 * Parse a generic YAML file (used for tools.yml and other config files)
 * @param {string} filePath - Path to the YAML file
 * @returns {object|null} Parsed YAML object or null on error
 */
function parseYamlFile(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      return yaml.load(content, { schema: yaml.JSON_SCHEMA });
    },
    filePath,
    null
  );
}

export {
  extractAgentMetadata,
  extractMcpServerConfigs,
  extractMcpServers,
  parseFrontmatter,
  parseSkillMetadata,
  parseHookMetadata,
  parseWorkflowMetadata,
  parseYamlFile,
  safeFileOperation,
};
