#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repository root is one level up from server directory
const REPO_ROOT = path.join(__dirname, "..");

// Directories containing the different types of content
const DIRECTORIES = {
  instructions: path.join(REPO_ROOT, "instructions"),
  prompts: path.join(REPO_ROOT, "prompts"),
  chatmodes: path.join(REPO_ROOT, "chatmodes"),
  agents: path.join(REPO_ROOT, "agents"),
};

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content };
  }

  const frontmatterText = match[1];
  const remainingContent = content.slice(match[0].length);

  // Parse simple YAML frontmatter
  const frontmatter = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: remainingContent };
}

/**
 * Search for files in all directories based on keywords
 */
async function searchInstructions(keywords) {
  const results = [];
  const searchTerms = keywords.toLowerCase().split(/\s+/);

  for (const [type, dirPath] of Object.entries(DIRECTORIES)) {
    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith(".md")) continue;

        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { frontmatter } = extractFrontmatter(content);

        // Search in filename, description, and content
        const searchText = `${file} ${frontmatter.description || ""} ${content}`.toLowerCase();

        // Check if any search term matches
        const matches = searchTerms.some((term) => searchText.includes(term));

        if (matches) {
          results.push({
            type,
            filename: file,
            title: frontmatter.title || file.replace(/\.(instructions|prompt|chatmode|agent)\.md$/, ""),
            description: frontmatter.description || "",
            mode: frontmatter.mode || undefined,
          });
        }
      }
    } catch (error) {
      // Directory might not exist, skip it
      console.error(`Error reading directory ${dirPath}:`, error.message);
    }
  }

  return results;
}

/**
 * Load a specific instruction file
 */
async function loadInstruction(mode, filename) {
  const dirPath = DIRECTORIES[mode];

  if (!dirPath) {
    throw new Error(`Invalid mode: ${mode}. Must be one of: instructions, prompts, chatmodes, agents`);
  }

  const filePath = path.join(dirPath, filename);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to load file ${filename} from ${mode}: ${error.message}`);
  }
}

/**
 * Get all available files for a specific mode
 */
async function listFiles(mode) {
  const dirPath = DIRECTORIES[mode];

  if (!dirPath) {
    throw new Error(`Invalid mode: ${mode}. Must be one of: instructions, prompts, chatmodes, agents`);
  }

  try {
    const files = await fs.readdir(dirPath);
    const results = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = path.join(dirPath, file);
      const content = await fs.readFile(filePath, "utf-8");
      const { frontmatter } = extractFrontmatter(content);

      results.push({
        filename: file,
        title: frontmatter.title || file.replace(/\.(instructions|prompt|chatmode|agent)\.md$/, ""),
        description: frontmatter.description || "",
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to list files from ${mode}: ${error.message}`);
  }
}

// Create MCP server
const server = new Server(
  {
    name: "awesome-copilot",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_instructions",
        description:
          "Search for GitHub Copilot customizations (instructions, prompts, chatmodes, agents) based on keywords. Returns a list of matching items with their type, filename, title, and description.",
        inputSchema: {
          type: "object",
          properties: {
            keywords: {
              type: "string",
              description: "Keywords to search for in titles, descriptions, and content",
            },
          },
          required: ["keywords"],
        },
      },
      {
        name: "load_instruction",
        description:
          "Load the complete content of a specific instruction, prompt, chatmode, or agent file from the awesome-copilot repository.",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["instructions", "prompts", "chatmodes", "agents"],
              description: "The type of content to load",
            },
            filename: {
              type: "string",
              description: "The filename to load (e.g., 'python-django.instructions.md')",
            },
          },
          required: ["mode", "filename"],
        },
      },
      {
        name: "list_files",
        description:
          "List all available files for a specific mode (instructions, prompts, chatmodes, or agents).",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["instructions", "prompts", "chatmodes", "agents"],
              description: "The type of content to list",
            },
          },
          required: ["mode"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_instructions") {
      const results = await searchInstructions(args.keywords);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    if (name === "load_instruction") {
      const content = await loadInstruction(args.mode, args.filename);
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    }

    if (name === "list_files") {
      const files = await listFiles(args.mode);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Register prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "search_prompt",
        description: "Get a prompt template for searching copilot instructions with specific keywords",
        arguments: [
          {
            name: "keyword",
            description: "The keyword to search for",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_prompt") {
    const keyword = args?.keyword || "{keyword}";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please search all the chatmodes, instructions, prompts, and agents that are related to the search keyword, "${keyword}".

Here's the process to follow:

1. Use the 'awesome-copilot' MCP server.
2. Search all chatmodes, instructions, prompts, and agents for the keyword provided.
3. DO NOT load any chatmodes, instructions, prompts, or agents from the MCP server until the user asks to do so.
4. Scan local chatmodes, instructions, prompts, and agents markdown files in .github/chatmodes, .github/instructions, .github/prompts, and .github/agents directories respectively.
5. Compare existing chatmodes, instructions, prompts, and agents with the search results.
6. Provide a structured response in a table format that includes the already exists, mode (chatmodes, instructions, prompts or agents), filename, title and description of each item found. Here's an example of the table format:

| Exists | Mode         | Filename                      | Title         | Description   |
|--------|--------------|-------------------------------|---------------|---------------|
| ✅     | chatmodes    | chatmode1.chatmode.md         | ChatMode 1    | Description 1 |
| ❌     | instructions | instruction1.instructions.md  | Instruction 1 | Description 1 |
| ✅     | prompts      | prompt1.prompt.md             | Prompt 1      | Description 1 |
| ❌     | agents       | agent1.agent.md               | Agent 1       | Description 1 |

✅ indicates that the item already exists in this repository, while ❌ indicates that it does not.

7. If any item doesn't exist in the repository, ask which item the user wants to save.
8. If the user wants to save it, save the item in the appropriate directory (.github/chatmodes, .github/instructions, .github/prompts, or .github/agents) using the mode and filename, with NO modification.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Awesome Copilot MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
