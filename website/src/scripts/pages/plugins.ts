/**
 * Plugins page functionality
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
  getExternalPluginUrl,
  pluginSearchText,
  pluginSource,
  renderPluginsHtml,
  sortPlugins,
  type PluginSortOption,
  type RenderablePlugin,
} from './plugins-render';

interface PluginItem {
  kind: string;
  path: string;
}

interface Plugin extends RenderablePlugin {
  id: string;
  items?: PluginItem[];
  license?: string | null;
}

function getPluginItemLabel(item: PluginItem): string {
  const normalizedPath = item.path.replace(/^\.\//, '');
  return `${item.kind}: ${normalizedPath}`;
}

async function copyPluginInstall(name: string): Promise<void> {
  const command = `copilot plugin install ${name}@awesome-copilot`;
  const success = await copyToClipboard(command);
  showToast(
    success ? 'Install command copied!' : 'Failed to copy',
    success ? 'success' : 'error'
  );
}

function openPluginDetailsModal(item: Plugin, trigger?: HTMLElement): void {
  const metaParts: string[] = [];
  metaParts.push(
    `<span class="resource-tag">${
      item.external ? 'External plugin' : `${item.itemCount} items`
    }</span>`
  );

  if (item.author?.name) {
    metaParts.push(
      `<span class="resource-tag">by ${escapeHtml(item.author.name)}</span>`
    );
  }

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const tagHtml = (item.tags || [])
    .map((tagText) => `<span class="resource-tag">${escapeHtml(tagText)}</span>`)
    .join('');

  const includedItems = item.items || [];
  const includedItemHtml = includedItems
    .slice(0, 24)
    .map(
      (pluginItem) =>
        `<span class="resource-tag tag-plugin-item">${escapeHtml(
          getPluginItemLabel(pluginItem)
        )}</span>`
    )
    .join('');
  const includedMoreHtml =
    includedItems.length > 24
      ? `<span class="resource-tag">+${includedItems.length - 24} more</span>`
      : '';

  const actions = [
    item.external
      ? `<a class="btn btn-primary" href="${escapeHtml(
          getExternalPluginUrl(item)
        )}" target="_blank" rel="noopener noreferrer">Repository</a>`
      : `<button id="plugin-details-install" class="btn btn-primary" type="button" data-plugin-name="${escapeHtml(
          item.name
        )}">Copy install</button>`,
    item.external
      ? ''
      : `<button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
          item.path
        )}" data-open-file-type="plugin">Source</button>`,
  ].filter(Boolean);

  openCardDetailsModal({
    title: item.name,
    description: item.description || 'No description',
    previewIcon: '🔌',
    previewText: 'Plugin metadata and install options',
    metaHtml: metaParts.join(''),
    tagsHtml: [tagHtml, includedItemHtml, includedMoreHtml]
      .filter(Boolean)
      .join(''),
    actionsHtml: actions.join(''),
    trigger,
  });
}

function setupPluginActionHandlers(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const installButton = target.closest(
      '.copy-plugin-install-btn, #plugin-details-install'
    ) as HTMLButtonElement | null;
    if (!installButton) return;
    event.stopPropagation();
    const pluginName = installButton.dataset.pluginName || '';
    if (pluginName) copyPluginInstall(pluginName);
  });
}

setupPluginActionHandlers();

initListingPage<Plugin>({
  dataFile: 'plugins.json',
  keyOf: (item) => item.path,
  search: pluginSearchText,
  facetValues: (item) => ({ source: pluginSource(item) }),
  sort: (items, sort) => sortPlugins(items, sort as PluginSortOption),
  render: renderPluginsHtml,
  noun: 'plugin',
  openModal: openPluginDetailsModal,
});
