"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// Mock the server transport
jest.mock('@modelcontextprotocol/sdk/server/stdio', () => ({
    StdioServerTransport: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        close: jest.fn(),
    })),
}));
describe('AwesomeCopilotServer Integration', () => {
    let server;
    beforeEach(() => {
        server = new index_1.AwesomeCopilotServer();
    });
    describe('server initialization', () => {
        it('should create server instance', () => {
            expect(server).toBeInstanceOf(index_1.AwesomeCopilotServer);
        });
    });
    describe('tool listing', () => {
        it('should list all available tools', async () => {
            const mockRequest = {};
            const handler = server.server.setRequestHandler.mock.calls.find((call) => call[0] === types_js_1.ListToolsRequestSchema)[1];
            const result = await handler(mockRequest);
            expect(result.tools).toHaveLength(7);
            const toolNames = result.tools.map((tool) => tool.name);
            expect(toolNames).toEqual([
                'search_all',
                'search_agents',
                'search_prompts',
                'search_instructions',
                'load_agent',
                'load_prompt',
                'load_instruction',
            ]);
        });
        it('should have correct tool schemas', async () => {
            const mockRequest = {};
            const handler = server.server.setRequestHandler.mock.calls.find((call) => call[0] === types_js_1.ListToolsRequestSchema)[1];
            const result = await handler(mockRequest);
            // Check search_all tool schema
            const searchAllTool = result.tools.find((tool) => tool.name === 'search_all');
            expect(searchAllTool.inputSchema.type).toBe('object');
            expect(searchAllTool.inputSchema.required).toEqual(['query']);
            expect(searchAllTool.inputSchema.properties.query.type).toBe('string');
            // Check load_agent tool schema
            const loadAgentTool = result.tools.find((tool) => tool.name === 'load_agent');
            expect(loadAgentTool.inputSchema.required).toEqual(['name']);
            expect(loadAgentTool.inputSchema.properties.name.type).toBe('string');
        });
    });
    describe('tool calling', () => {
        let callToolHandler;
        beforeEach(() => {
            callToolHandler = server.server.setRequestHandler.mock.calls.find((call) => call[0] === types_js_1.CallToolRequestSchema)[1];
        });
        it('should handle search_all tool call', async () => {
            const mockRequest = {
                params: {
                    name: 'search_all',
                    arguments: { query: 'test' },
                },
            };
            // Mock the search tools
            const searchTools = server.searchTools;
            searchTools.searchAll = jest.fn().mockResolvedValue({
                items: [],
                total: 0,
            });
            const result = await callToolHandler(mockRequest);
            expect(searchTools.searchAll).toHaveBeenCalledWith('test');
            expect(result.content[0].type).toBe('text');
            expect(JSON.parse(result.content[0].text)).toEqual({
                items: [],
                total: 0,
            });
        });
        it('should handle load_agent tool call', async () => {
            const mockRequest = {
                params: {
                    name: 'load_agent',
                    arguments: { name: 'test-agent' },
                },
            };
            const mockAgent = {
                name: 'test-agent',
                type: 'agent',
                content: 'Agent content',
                path: 'agents/test-agent.agent.md',
                url: 'https://github.com/github/awesome-copilot/blob/main/agents/test-agent.agent.md',
                frontmatter: { description: 'Test agent' },
            };
            // Mock the load tools
            const loadTools = server.loadTools;
            loadTools.loadAgent = jest.fn().mockResolvedValue(mockAgent);
            const result = await callToolHandler(mockRequest);
            expect(loadTools.loadAgent).toHaveBeenCalledWith('test-agent');
            expect(result.content[0].type).toBe('text');
            expect(JSON.parse(result.content[0].text)).toEqual(mockAgent);
        });
        it('should throw error for missing arguments', async () => {
            const mockRequest = {
                params: {
                    name: 'search_all',
                    arguments: {},
                },
            };
            await expect(callToolHandler(mockRequest)).rejects.toThrow('Query argument is required');
        });
        it('should throw error for missing query in search tools', async () => {
            const mockRequest = {
                params: {
                    name: 'search_all',
                    arguments: { query: '' },
                },
            };
            await expect(callToolHandler(mockRequest)).rejects.toThrow('Query argument is required');
        });
        it('should throw error for missing name in load tools', async () => {
            const mockRequest = {
                params: {
                    name: 'load_agent',
                    arguments: { name: '' },
                },
            };
            await expect(callToolHandler(mockRequest)).rejects.toThrow('Name argument is required');
        });
        it('should throw error for unknown tool', async () => {
            const mockRequest = {
                params: {
                    name: 'unknown_tool',
                    arguments: { query: 'test' },
                },
            };
            await expect(callToolHandler(mockRequest)).rejects.toThrow('Unknown tool: unknown_tool');
        });
    });
});
//# sourceMappingURL=index.integration.test.js.map