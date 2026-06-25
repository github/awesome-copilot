import type { HookItem, PluginItem, SkillItem, ToolItem, WorkflowItem } from '../lib/upstream-types';
import { downloadFile, downloadZipBundle, getGitHubUrl, REPO_IDENTIFIER, showToast, getVSCodeProtocolUrl } from './utils';
import { openShareModal } from './share-modal';
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
  overview: string;
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
  features: Array<{ title: string; value: string; icon: string }>;
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

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const FEATURE_ICON_PATHS: Record<string, string> = {
  hooks: 'M6 4h8v3h-2v4h3v-2h3v4h-3v2h-3v5H8v-5H6v-4h2V7H6V4Zm4 3v4h2V7h-2Z',
  workflows: 'M5 4h6v6H9v2h6v-2h-2V4h6v6h-2v4H9v2h2v4H5v-6h2v-4H5V4Zm2 2v2h2V6H7Zm8 0v2h2V6h-2Zm-8 10v2h2v-2H7Z',
  plugins: 'M8 3h3v4h2V3h3v4h2v5h-3v3h3v3h-3v3h-3v-3H9v3H6v-3H3v-3h3v-3H3V7h5V3Zm1 7v5h6v-5H9Z',
  tools: 'M4 5h16v10H4V5Zm2 2v6h12V7H6Zm2 11h8v2H8v-2Zm1-9h2v2H9V9Zm3 0h4v2h-4V9Z',
  share: 'M18 8h3v3h-3v2h-2v2h-2v2h-2v2h-2v2H8v-2H6v-2H4v-2H2v-3h3v2h2v2h2v2h2v-2h2v-2h2v-2h2V8Zm-4-4h4v4h-4V4Z',
  archive: 'M4 5h16v3h-2v2H6V8H4V5Zm2 5v9h12v-9H6Zm4 2h4v2h-4v-2Z',
  filter: 'M4 5h16v3h-2v2h-4v8l-4 2v-10H6V8H4V5Z',
  open: 'M5 5h8v3H8v8h8v-5h3v8H5V5Zm9-2h7v7h-3V8h-2V6h-2V3Z',
  info: 'M9 4h6v2h2v12h-2v2H9v-2H7V6h2V4Zm2 3v2h2V7h-2Zm0 4v6h2v-6h-2Z',
  github: 'M12 .5a12 12 0 0 0-3.8 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5.99.11-.78.43-1.3.78-1.6-2.66-.31-5.46-1.34-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.44 11.44 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.63-5.49 5.93.44.38.83 1.11.83 2.24v3.32c0 .32.21.7.83.58A12 12 0 0 0 12 .5Z',
  document: 'M6 3h9l3 3v15H6V3Zm2 3v12h8V8h-3V6H8Zm1 4h6v2H9v-2Zm0 4h5v2H9v-2Z',
  bolt: 'M12 2h5l-3 7h4L9 22l2-9H6l6-11Z',
  terminal: 'M3 5h18v14H3V5Zm2 3v8h14V8H5Zm2 2h2v2H7v-2Zm3 3h5v2h-5v-2Z',
};

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
    const heading = document.createElement('div');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const title = document.createElement('h3');
    const value = document.createElement('p');
    heading.className = 'feature-card__heading';
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('width', '18');
    icon.setAttribute('height', '18');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'currentColor');
    icon.setAttribute('shape-rendering', 'crispEdges');
    path.setAttribute('d', FEATURE_ICON_PATHS[feature.icon] ?? FEATURE_ICON_PATHS.info);
    icon.append(path);
    title.textContent = feature.title;
    value.textContent = feature.value;
    heading.append(icon, title);
    article.append(heading, value);
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
    overview: `${item.title} is a ${item.category} skill with ${formatCount(item.files.length, 'file')} and ${item.hasAssets ? formatCount(item.assetCount, 'bundled asset') : 'no bundled assets'}.`,
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
      { title: 'Category', value: item.category || '(none)', icon: 'tools' },
      { title: 'Assets', value: item.hasAssets ? `${item.assetCount} bundled asset${item.assetCount === 1 ? '' : 's'}` : '(none)', icon: 'archive' },
      { title: 'Files', value: `${item.files.length} file${item.files.length === 1 ? '' : 's'}`, icon: 'document' },
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
    overview: `Runs on ${formatCount(item.hooks.length, 'event')} with ${item.assets.length ? formatCount(item.assets.length, 'bundled asset') : 'no bundled assets'} and ${formatCount(item.tags.length, 'tag')}.`,
    label: item.hooks.length === 1 ? item.hooks[0] : `${item.hooks.length} events`,
    accent: stableAccent(item.id),
    terminalPath: item.readmeFile ?? item.path,
    listingHref: LISTING_HREFS.hook,
    listingLabel: 'hooks',
    installTitle: 'Use this hook bundle',
    installCommand: `cp -R ${item.path} .github/hooks/`,
    sourceUrl: getGitHubUrl(item.path),
    sourcePath: `awesome-copilot/${item.path}`,
    downloadHref: `/hooks/#file=${encodeURIComponent(item.readmeFile ?? item.path)}`,
    shareHref: `/hook/${encodeURIComponent(item.id)}/`,
    filePath: item.readmeFile ?? item.path,
    zipFiles: zipFiles.length > 0 ? zipFiles : null,
    tags: [...item.tags.slice(0, 6), ...item.hooks.slice(0, 2)],
    features: [
      { title: 'Events', value: joinOrNone(item.hooks), icon: 'hooks' },
      { title: 'Tags', value: joinOrNone(item.tags), icon: 'filter' },
      { title: 'Assets', value: item.assets.length ? `${item.assets.length} bundled asset${item.assets.length === 1 ? '' : 's'}` : '(none)', icon: 'archive' },
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
    overview: `Ships as an agentic workflow with ${formatCount(item.triggers.length, 'trigger')} and a source file under ${item.path}.`,
    label: item.triggers.length === 1 ? item.triggers[0] : `${item.triggers.length} triggers`,
    accent: stableAccent(item.id),
    terminalPath: item.path,
    listingHref: LISTING_HREFS.workflow,
    listingLabel: 'workflows',
    installTitle: 'Use this workflow',
    installCommand: `gh extension install github/gh-aw && cp ${item.path} .github/workflows/${item.id}.md && gh aw compile`,
    sourceUrl: getGitHubUrl(item.path),
    sourcePath: `awesome-copilot/${item.path}`,
    downloadHref: `/workflows/#file=${encodeURIComponent(item.path)}`,
    shareHref: `/workflow/${encodeURIComponent(item.id)}/`,
    filePath: item.path,
    zipFiles: [{ name: item.path, path: item.path }],
    tags: item.triggers,
    features: [
      { title: 'Triggers', value: joinOrNone(item.triggers), icon: 'workflows' },
      { title: 'Source', value: item.path, icon: 'document' },
      { title: 'Updated', value: item.lastUpdated || '(unknown)', icon: 'info' },
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
    overview: `${item.name} bundles ${formatCount(item.itemCount, 'resource')} and is published as an ${item.external ? 'external' : 'awesome-copilot'} plugin by ${pluginAuthor(item)}.`,
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
      { title: 'Resources', value: `${item.itemCount} bundled resource${item.itemCount === 1 ? '' : 's'}`, icon: 'plugins' },
      { title: 'Source', value: item.external ? 'external' : 'awesome-copilot', icon: item.external ? 'open' : 'github' },
      { title: 'Author', value: pluginAuthor(item), icon: 'info' },
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
    overview: `${item.name} is a ${item.category} tool with ${formatCount(item.features.length, 'capability')} and ${item.requirements.length ? formatCount(item.requirements.length, 'setup requirement') : 'no listed setup requirements'}.`,
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
      { title: 'Category', value: item.category, icon: 'tools' },
      { title: 'Requirements', value: joinOrNone(item.requirements), icon: 'terminal' },
      { title: 'Features', value: formatCount(item.features.length, 'capability'), icon: 'bolt' },
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
  setText('detail-overview', detail.overview);
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
    shareBtn.addEventListener('click', () => {
      const opened = openShareModal(
        {
          title: detail.title,
          description: detail.description,
          url: new URL(detail.shareHref, window.location.origin).toString(),
          badge: kind,
        },
        shareBtn
      );

      if (!opened) showToast('Share dialog unavailable', 'error');
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
