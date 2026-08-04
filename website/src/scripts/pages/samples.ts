/**
 * Samples/Cookbook page functionality
 */

import { FuzzySearch, type SearchableItem } from "../search";
import { fetchData, debounce } from "../utils";
import { createChoices, getChoicesValues, type Choices } from "../choices";
import {
  getRecipeResultsCountText,
  renderCookbookSectionsHtml,
  type Cookbook,
  type CookbookRecipeMatch,
  type Language,
} from "./samples-render";

interface SamplesData {
  cookbooks: Cookbook[];
  totalRecipes: number;
  totalCookbooks: number;
  filters: {
    languages: string[];
    tags: string[];
  };
}

// State
let samplesData: SamplesData | null = null;
let search: FuzzySearch<SearchableItem> | null = null;
let selectedLanguage: string | null = null;
let selectedTags: string[] = [];
let tagChoices: Choices | null = null;
let initialized = false;

/**
 * Initialize the samples page
 */
export async function initSamplesPage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    // Load samples data
    samplesData = await fetchData<SamplesData>("samples.json");

    if (!samplesData || samplesData.cookbooks.length === 0) {
      showEmptyState();
      return;
    }

    // Initialize search with all recipes
    const allRecipes = samplesData.cookbooks.flatMap((cookbook) =>
      cookbook.recipes.map(
        (recipe) =>
          ({
            ...recipe,
            title: recipe.name,
            cookbookId: cookbook.id,
          } as SearchableItem & { cookbookId: string })
      )
    );
    search = new FuzzySearch(allRecipes);

    // Setup UI
    handleLegacyCookbookHashLink();
    setupFilters();
    setupSearch();
    setupInteractionListeners();
    updateResultsCount();
  } catch (error) {
    console.error("Failed to initialize samples page:", error);
    showEmptyState();
  }
}

/**
 * Show empty state when no cookbooks are available
 */
function showEmptyState(): void {
  const container = document.getElementById("samples-list");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Samples Available</h3>
        <p>Check back soon for code samples and recipes.</p>
      </div>
    `;
  }

  // Hide filters
  const filtersBar = document.getElementById("filters-bar");
  if (filtersBar) filtersBar.style.display = "none";
}

/**
 * Setup language and tag filters
 */
function setupFilters(): void {
  if (!samplesData) return;

  // Language filter
  const languageSelect = document.getElementById(
    "filter-language"
  ) as HTMLSelectElement;
  if (languageSelect) {
    // Get unique languages across all cookbooks
    const languages = new Map<string, Language>();
    samplesData.cookbooks.forEach((cookbook) => {
      cookbook.languages.forEach((lang) => {
        if (!languages.has(lang.id)) {
          languages.set(lang.id, lang);
        }
      });
    });

    languageSelect.innerHTML = '<option value="">All Languages</option>';
    languages.forEach((lang, id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });

    languageSelect.addEventListener("change", () => {
      selectedLanguage = languageSelect.value || null;
      renderCookbooks();
      updateResultsCount();
    });
  }

  // Tag filter (multi-select with Choices.js)
  const tagSelect = document.getElementById("filter-tag") as HTMLSelectElement;
  if (tagSelect && samplesData.filters.tags.length > 0) {
    // Initialize Choices.js
    tagChoices = createChoices("#filter-tag", { placeholderValue: "All Tags" });
    tagChoices.setChoices(
      samplesData.filters.tags.map((tag) => ({ value: tag, label: tag })),
      "value",
      "label",
      true
    );

    tagSelect.addEventListener("change", () => {
      selectedTags = getChoicesValues(tagChoices!);
      renderCookbooks();
      updateResultsCount();
    });
  }

  // Clear filters button
  const clearBtn = document.getElementById("clear-filters");
  clearBtn?.addEventListener("click", clearFilters);
}

/**
 * Setup search functionality
 */
function setupSearch(): void {
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  if (!searchInput) return;

  searchInput.addEventListener(
    "input",
    debounce(() => {
      renderCookbooks();
      updateResultsCount();
    }, 200)
  );
}

/**
 * Clear all filters
 */
function clearFilters(): void {
  selectedLanguage = null;
  selectedTags = [];

  const languageSelect = document.getElementById(
    "filter-language"
  ) as HTMLSelectElement;
  if (languageSelect) languageSelect.value = "";

  // Clear Choices.js selection
  if (tagChoices) {
    tagChoices.removeActiveItems();
  }

  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  if (searchInput) searchInput.value = "";

  renderCookbooks();
  updateResultsCount();
}

/**
 * Get filtered recipes
 */
function getFilteredRecipes(): CookbookRecipeMatch[] {
  if (!samplesData || !search) return [];

  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const query = searchInput?.value.trim() || "";

  let results: CookbookRecipeMatch[] = [];

  if (query) {
    // Use fuzzy search - returns SearchableItem[] directly
    const searchResults = search.search(query);
    results = searchResults.map((item) => {
      const recipe = item as SearchableItem & { cookbookId: string };
      const cookbook = samplesData!.cookbooks.find(
        (c) => c.id === recipe.cookbookId
      )!;
      return {
        cookbook,
        recipe: recipe as unknown as CookbookRecipeMatch["recipe"],
        highlightedName: search!.highlight(recipe.title, query),
      };
    });
  } else {
    // No search query - return all recipes
    results = samplesData.cookbooks.flatMap((cookbook) =>
      cookbook.recipes.map((recipe) => ({ cookbook, recipe }))
    );
  }

  // Apply language filter using per-recipe languages array
  if (selectedLanguage) {
    results = results.filter(({ recipe }) =>
      recipe.languages.includes(selectedLanguage!)
    );
  }

  // Apply tag filter
  if (selectedTags.length > 0) {
    results = results.filter(({ recipe }) =>
      selectedTags.some((tag) => recipe.tags.includes(tag))
    );
  }

  return results;
}

/**
 * Render cookbooks and recipes
 */
function renderCookbooks(): void {
  const container = document.getElementById("samples-list");
  if (!container || !samplesData) return;

  container.innerHTML = renderCookbookSectionsHtml(getFilteredRecipes(), {
    selectedLanguage,
  });

  // Setup event listeners
  setupInteractionListeners();
}

/**
 * Setup event listeners for cookbook interactions
 */
function setupInteractionListeners(): void {
  // Language tab clicks
  document.querySelectorAll(".lang-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const langId = (tab as HTMLElement).dataset.lang;
      if (langId) {
        selectedLanguage = langId;
        // Update language filter select
        const languageSelect = document.getElementById(
          "filter-language"
        ) as HTMLSelectElement;
        if (languageSelect) languageSelect.value = langId;
        renderCookbooks();
        updateResultsCount();
      }
    });
  });
}

/**
 * Redirect legacy cookbook #file=<path> links to canonical cookbook routes.
 */
function handleLegacyCookbookHashLink(): void {
  const hashMatch = window.location.hash.match(/^#file=(.+)$/);
  if (!hashMatch) return;

  let filePath: string;
  try {
    filePath = decodeURIComponent(hashMatch[1]);
  } catch {
    return;
  }

  const parsed = parseCookbookPath(filePath);
  if (!parsed) return;

  const nextUrl = `/learning-hub/cookbook/${encodeURIComponent(
    parsed.cookbook
  )}/${encodeURIComponent(parsed.language)}/${encodeURIComponent(
    parsed.recipe
  )}/${parsed.example ? `#file=${encodeURIComponent(filePath)}` : ""}`;

  window.location.replace(nextUrl);
}

function parseCookbookPath(filePath: string): {
  cookbook: string;
  language: string;
  recipe: string;
  example: boolean;
} | null {
  const docMatch = filePath.match(/^cookbook\/([^/]+)\/([^/]+)\/([^/]+)\.md$/);
  if (docMatch) {
    return {
      cookbook: docMatch[1],
      language: docMatch[2],
      recipe: docMatch[3],
      example: false,
    };
  }

  const exampleMatch = filePath.match(
    /^cookbook\/([^/]+)\/([^/]+)\/recipe\/([^/.]+)\.[^/.]+$/
  );
  if (exampleMatch) {
    return {
      cookbook: exampleMatch[1],
      language: exampleMatch[2],
      recipe: exampleMatch[3],
      example: true,
    };
  }

  return null;
}

/**
 * Update results count display
 */
function updateResultsCount(): void {
  const resultsCount = document.getElementById("results-count");
  if (!resultsCount || !samplesData) return;

  const filtered = getFilteredRecipes();
  const total = samplesData.totalRecipes;
  resultsCount.textContent = getRecipeResultsCountText(filtered.length, total);
}

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initSamplesPage());
  } else {
    initSamplesPage();
  }
}
