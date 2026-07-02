import { escapeHtml } from "../utils";
import { renderEmptyStateHtml } from "./card-render";

/**
 * Shared "rcard" renderer used by every listing page. Each page builds a
 * ResourceCardModel (type icon, accent, purpose-built facts, action row) and
 * this module emits the exact markup + a11y hooks the listing CSS + client
 * handlers expect:
 *   - `.resource-item.rcard[data-path]` (role=listitem)
 *   - `.resource-preview` is a <button> with NO nested interactive children
 *   - `.resource-actions` are siblings OUTSIDE the button
 */

// --- Type glyphs (Primer where available; each carries its own viewBox) -----

export const TYPE_ICONS: Record<string, string> = {
  robot: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M22.5 13.919v-.278a5.097 5.097 0 0 0-4.961-5.086.858.858 0 0 1-.754-.497l-.149-.327A6.414 6.414 0 0 0 10.81 4a6.133 6.133 0 0 0-6.13 6.32l.019.628a.863.863 0 0 1-.67.869A3.263 3.263 0 0 0 1.5 14.996v.108A3.397 3.397 0 0 0 4.896 18.5h1.577a.75.75 0 0 1 0 1.5H4.896A4.896 4.896 0 0 1 0 15.104v-.108a4.761 4.761 0 0 1 3.185-4.493l-.004-.137A7.633 7.633 0 0 1 10.81 2.5a7.911 7.911 0 0 1 7.176 4.58C21.36 7.377 24 10.207 24 13.641v.278a.75.75 0 0 1-1.5 0Z"/><path d="m12.306 11.77 3.374 3.375a.749.749 0 0 1 0 1.061l-3.375 3.375-.057.051a.751.751 0 0 1-1.004-.051.751.751 0 0 1-.051-1.004l.051-.057 2.845-2.845-2.844-2.844a.75.75 0 1 1 1.061-1.061ZM22.5 19.8H18a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 0 1.5Z"/></svg>`,
  document: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4.09 12.11a1.23 1.23 0 0 0 .13 1.72l.16.14a1.23 1.23 0 0 0 1.52 0L13 9.5V22l8.91-10.11a1.23 1.23 0 0 0-.13-1.72l-.16-.14a1.23 1.23 0 0 0-1.52 0L13 14.5V2Z"/></svg>`,
  hook: `<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M3.38 8A9.502 9.502 0 0 1 12 2.5a9.502 9.502 0 0 1 9.215 7.182.75.75 0 1 0 1.456-.364C21.473 4.539 17.15 1 12 1a10.995 10.995 0 0 0-9.5 5.452V4.75a.75.75 0 0 0-1.5 0V8.5a1 1 0 0 0 1 1h3.75a.75.75 0 0 0 0-1.5H3.38Zm-.595 6.318a.75.75 0 0 0-1.455.364C2.527 19.461 6.85 23 12 23c4.052 0 7.592-2.191 9.5-5.451v1.701a.75.75 0 0 0 1.5 0V15.5a1 1 0 0 0-1-1h-3.75a.75.75 0 0 0 0 1.5h2.37A9.502 9.502 0 0 1 12 21.5c-4.446 0-8.181-3.055-9.215-7.182Z"/></svg>`,
  workflow: `<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M1 3a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H7v4.063C7 16.355 7.644 17 8.438 17H12.5v-2.5a2 2 0 0 1 2-2H21a2 2 0 0 1 2 2V21a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2v-2.5H8.437A2.939 2.939 0 0 1 5.5 15.562V11.5H3a2 2 0 0 1-2-2Zm2-.5a.5.5 0 0 0-.5.5v6.5a.5.5 0 0 0 .5.5h6.5a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5ZM14.5 14a.5.5 0 0 0-.5.5V21a.5.5 0 0 0 .5.5H21a.5.5 0 0 0 .5-.5v-6.5a.5.5 0 0 0-.5-.5Z"/></svg>`,
  plug: `<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M7 11.5H2.938c-.794 0-1.438.644-1.438 1.437v8.313a.75.75 0 0 1-1.5 0v-8.312A2.939 2.939 0 0 1 2.937 10H7V6.151c0-.897.678-1.648 1.57-1.74l6.055-.626 1.006-1.174A1.752 1.752 0 0 1 16.96 2h1.29c.966 0 1.75.784 1.75 1.75V6h3.25a.75.75 0 0 1 0 1.5H20V14h3.25a.75.75 0 0 1 0 1.5H20v2.25a1.75 1.75 0 0 1-1.75 1.75h-1.29a1.75 1.75 0 0 1-1.329-.611l-1.006-1.174-6.055-.627A1.749 1.749 0 0 1 7 15.348Zm9.77-7.913v.001l-1.201 1.4a.75.75 0 0 1-.492.258l-6.353.657a.25.25 0 0 0-.224.249v9.196a.25.25 0 0 0 .224.249l6.353.657c.191.02.368.112.493.258l1.2 1.401a.252.252 0 0 0 .19.087h1.29a.25.25 0 0 0 .25-.25v-14a.25.25 0 0 0-.25-.25h-1.29a.252.252 0 0 0-.19.087Z"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></svg>`,
  browser: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/></svg>`,
};

// --- Fact glyphs (small, stroke, tint to the card accent) -------------------

export const FACT_ICONS = {
  tools: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></svg>`,
  handoffs: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4"/></svg>`,
  mcp: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/></svg>`,
  applies: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>`,
  file: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
  asset: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12l8.73-5.04M12 22V12"/></svg>`,
  event: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>`,
  trigger: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>`,
  items: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><path d="M7 7h.01"/></svg>`,
  category: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>`,
  feature: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  author: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.82 6.2 20.86l1.11-6.46-4.7-4.58 6.49-.94Z"/></svg>`,
};

export const GITHUB_MARK = `<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;

export interface RCardFact {
  icon: string;
  label: string;
}

export interface RCardBadge {
  text: string;
  title?: string;
  moreCount?: number;
  mono?: boolean;
}

export interface RCardModel {
  accent: string;
  icon: string;
  title: string;
  description: string;
  /** Value written to data-path; the modal + action handlers key off this. */
  path: string;
  badge?: RCardBadge | null;
  facts?: RCardFact[];
  lastUpdatedHtml?: string;
  actionsHtml: string;
  /** Extra attributes on the card element (e.g. data-hook-id, id). */
  attributes?: Record<string, string>;
  articleClassName?: string;
  /** Optional media that replaces the icon tile (extensions thumbnails). */
  mediaHtml?: string;
}

export function factHtml(icon: string, label: string): string {
  return `<span class="rcard-fact">${icon}<span>${escapeHtml(label)}</span></span>`;
}

function badgeHtml(badge?: RCardBadge | null): string {
  if (!badge) return "";
  const cls = badge.mono ? "rcard-badge rcard-badge-mono" : "rcard-badge";
  const more =
    badge.moreCount && badge.moreCount > 0
      ? `<span class="rcard-badge-more">+${badge.moreCount}</span>`
      : "";
  return `<span class="${cls}"${
    badge.title ? ` title="${escapeHtml(badge.title)}"` : ""
  }>${escapeHtml(badge.text)}${more}</span>`;
}

function attrsHtml(attributes?: Record<string, string>): string {
  if (!attributes) return "";
  return Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join("");
}

export function renderResourceCardHtml(model: RCardModel): string {
  const factsHtml = model.facts && model.facts.length
    ? `<span class="rcard-facts">${model.facts
        .map((f) => factHtml(f.icon, f.label))
        .join("")}</span>`
    : "";

  const media = model.mediaHtml
    ? `<span class="rcard-media" aria-hidden="true">${model.mediaHtml}</span>`
    : `<span class="rcard-icon" aria-hidden="true">${model.icon}</span>`;

  const className = model.articleClassName
    ? `resource-item rcard ${model.articleClassName}`
    : "resource-item rcard";

  return `
    <div class="${className}" role="listitem" data-accent="${escapeHtml(
      model.accent
    )}" data-path="${escapeHtml(model.path)}"${attrsHtml(model.attributes)}>
      <button type="button" class="resource-preview rcard-preview">
        ${media}
        <span class="rcard-body">
          <span class="rcard-head">
            <span class="resource-title rcard-title">${escapeHtml(model.title)}</span>
            ${badgeHtml(model.badge)}
          </span>
          <span class="resource-description rcard-desc">${escapeHtml(
            model.description || "No description"
          )}</span>
          ${factsHtml}
          ${model.lastUpdatedHtml ? `<span class="rcard-updated">${model.lastUpdatedHtml}</span>` : ""}
        </span>
      </button>
      <div class="resource-actions rcard-actions">
        ${model.actionsHtml}
      </div>
    </div>
  `;
}

export function renderResourceGridHtml(
  models: RCardModel[],
  emptyTitle: string,
  emptyDescription: string
): string {
  if (models.length === 0) {
    return renderEmptyStateHtml(emptyTitle, emptyDescription);
  }
  return models.map(renderResourceCardHtml).join("");
}
