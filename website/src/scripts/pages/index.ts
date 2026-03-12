/**
 * Homepage functionality
 */
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, truncate, getResourceIcon } from '../utils';
import { setupModal, openFileModal } from '../modal';

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
          resultsDiv.innerHTML = results.map(item => `
            <button type="button" class="search-result" data-path="${escapeHtml(item.path)}" data-type="${escapeHtml(item.type)}">
              <span class="search-result-type">${getResourceIcon(item.type)}</span>
              <div>
                <div class="search-result-title">${search.highlight(item.title, query)}</div>
                <div class="search-result-description">${truncate(item.description, 60)}</div>
              </div>
            </button>
          `).join('');

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
