import { escapeHtml, getGitHubUrl, getLastUpdatedHtml } from '../utils';
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from './resource-card';

export interface RenderableSkillFile {
  name: string;
  path: string;
}

export interface RenderableSkill {
  id: string;
  title: string;
  description?: string;
  path: string;
  skillFile: string;
  category: string;
  hasAssets: boolean;
  assetCount: number;
  files: RenderableSkillFile[];
  lastUpdated?: string | null;
}

export type SkillSortOption = "title" | "lastUpdated";

export function sortSkills<T extends RenderableSkill>(
  items: T[],
  sort: SkillSortOption
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

/** Top-level bundled resource kinds (scripts, references, assets, …). */
export function skillAssetKinds(item: RenderableSkill): string[] {
  const kinds = new Set<string>();
  for (const file of item.files ?? []) {
    const name = file.name ?? '';
    const slash = name.indexOf('/');
    if (slash > 0) kinds.add(name.slice(0, slash).toLowerCase());
  }
  return [...kinds];
}

export function skillSearchText(item: RenderableSkill): string {
  return [item.title, item.description ?? '', item.id, skillAssetKinds(item).join(' ')].join(' ');
}

const CLIPBOARD_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;
const DOWNLOAD_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/></svg>`;

export function renderSkillsHtml(items: RenderableSkill[]): string {
  const models: RCardModel[] = items.map((item) => {
    const facts: RCardFact[] = [
      { icon: FACT_ICONS.file, label: `${item.files.length} file${item.files.length === 1 ? '' : 's'}` },
    ];
    if (item.hasAssets) {
      facts.push({
        icon: FACT_ICONS.asset,
        label: `${item.assetCount} asset${item.assetCount === 1 ? '' : 's'}`,
      });
    }

    const safeTitle = escapeHtml(item.title);
    const skillId = escapeHtml(item.id);
    const actionsHtml = `
      <button type="button" class="btn btn-primary btn-small copy-install-btn" data-skill-id="${skillId}" title="Copy install command" aria-label="Copy install command for ${safeTitle}">
        ${CLIPBOARD_SVG}<span>Copy install</span>
      </button>
      <button type="button" class="download-skill-btn rcard-icon-btn rcard-lead" data-skill-id="${skillId}" title="Download as ZIP" aria-label="Download ${safeTitle} as ZIP">
        ${DOWNLOAD_SVG}
      </button>
      <a href="${getGitHubUrl(item.path)}" class="action-github" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="View on GitHub" aria-label="View ${safeTitle} on GitHub">
        ${GITHUB_MARK}
      </a>
    `;

    return {
      accent: 'power',
      icon: TYPE_ICONS.lightning,
      title: item.title,
      description: item.description || 'No description',
      path: item.skillFile,
      attributes: { 'data-skill-id': item.id },
      facts,
      lastUpdatedHtml: getLastUpdatedHtml(item.lastUpdated),
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    'No skills match your filters',
    'Try a different search term or clear the active filters.'
  );
}
