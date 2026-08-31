import samplesData from "../../public/data/samples.json";

import type {
  CookbookSection,
  RecipeLink,
} from "../components/brand/learning-hub/CookbookIndex";

export type RecipeVariant = {
  doc: string;
  example: string | null;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  languages: string[];
  variants: Record<string, RecipeVariant>;
  external?: boolean;
  url?: string | null;
  author?: { name: string; url?: string } | null;
};

export type CookbookLanguage = {
  id: string;
  name: string;
  icon: string;
  extension: string;
};

export type Cookbook = {
  id: string;
  name: string;
  description: string;
  path: string;
  featured: boolean;
  languages: CookbookLanguage[];
  recipes: Recipe[];
};

const data = samplesData as unknown as { cookbooks: Cookbook[] };

export const cookbooks = data.cookbooks;

export const GITHUB_BLOB_BASE =
  "https://github.com/github/awesome-copilot/blob/main";
export const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";

/** Locales that mirror the English site under a URL prefix. */
export const LOCALES = ["es-es", "ja-jp", "ko-kr", "pt-br", "zh-cn"] as const;

const base = import.meta.env.BASE_URL ?? "/";

function withBase(path: string): string {
  return `${base.endsWith("/") ? base : `${base}/`}${path}`.replace(
    /\/{2,}/g,
    "/",
  );
}

/**
 * Canonical recipe URL: `/learning-hub/cookbook/<cookbook>/<language>/<recipe>/`,
 * optionally deep-linked to one of the recipe's files.
 */
export function recipeHref(
  cookbookId: string,
  languageId: string,
  recipeId: string,
  filePath?: string | null,
  locale?: string,
): string {
  const prefix = locale ? `${locale}/` : "";
  const path = withBase(
    `${prefix}learning-hub/cookbook/${encodeURIComponent(
      cookbookId,
    )}/${encodeURIComponent(languageId)}/${encodeURIComponent(recipeId)}/`,
  );
  return filePath ? `${path}#file=${encodeURIComponent(filePath)}` : path;
}

/** Every buildable recipe route: one page per (cookbook, language, recipe). */
export function recipeRoutes() {
  return cookbooks.flatMap((cookbook) =>
    cookbook.recipes.flatMap((recipe) =>
      Object.entries(recipe.variants ?? {}).flatMap(([languageId, variant]) => {
        const language = cookbook.languages.find(
          (item) => item.id === languageId,
        );
        if (!language || !variant || recipe.external) return [];
        return [{ cookbook, recipe, language, variant }];
      }),
    ),
  );
}

/**
 * Project the cookbook data into the index page's section/card shape. The
 * prototype listed "View Recipe" / "View Example" / "GitHub" per recipe; the
 * first language variant that exists supplies those links.
 */
export function cookbookSections(locale?: string): CookbookSection[] {
  return cookbooks.map((cookbook) => ({
    id: cookbook.id,
    name: cookbook.name,
    description: cookbook.description,
    recipes: cookbook.recipes.map((recipe) => {
      const links: RecipeLink[] = [];

      if (recipe.external) {
        if (recipe.url) {
          links.push({
            label: "View on GitHub",
            href: recipe.url,
            external: true,
          });
        }
      } else {
        const [languageId, variant] =
          Object.entries(recipe.variants ?? {})[0] ?? [];
        if (languageId && variant) {
          links.push({
            label: "View Recipe",
            href: recipeHref(cookbook.id, languageId, recipe.id, null, locale),
          });
          if (variant.example) {
            links.push({
              label: "View Example",
              href: recipeHref(
                cookbook.id,
                languageId,
                recipe.id,
                variant.example,
                locale,
              ),
            });
          }
          links.push({
            label: "GitHub",
            href: `${GITHUB_BLOB_BASE}/${variant.doc}`,
            external: true,
          });
        }
      }

      return {
        id: recipe.id,
        title: recipe.name,
        description: recipe.description,
        badge: recipe.external ? "Community" : undefined,
        author:
          recipe.author && recipe.author.url
            ? { name: recipe.author.name, href: recipe.author.url }
            : undefined,
        tags: recipe.tags,
        links,
      };
    }),
  }));
}
