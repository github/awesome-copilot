/**
 * Samples/Cookbook page functionality
 */

import { FuzzySearch, type SearchableItem } from "../search";
import { fetchData, escapeHtml } from "../utils";
import { createChoices, getChoicesValues, type Choices } from "../choices";
import { setupModal } from "../modal";

// Types
interface Language {
  id: string;
  name: string;
  icon: string;
  extension: string;
}

interface RecipeVariant {
  doc: string;
  example: string | null;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  variants: Record<string, RecipeVariant>;
}

interface Cookbook {
  id: string;
  name: string;
  description: string;
  path: string;
  featured: boolean;
  languages: Language[];
  recipes: Recipe[];
}

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
let expandedRecipes: Set<string> = new Set();
let tagChoices: Choices | null = null;

/**
 * Initialize the samples page
 */
export async function initSamplesPage(): Promise<void> {
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
    setupModal();
    setupFilters();
    setupSearch();
    renderCookbooks();
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
      option.textContent = `${lang.icon} ${lang.name}`;
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

  let debounceTimer: number;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      renderCookbooks();
      updateResultsCount();
    }, 200);
  });
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
function getFilteredRecipes(): {
  cookbook: Cookbook;
  recipe: Recipe;
  highlighted?: string;
}[] {
  if (!samplesData || !search) return [];

  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const query = searchInput?.value.trim() || "";

  let results: { cookbook: Cookbook; recipe: Recipe; highlighted?: string }[] =
    [];

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
        recipe: recipe as unknown as Recipe,
        highlighted: search!.highlight(recipe.title, query),
      };
    });
  } else {
    // No search query - return all recipes
    results = samplesData.cookbooks.flatMap((cookbook) =>
      cookbook.recipes.map((recipe) => ({ cookbook, recipe }))
    );
  }

  // Apply language filter
  if (selectedLanguage) {
    results = results.filter(
      ({ recipe }) => recipe.variants[selectedLanguage!]
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

  const filteredResults = getFilteredRecipes();

  if (filteredResults.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Results Found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
    return;
  }

  // Group by cookbook
  const byCookbook = new Map<
    string,
    { cookbook: Cookbook; recipes: { recipe: Recipe; highlighted?: string }[] }
  >();
  filteredResults.forEach(({ cookbook, recipe, highlighted }) => {
    if (!byCookbook.has(cookbook.id)) {
      byCookbook.set(cookbook.id, { cookbook, recipes: [] });
    }
    byCookbook.get(cookbook.id)!.recipes.push({ recipe, highlighted });
  });

  let html = "";
  byCookbook.forEach(({ cookbook, recipes }) => {
    html += renderCookbookSection(cookbook, recipes);
  });

  container.innerHTML = html;

  // Setup event listeners
  setupRecipeListeners();
}

/**
 * Render a cookbook section
 */
function renderCookbookSection(
  cookbook: Cookbook,
  recipes: { recipe: Recipe; highlighted?: string }[]
): string {
  const languageTabs = cookbook.languages
    .map(
      (lang) => `
    <button class="lang-tab${selectedLanguage === lang.id ? " active" : ""}"
            data-lang="${lang.id}"
            title="${lang.name}">
      ${lang.icon}
    </button>
  `
    )
    .join("");

  const recipeCards = recipes
    .map(({ recipe, highlighted }) =>
      renderRecipeCard(cookbook, recipe, highlighted)
    )
    .join("");

  return `
    <div class="cookbook-section" data-cookbook="${cookbook.id}">
      <div class="cookbook-header">
        <div class="cookbook-info">
          <h2>${escapeHtml(cookbook.name)}</h2>
          <p>${escapeHtml(cookbook.description)}</p>
        </div>
        <div class="cookbook-languages">
          ${languageTabs}
        </div>
      </div>
      <div class="recipes-grid">
        ${recipeCards}
      </div>
    </div>
  `;
}

/**
 * Render a recipe card
 */
function renderRecipeCard(
  cookbook: Cookbook,
  recipe: Recipe,
  highlightedName?: string
): string {
  const recipeKey = `${cookbook.id}-${recipe.id}`;
  const isExpanded = expandedRecipes.has(recipeKey);

  // Determine which language to show
  const displayLang = selectedLanguage || cookbook.languages[0]?.id || "nodejs";
  const variant = recipe.variants[displayLang];

  const tags = recipe.tags
    .map((tag) => `<span class="recipe-tag">${escapeHtml(tag)}</span>`)
    .join("");

  const langIndicators = cookbook.languages
    .filter((lang) => recipe.variants[lang.id])
    .map(
      (lang) =>
        `<span class="lang-indicator" title="${lang.name}">${lang.icon}</span>`
    )
    .join("");

  return `
    <div class="recipe-card${
      isExpanded ? " expanded" : ""
    }" data-recipe="${recipeKey}" data-cookbook="${
    cookbook.id
  }" data-recipe-id="${recipe.id}">
      <div class="recipe-header">
        <h3>${highlightedName || escapeHtml(recipe.name)}</h3>
        <div class="recipe-langs">${langIndicators}</div>
      </div>
      <p class="recipe-description">${escapeHtml(recipe.description)}</p>
      <div class="recipe-tags">${tags}</div>
      <div class="recipe-actions">
        ${
          variant
            ? `
          <button class="btn btn-secondary btn-small view-recipe-btn" data-doc="${
            variant.doc
          }">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75zM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5z"/>
            </svg>
            View Recipe
          </button>
          ${
            variant.example
              ? `
            <button class="btn btn-secondary btn-small view-example-btn" data-example="${variant.example}">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M4.72 3.22a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06-1.06L7.69 7.5 4.72 4.28a.75.75 0 0 1 0-1.06zm6.25 1.06L10.22 5l.75.75-2.25 2.25 2.25 2.25-.75.75-.75-.72L11.97 7.5z"/>
              </svg>
              View Example
            </button>
          `
              : ""
          }
          <a href="https://github.com/github/awesome-copilot/blob/main/${
            variant.doc
          }"
             class="btn btn-secondary btn-small" target="_blank" rel="noopener">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        `
            : '<span class="no-variant">Not available for selected language</span>'
        }
      </div>
    </div>
  `;
}

/**
 * Setup event listeners for recipe interactions
 */
function setupRecipeListeners(): void {
  // View recipe buttons
  document.querySelectorAll(".view-recipe-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const docPath = (btn as HTMLElement).dataset.doc;
      if (docPath) {
        await showRecipeContent(docPath, "recipe");
      }
    });
  });

  // View example buttons
  document.querySelectorAll(".view-example-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const examplePath = (btn as HTMLElement).dataset.example;
      if (examplePath) {
        await showRecipeContent(examplePath, "example");
      }
    });
  });

  // Language tab clicks
  document.querySelectorAll(".lang-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
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
 * Show recipe/example content in modal
 */
async function showRecipeContent(
  filePath: string,
  type: "recipe" | "example"
): Promise<void> {
  // Use existing modal infrastructure
  const { openFileModal } = await import("../modal");
  await openFileModal(filePath, type);
}

/**
 * Update results count display
 */
function updateResultsCount(): void {
  const resultsCount = document.getElementById("results-count");
  if (!resultsCount || !samplesData) return;

  const filtered = getFilteredRecipes();
  const total = samplesData.totalRecipes;

  if (filtered.length === total) {
    resultsCount.textContent = `${total} recipe${total !== 1 ? "s" : ""}`;
  } else {
    resultsCount.textContent = `${filtered.length} of ${total} recipe${
      total !== 1 ? "s" : ""
    }`;
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initSamplesPage());
  } else {
    initSamplesPage();
  }
}
