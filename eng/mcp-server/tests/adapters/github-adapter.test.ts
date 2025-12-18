import { GitHubAdapter } from '../../src/adapters/github-adapter';
import { ContentItem } from '../../src/types';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    jest.clearAllMocks();
  });

  describe('fetchGitHubAPI', () => {
    it('should fetch data successfully', async () => {
      const mockData = { test: 'data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      } as any);

      const result = await (adapter as any).fetchGitHubAPI('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/repos/github/awesome-copilot/test');
      expect(result).toEqual(mockData);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect((adapter as any).fetchGitHubAPI('/test')).rejects.toThrow(
        'GitHub API error: 404 Not Found'
      );
    });
  });

  describe('getTree', () => {
    it('should get tree without path', async () => {
      const mockTree = [{ path: 'test.md', type: 'blob' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ tree: mockTree }),
      } as any);

      const result = await adapter.getTree();

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/repos/github/awesome-copilot/git/trees/main?recursive=1');
      expect(result).toEqual(mockTree);
    });

    it('should get tree with path', async () => {
      const mockTree = [{ path: 'agents/test.agent.md', type: 'blob' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ tree: mockTree }),
      } as any);

      const result = await adapter.getTree('agents');

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/repos/github/awesome-copilot/git/trees/main?recursive=1&path=agents');
      expect(result).toEqual(mockTree);
    });
  });

  describe('getRawFile', () => {
    it('should fetch raw file content', async () => {
      const mockContent = '# Test Content';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockContent),
      } as any);

      const result = await adapter.getRawFile('test.md');

      expect(mockFetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/github/awesome-copilot/main/test.md');
      expect(result).toEqual(mockContent);
    });

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect(adapter.getRawFile('nonexistent.md')).rejects.toThrow(
        'Failed to fetch raw file: 404 Not Found'
      );
    });
  });

  describe('getContentItem', () => {
    it('should parse agent file correctly', async () => {
      const mockContent = `---
description: Test agent description
model: GPT-4
---

Agent content here.`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockContent),
      } as any);

      const result = await adapter.getContentItem('agents/test.agent.md');

      expect(result).toEqual({
        path: 'agents/test.agent.md',
        name: 'test',
        type: 'agent',
        frontmatter: {
          description: 'Test agent description',
          model: 'GPT-4',
        },
        content: '\nAgent content here.',
        url: 'https://github.com/github/awesome-copilot/blob/main/agents/test.agent.md',
      });
    });

    it('should parse prompt file correctly', async () => {
      const mockContent = `---
description: Test prompt description
mode: ask
---

Prompt content here.`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockContent),
      } as any);

      const result = await adapter.getContentItem('prompts/test.prompt.md');

      expect(result?.type).toBe('prompt');
      expect(result?.name).toBe('test');
    });

    it('should parse instruction file correctly', async () => {
      const mockContent = `---
description: Test instruction description
applyTo: **.js, **.ts
---

Instruction content here.`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockContent),
      } as any);

      const result = await adapter.getContentItem('instructions/test.instructions.md');

      expect(result?.type).toBe('instruction');
      expect(result?.name).toBe('test');
    });

    it('should return null on parsing error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      const result = await adapter.getContentItem('nonexistent.md');

      expect(result).toBeNull();
    });
  });

  describe('getAllContentItems', () => {
    it('should get all content items and filter correctly', async () => {
      const mockTree = [
        { path: 'agents/test.agent.md', type: 'blob' },
        { path: 'prompts/test.prompt.md', type: 'blob' },
        { path: 'instructions/test.instructions.md', type: 'blob' },
        { path: 'README.md', type: 'blob' }, // Should be filtered out
      ];

      const mockContent = `---
description: Test description
---

Content`;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ tree: mockTree }),
        } as any)
        .mockResolvedValue({
          ok: true,
          text: jest.fn().mockResolvedValue(mockContent),
        } as any);

      const result = await adapter.getAllContentItems();

      expect(result).toHaveLength(3);
      expect(result.map((item: ContentItem) => item.type)).toEqual(['agent', 'prompt', 'instruction']);
    });

    it('should handle errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.getAllContentItems()).rejects.toThrow('Network error');
    });
  });
});
