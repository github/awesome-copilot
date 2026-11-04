/** Collection ids that belong to the cookbook, which is routed elsewhere. */
const COOKBOOK_RE = /(^|\/)cookbook(\/|$)/;

/**
 * Learning Hub article ids, i.e. everything in the `docs` collection under a
 * `learning-hub/` path that is not an index page or a cookbook recipe.
 */
export function isLearningHubArticle(id: string): boolean {
  if (COOKBOOK_RE.test(id)) return false;
  // The Learning Hub landing page is a real Astro page, not a collection entry.
  if (splitLocale(id).path === "learning-hub/index") return false;
  return /(^|\/)learning-hub\//.test(id);
}

/** Remove the collection-only `/index` suffix from a public Learning Hub path. */
export function normalizeLearningHubPath(path: string): string {
  return path.replace(/\/index$/, "");
}

/** Return the canonical public path for a collection entry id. */
export function learningHubEntryPath(id: string): string {
  return normalizeLearningHubPath(splitLocale(id).path);
}

const LOCALES = ["es-es", "ja-jp", "ko-kr", "pt-br", "zh-cn"] as const;

export type Locale = (typeof LOCALES)[number];

/** Split a collection id into its locale prefix (if any) and the rest. */
export function splitLocale(id: string): { locale?: Locale; path: string } {
  const [head, ...rest] = id.split("/");
  if ((LOCALES as readonly string[]).includes(head)) {
    return { locale: head as Locale, path: rest.join("/") };
  }
  return { path: id };
}

export { LOCALES };

/**
 * The workshop landing page, real-world app track, and First Steps tracks have
 * mirrored translations. The language selector is only useful on pages with
 * an actual translation, so callers gate it rather than showing it site-wide.
 */
const TRANSLATED_PREFIXES = [
  "learning-hub/copilot-workshops/app",
  "learning-hub/copilot-workshops/first-steps",
];
const TRANSLATED_WORKSHOP_LANDING = "learning-hub/copilot-workshops";

/** Whether the (unprefixed, English) article id has mirrored translations. */
export function hasTranslations(englishId: string): boolean {
  const normalized = normalizeLearningHubPath(englishId);
  return (
    normalized === TRANSLATED_WORKSHOP_LANDING ||
    TRANSLATED_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  );
}

/**
 * The locale of the *content actually rendered* for a page, as distinct from
 * the URL. Only explicitly translated entries are served under locale
 * prefixes, so `<html lang>` must reflect the entry's locale rather than
 * relying on URL routing to imply it.
 *
 * `englishId` is only meaningful for Learning Hub articles, which are the only
 * content with real mirrored translations today (see `hasTranslations`).
 */
export function contentLocale(
  requestedLocale: Locale | undefined,
  englishId?: string,
): "en" | Locale {
  if (!requestedLocale) return "en";
  if (englishId && hasTranslations(englishId)) return requestedLocale;
  return "en";
}
