import type { Searchable } from '../lib/search/fuzzy';
import type { Accent } from '../lib/types';
import { createSearch, initSearch } from './search-client';
import { getQueryParam, getQueryParamValues, updateQueryParams } from './url-state';

type FilterType = 'multi' | 'single' | 'flag';

export interface CatalogFilterConfig {
  param: string;
  label: string;
  type: FilterType;
  defaultValue?: string;
}

export interface CatalogClientItem extends Searchable {
  id: string;
  title: string;
  label: string;
  description: string;
  tags: string[];
  accent: Accent;
  href: string;
  detail: string;
  sortDate?: string | null;
  sortTitle?: string;
  filters: Record<string, string[]>;
}

export interface CatalogConfig<TRaw> {
  dataUrl: string;
  gridSelector: string;
  countSelector: string;
  emptySelector: string;
  searchInputSelector: string;
  searchResultsSelector: string;
  searchStatusSelector: string;
  loadMoreSelector: string;
  loadSentinelSelector: string;
  clearSelector: string;
  emptyClearSelector: string;
  resourceName: string;
  resourceNamePlural: string;
  filterConfigs: CatalogFilterConfig[];
  defaultSort: string;
  toClientItem: (item: TRaw) => CatalogClientItem;
}

const INITIAL_RENDER_COUNT = 36;
const RENDER_BATCH_SIZE = 24;

export function stableAccent(source: string): Accent {
  const accents: Accent[] = ['purple', 'blue', 'green', 'yellow'];
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return accents[hash % accents.length];
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case "'": return '&#39;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

async function loadItems<TRaw>(dataUrl: string, toClientItem: (item: TRaw) => CatalogClientItem): Promise<CatalogClientItem[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}${dataUrl}`);
  if (!response.ok) throw new Error(`Failed to load ${dataUrl}: ${response.status}`);
  const data = await response.json() as { items: TRaw[] };
  return data.items.map(toClientItem);
}

function readFilterState(configs: CatalogFilterConfig[]): Record<string, string[]> {
  const state: Record<string, string[]> = {};
  for (const config of configs) {
    if (config.type === 'flag') {
      const val = getQueryParam(config.param);
      state[config.param] = val === '1' ? ['1'] : [];
    } else {
      state[config.param] = config.type === 'multi'
        ? getQueryParamValues(config.param)
        : [getQueryParam(config.param) || config.defaultValue || ''].filter(Boolean);
    }
  }
  return state;
}

function applyFilterState(items: CatalogClientItem[], state: Record<string, string[]>, configs: CatalogFilterConfig[]): CatalogClientItem[] {
  return items.filter((item) => configs.every((config) => {
    if (config.param === 'sort') return true;
    const selected = state[config.param] ?? [];

    if (config.type === 'flag') {
      if (selected.length === 0) return true;
      const values = item.filters[config.param] ?? [];
      return values.includes('1');
    }

    const active = config.type === 'single'
      ? selected.filter(value => value && value !== config.defaultValue)
      : selected;
    if (active.length === 0) return true;
    const values = item.filters[config.param] ?? [];
    return active.some(value => values.includes(value));
  }));
}

function sortItems(items: CatalogClientItem[], sortBy: string): CatalogClientItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'lastUpdated') return (b.sortDate ?? '').localeCompare(a.sortDate ?? '');
    if (sortBy === 'featured') {
      const featured = Number((b.filters.featured ?? []).includes('true')) - Number((a.filters.featured ?? []).includes('true'));
      if (featured !== 0) return featured;
    }
    return (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title);
  });
}

function renderCard(item: CatalogClientItem): string {
  const accent = escapeHtml(item.accent);
  const tags = item.tags
    .slice(0, 3)
    .map(tag => `<span class="badge badge--neutral">${escapeHtml(tag)}</span>`)
    .join('');

  return `
    <a class="resource-card resource-card--${accent}" role="listitem" data-path="${escapeHtml(item.detail)}" data-id="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}">
	      <span class="resource-card__topline">
	        <span class="badge badge--${accent}">${escapeHtml(item.label)}</span>
	      </span>
      <span class="resource-card__body">
        <span class="resource-card__title">${escapeHtml(item.title)}</span>
        <span class="resource-card__description">${escapeHtml(item.description)}</span>
      </span>
      <span class="resource-card__footer">
        <span class="resource-card__tags">${tags}</span>
        <span class="resource-card__cta">Open details<svg aria-hidden="true" class="icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="shape-rendering:crispEdges"><path d="M4 11h11V8h3v2h2v4h-2v2h-3v-3H4v-2Z"/></svg></span>
      </span>
    </a>`;
}

function updateFilterDisplays(configs: CatalogFilterConfig[], state: Record<string, string[]>): void {
  for (const config of configs) {
    const display = document.querySelector<HTMLElement>(`.filter-display[data-param="${config.param}"]`);
    const values = state[config.param] ?? [];
    if (!display) continue;
    const active = config.type === 'single'
      ? values.filter(value => value && value !== config.defaultValue)
      : values;
    display.textContent = active.length > 0 ? `${config.label.toLowerCase()}: ${active.join(', ')}` : `${config.label.toLowerCase()}: all`;
  }
}

function wireFilterSelects(configs: CatalogFilterConfig[], onChange: () => void): void {
  document.querySelectorAll<HTMLSelectElement>('select[data-filter-param]').forEach((select) => {
    const config = configs.find(item => item.param === select.dataset.filterParam);
    if (!config) return;

    if (config.type === 'flag') {
      const val = getQueryParam(config.param);
      select.value = val === '1' ? '1' : '';
      select.addEventListener('change', () => {
        const value = select.value === '1' ? '1' : null;
        updateQueryParams({ set: { [config.param]: value } });
        onChange();
      });
      return;
    }

    const values = config.type === 'multi' ? getQueryParamValues(config.param) : [getQueryParam(config.param) || config.defaultValue || ''];
    for (const option of select.options) option.selected = values.includes(option.value);

    select.addEventListener('change', () => {
      if (config.type === 'multi') {
        updateQueryParams({ setAll: { [config.param]: Array.from(select.selectedOptions).map(option => option.value).filter(Boolean) } });
      } else {
        const value = select.value && select.value !== config.defaultValue ? select.value : null;
        updateQueryParams({ set: { [config.param]: value } });
      }
      onChange();
    });
  });
}

function wireFilterToggles(configs: CatalogFilterConfig[], onChange: () => void): void {
  document.querySelectorAll<HTMLButtonElement>('button[data-filter-param]').forEach((button) => {
    const config = configs.find(item => item.param === button.dataset.filterParam);
    if (!config || config.type !== 'flag') return;

    const val = getQueryParam(config.param);
    const isActive = val === '1';
    button.setAttribute('aria-pressed', String(isActive));
    if (isActive) button.classList.add('console-toggle--active');

    button.addEventListener('click', () => {
      const url = new URL(window.location.href);
      const currentlyActive = url.searchParams.get(config.param) === '1';
      if (currentlyActive) {
        url.searchParams.delete(config.param);
        button.classList.remove('console-toggle--active');
      } else {
        url.searchParams.set(config.param, '1');
        button.classList.add('console-toggle--active');
      }
      button.setAttribute('aria-pressed', String(!currentlyActive));
      history.replaceState(null, '', url.toString());
      onChange();
    });
  });
}

export async function initResourceCatalog<TRaw>(config: CatalogConfig<TRaw>): Promise<{ applyAndRender: () => void }> {
  const grid = document.querySelector<HTMLElement>(config.gridSelector);
  const countEl = document.querySelector<HTMLElement>(config.countSelector);
  const emptyState = document.querySelector<HTMLElement>(config.emptySelector);
  const loadMore = document.querySelector<HTMLButtonElement>(config.loadMoreSelector);
  const loadSentinel = document.querySelector<HTMLElement>(config.loadSentinelSelector);
  const clearButton = document.querySelector<HTMLButtonElement>(config.clearSelector);
  const emptyClear = document.querySelector<HTMLButtonElement>(config.emptyClearSelector);
  const searchInput = document.querySelector<HTMLInputElement>(config.searchInputSelector);

  if (countEl) countEl.textContent = `Loading ${config.resourceNamePlural}...`;

  let items: CatalogClientItem[];
  try {
    items = await loadItems(config.dataUrl, config.toClientItem);
  } catch (error) {
    console.error(error);
    if (countEl) countEl.textContent = `Failed to load ${config.resourceNamePlural}`;
    if (emptyState) emptyState.hidden = false;
    return { applyAndRender: () => {} };
  }

  const engine = createSearch<CatalogClientItem>(items);
  let currentItems: CatalogClientItem[] = [];
  let visibleCount = INITIAL_RENDER_COUNT;

  function renderProgress(): void {
    const visibleItems = Math.min(visibleCount, currentItems.length);
    if (grid) grid.innerHTML = currentItems.slice(0, visibleItems).map(renderCard).join('');
    if (countEl) countEl.textContent = `Showing ${visibleItems} of ${currentItems.length} matching ${config.resourceName}${currentItems.length === 1 ? '' : 's'} (${items.length} total)`;
    if (loadMore) {
      loadMore.hidden = visibleItems >= currentItems.length;
      loadMore.textContent = `Load more ${config.resourceNamePlural} (${visibleItems}/${currentItems.length})`;
    }
    if (loadSentinel) loadSentinel.hidden = visibleItems >= currentItems.length;
  }

  function applyAndRender(): void {
    const query = searchInput?.value.trim() || getQueryParam('q') || '';
    const filteredBySearch = query ? engine.search(query).filter((item): item is CatalogClientItem => item != null) : [...items];
    const state = readFilterState(config.filterConfigs);
    const sortBy = getQueryParam('sort') || config.defaultSort;
    state.sort = [sortBy];
    currentItems = sortItems(applyFilterState(filteredBySearch, state, config.filterConfigs), sortBy);
    visibleCount = INITIAL_RENDER_COUNT;
    renderProgress();
    updateFilterDisplays(config.filterConfigs, state);
    if (emptyState) emptyState.hidden = currentItems.length > 0;
    if (grid) grid.style.display = currentItems.length > 0 ? '' : 'none';
  }

  function clearFilters(): void {
    const remove: Record<string, string | null> = { q: null };
    for (const filterConfig of config.filterConfigs) remove[filterConfig.param] = null;
    updateQueryParams({ set: remove });
    if (searchInput) searchInput.value = '';
    document.querySelectorAll<HTMLSelectElement>('select[data-filter-param]').forEach((select) => {
      for (const option of select.options) option.selected = option.value === '' || option.value === select.dataset.defaultValue;
    });
    applyAndRender();
  }

  wireFilterSelects(config.filterConfigs, applyAndRender);
  wireFilterToggles(config.filterConfigs, applyAndRender);
  clearButton?.addEventListener('click', clearFilters);
  emptyClear?.addEventListener('click', clearFilters);
  loadMore?.addEventListener('click', () => {
    visibleCount = Math.min(visibleCount + RENDER_BATCH_SIZE, currentItems.length);
    renderProgress();
  });

  if (loadSentinel && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      visibleCount = Math.min(visibleCount + RENDER_BATCH_SIZE, currentItems.length);
      renderProgress();
    }, { rootMargin: '320px' });
    observer.observe(loadSentinel);
  }

  let searchTimer = 0;
  searchInput?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(applyAndRender, 220);
  });

  initSearch<CatalogClientItem>(engine, {
    inputSelector: config.searchInputSelector,
    resultsSelector: config.searchResultsSelector,
    statusSelector: config.searchStatusSelector,
    minLength: 1,
    maxResults: 40,
  }, {
    render(item, idx, query, highlight) {
      const desc = item.description.length > 100 ? `${item.description.slice(0, 100)}...` : item.description;
      return `<div class="search-result" data-result-index="${idx}" role="option" aria-selected="false"><span class="search-result-title">${highlight(escapeHtml(item.title), query)}</span><span class="search-result-desc">${highlight(escapeHtml(desc), query)}</span></div>`;
    },
    onSelect(item) {
      window.location.href = item.href;
    },
    statusText(query, resultCount, totalCount) {
      if (!query) return '';
      if (resultCount === 0) return `No ${config.resourceNamePlural} match "${query}"`;
      return `${resultCount} of ${totalCount} ${config.resourceNamePlural} match "${query}"`;
    },
  });

  applyAndRender();

  return { applyAndRender };
}
