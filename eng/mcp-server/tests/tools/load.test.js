"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load_1 = require("../../src/tools/load");
const github_adapter_1 = require("../../src/adapters/github-adapter");
// Mock GitHubAdapter
jest.mock('../src/adapters/github-adapter');
const MockGitHubAdapter = github_adapter_1.GitHubAdapter;
describe('LoadTools', () => {
    let mockAdapter;
    let loadTools;
    const mockAgentItem = {
        path: 'agents/test-agent.agent.md',
        name: 'test-agent',
        type: 'agent',
        frontmatter: {
            description: 'Test agent description',
            model: 'GPT-4'
        },
        content: 'Agent content here',
        url: 'https://github.com/github/awesome-copilot/blob/main/agents/test-agent.agent.md',
    };
    const mockPromptItem = {
        path: 'prompts/test-prompt.prompt.md',
        name: 'test-prompt',
        type: 'prompt',
        frontmatter: {
            description: 'Test prompt description',
            mode: 'ask'
        },
        content: 'Prompt content here',
        url: 'https://github.com/github/awesome-copilot/blob/main/prompts/test-prompt.prompt.md',
    };
    const mockInstructionItem = {
        path: 'instructions/test-instruction.instructions.md',
        name: 'test-instruction',
        type: 'instruction',
        frontmatter: {
            description: 'Test instruction description',
            applyTo: '**/*.js'
        },
        content: 'Instruction content here',
        url: 'https://github.com/github/awesome-copilot/blob/main/instructions/test-instruction.instructions.md',
    };
    beforeEach(() => {
        mockAdapter = new MockGitHubAdapter();
        loadTools = new load_1.LoadTools(mockAdapter);
        jest.clearAllMocks();
    });
    describe('loadAgent', () => {
        it('should load agent by name', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem]);
            const result = await loadTools.loadAgent('test-agent');
            expect(mockAdapter.getAllContentItems).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockAgentItem);
        });
        it('should return null for non-existent agent', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem]);
            const result = await loadTools.loadAgent('non-existent-agent');
            expect(result).toBeNull();
        });
        it('should handle adapter errors', async () => {
            mockAdapter.getAllContentItems.mockRejectedValue(new Error('API Error'));
            await expect(loadTools.loadAgent('test-agent')).rejects.toThrow('API Error');
        });
        it('should find agent case-insensitively', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem]);
            const result = await loadTools.loadAgent('TEST-AGENT');
            expect(result).toEqual(mockAgentItem);
        });
    });
    describe('loadPrompt', () => {
        it('should load prompt by name', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockPromptItem]);
            const result = await loadTools.loadPrompt('test-prompt');
            expect(result).toEqual(mockPromptItem);
        });
        it('should return null for non-existent prompt', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockPromptItem]);
            const result = await loadTools.loadPrompt('non-existent-prompt');
            expect(result).toBeNull();
        });
        it('should only return prompts, not other types', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem, mockPromptItem]);
            const result = await loadTools.loadPrompt('test-prompt');
            expect(result).toEqual(mockPromptItem);
        });
    });
    describe('loadInstruction', () => {
        it('should load instruction by name', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockInstructionItem]);
            const result = await loadTools.loadInstruction('test-instruction');
            expect(result).toEqual(mockInstructionItem);
        });
        it('should return null for non-existent instruction', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockInstructionItem]);
            const result = await loadTools.loadInstruction('non-existent-instruction');
            expect(result).toBeNull();
        });
        it('should only return instructions, not other types', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem, mockInstructionItem]);
            const result = await loadTools.loadInstruction('test-instruction');
            expect(result).toEqual(mockInstructionItem);
        });
    });
    describe('edge cases', () => {
        it('should handle empty item list', async () => {
            mockAdapter.getAllContentItems.mockResolvedValue([]);
            const result = await loadTools.loadAgent('test-agent');
            expect(result).toBeNull();
        });
        it('should handle items without names', async () => {
            const itemWithoutName = { ...mockAgentItem, name: '' };
            mockAdapter.getAllContentItems.mockResolvedValue([itemWithoutName]);
            const result = await loadTools.loadAgent('test-agent');
            expect(result).toBeNull();
        });
        it('should handle multiple items with same name', async () => {
            const duplicateItem = { ...mockAgentItem };
            mockAdapter.getAllContentItems.mockResolvedValue([mockAgentItem, duplicateItem]);
            const result = await loadTools.loadAgent('test-agent');
            expect(result).toEqual(mockAgentItem); // Should return first match
        });
    });
});
//# sourceMappingURL=load.test.js.map