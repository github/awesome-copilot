/**
 * Shared always-visible filter bar controller for listing pages.
 *
 * Reads the DOM produced by the `.filter-bar` markup:
 *   #listing-search, .facet-chip[data-facet-group][data-facet-value],
 *   #sort-select, #results-count, #clear-filters
 *
 * Filtering semantics: within a facet group values are OR'd; across groups the
 * groups are AND'd; a free-text search AND's on top. Clicking a card (outside
 * `.resource-actions`) opens the page's modal. Action buttons keep their own
 * delegated handlers via setupActionHandlers.
 */
import {
  fetchData,
  getQueryParam,
  setupActionHandlers,
  setupDropdownCloseHandlers,
  updateQueryParams,
} from "../utils";
import { setupModal } from "../modal";

export interface ListingConfig<T> {
  /** JSON file under /public/data, e.g. "hooks.json". */
  dataFile: string;
  /** Unique key per item, written to data-path and used for the modal map. */
  keyOf: (item: T) => string;
  /** Free-text haystack for the search box. */
  search: (item: T) => string;
  /** Values an item exposes for a facet group (group name -> values). */
  facetValues?: (item: T) => Record<string, string[]>;
  sort: (items: T[], sort: string) => T[];
  render: (items: T[]) => string;
  /** Singular noun for the results count, e.g. "hook". */
  noun: string;
  defaultSort?: string;
  openModal?: (item: T, trigger?: HTMLElement) => void;
  /** Run after each render (e.g. to (re)bind bespoke buttons). */
  afterRender?: () => void;
}

export function initListingPage<T>(config: ListingConfig<T>): void {
  const defaultSort = config.defaultSort ?? "title";

  let allItems: T[] = [];
  let byKey = new Map<string, T>();
  let currentQuery = "";
  let currentSort = defaultSort;
  const activeFacets = new Map<string, Set<string>>();
  let resourceListHandlersReady = false;
  let modalReady = false;

  function hasActiveFilters(): boolean {
    if (currentQuery.trim() !== "") return true;
    for (const set of activeFacets.values()) if (set.size > 0) return true;
    return false;
  }

  function matchesFacets(item: T): boolean {
    if (!config.facetValues || activeFacets.size === 0) return true;
    const values = config.facetValues(item);
    for (const [group, active] of activeFacets) {
      if (active.size === 0) continue;
      const itemValues = values[group] ?? [];
      if (!itemValues.some((v) => active.has(v))) return false;
    }
    return true;
  }

  function filterItems(): T[] {
    const query = currentQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      if (!matchesFacets(item)) return false;
      if (query && !config.search(item).toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }

  function renderItems(items: T[]): void {
    const list = document.getElementById("resource-list");
    if (!list) return;
    list.innerHTML = config.render(items);
    config.afterRender?.();
  }

  function applyFiltersAndRender(): void {
    const results = config.sort(filterItems(), currentSort);
    renderItems(results);

    const countEl = document.getElementById("results-count");
    if (countEl) {
      countEl.textContent = `${results.length} ${config.noun}${
        results.length === 1 ? "" : "s"
      }`;
    }
    const clearBtn = document.getElementById("clear-filters");
    if (clearBtn) (clearBtn as HTMLButtonElement).hidden = !hasActiveFilters();
  }

  function syncUrlState(): void {
    const params: Record<string, string | string[]> = {
      q: currentQuery.trim(),
      sort: currentSort === defaultSort ? "" : currentSort,
    };
    for (const [group, set] of activeFacets) {
      params[group] = [...set];
    }
    updateQueryParams(params);
  }

  function setupResourceListHandlers(): void {
    const list = document.getElementById("resource-list");
    if (!list || resourceListHandlersReady || !config.openModal) return;

    list.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".resource-actions")) return;

      const item = target.closest(".resource-item") as HTMLElement | null;
      const button = item?.querySelector(".resource-preview") as
        | HTMLElement
        | undefined;
      const key = item?.dataset.path;
      if (key) {
        const record = byKey.get(key);
        if (record) config.openModal?.(record, button);
      }
    });

    resourceListHandlersReady = true;
  }

  function setupFilterBar(): void {
    const searchInput = document.getElementById(
      "listing-search"
    ) as HTMLInputElement | null;
    const sortSelect = document.getElementById(
      "sort-select"
    ) as HTMLSelectElement | null;
    const chips = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".facet-chip")
    );
    const clearBtn = document.getElementById(
      "clear-filters"
    ) as HTMLButtonElement | null;

    // Hydrate state from the URL so shared/bookmarked filters survive reloads.
    const initialQuery = getQueryParam("q");
    if (initialQuery && searchInput) {
      currentQuery = initialQuery;
      searchInput.value = initialQuery;
    }

    const params = new URLSearchParams(window.location.search);
    for (const chip of chips) {
      const group = chip.dataset.facetGroup;
      if (group && !activeFacets.has(group)) {
        activeFacets.set(group, new Set(params.getAll(group)));
      }
    }

    const initialSort = getQueryParam("sort");
    if (initialSort && sortSelect) {
      currentSort = initialSort;
      sortSelect.value = initialSort;
    }

    chips.forEach((chip) => {
      const group = chip.dataset.facetGroup;
      const value = chip.dataset.facetValue;
      if (!group || value === undefined) return;
      const active = activeFacets.get(group)!;
      chip.setAttribute("aria-pressed", active.has(value) ? "true" : "false");

      chip.addEventListener("click", () => {
        const pressed = chip.getAttribute("aria-pressed") === "true";
        const next = !pressed;
        chip.setAttribute("aria-pressed", next ? "true" : "false");
        if (next) active.add(value);
        else active.delete(value);
        applyFiltersAndRender();
        syncUrlState();
      });
    });

    let searchTimer: number | undefined;
    searchInput?.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        currentQuery = searchInput.value;
        applyFiltersAndRender();
        syncUrlState();
      }, 150);
    });

    sortSelect?.addEventListener("change", () => {
      currentSort = sortSelect.value;
      applyFiltersAndRender();
      syncUrlState();
    });

    clearBtn?.addEventListener("click", () => {
      currentQuery = "";
      currentSort = defaultSort;
      for (const set of activeFacets.values()) set.clear();
      if (searchInput) searchInput.value = "";
      if (sortSelect) sortSelect.value = defaultSort;
      chips.forEach((chip) => chip.setAttribute("aria-pressed", "false"));
      applyFiltersAndRender();
      syncUrlState();
      searchInput?.focus();
    });
  }

  async function init(): Promise<void> {
    const list = document.getElementById("resource-list");

    if (config.openModal && !modalReady) {
      setupModal();
      modalReady = true;
    }

    setupResourceListHandlers();

    const data = await fetchData<{ items: T[] }>(config.dataFile);
    if (!data || !data.items) {
      if (list) {
        list.innerHTML =
          '<div class="empty-state"><h3>Failed to load data</h3></div>';
      }
      return;
    }

    allItems = data.items;
    byKey = new Map(allItems.map((item) => [config.keyOf(item), item]));

    setupFilterBar();
    applyFiltersAndRender();
    setupDropdownCloseHandlers();
    setupActionHandlers();
  }

  document.addEventListener("DOMContentLoaded", init);
}
