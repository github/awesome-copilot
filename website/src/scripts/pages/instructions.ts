/**
 * Instructions page functionality
 */
import {
  escapeHtml,
  formatRelativeTime,
  getVSCodeInstallUrl,
} from '../utils';
import { openCardDetailsModal } from '../modal';
import { initListingPage } from './listing-controller';
import {
  instructionExtensions,
  instructionSearchText,
  renderInstructionsHtml,
  sortInstructions,
  type InstructionSortOption,
  type RenderableInstruction,
} from './instructions-render';

interface Instruction extends RenderableInstruction {
  path: string;
  applyTo?: string | string[];
  extensions?: string[];
  lastUpdated?: string | null;
}

function openInstructionDetailsModal(item: Instruction, trigger?: HTMLElement): void {
  const metaParts: string[] = [];
  const applyToText = Array.isArray(item.applyTo) ? item.applyTo.join(', ') : item.applyTo;
  if (applyToText) {
    metaParts.push(`<span class="resource-tag">applies to: ${escapeHtml(applyToText)}</span>`);
  }

  metaParts.push(
    ...(item.extensions || []).map(
      (extension) => `<span class="resource-tag tag-extension">${escapeHtml(extension)}</span>`
    )
  );

  if (item.lastUpdated) {
    metaParts.push(`<span class="last-updated">Updated ${escapeHtml(formatRelativeTime(item.lastUpdated))}</span>`);
  }

  const vscodeUrl = getVSCodeInstallUrl('instructions', item.path, false);
  const insidersUrl = getVSCodeInstallUrl('instructions', item.path, true);
  const actions = [
    vscodeUrl
      ? `<a class="btn btn-primary btn-small" href="${escapeHtml(vscodeUrl)}" target="_blank" rel="noopener noreferrer">Install (VS Code)</a>`
      : '',
    insidersUrl
      ? `<a class="btn btn-secondary btn-small" href="${escapeHtml(insidersUrl)}" target="_blank" rel="noopener noreferrer">Install (Insiders)</a>`
      : '',
    `<button class="btn btn-secondary btn-small" type="button" data-open-file-path="${escapeHtml(
      item.path
    )}" data-open-file-type="instruction">Source</button>`,
  ].filter(Boolean);

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '📋',
    previewText: 'Instruction metadata and install options',
    metaHtml: metaParts.join(''),
    actionsHtml: actions.join(''),
    trigger,
  });
}

initListingPage<Instruction>({
  dataFile: 'instructions.json',
  keyOf: (item) => item.path,
  search: instructionSearchText,
  facetValues: (item) => ({ extension: instructionExtensions(item) }),
  sort: (items, sort) => sortInstructions(items, sort as InstructionSortOption),
  render: renderInstructionsHtml,
  noun: 'instruction',
  openModal: openInstructionDetailsModal,
});
