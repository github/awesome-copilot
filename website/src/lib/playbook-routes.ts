/** Collection ids that belong to the cookbook, which is routed elsewhere. */
const COOKBOOK_RE = /(^|\/)cookbook(\/|$)/;

/**
 * Playbook article ids, i.e. everything in the `docs` collection under a
 * `learning-hub/` path that is not an index page or a cookbook recipe.
 */
export function isPlaybookArticle(id: string): boolean {
  if (COOKBOOK_RE.test(id)) return false;
  // The Playbook landing page is a real Astro page, not a collection entry.
  if (splitLocale(id).path === "learning-hub/index") return false;
  return /(^|\/)learning-hub\//.test(id);
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
 * Only the `copilot-workshops/app` track currently has mirrored translations
 * under `website/src/content/docs/<locale>/…`; every other Playbook article,
 * workshop track, and cookbook recipe is English-only. The language selector
 * is only useful (and only correct) on pages that actually have a translation
 * to switch to, so callers gate it on this check rather than showing it site-wide.
 */
const TRANSLATED_PREFIX = "learning-hub/copilot-workshops/app";

/** Whether the (unprefixed, English) article id has mirrored translations. */
export function hasTranslations(englishId: string): boolean {
  return (
    englishId === TRANSLATED_PREFIX ||
    englishId.startsWith(`${TRANSLATED_PREFIX}/`)
  );
}

/**
 * Narrow Astro's `Astro.currentLocale` to a non-default site locale.
 *
 * Astro's i18n `fallback` map auto-generates the locale-prefixed variant of
 * every English page, so a single route file serves all locales. On those
 * generated pages `Astro.url.pathname` is the *rewritten* English path, so the
 * requested locale is only recoverable from `currentLocale`. The default
 * locale (`en`) maps to `undefined` because English content is unprefixed.
 */
export function siteLocale(currentLocale: string | undefined): Locale | undefined {
  return currentLocale && (LOCALES as readonly string[]).includes(currentLocale)
    ? (currentLocale as Locale)
    : undefined;
}

/**
 * Pick the entry to render for `locale`: the real translation when the docs
 * collection has one, otherwise the English entry (fallback).
 */
export function localizedEntry<T extends { id: string }>(
  entries: readonly T[],
  englishId: string,
  locale: Locale | undefined,
): T {
  const english = entries.find((entry) => entry.id === englishId);
  if (!locale) return english as T;
  const translated = entries.find((entry) => entry.id === `${locale}/${englishId}`);
  return translated ?? (english as T);
}
