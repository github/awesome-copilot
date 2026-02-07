/**
 * Tools page functionality
 */
import { FuzzySearch, type SearchableItem } from "../search";
import { fetchData, debounce, escapeHtml } from "../utils";

export interface Tool extends SearchableItem {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  requirements: string[];
  features: string[];
  links: {
    blog?: string;
    vscode?: string;
    "vscode-insiders"?: string;
    "visual-studio"?: string;
    github?: string;
    documentation?: string;
    marketplace?: string;
    npm?: string;
    pypi?: string;
  };
  configuration?: {
    type: string;
    content: string;
  };
  tags: string[];
}

interface ToolsData {
  items: Tool[];
  filters: {
    categories: string[];
    tags: string[];
  };
}

let allItems: Tool[] = [];
let search: FuzzySearch<Tool>;
let currentFilters = {
  categories: [] as string[],
  query: "",
};

function formatMultilineText(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const countEl = document.getElementById("results-count");
  const query = searchInput?.value || "";
  currentFilters.query = query;

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.categories.length > 0) {
    results = results.filter((item) =>
      currentFilters.categories.includes(item.category)
    );
  }

  renderTools(results, query);

  let countText = `${results.length} of ${allItems.length} tools`;
  if (currentFilters.categories.length > 0) {
    countText += ` (filtered by ${currentFilters.categories.length} categories)`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderTools(tools: Tool[], query = ""): void {
  const container = document.getElementById("tools-list");
  if (!container) return;

  if (tools.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No tools found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tools
    .map((tool) => {
      const badges: string[] = [];
      if (tool.featured) {
        badges.push('<span class="tool-badge featured">Featured</span>');
      }
      badges.push(
        `<span class="tool-badge category">${escapeHtml(tool.category)}</span>`
      );

      const features =
        tool.features && tool.features.length > 0
          ? `<div class="tool-section">
          <h3>Features</h3>
          <ul>${tool.features
            .map((f) => `<li>${escapeHtml(f)}</li>`)
            .join("")}</ul>
        </div>`
          : "";

      const requirements =
        tool.requirements && tool.requirements.length > 0
          ? `<div class="tool-section">
          <h3>Requirements</h3>
          <ul>${tool.requirements
            .map((r) => `<li>${escapeHtml(r)}</li>`)
            .join("")}</ul>
        </div>`
          : "";

      const tags =
        tool.tags && tool.tags.length > 0
          ? `<div class="tool-tags">
          ${tool.tags
            .map((t) => `<span class="tool-tag">${escapeHtml(t)}</span>`)
            .join("")}
        </div>`
          : "";

      const config = tool.configuration
        ? `<div class="tool-config">
          <h3>Configuration</h3>
          <div class="tool-config-wrapper">
            <pre><code>${escapeHtml(tool.configuration.content)}</code></pre>
          </div>
          <button class="copy-config-btn" data-config="${encodeURIComponent(
            tool.configuration.content
          )}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
            </svg>
            Copy Configuration
          </button>
        </div>`
        : "";

      const actions: string[] = [];
      if (tool.links.blog) {
        actions.push(
          `<a href="${tool.links.blog}" class="btn btn-secondary" target="_blank" rel="noopener">📖 Blog</a>`
        );
      }
      if (tool.links.marketplace) {
        actions.push(
          `<a href="${tool.links.marketplace}" class="btn btn-secondary" target="_blank" rel="noopener">🏪 Marketplace</a>`
        );
      }
      if (tool.links.npm) {
        actions.push(
          `<a href="${tool.links.npm}" class="btn btn-secondary" target="_blank" rel="noopener">📦 npm</a>`
        );
      }
      if (tool.links.pypi) {
        actions.push(
          `<a href="${tool.links.pypi}" class="btn btn-secondary" target="_blank" rel="noopener">🐍 PyPI</a>`
        );
      }
      if (tool.links.documentation) {
        actions.push(
          `<a href="${tool.links.documentation}" class="btn btn-secondary" target="_blank" rel="noopener">📚 Docs</a>`
        );
      }
      if (tool.links.github) {
        actions.push(
          `<a href="${tool.links.github}" class="btn btn-secondary" target="_blank" rel="noopener">GitHub</a>`
        );
      }
      if (tool.links.vscode) {
        actions.push(
          `<a href="${tool.links.vscode}" class="btn btn-primary" target="_blank" rel="noopener">Install in VS Code</a>`
        );
      }
      if (tool.links["vscode-insiders"]) {
        actions.push(
          `<a href="${tool.links["vscode-insiders"]}" class="btn btn-outline" target="_blank" rel="noopener">VS Code Insiders</a>`
        );
      }
      if (tool.links["visual-studio"]) {
        actions.push(
          `<a href="${tool.links["visual-studio"]}" class="btn btn-outline" target="_blank" rel="noopener">Visual Studio</a>`
        );
      }

      const actionsHtml =
        actions.length > 0
          ? `<div class="tool-actions">${actions.join("")}</div>`
          : "";

      const titleHtml = query
        ? search.highlight(tool.name, query)
        : escapeHtml(tool.name);
      const descriptionHtml = formatMultilineText(tool.description);

      return `
      <div class="tool-card">
        <div class="tool-header">
          <h2>${titleHtml}</h2>
          <div class="tool-badges">
            ${badges.join("")}
          </div>
        </div>
        <p class="tool-description">${descriptionHtml}</p>
        ${features}
        ${requirements}
        ${config}
        ${tags}
        ${actionsHtml}
      </div>
    `;
    })
    .join("");

  setupCopyConfigHandlers();
}

function setupCopyConfigHandlers(): void {
  document.querySelectorAll(".copy-config-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const button = e.currentTarget as HTMLButtonElement;
      const config = decodeURIComponent(button.dataset.config || "");
      try {
        await navigator.clipboard.writeText(config);
        button.classList.add("copied");
        const originalHtml = button.innerHTML;
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
          </svg>
          Copied!
        `;
        setTimeout(() => {
          button.classList.remove("copied");
          button.innerHTML = originalHtml;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  });
}

export async function initToolsPage(): Promise<void> {
  const container = document.getElementById("tools-list");
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const categoryFilter = document.getElementById(
    "filter-category"
  ) as HTMLSelectElement;
  const clearFiltersBtn = document.getElementById("clear-filters");

  if (container) {
    container.innerHTML = '<div class="loading">Loading tools...</div>';
  }

  const data = await fetchData<ToolsData>("tools.json");
  if (!data || !data.items) {
    if (container)
      container.innerHTML =
        '<div class="empty-state"><h3>Failed to load tools</h3></div>';
    return;
  }

  // Map items to include title for FuzzySearch
  allItems = data.items.map((item) => ({
    ...item,
    title: item.name, // FuzzySearch uses title
  }));

  search = new FuzzySearch<Tool>();
  search.setItems(allItems);

  // Populate category filter
  if (categoryFilter && data.filters.categories) {
    categoryFilter.innerHTML =
      '<option value="">All Categories</option>' +
      data.filters.categories
        .map(
          (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
        )
        .join("");

    categoryFilter.addEventListener("change", () => {
      currentFilters.categories = categoryFilter.value
        ? [categoryFilter.value]
        : [];
      applyFiltersAndRender();
    });
  }

  // Search input handler
  searchInput?.addEventListener(
    "input",
    debounce(() => applyFiltersAndRender(), 200)
  );

  // Clear filters
  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { categories: [], query: "" };
    if (categoryFilter) categoryFilter.value = "";
    if (searchInput) searchInput.value = "";
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initToolsPage);
