import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from '../utils';
import {
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardModel,
} from './resource-card';

export interface RenderableWorkflow {
  title: string;
  description?: string;
  path: string;
  triggers: string[];
  lastUpdated?: string | null;
}

export type WorkflowSortOption = 'title' | 'lastUpdated';

const TRIGGER_LABELS: Record<string, string> = {
  schedule: 'Scheduled',
  workflow_dispatch: 'Manual',
  issues: 'On issues',
  slash_command: 'Slash command',
  roles: 'Roles',
};

/** Human-friendly label for a raw trigger key. */
export function humanizeTrigger(trigger: string): string {
  return (
    TRIGGER_LABELS[trigger] ??
    trigger.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function sortWorkflows<T extends RenderableWorkflow>(
  items: T[],
  sort: WorkflowSortOption
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

export function workflowTriggers(item: RenderableWorkflow): string[] {
  return item.triggers ?? [];
}

export function workflowSearchText(item: RenderableWorkflow): string {
  return [
    item.title,
    item.description ?? '',
    (item.triggers ?? []).map(humanizeTrigger).join(' '),
    (item.triggers ?? []).join(' '),
  ].join(' ');
}

export function renderWorkflowsHtml(items: RenderableWorkflow[]): string {
  const models: RCardModel[] = items.map((item) => {
    const triggers = item.triggers ?? [];
    const badge = triggers.length
      ? {
          text: humanizeTrigger(triggers[0]),
          title: triggers.map(humanizeTrigger).join(', '),
          moreCount: triggers.length - 1,
        }
      : null;

    const actionsHtml = `
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
      accent: 'automation',
      icon: TYPE_ICONS.workflow,
      title: item.title,
      description: item.description || 'No description',
      path: item.path,
      badge,
      lastUpdatedHtml: getLastUpdatedHtml(item.lastUpdated),
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    'No workflows match your filters',
    'Try a different search term or clear the active filters.'
  );
}
