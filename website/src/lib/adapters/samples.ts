/**
 * Samples/Cookbook adapter.
 *
 * Flattens recipes from cookbooks into a searchable/filterable index
 * for the Learning Hub cookbook page.
 */

import type {
  SamplesData,
  Cookbook,
  CookbookRecipe,
  CookbookLanguage,
} from "../upstream-types";

export interface CookbookRecipeEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cookbookId: string;
  cookbookName: string;
  languages: string[];
  external: boolean;
  url?: string | null;
  variants: Record<string, { code?: string }>;
}

export interface CookbookSummary {
  id: string;
  name: string;
  description: string;
  path: string;
  featured: boolean;
  languages: CookbookLanguage[];
  recipeCount: number;
}

/**
 * Adapt the full samples data into a flat recipe list and cookbook summaries.
 */
export function adaptSamples(data: SamplesData): {
  recipes: CookbookRecipeEntry[];
  cookbooks: CookbookSummary[];
  filters: { languages: string[]; tags: string[] };
} {
  const recipes: CookbookRecipeEntry[] = [];
  const cookbooks: CookbookSummary[] = [];

  for (const cookbook of data.cookbooks ?? []) {
    cookbooks.push({
      id: cookbook.id,
      name: cookbook.name,
      description: cookbook.description,
      path: cookbook.path,
      featured: cookbook.featured ?? false,
      languages: cookbook.languages ?? [],
      recipeCount: cookbook.recipes?.length ?? 0,
    });

    for (const recipe of cookbook.recipes ?? []) {
      recipes.push(adaptRecipe(recipe, cookbook));
    }
  }

  return {
    recipes,
    cookbooks,
    filters: {
      languages: data.filters?.languages ?? [],
      tags: data.filters?.tags ?? [],
    },
  };
}

function adaptRecipe(
  recipe: CookbookRecipe,
  cookbook: Cookbook,
): CookbookRecipeEntry {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description ?? "",
    tags: recipe.tags ?? [],
    cookbookId: cookbook.id,
    cookbookName: cookbook.name,
    // `languages` is not declared in the upstream CookbookRecipe type but may be
    // present at runtime. Cast through `unknown` to avoid modifying the shared type.
    languages: Array.isArray(
      (recipe as unknown as Record<string, unknown>).languages,
    )
      ? ((recipe as unknown as Record<string, unknown>).languages as string[])
      : [],
    external: !!(recipe as any).external,
    url: recipe.url ?? null,
    variants: recipe.variants ?? {},
  };
}
