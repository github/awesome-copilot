/**
 * Client-side search orchestrator.
 *
 * Connects an HTML search input to the FuzzySearch engine and DOM result
 * rendering.  Designed to be imported by catalog pages (PR3+).
 *
 * Key behaviors:
 * - Debounced input (300ms default)
 * - Keyboard navigation (arrows + Enter)
 * - URL sync with `?q=` parameter
 * - Screen-reader-friendly live region updates
 *
 * All DOM access is guarded — safe to import at build time.
 */

import { FuzzySearch, type Searchable } from '../lib/search/fuzzy';
import { getQueryParam, updateQueryParams } from './url-state';
import { debounce, handleSearchKeyboard } from './modal-client';

const IS_CLIENT = typeof document !== 'undefined';

export interface SearchConfig {
  /** The <input> element that triggers the search. */
  inputSelector: string;
  /** The container where results are rendered. */
  resultsSelector: string;
  /** Optional: selector for live-region status text. */
  statusSelector?: string;
  /** Debounce delay in ms.  Default: 300. */
  debounceMs?: number;
  /** Minimum query length before search activates.  Default: 2. */
  minLength?: number;
  /** Max results to show.  Default: 50. */
  maxResults?: number;
}

export interface SearchResultHandler<T extends Searchable> {
  /** Render a single result item as an HTML string. */
  render: (item: T, index: number, query: string, highlight: (text: string, q: string) => string) => string;
  /** Called when user navigates to a result via keyboard. */
  onNavigate?: (index: number) => void;
  /** Called when user selects a result (Enter or click). */
  onSelect: (item: T, index: number) => void;
  /** Build status text for accessible live region. */
  statusText?: (query: string, resultCount: number, totalCount: number) => string;
}

/**
 * Wire up a search input to the fuzzy engine.
 *
 * Returns a cleanup function to remove event listeners.
 */
export function initSearch<T extends Searchable>(
  engine: FuzzySearch<T>,
  config: SearchConfig,
  handler: SearchResultHandler<T>,
): () => void {
  if (!IS_CLIENT) return () => {};

  const debounceMs = config.debounceMs ?? 300;
  const minLength = config.minLength ?? 2;
  const maxResults = config.maxResults ?? 50;

  const input = document.querySelector<HTMLInputElement>(config.inputSelector);
  const resultsContainer = document.querySelector(config.resultsSelector);
  const statusEl = config.statusSelector
    ? document.querySelector(config.statusSelector)
    : null;

  if (!input || !resultsContainer) {
    console.warn('initSearch: input or results container not found', {
      inputSelector: config.inputSelector,
      resultsSelector: config.resultsSelector,
    });
    return () => {};
  }

  let activeIdx = -1;

  /* ── Render current results ─────────────────────────────── */
  function renderResults(query: string): void {
    const results = engine.search(query, { limit: maxResults });
    activeIdx = -1;

    if (!resultsContainer) return;

    // Build HTML
    const html = results
      .map((item, idx) => handler.render(item, idx, query, engine.highlight.bind(engine)))
      .join('');

    resultsContainer.innerHTML = html;

    // Wire click handlers on result items
    const items = resultsContainer.querySelectorAll<HTMLElement>('[data-result-index]');
    items.forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-result-index') ?? '-1', 10);
        if (idx >= 0 && idx < results.length) {
          handler.onSelect(results[idx], idx);
        }
      });
    });

    // Update live region
    if (statusEl) {
      const text = handler.statusText
        ? handler.statusText(query, results.length, engine.itemCount)
        : `${results.length} of ${engine.itemCount} results`;

      statusEl.textContent = text;
    }

    // Show/hide results
    if (resultsContainer instanceof HTMLElement) {
      resultsContainer.style.display = results.length > 0 && query.length >= minLength ? '' : 'none';
    }
  }

  /* ── Debounced input handler ─────────────────────────────── */
  const handleInput = debounce(() => {
    const query = input.value.trim();
    updateQueryParams({ set: { q: query || null } });
    renderResults(query);
  }, debounceMs);

  /* ── Keyboard navigation ─────────────────────────────────── */
  function handleKeydown(e: KeyboardEvent): void {
    const results = document.querySelectorAll<HTMLElement>(
      `${config.resultsSelector} [data-result-index]`,
    );

    const newIdx = handleSearchKeyboard(
      e,
      activeIdx,
      results.length - 1,
      (idx) => {
        // Select: re-query to get the item and delegate
        const query = input.value.trim();
        const items = engine.search(query, { limit: maxResults });
        if (idx >= 0 && idx < items.length) {
          handler.onSelect(items[idx], idx);
        }
      },
    );

    if (newIdx !== activeIdx) {
      // Remove previous highlight
      if (activeIdx >= 0 && results[activeIdx]) {
        results[activeIdx].classList.remove('search-result--active');
        results[activeIdx].setAttribute('aria-selected', 'false');
      }
      // Add new highlight
      if (newIdx >= 0 && results[newIdx]) {
        results[newIdx].classList.add('search-result--active');
        results[newIdx].setAttribute('aria-selected', 'true');
        results[newIdx].scrollIntoView({ block: 'nearest' });
        if (handler.onNavigate) handler.onNavigate(newIdx);
      }
      activeIdx = newIdx;
    }
  }

  /* ── Wire events ─────────────────────────────────────────── */
  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);

  // Click outside results closes them
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (!resultsContainer?.contains(e.target) && e.target !== input) {
      if (resultsContainer instanceof HTMLElement) {
        resultsContainer.style.display = 'none';
      }
      activeIdx = -1;
    }
  });

  /* ── Hydrate from URL on init ────────────────────────────── */
  const initialQuery = getQueryParam('q');
  if (initialQuery) {
    input.value = initialQuery;
    renderResults(initialQuery);
  }

  /* ── Cleanup ─────────────────────────────────────────────── */
  return () => {
    input.removeEventListener('input', handleInput);
    input.removeEventListener('keydown', handleKeydown);
  };
}

/**
 * Create a default FuzzySearch instance ready for wiring.
 */
export function createSearch<T extends Searchable>(items?: T[]): FuzzySearch<T> {
  const engine = new FuzzySearch<T>();
  if (items) engine.setItems(items);
  return engine;
}
