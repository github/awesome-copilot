import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { GitHubAdapter } from './adapters/github-adapter';
import { SearchTools } from './tools/search';
import { LoadTools } from './tools/load';
import { ContentItem, SearchResult } from './types';

export class AwesomeCopilotServer {
  private server: Server;
  private githubAdapter: GitHubAdapter;
  private searchTools: SearchTools;
  private loadTools: LoadTools;

  constructor() {
    this.server = new Server(
      {
        name: 'awesome-copilot-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.githubAdapter = new GitHubAdapter();
    this.searchTools = new SearchTools(this.githubAdapter);
    this.loadTools = new LoadTools(this.githubAdapter);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_all',
            description: 'Search across all awesome-copilot content (agents, prompts, instructions)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_agents',
            description: 'Search specifically in agents',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_prompts',
            description: 'Search specifically in prompts',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_instructions',
            description: 'Search specifically in instructions',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'load_agent',
            description: 'Load a specific agent by name',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Agent name (without .agent.md extension)',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'load_prompt',
            description: 'Load a specific prompt by name',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Prompt name (without .prompt.md extension)',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'load_instruction',
            description: 'Load a specific instruction by name',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Instruction name (without .instructions.md extension)',
                },
              },
              required: ['name'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Arguments are required'
        );
      }

      try {
        switch (name) {
          case 'search_all':
            const queryAll = args.query as string;
            if (!queryAll) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Query argument is required'
              );
            }
            const searchAllResult = await this.searchTools.searchAll(queryAll);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchAllResult, null, 2),
                },
              ],
            };

          case 'search_instructions':
            const queryInstructions = args.query as string;
            if (!queryInstructions) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Query argument is required'
              );
            }
            const searchInstructionsResult = await this.searchTools.searchInstructions(queryInstructions);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchInstructionsResult, null, 2),
                },
              ],
            };

          case 'search_agents':
            const queryAgents = args.query as string;
            if (!queryAgents) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Query argument is required'
              );
            }
            const searchAgentsResult = await this.searchTools.searchAgents(queryAgents);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchAgentsResult, null, 2),
                },
              ],
            };

          case 'search_prompts':
            const queryPrompts = args.query as string;
            if (!queryPrompts) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Query argument is required'
              );
            }
            const searchPromptsResult = await this.searchTools.searchPrompts(queryPrompts);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchPromptsResult, null, 2),
                },
              ],
            };

          case 'load_agent':
            const agentNameArg = args.name as string;
            if (!agentNameArg) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Name argument is required'
              );
            }
            const agent = await this.loadTools.loadAgent(agentNameArg);
            if (!agent) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Agent '${agentNameArg}' not found`
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(agent, null, 2),
                },
              ],
            };

          case 'load_prompt':
            const promptNameArg = args.name as string;
            if (!promptNameArg) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Name argument is required'
              );
            }
            const prompt = await this.loadTools.loadPrompt(promptNameArg);
            if (!prompt) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Prompt '${promptNameArg}' not found`
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(prompt, null, 2),
                },
              ],
            };

          case 'load_instruction':
            const nameArg = args.name as string;
            if (!nameArg) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Name argument is required'
              );
            }
            const instruction = await this.loadTools.loadInstruction(nameArg);
            if (!instruction) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Instruction '${nameArg}' not found`
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(instruction, null, 2),
                },
              ],
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Internal error: ${message}`
        );
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'search',
            description: 'Search prompt for awesome-copilot content',
            arguments: [
              {
                name: 'query',
                description: 'Search query',
                required: true,
              },
            ],
          },
        ],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name !== 'search') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown prompt: ${name}`
        );
      }

      const query = args?.query as string;
      if (!query) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Query argument is required'
        );
      }

      const searchResult = await this.searchTools.searchAll(query);

      const messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search results for "${query}":\n\n${JSON.stringify(searchResult, null, 2)}`,
          },
        },
      ];

      return {
        messages,
      };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Awesome Copilot MCP Server running on stdio');
  }
}

// Start the server
const server = new AwesomeCopilotServer();
server.run().catch(console.error);
