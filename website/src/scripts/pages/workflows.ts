/**
 * Workflows page functionality
 */
import {
  copyToClipboard,
  escapeHtml,
  formatRelativeTime,
  showToast,
} from '../utils';
import { openCardDetailsModal } from '../modal';
import { initListingPage } from './listing-controller';
import {
  humanizeTrigger,
  renderWorkflowsHtml,
  sortWorkflows,
  workflowSearchText,
  workflowTriggers,
  type RenderableWorkflow,
  type WorkflowSortOption,
} from './workflows-render';

interface Workflow extends RenderableWorkflow {
  id: string;
}

function openWorkflowDetailsModal(item: Workflow, trigger?: HTMLElement): void {
  const metaParts: string[] = [];
  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const triggerTags = item.triggers
    .map(
      (triggerName) =>
        `<span class="resource-tag tag-trigger">${escapeHtml(
          humanizeTrigger(triggerName)
        )}</span>`
    )
    .join('');

  const actionsHtml = `
    <button id="workflow-details-copy-path" class="btn btn-primary" type="button" data-workflow-path="${escapeHtml(
      item.path
    )}">Copy path</button>
    <button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
      item.path
    )}" data-open-file-type="workflow">Source</button>
  `;

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '⚡',
    previewText: 'Workflow trigger details and source',
    metaHtml: metaParts.join(''),
    tagsHtml: triggerTags,
    actionsHtml,
    trigger,
  });
}

function setupWorkflowActionHandlers(): void {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const copyPathButton = target.closest(
      '#workflow-details-copy-path'
    ) as HTMLButtonElement | null;
    if (!copyPathButton) return;
    const workflowPath = copyPathButton.dataset.workflowPath || '';
    if (!workflowPath) return;
    const success = await copyToClipboard(workflowPath);
    showToast(
      success ? 'Path copied!' : 'Failed to copy path',
      success ? 'success' : 'error'
    );
  });
}

setupWorkflowActionHandlers();

initListingPage<Workflow>({
  dataFile: 'workflows.json',
  keyOf: (item) => item.path,
  search: workflowSearchText,
  facetValues: (item) => ({ trigger: workflowTriggers(item) }),
  sort: (items, sort) => sortWorkflows(items, sort as WorkflowSortOption),
  render: renderWorkflowsHtml,
  noun: 'workflow',
  openModal: openWorkflowDetailsModal,
});
