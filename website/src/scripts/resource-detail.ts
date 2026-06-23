import type { HookItem, PluginItem, SkillItem, ToolItem, WorkflowItem } from '../lib/upstream-types';
import { downloadFile, downloadZipBundle, getGitHubUrl, REPO_IDENTIFIER, shareFile, showToast, getVSCodeProtocolUrl } from './utils';
import { stableAccent } from './resource-catalog';

type ResourceKind = 'skill' | 'hook' | 'workflow' | 'plugin' | 'tool';

interface ZipFileEntry {
  name: string;
  path: string;
}

interface DetailData {
  id: string;
  title: string;
  description: string;
  label: string;
  accent: string;
  terminalPath: string;
  listingHref: string;
  listingLabel: string;
  installTitle: string;
  installCommand: string;
  sourceUrl: string;
  sourcePath: string;
  downloadHref: string;
  shareHref: string;
  filePath: string;
  zipFiles: ZipFileEntry[] | null;
  tags: string[];
  features: Array<{ title: string; value: string }>;
  featureTags: string[];
  specs: Array<{ name: string; value: string }>;
  metadata: Array<{ name: string; value: string }>;
}

const DATA_URLS: Record<ResourceKind, string> = {
  skill: 'data/skills.json',
  hook: 'data/hooks.json',
  workflow: 'data/workflows.json',
  plugin: 'data/plugins.json',
  tool: 'data/tools.json',
};

const LISTING_HREFS: Record<ResourceKind, string> = {
  skill: '/skills/',
  hook: '/hooks/',
  workflow: '/workflows/',
  plugin: '/plugins/',
  tool: '/tools/',
};

function joinOrNone(values: unknown[] | undefined): string {
  return values?.length ? values.join(', ') : '(none)';
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setHref(label: string, href: string): void {
  const link = document.querySelector<HTMLAnchorElement>(`a[aria-label="${label}"]`);
  if (link) link.href = href;
}

function renderTags(tags: string[]): void {
  const tagList = document.getElementById('detail-tags');
  if (!tagList) return;
  tagList.textContent = '';
  for (const tag of tags) {
    const badge = document.createElement('span');
    badge.className = 'detail-badge detail-badge--neutral';
    badge.textContent = tag;
    tagList.append(badge);
  }
}

function renderFeatureCards(features: DetailData['features']): void {
  const grid = document.getElementById('detail-features');
  if (!grid) return;
  grid.textContent = '';
  for (const feature of features) {
    const article = document.createElement('article');
    const title = document.createElement('h3');
    const value = document.createElement('p');
    title.textContent = feature.title;
    value.textContent = feature.value;
    article.append(title, value);
    grid.append(article);
  }
}

function renderFeatureTags(tags: string[]): void {
  const container = document.getElementById('detail-feature-tags');
  if (!container) return;
  container.textContent = '';
  if (!tags || tags.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  for (const tag of tags) {
    const badge = document.createElement('span');
    badge.className = 'feature-tag';
    badge.textContent = tag;
    container.append(badge);
  }
}

function renderDefinitionList(id: string, entries: Array<{ name: string; value: string }>): void {
  const list = document.getElementById(id);
  if (!list) return;
  list.textContent = '';
  for (const entry of entries) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const desc = document.createElement('dd');
    term.textContent = entry.name;
    desc.textContent = entry.value;
    row.append(term, desc);
    list.append(row);
  }
}

function adaptSkill(item: SkillItem): DetailData {
  const command = `gh skills install ${REPO_IDENTIFIER} ${item.id}`;
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    label: item.hasAssets ? `${item.assetCount} assets` : 'skill',
    accent: stableAccent(item.id),
    terminalPath: item.skillFile,
    listingHref: LISTING_HREFS.skill,
    listingLabel: 'skills',
    installTitle: 'Install this skill',
    installCommand: command,
    sourceUrl: getGitHubUrl(item.path),
    sourcePath: `awesome-copilot/${item.path}`,
    downloadHref: `/skills/#file=${encodeURIComponent(item.skillFile)}`,
    shareHref: `/skill/${encodeURIComponent(item.id)}/`,
    filePath: item.skillFile,
    zipFiles: item.files.map((f) => ({ name: f.name, path: f.path })),
    tags: [item.category, item.hasAssets ? 'assets' : 'no-assets', `${item.files.length} files`].filter(Boolean),
    features: [
      { title: 'Category', value: item.category || '(none)' },
      { title: 'Assets', value: item.hasAssets ? `${item.assetCount} bundled asset${item.assetCount === 1 ? '' : 's'}` : '(none)' },
      { title: 'Files', value: `${item.files.length} file${item.files.length === 1 ? '' : 's'}` },
    ],
    featureTags: [],
    specs: [
      { name: 'name', value: item.name },
      { name: 'skillFile', value: item.skillFile },
      { name: 'assets', value: String(item.assetCount) },
      { name: 'updated', value: item.lastUpdated || '(unknown)' },
    ],
    metadata: [
      { name: 'type', value: 'skill' },
      { name: 'path', value: item.path },
      { name: 'status', value: item.hasAssets ? 'bundled' : 'single file' },
    ],
  };
}

function adaptHook(item: HookItem): DetailData {
  const zipFiles: ZipFileEntry[] = item.readmeFile
    ? [{ name: 'README.md', path: item.readmeFile }]
    : [];
  for (const asset of item.assets) {
    zipFiles.push({ name: asset, path: `${item.path}/${asset}` });
  }
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    label: item.hooks.length === 1 ? item.hooks[0] : `${item.hooks.length} events`,
    accent: stableAccent(item.id),
    terminalPath: item.readmeFile ?? item.path,
    listingHref: LISTING_HREFS.hook,
    listingLabel: 'hooks',
    installTitle: 'Use this hook bundle',
    installCommand: `cp -R ${item.path} .github/copilot/hooks/`,
    sourceUrl: getGitHubUrl(item.path),
    sourcePath: `awesome-copilot/${item.path}`,
    downloadHref: `/hooks/#file=${encodeURIComponent(item.readmeFile ?? item.path)}`,
    shareHref: `/hook/${encodeURIComponent(item.id)}/`,
    filePath: item.readmeFile ?? item.path,
    zipFiles: zipFiles.length > 0 ? zipFiles : null,
    tags: [...item.tags.slice(0, 6), ...item.hooks.slice(0, 2)],
    features: [
      { title: 'Events', value: joinOrNone(item.hooks) },
      { title: 'Tags', value: joinOrNone(item.tags) },
      { title: 'Assets', value: item.assets.length ? `${item.assets.length} bundled asset${item.assets.length === 1 ? '' : 's'}` : '(none)' },
    ],
    featureTags: [],
    specs: [
      { name: 'name', value: item.title },
      { name: 'events', value: joinOrNone(item.hooks) },
      { name: 'assets', value: String(item.assets.length) },
      { name: 'updated', value: item.lastUpdated || '(unknown)' },
    ],
    metadata: [
      { name: 'type', value: 'hook' },
      { name: 'path', value: item.path },
      { name: 'readme', value: item.readmeFile ?? '(none)' },
    ],
  };
}

function adaptWorkflow(item: WorkflowItem): DetailData {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    label: item.triggers.length === 1 ? item.triggers[0] : `${item.triggers.length} triggers`,
    accent: stableAccent(item.id),
    terminalPath: item.path,
    listingHref: LISTING_HREFS.workflow,
    listingLabel: 'workflows',
    installTitle: 'Use this workflow',
    installCommand: `cp ${item.path} .github/workflows/${item.id}.md`,
    sourceUrl: getGitHubUrl(item.path),
    sourcePath: `awesome-copilot/${item.path}`,
    downloadHref: `/workflows/#file=${encodeURIComponent(item.path)}`,
    shareHref: `/workflow/${encodeURIComponent(item.id)}/`,
    filePath: item.path,
    zipFiles: null,
    tags: item.triggers,
    features: [
      { title: 'Triggers', value: joinOrNone(item.triggers) },
      { title: 'Source', value: item.path },
      { title: 'Updated', value: item.lastUpdated || '(unknown)' },
    ],
    featureTags: [],
    specs: [
      { name: 'name', value: item.title },
      { name: 'triggers', value: joinOrNone(item.triggers) },
      { name: 'path', value: item.path },
      { name: 'updated', value: item.lastUpdated || '(unknown)' },
    ],
    metadata: [
      { name: 'type', value: 'workflow' },
      { name: 'path', value: item.path },
      { name: 'status', value: 'agentic workflow' },
    ],
  };
}

function pluginAuthor(item: PluginItem): string {
  const author = item.author as unknown;
  if (typeof author === 'string') return author;
  if (author && typeof author === 'object' && 'name' in author) return String((author as { name?: string }).name ?? '');
  return '(unknown)';
}

function adaptPlugin(item: PluginItem): DetailData {
  const repository = item.repository || item.homepage || `https://github.com/${REPO_IDENTIFIER}/tree/main/${item.path}`;
  return {
    id: item.id,
    title: item.name,
    description: item.description,
    label: item.external ? 'external' : 'plugin',
    accent: stableAccent(item.id),
    terminalPath: item.path,
    listingHref: LISTING_HREFS.plugin,
    listingLabel: 'plugins',
    installTitle: 'Install this plugin',
    installCommand: item.external ? `copilot plugin install ${item.name}` : `copilot plugin install ${item.name}@awesome-copilot`,
    sourceUrl: repository,
    sourcePath: repository,
    downloadHref: repository,
    shareHref: `/plugin/${encodeURIComponent(item.id)}/`,
    filePath: '',
    zipFiles: null,
    tags: item.tags.slice(0, 8),
    features: [
      { title: 'Resources', value: `${item.itemCount} bundled resource${item.itemCount === 1 ? '' : 's'}` },
      { title: 'Source', value: item.external ? 'external' : 'awesome-copilot' },
      { title: 'Author', value: pluginAuthor(item) },
    ],
    featureTags: [],
    specs: [
      { name: 'name', value: item.name },
      { name: 'resources', value: String(item.itemCount) },
      { name: 'license', value: item.license ?? '(unknown)' },
      { name: 'repository', value: repository },
    ],
    metadata: [
      { name: 'type', value: 'plugin' },
      { name: 'path', value: item.path },
      { name: 'status', value: item.external ? 'external' : 'curated' },
    ],
  };
}

function adaptTool(item: ToolItem): DetailData {
  const primaryLink = item.links.github || item.links.marketplace || item.links.vscode || item.links.pypi || item.links.blog || LISTING_HREFS.tool;
  return {
    id: item.id,
    title: item.name,
    description: item.description,
    label: item.featured ? 'featured' : item.category,
    accent: stableAccent(item.id),
    terminalPath: item.configuration?.type ?? item.category,
    listingHref: LISTING_HREFS.tool,
    listingLabel: 'tools',
    installTitle: 'Configure this tool',
    installCommand: item.configuration?.content?.trim() || 'See the project documentation for setup details.',
    sourceUrl: primaryLink,
    sourcePath: primaryLink,
    downloadHref: primaryLink,
    shareHref: `/tool/${encodeURIComponent(item.id)}/`,
    filePath: '',
    zipFiles: null,
    tags: [item.category, ...item.tags].slice(0, 8),
    features: [
      { title: 'Category', value: item.category },
      { title: 'Requirements', value: joinOrNone(item.requirements) },
    ],
    featureTags: item.features,
    specs: [
      { name: 'name', value: item.name },
      { name: 'category', value: item.category },
      { name: 'featured', value: item.featured ? 'yes' : 'no' },
      { name: 'configuration', value: item.configuration?.type ?? '(none)' },
    ],
    metadata: [
      { name: 'type', value: 'tool' },
      { name: 'source', value: primaryLink },
      { name: 'status', value: item.featured ? 'featured' : 'available' },
    ],
  };
}

function adapt(kind: ResourceKind, item: unknown): DetailData {
  if (kind === 'skill') return adaptSkill(item as SkillItem);
  if (kind === 'hook') return adaptHook(item as HookItem);
  if (kind === 'workflow') return adaptWorkflow(item as WorkflowItem);
  if (kind === 'plugin') return adaptPlugin(item as PluginItem);
  return adaptTool(item as ToolItem);
}

function renderDetail(detail: DetailData, kind: ResourceKind): void {
  document.title = `${detail.title} · ${kind[0].toUpperCase()}${kind.slice(1)} · Awesome Copilot`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', detail.description);

  setText('breadcrumb-current', detail.title);
  setText('detail-terminal-line', `cat ./${detail.terminalPath}`);
  setText('detail-title', detail.title);
  setText('detail-description', detail.description);
  setText('detail-overview', detail.description);
  setText('detail-path', detail.terminalPath);
  setText('source-owner', detail.sourcePath);
  setText('install-title', detail.installTitle);

  const label = document.getElementById('detail-label');
  if (label) {
    label.textContent = detail.label;
    label.className = `detail-badge detail-badge--${detail.accent}`;
  }

  for (const code of document.querySelectorAll<HTMLElement>('[data-install-command]')) code.textContent = detail.installCommand;
  setHref('Back to listing', detail.listingHref);
  setHref('View source listing', detail.sourceUrl);
  initDetailActions(detail, kind);
  renderFeatureCards(detail.features);
  renderFeatureTags(detail.featureTags);
  renderDefinitionList('detail-specs', detail.specs);
  renderDefinitionList('detail-metadata', detail.metadata);
  renderTags(detail.tags);
}

function initDetailActions(detail: DetailData, kind: ResourceKind): void {
  const downloadBtn = document.getElementById('detail-download-btn') as HTMLButtonElement | null;
  const shareBtn = document.getElementById('detail-share-btn') as HTMLButtonElement | null;
  const heroInstallBtn = document.getElementById('hero-install-btn') as HTMLButtonElement | null;
  const dialog = document.getElementById('install-modal') as HTMLDialogElement | null;
  const vscodeLink = document.getElementById('install-modal-vscode') as HTMLAnchorElement | null;
  const insidersLink = document.getElementById('install-modal-insiders') as HTMLAnchorElement | null;

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (detail.zipFiles && detail.zipFiles.length > 0) {
        const originalText = downloadBtn.textContent;
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Preparing…';
        try {
          await downloadZipBundle(detail.id, detail.zipFiles);
          showToast('Download started!', 'success');
        } catch {
          showToast('Download failed', 'error');
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = originalText;
        }
      } else if (detail.filePath) {
        const ok = await downloadFile(detail.filePath);
        showToast(ok ? 'Download started!' : 'Download failed', ok ? 'success' : 'error');
      } else if (detail.sourceUrl) {
        window.open(detail.sourceUrl, '_blank');
      }
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (detail.filePath) {
        const ok = await shareFile(detail.filePath);
        showToast(ok ? 'Link copied!' : 'Failed to copy', ok ? 'success' : 'error');
      } else {
        const url = `${window.location.origin}${detail.shareHref}`;
        try { await navigator.clipboard.writeText(url); showToast('Link copied!', 'success'); }
        catch { showToast('Failed to copy', 'error'); }
      }
    });
  }

  if (heroInstallBtn && dialog && detail.filePath) {
    const vscodeUrl = getVSCodeProtocolUrl(kind, detail.filePath, false);
    const insidersUrl = getVSCodeProtocolUrl(kind, detail.filePath, true);

    if (vscodeUrl) {
      if (vscodeLink) vscodeLink.href = vscodeUrl;
      if (insidersLink) insidersLink.href = insidersUrl || '#';

      heroInstallBtn.addEventListener('click', () => {
        dialog.showModal();
      });
    }
  }
}

function renderError(kind: ResourceKind, message: string): void {
  setText('breadcrumb-current', `${kind} not found`);
  setText('detail-title', `${kind} not found`);
  setText('detail-description', message);
  setText('detail-overview', message);
}

export async function initResourceDetail(kind: ResourceKind): Promise<void> {
  const rawId = window.location.pathname.split('/').filter(Boolean).pop() || '';
  if (!rawId) {
    renderError(kind, `Missing ${kind} id. Go back to the listing and choose a resource.`);
    return;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${DATA_URLS[kind]}`);
    if (!response.ok) throw new Error(`Failed to load ${kind} data (${response.status})`);
    const data = await response.json() as { items: Array<{ id: string }> };
    const raw = data.items.find(item => item.id === rawId);
    if (!raw) {
      renderError(kind, `No ${kind} found for id "${rawId}".`);
      return;
    }
    renderDetail(adapt(kind, raw), kind);
  } catch (error) {
    renderError(kind, error instanceof Error ? error.message : `Failed to load ${kind} details.`);
  }
}

export function initCopyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = button.closest('.terminal-card')?.querySelector('code')?.textContent?.trim();
      if (!code) return;
      const label = button.querySelector('span');
      const previousLabel = label?.textContent ?? 'Copy';
      try {
        await navigator.clipboard.writeText(code);
        button.dataset.copied = 'true';
        if (label) label.textContent = 'Copied';
        window.setTimeout(() => {
          button.dataset.copied = 'false';
          if (label) label.textContent = previousLabel;
        }, 1600);
      } catch {
        if (label) label.textContent = 'Failed';
        window.setTimeout(() => {
          if (label) label.textContent = previousLabel;
        }, 1600);
      }
    });
  });
}
