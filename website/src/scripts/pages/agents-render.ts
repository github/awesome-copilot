import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from "../utils";
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from "./resource-card";

export interface RenderableAgent {
  title: string;
  description?: string;
  path: string;
  model?: string | string[];
  tools?: string[];
  hasHandoffs?: boolean;
  mcpServers?: string[];
  lastUpdated?: string | null;
}

export type AgentSortOption = "title" | "lastUpdated";

export interface AgentFilterState {
  query: string;
  families: string[];
  capabilities: string[];
}

const resourceType = "agent";

export interface ModelFamily {
  key: string;
  label: string;
}

export interface Facet {
  key: string;
  label: string;
}

const FAMILY_RULES: { key: string; label: string; test: RegExp }[] = [
  { key: "gpt", label: "GPT", test: /gpt|o1|o3|o4|codex/i },
  { key: "claude", label: "Claude", test: /claude|sonnet|opus|haiku/i },
  { key: "gemini", label: "Gemini", test: /gemini/i },
  { key: "grok", label: "Grok", test: /grok/i },
  { key: "llama", label: "Llama", test: /llama/i },
  { key: "mistral", label: "Mistral", test: /mistral|mixtral/i },
];

/** Split a possibly array/pipe-delimited model field into cleaned model names. */
export function normalizeModelList(model?: string | string[]): string[] {
  if (!model) return [];
  const raw = Array.isArray(model) ? model : [model];
  const out: string[] = [];
  for (const entry of raw) {
    for (const part of String(entry).split(/[|,]/)) {
      const cleaned = part.replace(/['"]/g, "").trim();
      if (cleaned) out.push(cleaned);
    }
  }
  return out;
}

function familyOf(modelName: string): ModelFamily {
  for (const rule of FAMILY_RULES) {
    if (rule.test.test(modelName)) return { key: rule.key, label: rule.label };
  }
  return { key: "other", label: "Other" };
}

/** Distinct model-family keys for a single agent. */
export function agentModelFamilies(item: RenderableAgent): string[] {
  const set = new Set<string>();
  for (const m of normalizeModelList(item.model)) set.add(familyOf(m).key);
  return [...set];
}

/** Model families present across all items, ordered by frequency. */
export function getModelFamilies(items: RenderableAgent[]): ModelFamily[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const key of agentModelFamilies(item)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const labelFor = (key: string) =>
    FAMILY_RULES.find((r) => r.key === key)?.label ?? "Other";
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({ key, label: labelFor(key) }));
}

/** Capability facets present across items (handoffs, MCP). */
export function getCapabilityFacets(items: RenderableAgent[]): Facet[] {
  const facets: Facet[] = [];
  if (items.some((i) => (i.mcpServers?.length ?? 0) > 0)) {
    facets.push({ key: "mcp", label: "MCP servers" });
  }
  if (items.some((i) => i.hasHandoffs)) {
    facets.push({ key: "handoffs", label: "Handoffs" });
  }
  return facets;
}

export function sortAgents<T extends RenderableAgent>(
  items: T[],
  sort: AgentSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === "lastUpdated") {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }
    return a.title.localeCompare(b.title);
  });
}

export function filterAgents<T extends RenderableAgent>(
  items: T[],
  state: AgentFilterState
): T[] {
  const query = state.query.trim().toLowerCase();
  const families = new Set(state.families);
  const capabilities = new Set(state.capabilities);

  return items.filter((item) => {
    if (capabilities.has("handoffs") && !item.hasHandoffs) return false;
    if (capabilities.has("mcp") && !(item.mcpServers?.length ?? 0)) return false;

    if (families.size > 0) {
      const itemFamilies = agentModelFamilies(item);
      if (!itemFamilies.some((f) => families.has(f))) return false;
    }

    if (query) {
      const haystack = [
        item.title,
        item.description ?? "",
        normalizeModelList(item.model).join(" "),
        (item.tools ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function renderAgentsHtml(items: RenderableAgent[]): string {
  const models: RCardModel[] = items.map((item) => {
    const modelNames = normalizeModelList(item.model);
    const badge = modelNames.length
      ? {
          text: modelNames[0],
          title: modelNames.join(", "),
          moreCount: modelNames.length - 1,
          mono: true,
        }
      : null;

    const facts: RCardFact[] = [];
    if (item.tools && item.tools.length) {
      facts.push({
        icon: FACT_ICONS.tools,
        label: `${item.tools.length} tool${item.tools.length === 1 ? "" : "s"}`,
      });
    }
    if (item.mcpServers && item.mcpServers.length) {
      facts.push({ icon: FACT_ICONS.mcp, label: `${item.mcpServers.length} MCP` });
    }
    if (item.hasHandoffs) {
      facts.push({ icon: FACT_ICONS.handoffs, label: "Handoffs" });
    }

    const actionsHtml = `
      ${getInstallDropdownHtml(resourceType, item.path, true)}
      ${getActionButtonsHtml(item.path, true)}
      <a href="${getGitHubUrl(
        item.path
      )}" class="btn btn-secondary btn-small action-github" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="View on GitHub" aria-label="View ${escapeHtml(
        item.title
      )} on GitHub">
        ${GITHUB_MARK}
      </a>
    `;

    return {
      accent: "ai",
      icon: TYPE_ICONS.robot,
      title: item.title,
      description: item.description || "No description",
      path: item.path,
      badge,
      facts,
      lastUpdatedHtml: getLastUpdatedHtml(item.lastUpdated),
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    "No agents match your filters",
    "Try a different search term or clear the active filters."
  );
}
