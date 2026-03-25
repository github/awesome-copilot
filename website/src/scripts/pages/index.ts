/**
 * Homepage functionality
 */
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, truncate, getResourceIcon } from '../utils';
import { setupModal, openFileModal } from '../modal';

// SVG icon definitions for search results
// Icons with `fill: true` use fill="currentColor", others use stroke
const iconDefs: Record<string, { path: string; fill?: boolean }> = {
  // Agent icon - GitHub Primer's agent-24
  robot: {
    fill: true,
    path: '<path d="M22.5 13.919v-.278a5.097 5.097 0 0 0-4.961-5.086.858.858 0 0 1-.754-.497l-.149-.327A6.414 6.414 0 0 0 10.81 4a6.133 6.133 0 0 0-6.13 6.32l.019.628a.863.863 0 0 1-.67.869A3.263 3.263 0 0 0 1.5 14.996v.108A3.397 3.397 0 0 0 4.896 18.5h1.577a.75.75 0 0 1 0 1.5H4.896A4.896 4.896 0 0 1 0 15.104v-.108a4.761 4.761 0 0 1 3.185-4.493l-.004-.137A7.633 7.633 0 0 1 10.81 2.5a7.911 7.911 0 0 1 7.176 4.58C21.36 7.377 24 10.207 24 13.641v.278a.75.75 0 0 1-1.5 0Z"/><path d="m12.306 11.77 3.374 3.375a.749.749 0 0 1 0 1.061l-3.375 3.375-.057.051a.751.751 0 0 1-1.004-.051.751.751 0 0 1-.051-1.004l.051-.057 2.845-2.845-2.844-2.844a.75.75 0 1 1 1.061-1.061ZM22.5 19.8H18a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 0 1.5Z"/>'
  },
  document: {
    path: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  lightning: {
    path: '<path d="M13 2 4.09 12.11a1.23 1.23 0 0 0 .13 1.72l.16.14a1.23 1.23 0 0 0 1.52 0L13 9.5V22l8.91-10.11a1.23 1.23 0 0 0-.13-1.72l-.16-.14a1.23 1.23 0 0 0-1.52 0L13 14.5V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  // Hook icon - GitHub Primer's sync-24
  hook: {
    fill: true,
    path: '<path d="M3.38 8A9.502 9.502 0 0 1 12 2.5a9.502 9.502 0 0 1 9.215 7.182.75.75 0 1 0 1.456-.364C21.473 4.539 17.15 1 12 1a10.995 10.995 0 0 0-9.5 5.452V4.75a.75.75 0 0 0-1.5 0V8.5a1 1 0 0 0 1 1h3.75a.75.75 0 0 0 0-1.5H3.38Zm-.595 6.318a.75.75 0 0 0-1.455.364C2.527 19.461 6.85 23 12 23c4.052 0 7.592-2.191 9.5-5.451v1.701a.75.75 0 0 0 1.5 0V15.5a1 1 0 0 0-1-1h-3.75a.75.75 0 0 0 0 1.5h2.37A9.502 9.502 0 0 1 12 21.5c-4.446 0-8.181-3.055-9.215-7.182Z"/>'
  },
  // Workflow icon - GitHub Primer's workflow-24
  workflow: {
    fill: true,
    path: '<path d="M1 3a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H7v4.063C7 16.355 7.644 17 8.438 17H12.5v-2.5a2 2 0 0 1 2-2H21a2 2 0 0 1 2 2V21a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2v-2.5H8.437A2.939 2.939 0 0 1 5.5 15.562V11.5H3a2 2 0 0 1-2-2Zm2-.5a.5.5 0 0 0-.5.5v6.5a.5.5 0 0 0 .5.5h6.5a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5ZM14.5 14a.5.5 0 0 0-.5.5V21a.5.5 0 0 0 .5.5H21a.5.5 0 0 0 .5-.5v-6.5a.5.5 0 0 0-.5-.5Z"/>'
  },
  // Plug icon - GitHub Primer's plug-24
  plug: {
    fill: true,
    path: '<path d="M7 11.5H2.938c-.794 0-1.438.644-1.438 1.437v8.313a.75.75 0 0 1-1.5 0v-8.312A2.939 2.939 0 0 1 2.937 10H7V6.151c0-.897.678-1.648 1.57-1.74l6.055-.626 1.006-1.174A1.752 1.752 0 0 1 16.96 2h1.29c.966 0 1.75.784 1.75 1.75V6h3.25a.75.75 0 0 1 0 1.5H20V14h3.25a.75.75 0 0 1 0 1.5H20v2.25a1.75 1.75 0 0 1-1.75 1.75h-1.29a1.75 1.75 0 0 1-1.329-.611l-1.006-1.174-6.055-.627A1.749 1.749 0 0 1 7 15.348Zm9.77-7.913v.001l-1.201 1.4a.75.75 0 0 1-.492.258l-6.353.657a.25.25 0 0 0-.224.249v9.196a.25.25 0 0 0 .224.249l6.353.657c.191.02.368.112.493.258l1.2 1.401a.252.252 0 0 0 .19.087h1.29a.25.25 0 0 0 .25-.25v-14a.25.25 0 0 0-.25-.25h-1.29a.252.252 0 0 0-.19.087Z"/>'
  },
  wrench: {
    path: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  }
};

function getIconSvg(iconName: string): string {
  const icon = iconDefs[iconName] || iconDefs.document;
  const fill = icon.fill ? 'fill="currentColor"' : 'fill="none"';
  return `<svg viewBox="0 0 24 24" ${fill} aria-hidden="true">${icon.path}</svg>`;
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
