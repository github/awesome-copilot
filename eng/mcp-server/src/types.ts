export interface Frontmatter {
  mode?: string;
  description?: string;
  applyTo?: string;
  model?: string;
  [key: string]: any;
}

export interface ContentItem {
  path: string;
  name: string;
  type: 'agent' | 'prompt' | 'instruction' | 'collection';
  frontmatter?: Frontmatter;
  content: string;
  url: string;
}

export interface SearchResult {
  items: ContentItem[];
  total: number;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}
