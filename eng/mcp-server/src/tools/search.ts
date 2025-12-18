import { ContentItem, SearchResult } from '../types';
import { GitHubAdapter } from '../adapters/github-adapter';

export class SearchTools {
  private githubAdapter: GitHubAdapter;

  constructor(githubAdapter: GitHubAdapter) {
    this.githubAdapter = githubAdapter;
  }

  private searchItems(items: ContentItem[], query: string, types?: string[]): ContentItem[] {
    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
      if (types && !types.includes(item.type)) {
        return false;
      }

      const searchableText = [
        item.name,
        item.frontmatter?.description,
        item.content,
        item.path
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }

  async searchAll(query: string): Promise<SearchResult> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const filteredItems = this.searchItems(allItems, query);

    return {
      items: filteredItems,
      total: filteredItems.length
    };
  }

  async searchInstructions(query: string): Promise<SearchResult> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const filteredItems = this.searchItems(allItems, query, ['instruction']);

    return {
      items: filteredItems,
      total: filteredItems.length
    };
  }

  async searchAgents(query: string): Promise<SearchResult> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const filteredItems = this.searchItems(allItems, query, ['agent']);

    return {
      items: filteredItems,
      total: filteredItems.length
    };
  }

  async searchPrompts(query: string): Promise<SearchResult> {
    const allItems = await this.githubAdapter.getAllContentItems();
    const filteredItems = this.searchItems(allItems, query, ['prompt']);

    return {
      items: filteredItems,
      total: filteredItems.length
    };
  }
}
