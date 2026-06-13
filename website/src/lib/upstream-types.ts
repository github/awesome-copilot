/**
 * Type definitions matching the upstream generated JSON schemas
 * produced by `eng/generate-website-data.mjs`.
 *
 * Every field matches what appears in `website/public/data/*.json`.
 * Nullable fields are marked optional so adapters can provide safe fallbacks.
 */

/* ── Agent ─────────────────────────────────────────────────── */

export interface AgentItem {
  id: string;
  title: string;
  description: string;
  model: string[] | null;
  tools: string[];
  hasHandoffs: boolean;
  handoffs: string[];
  mcpServers: string[];
  path: string;
  filename: string;
  lastUpdated: string;
}

export interface AgentsData {
  items: AgentItem[];
}

/* ── Instruction ───────────────────────────────────────────── */

export interface InstructionItem {
  id: string;
  title: string;
  description: string;
  applyTo: string | null;
  applyToPatterns: string[];
  extensions: string[];
  path: string;
  filename: string;
  lastUpdated: string;
}

export interface InstructionsData {
  items: InstructionItem[];
}

/* ── Skill ─────────────────────────────────────────────────── */

export interface SkillFile {
  path: string;
  name: string;
  size: number;
}

export interface SkillItem {
  id: string;
  name: string;
  title: string;
  description: string;
  assets: string[];
  hasAssets: boolean;
  assetCount: number;
  category: string;
  path: string;
  skillFile: string;
  files: SkillFile[];
  lastUpdated: string;
}

export interface SkillsData {
  items: SkillItem[];
}

/* ── Hook ──────────────────────────────────────────────────── */

export interface HookItem {
  id: string;
  title: string;
  description: string;
  hooks: string[];
  tags: string[];
  assets: string[];
  path: string;
  readmeFile?: string;         // may be missing
  lastUpdated: string;
}

export interface HooksData {
  items: HookItem[];
}

/* ── Workflow ──────────────────────────────────────────────── */

export interface WorkflowItem {
  id: string;
  title: string;
  description: string;
  triggers: string[];
  path: string;
  lastUpdated: string;
}

export interface WorkflowsData {
  items: WorkflowItem[];
}

/* ── Plugin ────────────────────────────────────────────────── */

export interface PluginKindItem {
  kind: string;
  path: string;
}

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  path: string;
  tags: string[];
  itemCount: number;
  items: PluginKindItem[];
  external?: boolean;
  repository?: string;
  homepage?: string;
  author?: string;
  license?: string;
  source?: string;
}

export interface PluginsData {
  items: PluginItem[];
}

/* ── Tool ──────────────────────────────────────────────────── */

export interface ToolConfiguration {
  type: string;
  content: string;
}

export interface ToolLinks {
  [key: string]: string | undefined;
  github?: string;
  pypi?: string;
  blog?: string;
  vscode?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  requirements: string[];
  features: string[];
  links: ToolLinks;
  configuration: ToolConfiguration | null;
  tags: string[];
}

export interface ToolsData {
  items: ToolItem[];
}

/* ── Search Index ──────────────────────────────────────────── */

export interface SearchIndexItem {
  type: string;
  id: string;
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  searchText: string;
  tags?: string[];
}

export type SearchIndexData = SearchIndexItem[];

/* ── Manifest ──────────────────────────────────────────────── */

export interface ManifestCounts {
  agents: number;
  instructions: number;
  skills: number;
  hooks: number;
  workflows: number;
  plugins: number;
  tools: number;
  contributors: number;
  samples: number;
  total: number;
}

export interface ManifestItem {
  generated: string;
  counts: ManifestCounts;
}

/* ── Samples (Cookbook) ────────────────────────────────────── */

export interface CookbookLanguage {
  id: string;
  name: string;
  icon: string;
  extension: string;
}

export interface CookbookRecipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files?: Record<string, string>;
  url?: string;
  variants?: Record<string, { code: string }>;
}

export interface Cookbook {
  id: string;
  name: string;
  description: string;
  path: string;
  featured: boolean;
  languages: CookbookLanguage[];
  recipes: CookbookRecipe[];
}

export interface SamplesFilters {
  [key: string]: string[];
}

export interface SamplesData {
  cookbooks: Cookbook[];
  totalRecipes: number;
  totalCookbooks: number;
  filters: SamplesFilters;
}
