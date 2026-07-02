/**
 * Hooks page functionality
 */
import {
  escapeHtml,
  fetchData,
  formatRelativeTime,
  showToast,
  downloadZipBundle,
} from '../utils';
import { openCardDetailsModal } from '../modal';
import { initListingPage } from './listing-controller';
import {
  hookEvents,
  hookSearchText,
  renderHooksHtml,
  sortHooks,
  type HookSortOption,
  type RenderableHook,
} from './hooks-render';

interface Hook extends RenderableHook {}

interface HooksData {
  items: Hook[];
}

const SPINNER_SVG =
  '<svg class="spinner" viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 8 1.5V0z"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>';
const DOWNLOAD_SVG =
  '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/></svg>';

let hookById = new Map<string, Hook>();

async function downloadHook(hookId: string, btn: HTMLButtonElement): Promise<void> {
  const hook = hookById.get(hookId);
  if (!hook) {
    showToast('Hook not found.', 'error');
    return;
  }

  const files = [
    { name: 'README.md', path: hook.readmeFile },
    ...hook.assets.map((asset) => ({ name: asset, path: `${hook.path}/${asset}` })),
  ];

  const iconOnly = btn.classList.contains('rcard-icon-btn');
  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = iconOnly ? SPINNER_SVG : `${SPINNER_SVG}<span>Preparing…</span>`;

  try {
    await downloadZipBundle(hook.id, files);
    btn.innerHTML = iconOnly ? CHECK_SVG : `${CHECK_SVG}<span>Downloaded!</span>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    showToast(message, 'error');
    btn.innerHTML = iconOnly ? DOWNLOAD_SVG : originalContent;
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

function openHookDetailsModal(item: Hook, trigger?: HTMLElement): void {
  const metaParts = item.hooks.map(
    (hookName) => `<span class="resource-tag tag-hook">${escapeHtml(hookName)}</span>`
  );

  if (item.assets.length > 0) {
    metaParts.push(
      `<span class="resource-tag tag-assets">${item.assets.length} asset${
        item.assets.length === 1 ? '' : 's'
      }</span>`
    );
  }

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const tagHtml = item.tags
    .map((tagText) => `<span class="resource-tag tag-tag">${escapeHtml(tagText)}</span>`)
    .join('');

  const actionsHtml = `
    <button id="hook-details-download" class="btn btn-primary" type="button" data-hook-id="${escapeHtml(
      item.id
    )}">Download</button>
    <button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
      item.readmeFile
    )}" data-open-file-type="hook">Source</button>
  `;

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '🪝',
    previewText: 'Hook events and download options',
    metaHtml: metaParts.join(''),
    tagsHtml: tagHtml,
    actionsHtml,
    trigger,
  });
}

function setupHookActionHandlers(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const downloadBtn = target.closest(
      '.download-hook-btn, #hook-details-download'
    ) as HTMLButtonElement | null;
    if (downloadBtn) {
      event.stopPropagation();
      const hookId = downloadBtn.dataset.hookId;
      if (hookId) downloadHook(hookId, downloadBtn);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupHookActionHandlers();
  const data = await fetchData<HooksData>('hooks.json');
  if (data?.items) {
    hookById = new Map(data.items.map((item) => [item.id, item]));
  }
});

initListingPage<Hook>({
  dataFile: 'hooks.json',
  keyOf: (item) => item.readmeFile,
  search: hookSearchText,
  facetValues: (item) => ({ event: hookEvents(item) }),
  sort: (items, sort) => sortHooks(items, sort as HookSortOption),
  render: renderHooksHtml,
  noun: 'hook',
  openModal: openHookDetailsModal,
});
