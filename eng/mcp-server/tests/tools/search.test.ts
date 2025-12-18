import { SearchTools } from '../../src/tools/search';
import { GitHubAdapter } from '../../src/adapters/github-adapter';
import { ContentItem } from '../../src/types';

// Mock GitHubAdapter
jest.mock('../src/adapters/github-adapter');

const MockGitHubAdapter = GitHubAdapter as jest.MockedClass<typeof GitHubAdapter>;

describe('SearchTools', () => {
  let mockAdapter: jest.Mocked<GitHubAdapter>;
  let searchTools: SearchTools;

  const mockItems: ContentItem[] = [
    {
      path: 'agents/debug-agent.agent.md',
      name: 'debug-agent',
      type: 'agent',
      frontmatter: { description: 'Debug agent for testing' },
      content: 'Agent content with debug info',
      url: 'https://github.com/github/awesome-copilot/blob/main/agents/debug-agent.agent.md',
    },
    {
      path: 'agents/test-agent.agent.md',
      name: 'test-agent',
      type: 'agent',
      frontmatter: { description: 'Test agent description' },
      content: 'Test agent content',
      url: 'https://github.com/github/awesome-copilot/blob/main/agents/test-agent.agent.md',
    },
    {
      path: 'prompts/debug-prompt.prompt.md',
      name: 'debug-prompt',
      type: 'prompt',
      frontmatter: { description: 'Debug prompt for testing' },
      content: 'Prompt content with debug instructions',
      url: 'https://github.com/github/awesome-copilot/blob/main/prompts/debug-prompt.prompt.md',
    },
    {
      path: 'instructions/debug-instruction.instructions.md',
      name: 'debug-instruction',
      type: 'instruction',
      frontmatter: { description: 'Debug instruction for testing' },
      content: 'Instruction content with debug guidelines',
      url: 'https://github.com/github/awesome-copilot/blob/main/instructions/debug-instruction.instructions.md',
    },
  ];

  beforeEach(() => {
    mockAdapter = new MockGitHubAdapter() as jest.Mocked<GitHubAdapter>;
    searchTools = new SearchTools(mockAdapter);
    jest.clearAllMocks();
  });

  describe('searchItems', () => {
    it('should filter items by query', () => {
      const result = (searchTools as any).searchItems(mockItems, 'debug');

      expect(result).toHaveLength(3);
      expect(result.map((item: ContentItem) => item.name)).toEqual([
        'debug-agent',
        'debug-prompt',
        'debug-instruction'
      ]);
    });

    it('should filter items by query and types', () => {
      const result = (searchTools as any).searchItems(mockItems, 'debug', ['agent']);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('debug-agent');
    });

    it('should be case insensitive', () => {
      const result = (searchTools as any).searchItems(mockItems, 'DEBUG');

      expect(result).toHaveLength(3);
    });

    it('should search in name, description, content, and path', () => {
      const result = (searchTools as any).searchItems(mockItems, 'testing');

      expect(result).toHaveLength(3);
      expect(result.every((item: ContentItem) => item.frontmatter?.description?.includes('testing'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const result = (searchTools as any).searchItems(mockItems, 'nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('searchAll', () => {
    it('should search all items', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue(mockItems);

      const result = await searchTools.searchAll('debug');

      expect(mockAdapter.getAllContentItems).toHaveBeenCalledTimes(1);
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should handle empty results', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue([]);

      const result = await searchTools.searchAll('debug');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle adapter errors', async () => {
      mockAdapter.getAllContentItems.mockRejectedValue(new Error('API Error'));

      await expect(searchTools.searchAll('debug')).rejects.toThrow('API Error');
    });
  });

  describe('searchAgents', () => {
    it('should search only agents', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue(mockItems);

      const result = await searchTools.searchAgents('debug');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('agent');
      expect(result.total).toBe(1);
    });

    it('should return empty for no agent matches', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue(mockItems);

      const result = await searchTools.searchAgents('nonexistent');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchPrompts', () => {
    it('should search only prompts', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue(mockItems);

      const result = await searchTools.searchPrompts('debug');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('prompt');
      expect(result.total).toBe(1);
    });
  });

  describe('searchInstructions', () => {
    it('should search only instructions', async () => {
      mockAdapter.getAllContentItems.mockResolvedValue(mockItems);

      const result = await searchTools.searchInstructions('debug');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('instruction');
      expect(result.total).toBe(1);
    });
  });
});
