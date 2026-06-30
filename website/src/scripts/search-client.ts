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

import { FuzzySearch, type Searchable } from "../lib/search/fuzzy";
import { getQueryParam, updateQueryParams } from "./url-state";
import { debounce } from "./utils";

const IS_CLIENT = typeof document !== "undefined";

/**
 * Handle keyboard navigation within a listbox of search results.
 *
 * Processes ArrowDown, ArrowUp, and Enter, updating the active index and
 * invoking `onSelect` when the user confirms a choice with Enter.
 *
 * Returns the new active index (-1 means nothing is selected).
 */
function handleSearchKeyboard(
  e: KeyboardEvent,
  currentIdx: number,
  maxIdx: number,
  onSelect: (index: number) => void,
): number {
  if (maxIdx < 0) return -1;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      return Math.min(currentIdx + 1, maxIdx);
    case "ArrowUp":
      e.preventDefault();
      // Don't wrap below zero — staying at 0 means the first item stays highlighted.
      return Math.max(currentIdx - 1, 0);
    case "Enter":
      if (currentIdx >= 0) {
        e.preventDefault();
        onSelect(currentIdx);
      }
      return currentIdx;
    default:
      return currentIdx;
  }
}

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
  render: (
    item: T,
    index: number,
    query: string,
    highlight: (text: string, q: string) => string,
  ) => string;
  /** Called when user navigates to a result via keyboard. */
  onNavigate?: (index: number) => void;
  /** Called when user selects a result (Enter or click). */
  onSelect: (item: T, index: number) => void;
  /** Build status text for accessible live region. */
  statusText?: (
    query: string,
    resultCount: number,
    totalCount: number,
  ) => string;
}

/**
 * Wire up a search input to the fuzzy engine.
 *
 * Applies full ARIA combobox semantics on the input:
 *   role="combobox", aria-haspopup, aria-expanded, aria-controls, aria-autocomplete,
 *   aria-activedescendant (updated as the user navigates with arrow keys).
 * The results container receives role="listbox" and each rendered option receives a
 * stable id so aria-activedescendant can point to it.
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
    console.warn("initSearch: input or results container not found", {
      inputSelector: config.inputSelector,
      resultsSelector: config.resultsSelector,
    });
    return () => {};
  }

  // Bind to definite-typed aliases after the null guard. TypeScript strict mode
  // does not always propagate narrowing of query-result variables into closures,
  // so we capture them here to satisfy the type checker and document the contract.
  const inputEl: HTMLInputElement = input;

  // Derive a stable, DOM-safe ID prefix from the input selector so that
  // aria-activedescendant IDs are unique when multiple search widgets coexist.
  const widgetId = config.inputSelector
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/^_+/, "");

  // ── ARIA combobox wiring ────────────────────────────────────────────────
  // The input acts as a combobox that controls the listbox below it.
  // See: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  inputEl.setAttribute("role", "combobox");
  inputEl.setAttribute("aria-haspopup", "listbox");
  inputEl.setAttribute("aria-expanded", "false");
  inputEl.setAttribute("aria-autocomplete", "list");
  // Wire aria-controls if the results container has an id.
  if (resultsContainer instanceof HTMLElement && resultsContainer.id) {
    inputEl.setAttribute("aria-controls", resultsContainer.id);
  }
  // Ensure the results container exposes role="listbox" (may already be in HTML).
  if (!resultsContainer.getAttribute("role")) {
    resultsContainer.setAttribute("role", "listbox");
  }

  let activeIdx = -1;

  /* ── Render current results ─────────────────────────────── */
  function renderResults(query: string): void {
    const results = engine.search(query, { limit: maxResults });
    activeIdx = -1;

    if (!resultsContainer) return;

    // Build HTML from caller-provided renderer.
    const html = results
      .map((item, idx) =>
        handler.render(item, idx, query, engine.highlight.bind(engine)),
      )
      .join("");

    resultsContainer.innerHTML = html;

    // Assign stable IDs and wire click handlers on every option element.
    // IDs are required for aria-activedescendant to reference the active option.
    const items = resultsContainer.querySelectorAll<HTMLElement>(
      "[data-result-index]",
    );
    items.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-result-index") ?? "-1", 10);
      el.id = `${widgetId}_option_${idx}`;
      el.setAttribute("role", "option");
      el.addEventListener("click", () => {
        if (idx >= 0 && idx < results.length) {
          handler.onSelect(results[idx], idx);
        }
      });
    });

    // Update live region.
    if (statusEl) {
      const text = handler.statusText
        ? handler.statusText(query, results.length, engine.itemCount)
        : `${results.length} of ${engine.itemCount} results`;
      statusEl.textContent = text;
    }

    // Show/hide results and keep aria-expanded in sync.
    const visible = results.length > 0 && query.length >= minLength;
    if (resultsContainer instanceof HTMLElement) {
      resultsContainer.style.display = visible ? "" : "none";
    }
    inputEl.setAttribute("aria-expanded", visible ? "true" : "false");
    if (!visible) inputEl.removeAttribute("aria-activedescendant");
  }

  /* ── Debounced input handler ─────────────────────────────── */
  const handleInput = debounce(() => {
    const query = inputEl.value.trim();
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
        const query = inputEl.value.trim();
        const items = engine.search(query, { limit: maxResults });
        if (idx >= 0 && idx < items.length) {
          handler.onSelect(items[idx], idx);
        }
      },
    );

    if (newIdx !== activeIdx) {
      // Remove highlight from previous option.
      if (activeIdx >= 0 && results[activeIdx]) {
        results[activeIdx].classList.remove("search-result--active");
        results[activeIdx].setAttribute("aria-selected", "false");
      }
      // Apply highlight to new option and announce it via aria-activedescendant.
      if (newIdx >= 0 && results[newIdx]) {
        results[newIdx].classList.add("search-result--active");
        results[newIdx].setAttribute("aria-selected", "true");
        results[newIdx].scrollIntoView({ block: "nearest" });
        // Point the combobox input at the newly focused option so screen readers
        // announce it without moving DOM focus away from the text field.
        inputEl.setAttribute("aria-activedescendant", results[newIdx].id);
        if (handler.onNavigate) handler.onNavigate(newIdx);
      } else {
        inputEl.removeAttribute("aria-activedescendant");
      }
      activeIdx = newIdx;
    }
  }

  /* ── Wire events ─────────────────────────────────────────── */
  inputEl.addEventListener("input", handleInput);
  inputEl.addEventListener("keydown", handleKeydown);

  // Clicking outside the widget collapses the listbox.
  const handleDocumentClick = (e: MouseEvent) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (!resultsContainer?.contains(e.target) && e.target !== inputEl) {
      if (resultsContainer instanceof HTMLElement) {
        resultsContainer.style.display = "none";
      }
      // Keep combobox state consistent: collapsed, no active descendant.
      inputEl.setAttribute("aria-expanded", "false");
      inputEl.removeAttribute("aria-activedescendant");
      activeIdx = -1;
    }
  };

  document.addEventListener("click", handleDocumentClick);

  /* ── Hydrate from URL on init ────────────────────────────── */
  const initialQuery = getQueryParam("q");
  if (initialQuery) {
    inputEl.value = initialQuery;
    renderResults(initialQuery);
  }

  /* ── Cleanup ─────────────────────────────────────────────── */
  return () => {
    inputEl.removeEventListener("input", handleInput);
    inputEl.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("click", handleDocumentClick);
  };
}

/**
 * Create a default FuzzySearch instance ready for wiring.
 */
export function createSearch<T extends Searchable>(
  items?: T[],
): FuzzySearch<T> {
  const engine = new FuzzySearch<T>();
  if (items) engine.setItems(items);
  return engine;
}
