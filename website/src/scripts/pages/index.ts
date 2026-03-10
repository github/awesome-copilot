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
      searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          resultsDiv.classList.add('hidden');
          return;
        }

        const results = search.search(query).slice(0, 10);
        if (results.length === 0) {
          resultsDiv.innerHTML = '<div class="search-result-empty">No results found</div>';
        } else {
          resultsDiv.innerHTML = results.map(item => `
            <div class="search-result" data-path="${escapeHtml(item.path)}" data-type="${escapeHtml(item.type)}">
              <span class="search-result-type">${getResourceIcon(item.type)}</span>
              <div>
                <div class="search-result-title">${search.highlight(item.title, query)}</div>
                <div class="search-result-description">${truncate(item.description, 60)}</div>
              </div>
            </div>
          `).join('');

          // Add click handlers
          resultsDiv.querySelectorAll('.search-result').forEach(el => {
            el.addEventListener('click', () => {
              const path = (el as HTMLElement).dataset.path;
              const type = (el as HTMLElement).dataset.type;
              if (path && type) openFileModal(path, type);
            });
          });
        }
        resultsDiv.classList.remove('hidden');
      }, 200));

      // Close results when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target as Node) && !resultsDiv.contains(e.target as Node)) {
          resultsDiv.classList.add('hidden');
        }
      });
    }
  }

  // Setup modal
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initHomepage);
