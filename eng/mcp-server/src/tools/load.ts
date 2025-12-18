import { ContentItem } from '../types';
import { GitHubAdapter } from '../adapters/github-adapter';

export class LoadTools {
  private githubAdapter: GitHubAdapter;

  constructor(githubAdapter: GitHubAdapter) {
    this.githubAdapter = githubAdapter;
  }

  async loadInstruction(name: string): Promise<ContentItem | null> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const instruction = allItems.find(item =>
      item.type === 'instruction' &&
      item.name &&
      (item.name.toLowerCase() === name.toLowerCase() || item.path.includes(`/${name}.instructions.md`))
    );

    return instruction || null;
  }

  async loadAgent(name: string): Promise<ContentItem | null> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const agent = allItems.find(item =>
      item.type === 'agent' &&
      item.name &&
      (item.name.toLowerCase() === name.toLowerCase() || item.path.includes(`/${name}.agent.md`))
    );

    return agent || null;
  }

  async loadPrompt(name: string): Promise<ContentItem | null> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const prompt = allItems.find(item =>
      item.type === 'prompt' &&
      item.name &&
      (item.name.toLowerCase() === name.toLowerCase() || item.path.includes(`/${name}.prompt.md`))
    );

    return prompt || null;
  }
}
