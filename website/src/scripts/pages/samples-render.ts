import { escapeHtml, sanitizeUrl } from "../utils";

export interface Language {
  id: string;
  name: string;
  icon: string;
  extension: string;
}

export interface RecipeVariant {
  doc: string;
  example: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  languages: string[];
  variants: Record<string, RecipeVariant>;
  external?: boolean;
  url?: string | null;
  author?: { name: string; url?: string } | null;
}

export interface Cookbook {
  id: string;
  name: string;
  description: string;
  path: string;
  featured: boolean;
  languages: Language[];
  recipes: Recipe[];
}

export interface CookbookRecipeMatch {
  cookbook: Cookbook;
  recipe: Recipe;
  highlightedName?: string;
}

export function getRecipeResultsCountText(
  filteredCount: number,
  totalCount: number
): string {
  if (filteredCount === totalCount) {
    return `${totalCount} recipe${totalCount !== 1 ? "s" : ""}`;
  }

  return `${filteredCount} of ${totalCount} recipe${
    totalCount !== 1 ? "s" : ""
  }`;
}

export function renderCookbookSectionsHtml(
  matches: CookbookRecipeMatch[],
  options: {
    selectedLanguage?: string | null;
  } = {}
): string {
  if (matches.length === 0) {
    return `
      <div class="empty-state">
        <h3>No Results Found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
  }

  const { selectedLanguage = null } = options;
  const byCookbook = new Map<
    string,
    { cookbook: Cookbook; recipes: { recipe: Recipe; highlightedName?: string }[] }
  >();

  matches.forEach(({ cookbook, recipe, highlightedName }) => {
    if (!byCookbook.has(cookbook.id)) {
      byCookbook.set(cookbook.id, { cookbook, recipes: [] });
    }
    byCookbook.get(cookbook.id)?.recipes.push({ recipe, highlightedName });
  });

  let html = "";
  byCookbook.forEach(({ cookbook, recipes }) => {
    html += renderCookbookSection(cookbook, recipes, selectedLanguage);
  });

  return html;
}

function renderCookbookSection(
  cookbook: Cookbook,
  recipes: { recipe: Recipe; highlightedName?: string }[],
  selectedLanguage: string | null
): string {
  const languageTabs = cookbook.languages
    .map(
      (language) => `
    <button class="lang-tab${selectedLanguage === language.id ? " active" : ""}"
            data-lang="${escapeHtml(language.id)}"
            title="${escapeHtml(language.name)}">
      ${escapeHtml(language.icon)}
    </button>
  `
    )
    .join("");

  const recipeCards = recipes
    .map(({ recipe, highlightedName }) =>
      renderRecipeCard(cookbook, recipe, selectedLanguage, highlightedName)
    )
    .join("");

  return `
    <div class="cookbook-section" data-cookbook="${escapeHtml(cookbook.id)}">
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

function renderRecipeCard(
  cookbook: Cookbook,
  recipe: Recipe,
  selectedLanguage: string | null,
  highlightedName?: string
): string {
  const recipeKey = `${cookbook.id}-${recipe.id}`;
  const tags = recipe.tags
    .map((tag) => `<span class="recipe-tag">${escapeHtml(tag)}</span>`)
    .join("");
  const titleHtml = highlightedName || escapeHtml(recipe.name);

  if (recipe.external && recipe.url) {
    const authorHtml = recipe.author
      ? `<span class="recipe-author">by ${
          recipe.author.url
            ? `<a href="${sanitizeUrl(
                recipe.author.url
              )}" target="_blank" rel="noopener">${escapeHtml(
                recipe.author.name
              )}</a>`
            : escapeHtml(recipe.author.name)
        }</span>`
      : "";

    return `
      <div class="recipe-card external" data-recipe="${escapeHtml(recipeKey)}">
        <div class="recipe-header">
          <h3>${titleHtml}</h3>
          <span class="recipe-badge external-badge" title="External project">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"/>
            </svg>
            Community
          </span>
        </div>
        <p class="recipe-description">${escapeHtml(recipe.description)}</p>
        ${authorHtml ? `<div class="recipe-author-line">${authorHtml}</div>` : ""}
        <div class="recipe-tags">${tags}</div>
        <div class="recipe-actions">
          <a href="${sanitizeUrl(
            recipe.url
          )}" class="btn btn-primary btn-small" target="_blank" rel="noopener">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    `;
  }

  const displayLanguage = selectedLanguage || cookbook.languages?.[0]?.id || "nodejs";
  const variant = recipe.variants[displayLanguage];
  const langIndicators = (cookbook.languages ?? [])
    .filter((language) => recipe.variants[language.id])
    .map(
      (language) =>
        `<span class="lang-indicator" title="${escapeHtml(language.name)}">${escapeHtml(
          language.icon
        )}</span>`
    )
    .join("");

  return `
    <div class="recipe-card" data-recipe="${escapeHtml(
      recipeKey
    )}" data-cookbook="${escapeHtml(cookbook.id)}" data-recipe-id="${escapeHtml(
    recipe.id
  )}">
      <div class="recipe-header">
        <h3>${titleHtml}</h3>
        <div class="recipe-langs">${langIndicators}</div>
      </div>
      <p class="recipe-description">${escapeHtml(recipe.description)}</p>
      <div class="recipe-tags">${tags}</div>
      <div class="recipe-actions">
        ${
          variant
            ? `
          <button class="btn btn-secondary btn-small view-recipe-btn" data-doc="${escapeHtml(
            variant.doc
          )}">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75zM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5z"/>
            </svg>
            View Recipe
          </button>
          ${
            variant.example
              ? `
            <button class="btn btn-secondary btn-small view-example-btn" data-example="${escapeHtml(
              variant.example
            )}">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M4.72 3.22a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06-1.06L7.69 7.5 4.72 4.28a.75.75 0 0 1 0-1.06zm6.25 1.06L10.22 5l.75.75-2.25 2.25 2.25 2.25-.75.75-.75-.72L11.97 7.5z"/>
              </svg>
              View Example
            </button>
          `
              : ""
          }
          <a href="https://github.com/github/awesome-copilot/blob/main/${escapeHtml(
            variant.doc
          )}"
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
