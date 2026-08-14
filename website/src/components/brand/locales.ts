/**
 * Locale table for the site's language selector.
 *
 * These codes mirror the `i18n.locales` list in `astro.config.mjs` and the
 * locale directory names used by mirrored Playbook content
 * (`website/src/content/docs/<locale>/…`). The default locale is served at the
 * site root with no prefix (`prefixDefaultLocale: false`).
 */

export type SiteLocale = {
  /** Locale code / URL prefix, e.g. `es-es`. */
  code: string;
  /** Name of the language, written in that language. */
  label: string;
};

export const DEFAULT_LOCALE = "en";

export const SITE_LOCALES: SiteLocale[] = [
  { code: "en", label: "English" },
  { code: "es-es", label: "Español" },
  { code: "ja-jp", label: "日本語" },
  { code: "ko-kr", label: "한국어" },
  { code: "pt-br", label: "Português do Brasil" },
  { code: "zh-cn", label: "简体中文" },
];

const LOCALE_CODES = new Set(SITE_LOCALES.map((locale) => locale.code));

/**
 * Split a base-relative path into its locale prefix (if any) and the remainder.
 * The default locale has no prefix, so an unprefixed path reports as default.
 */
export function splitLocale(relativePath: string): {
  locale: string;
  rest: string;
} {
  const trimmed = relativePath.replace(/^\/+/, "");
  const [first, ...restParts] = trimmed.split("/");
  if (first && LOCALE_CODES.has(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, rest: restParts.join("/") };
  }
  return { locale: DEFAULT_LOCALE, rest: trimmed };
}
