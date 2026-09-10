import { GlobeIcon } from "@primer/octicons-react";
import { ActionMenu } from "@primer/react-brand";
import { useEffect, useState } from "react";

import {
  DEFAULT_LOCALE,
  SITE_LOCALES,
  splitLocale,
  type SiteLocale,
} from "./locales";
import { pageHref } from "./pageHref";

const BASE = import.meta.env.BASE_URL ?? "/";

/** Strip the configured base path from a browser pathname. */
function stripBase(pathname: string): string {
  const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
  return pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, "");
}

/**
 * Build the equivalent URL for `locale`, keeping the rest of the current path,
 * the query string and the hash. Astro serves the default locale unprefixed,
 * so switching to it drops the prefix entirely.
 */
function localeHref(locale: string, pathname: string, suffix: string): string {
  const { rest } = splitLocale(stripBase(pathname));
  const target = locale === DEFAULT_LOCALE ? rest : `${locale}/${rest}`;
  const normalized = target.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${normalized ? pageHref(normalized) : pageHref()}${suffix}`;
}

/**
 * Language picker for the top navigation.
 *
 * Replaces the Starlight `LanguageSelect.astro` override removed during the
 * migration. Locale switching is a pure path rewrite performed in the browser,
 * so a single statically rendered menu works on every page.
 */
export function LanguageSelect({
  locales = SITE_LOCALES,
  label = "Language",
}: {
  locales?: SiteLocale[];
  label?: string;
}) {
  const [current, setCurrent] = useState(DEFAULT_LOCALE);
  const [hrefs, setHrefs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      locales.map((locale) => [
        locale.code,
        locale.code === DEFAULT_LOCALE ? pageHref() : pageHref(locale.code),
      ]),
    ),
  );

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const suffix = `${search}${hash}`;
    setCurrent(splitLocale(stripBase(pathname)).locale);
    setHrefs(
      Object.fromEntries(
        locales.map((locale) => [
          locale.code,
          localeHref(locale.code, pathname, suffix),
        ]),
      ),
    );
  }, [locales]);

  const active =
    locales.find((locale) => locale.code === current) ?? locales[0];

  return (
    <ActionMenu size="small" menuAlignment="end" selectionVariant="none">
      <ActionMenu.Button
        variant="subtle"
        size="small"
        leadingVisual={<GlobeIcon />}
        aria-label={`${label}: ${active.label}`}
      >
        {active.label}
      </ActionMenu.Button>
      <ActionMenu.Overlay aria-label={label}>
        {locales.map((locale) => (
          <ActionMenu.Item
            as="a"
            key={locale.code}
            href={hrefs[locale.code]}
            hrefLang={locale.code}
            lang={locale.code}
            aria-current={locale.code === current ? "true" : undefined}
          >
            {locale.label}
          </ActionMenu.Item>
        ))}
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
