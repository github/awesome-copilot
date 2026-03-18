/**
 * Homepage functionality
 */
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, truncate, getResourceIcon } from '../utils';
import { setupModal, openFileModal } from '../modal';

// SVG icon paths for search results
const iconPaths: Record<string, string> = {
  robot: '<path d="M9 15.5h6M12 12v3.5M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 12.5h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2M19.5 12.5h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  lightning: '<path d="M13 2 4.09 12.11a1.23 1.23 0 0 0 .13 1.72l.16.14a1.23 1.23 0 0 0 1.52 0L13 9.5V22l8.91-10.11a1.23 1.23 0 0 0-.13-1.72l-.16-.14a1.23 1.23 0 0 0-1.52 0L13 14.5V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  hook: '<path d="M12 22a5 5 0 0 0 5-5c0-2.5-2-3.5-4-5.5s-3-4-3-6.5a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22a5 5 0 0 1-5-5c0-2.5 2-3.5 4-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  workflow: '<path d="M4 7h16M4 17h16M8 3v4M8 13v4M16 3v4M16 13v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="17" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="17" r="2" stroke="currentColor" stroke-width="1.5"/>',
  plug: '<path d="M12 22v-5M8 17h8M6 2v8a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 2h4M14 2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

function getIconSvg(iconName: string): string {
  const path = iconPaths[iconName] || iconPaths.document;
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
}

interface Manifest {
  counts: {
    agents: number;
    instructions: number;
    skills: number;
    hooks: number;
    workflows: number;
    plugins: number;
    tools: number;
  };
}

interface Plugin {
  id: string;
  name: string;
  description?: string;
  path: string;
  tags?: string[];
  featured?: boolean;
  itemCount: number;
}

interface PluginsData {
  items: Plugin[];
}

// Recent searches storage
const RECENT_SEARCHES_KEY = 'awesome-copilot-recent-searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  if (!query.trim()) return;
  const searches = getRecentSearches();
  const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
  filtered.unshift(query);
  const limited = filtered.slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limited));
}

function removeRecentSearch(query: string): void {
  const searches = getRecentSearches();
  const filtered = searches.filter(s => s !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
}

function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export async function initHomepage(): Promise<void> {
  // Load manifest for stats
  const manifest = await fetchData<Manifest>('manifest.json');
  if (manifest && manifest.counts) {
    // Populate counts in cards
    const countKeys = ['agents', 'instructions', 'skills', 'hooks', 'workflows', 'plugins', 'tools'] as const;
    countKeys.forEach(key => {
      const countEl = document.querySelector(`.card-count[data-count="${key}"]`);
      if (countEl && manifest.counts[key] !== undefined) {
        countEl.textContent = manifest.counts[key].toString();
      }
    });
  }

  // Load search index
  const searchIndex = await fetchData<SearchItem[]>('search-index.json');
  if (searchIndex) {
    const search = new FuzzySearch<SearchItem>();
    search.setItems(searchIndex);

    const searchInput = document.getElementById('global-search') as HTMLInputElement;
    const resultsDiv = document.getElementById('search-results');

    if (searchInput && resultsDiv) {
      const statusEl = document.getElementById("global-search-status");
      let isShowingRecent = false;

      const hideResults = (): void => {
        resultsDiv.classList.add("hidden");
        isShowingRecent = false;
      };

      const showResults = (): void => {
        resultsDiv.classList.remove("hidden");
      };

      const getResultButtons = (): HTMLButtonElement[] =>
        Array.from(
          resultsDiv.querySelectorAll<HTMLButtonElement>(".search-result, .search-recent-item")
        );

      const openResult = (resultEl: HTMLElement): void => {
        const path = resultEl.dataset.path;
        const type = resultEl.dataset.type;
        if (path && type) {
          hideResults();
          openFileModal(path, type);
        }
      };

      // Render recent searches
      const renderRecentSearches = (): void => {
        const recent = getRecentSearches();
        if (recent.length === 0) return;

        const clockIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        const xIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        resultsDiv.innerHTML = `
          <div class="search-recent-header">
            <span>Recent Searches</span>
            <button class="search-clear-recent" aria-label="Clear recent searches">Clear</button>
          </div>
          ${recent.map(query => `
            <button type="button" class="search-recent-item" data-query="${escapeHtml(query)}">
              <span class="search-recent-icon">${clockIcon}</span>
              <span class="search-recent-text">${escapeHtml(query)}</span>
              <button type="button" class="search-recent-remove" data-query="${escapeHtml(query)}" aria-label="Remove from history">
                ${xIcon}
              </button>
            </button>
          `).join('')}
        `;

        // Add click handlers for recent items
        resultsDiv.querySelectorAll('.search-recent-item').forEach(item => {
          item.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.search-recent-remove')) return;
            const query = (item as HTMLElement).dataset.query;
            if (query) {
              searchInput.value = query;
              searchInput.dispatchEvent(new Event('input'));
            }
          });
        });

        // Add click handlers for remove buttons
        resultsDiv.querySelectorAll('.search-recent-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const query = (btn as HTMLElement).dataset.query;
            if (query) {
              removeRecentSearch(query);
              renderRecentSearches();
              if (getRecentSearches().length === 0) {
                hideResults();
              }
            }
          });
        });

        // Add clear all handler
        const clearBtn = resultsDiv.querySelector('.search-clear-recent');
        clearBtn?.addEventListener('click', () => {
          clearRecentSearches();
          hideResults();
        });

        isShowingRecent = true;
        showResults();
      };

      // Show recent searches on focus when empty
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length === 0) {
          renderRecentSearches();
        }
      });

      searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          if (query.length === 0) {
            renderRecentSearches();
          } else {
            resultsDiv.innerHTML = '';
            hideResults();
          }
          if (statusEl) {
            statusEl.textContent = '';
          }
          return;
        }

        isShowingRecent = false;
        const results = search.search(query).slice(0, 10);
        if (results.length === 0) {
          resultsDiv.innerHTML = `
            <div class="search-result-empty">
              <div class="search-result-empty-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                  <path d="M8 8l6 6M14 8l-6 6"/>
                </svg>
              </div>
              <div class="search-result-empty-title">No results found</div>
              <div class="search-result-empty-hint">Try different keywords or check your spelling</div>
            </div>
          `;
          if (statusEl) {
            statusEl.textContent = 'No results found.';
          }
        } else {
          // Add to recent searches when user gets results
          addRecentSearch(query);

          resultsDiv.innerHTML = results.map(item => {
            const iconName = getResourceIcon(item.type);
            return `
            <button type="button" class="search-result" data-path="${escapeHtml(item.path)}" data-type="${escapeHtml(item.type)}">
              <span class="search-result-type" data-icon="${iconName}">${getIconSvg(iconName)}</span>
              <div>
                <div class="search-result-title">${search.highlight(item.title, query)}</div>
                <div class="search-result-description">${truncate(item.description, 60)}</div>
              </div>
            </button>
          `}).join('');

          if (statusEl) {
            statusEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'} available.`;
          }

          getResultButtons().forEach((el, index, buttons) => {
            el.addEventListener('click', () => {
              openResult(el);
            });

            el.addEventListener("keydown", (event) => {
              switch (event.key) {
                case "ArrowDown":
                  event.preventDefault();
                  buttons[(index + 1) % buttons.length]?.focus();
                  break;
                case "ArrowUp":
                  event.preventDefault();
                  if (index === 0) {
                    searchInput.focus();
                  } else {
                    buttons[index - 1]?.focus();
                  }
                  break;
                case "Home":
                  event.preventDefault();
                  buttons[0]?.focus();
                  break;
                case "End":
                  event.preventDefault();
                  buttons[buttons.length - 1]?.focus();
                  break;
                case "Escape":
                  event.preventDefault();
                  hideResults();
                  searchInput.focus();
                  break;
              }
            });
          });
        }

        showResults();
      }, 200));

      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          const firstResult = getResultButtons()[0];
          if (firstResult) {
            event.preventDefault();
            firstResult.focus();
          }
        }

        if (event.key === "Escape") {
          hideResults();
        }
      });

      // Close results when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target as Node) && !resultsDiv.contains(e.target as Node)) {
          hideResults();
        }
      });

      // Cmd/Ctrl + K to focus search
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      });
    }
  }

  // Setup modal
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initHomepage);
