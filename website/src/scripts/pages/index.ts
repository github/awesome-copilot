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

      const hideResults = (): void => {
        resultsDiv.classList.add("hidden");
      };

      const showResults = (): void => {
        resultsDiv.classList.remove("hidden");
      };

      const getResultButtons = (): HTMLButtonElement[] =>
        Array.from(
          resultsDiv.querySelectorAll<HTMLButtonElement>(".search-result")
        );

      const openResult = (resultEl: HTMLElement): void => {
        const path = resultEl.dataset.path;
        const type = resultEl.dataset.type;
        if (path && type) {
          hideResults();
          openFileModal(path, type);
        }
      };

      searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          resultsDiv.innerHTML = '';
          if (statusEl) {
            statusEl.textContent = '';
          }
          hideResults();
          return;
        }

        const results = search.search(query).slice(0, 10);
        if (results.length === 0) {
          resultsDiv.innerHTML = '<div class="search-result-empty">No results found</div>';
          if (statusEl) {
            statusEl.textContent = 'No results found.';
          }
        } else {
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
    }
  }

  // Setup modal
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initHomepage);
