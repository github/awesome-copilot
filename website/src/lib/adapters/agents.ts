/**
 * AgentItem → ResultItem adapter.
 *
 * Normalizes upstream agents.json records into the UI's ResultItem view model.
 * Handles null models, empty handoffs/tools, and missing optional fields.
 */

import type { ResultItem, ResourceFile } from "../types";
import type { AgentItem } from "../upstream-types";
import { stableAccent } from "../../scripts/resource-catalog";

/** Maximum number of tools shown as tags before a "+N more" overflow. */
const MAX_TOOL_TAGS = 3;

export function adaptAgent(item: AgentItem): ResultItem {
  const tags = buildTags(item);

  const result: ResultItem = {
    id: item.id,
    title: item.title,
    label: buildLabel(item),
    description: item.description,
    tags,
    accent: stableAccent(item.id || item.filename || item.title),
    detail: item.path,
    model: Array.isArray(item.model)
      ? item.model.join(", ")
      : (item.model ?? undefined),
    tools: item.tools.length > 0 ? item.tools : undefined,
    // handoffs is string[] in the upstream schema; use the strings directly.
    handoffs:
      item.hasHandoffs && item.handoffs.length > 0 ? item.handoffs : undefined,
    actions: buildActions(),
    resourceFiles: buildResourceFiles(item),
  };

  return result;
}

function buildLabel(item: AgentItem): string {
  if (item.hasHandoffs) return "handoff enabled";
  if (item.tools.length > 0) return "tool-enabled";
  if (item.model) return "model configured";
  return "agent";
}

function buildTags(item: AgentItem): string[] {
  const tags: string[] = [];

  // Model tag
  if (item.model && Array.isArray(item.model) && item.model.length > 0) {
    tags.push(item.model.join(", "));
  } else if (typeof item.model === "string" && item.model) {
    tags.push(item.model);
  } else {
    tags.push("(none)");
  }

  // Tool tags — show up to MAX_TOOL_TAGS
  const shown = item.tools.slice(0, MAX_TOOL_TAGS);
  tags.push(...shown);
  if (item.tools.length > MAX_TOOL_TAGS) {
    tags.push(`+${item.tools.length - MAX_TOOL_TAGS} more`);
  }

  // Handoff flag
  if (item.hasHandoffs) {
    tags.push("handoffs");
  }

  return tags;
}

function buildActions(): string[] {
  return ["install", "download", "share", "github"];
}

function buildResourceFiles(item: AgentItem): ResourceFile[] {
  const files: ResourceFile[] = [];
  if (item.path) {
    files.push({
      path: item.path,
      type: "reference",
      description: item.filename || item.path,
    });
  }
  return files;
}

/** Convenience: adapt an entire array in one call. */
export function adaptAgents(items: AgentItem[]): ResultItem[] {
  return items.map(adaptAgent);
}
