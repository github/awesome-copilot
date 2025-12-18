import { GitHubTreeResponse, GitHubTreeItem, ContentItem } from '../types';
import { parseFrontmatter } from '../parsers/frontmatter';

const GITHUB_API_BASE = 'https://api.github.com';
const OWNER = 'github';
const REPO = 'awesome-copilot';
const BRANCH = 'main';

export class GitHubAdapter {
  private async fetchGitHubAPI(endpoint: string): Promise<any> {
    const url = `${GITHUB_API_BASE}/repos/${OWNER}/${REPO}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTree(path?: string): Promise<GitHubTreeItem[]> {
    const endpoint = `/git/trees/${BRANCH}${path ? `?recursive=1&path=${encodeURIComponent(path)}` : '?recursive=1'}`;
    const response: GitHubTreeResponse = await this.fetchGitHubAPI(endpoint);
    return response.tree;
  }

  async getRawFile(path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch raw file: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  async getContentItem(path: string): Promise<ContentItem | null> {
    try {
      const content = await this.getRawFile(path);
      const { frontmatter, body } = parseFrontmatter(content);

      let type: ContentItem['type'] = 'collection';
      if (path.includes('agents/') && path.endsWith('.agent.md')) {
        type = 'agent';
      } else if (path.includes('prompts/') && path.endsWith('.prompt.md')) {
        type = 'prompt';
      } else if (path.includes('instructions/') && path.endsWith('.instructions.md')) {
        type = 'instruction';
      }

      const name = path.split('/').pop()?.replace(/\.(agent|prompt|instructions)\.md$/, '') || '';

      return {
        path,
        name,
        type,
        frontmatter,
        content: body,
        url: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${path}`
      };
    } catch (error) {
      console.warn(`Failed to get content item for ${path}:`, error);
      return null;
    }
  }

  async getAllContentItems(): Promise<ContentItem[]> {
    const tree = await this.getTree();
    const contentFiles = tree.filter(item =>
      item.type === 'blob' &&
      (item.path.endsWith('.agent.md') ||
       item.path.endsWith('.prompt.md') ||
       item.path.endsWith('.instructions.md'))
    );

    const items: ContentItem[] = [];
    for (const file of contentFiles) {
      const item = await this.getContentItem(file.path);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }
}
