import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from '../utils';
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from './resource-card';

export interface RenderableInstruction {
  title: string;
  description?: string;
  path: string;
  applyTo?: string | string[] | null;
  extensions?: string[];
  lastUpdated?: string | null;
}

export type InstructionSortOption = 'title' | 'lastUpdated';

export function sortInstructions<T extends RenderableInstruction>(
  items: T[],
  sort: InstructionSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'lastUpdated') {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.title.localeCompare(b.title);
  });
}

/** Extension facet values for an instruction (["(none)"] when it targets none). */
export function instructionExtensions(item: RenderableInstruction): string[] {
  return item.extensions && item.extensions.length > 0
    ? item.extensions
    : ['(none)'];
}

export function instructionSearchText(item: RenderableInstruction): string {
  const applyTo = Array.isArray(item.applyTo)
    ? item.applyTo.join(' ')
    : item.applyTo ?? '';
  return [item.title, item.description ?? '', applyTo, (item.extensions ?? []).join(' ')].join(' ');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Human-friendly "applies to" label; collapses catch-all globs to "All files". */
function formatApplyTo(applyToText: string): string {
  const normalized = applyToText.trim();
  if (!normalized) return 'All files';
  const catchAll = new Set(['*', '**', '**/*', '**/**', '*.*']);
  if (catchAll.has(normalized)) return 'All files';
  return truncate(normalized, 42);
}

export function renderInstructionsHtml(items: RenderableInstruction[]): string {
  const models: RCardModel[] = items.map((item) => {
    const extensions = item.extensions ?? [];
    const applyToText = Array.isArray(item.applyTo)
      ? item.applyTo.join(', ')
      : item.applyTo ?? '';

    const badge = extensions.length
      ? {
          text: extensions[0],
          title: extensions.join(', '),
          moreCount: extensions.length - 1,
          mono: true,
        }
      : null;

    const facts: RCardFact[] = [
      { icon: FACT_ICONS.applies, label: formatApplyTo(applyToText) },
    ];

    const actionsHtml = `
      ${getInstallDropdownHtml('instructions', item.path, true)}
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
      accent: 'docs',
      icon: TYPE_ICONS.document,
      title: item.title,
      description: item.description || 'No description',
      path: item.path,
      badge,
      facts,
      lastUpdatedHtml: getLastUpdatedHtml(item.lastUpdated),
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    'No instructions match your filters',
    'Try a different search term or clear the active filters.'
  );
}
