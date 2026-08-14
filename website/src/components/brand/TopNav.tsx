import { ChevronDownIcon, ThreeBarsIcon, XIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { Button } from "@primer/react-brand";
import { useEffect, useRef } from "react";

import type { SearchItem } from "./searchIndex";
import mobileStyles from "./styles/TopNav.module.css";
import { ContributorsNavButton } from "./ContributorsNavButton";
import { LanguageSelect } from "./LanguageSelect";
import { TopNavSearch } from "./TopNavSearch";

const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

type NavLink = { label: string; href: string; current: boolean };

/**
 * The top navigation is intentionally reduced to two tabs shared across every
 * page: a "Resources" dropdown that gathers all catalog destinations, plus a
 * standalone "Copilot Playbook" tab. Each page owns its own scoped CSS module,
 * so the class map is injected via `styles` to keep the existing look.
 */
export function TopNav({
  styles,
  links,
  libraryLabel = "Resources",
  playbookLabel = "Playbook",
  contributorsHref,
  contributorsTotal = 0,
  searchIndex,
  contributorsCurrent = false,
  searchAriaLabel = "Search the library",
}: {
  styles: Record<string, string | undefined>;
  links: NavLink[];
  libraryLabel?: string;
  playbookLabel?: string;
  contributorsHref?: string;
  contributorsTotal?: number;
  searchIndex?: SearchItem[];
  contributorsCurrent?: boolean;
  searchAriaLabel?: string;
}) {
  const playbook = links.find((link) => link.label === playbookLabel);
  const libraryLinks = links.filter((link) => link.label !== playbookLabel);
  const libraryActive = libraryLinks.some((link) => link.current);
  const desktopMenuRef = useRef<HTMLDetailsElement>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeMenus = () => {
      if (desktopMenuRef.current) desktopMenuRef.current.open = false;
      if (mobileMenuRef.current) mobileMenuRef.current.open = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const activeElement = document.activeElement;
      const activeMenu = [desktopMenuRef.current, mobileMenuRef.current].find(
        (menu) => menu?.open && activeElement && menu.contains(activeElement),
      );
      if (!activeMenu) return;
      closeMenus();
      activeMenu.querySelector("summary")?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !desktopMenuRef.current?.contains(target) &&
        !mobileMenuRef.current?.contains(target)
      ) {
        closeMenus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <>
      <ul className={styles.subNavList}>
        <li className={styles.moreItem}>
          <details className={styles.moreMenu} ref={desktopMenuRef}>
            <summary
              className={clsx(
                styles.subNavLink,
                styles.moreTrigger,
                libraryActive && styles.subNavLinkActive,
              )}
            >
              {libraryLabel}
              <ChevronDownIcon size={16} className={styles.moreChevron} />
            </summary>
            <div className={styles.moreOverlay}>
              {libraryLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={styles.moreLink}
                  aria-current={link.current ? "page" : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </details>
        </li>
        {playbook && (
          <li>
            <a
              href={playbook.href}
              className={clsx(
                styles.subNavLink,
                playbook.current && styles.subNavLinkActive,
              )}
              aria-current={playbook.current ? "page" : undefined}
            >
              {playbook.label}
            </a>
          </li>
        )}
      </ul>

      <details className={mobileStyles.mobileMenu} ref={mobileMenuRef}>
        <summary
          className={mobileStyles.mobileTrigger}
          aria-label={`Open ${libraryLabel} menu`}
        >
          <ThreeBarsIcon size={20} className={mobileStyles.triggerBars} />
          <XIcon size={20} className={mobileStyles.triggerClose} />
        </summary>
        <nav className={mobileStyles.mobileOverlay} aria-label={libraryLabel}>
          {contributorsHref && (
            <>
              <div className={mobileStyles.mobileSearch}>
                <TopNavSearch
                  index={searchIndex}
                  styles={styles}
                  variant="inline"
                  inputAriaLabel={searchAriaLabel}
                />
              </div>
              <span className={mobileStyles.overlayDivider} aria-hidden="true" />
            </>
          )}
          <span className={mobileStyles.overlayLabel}>{libraryLabel}</span>
          {libraryLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={mobileStyles.mobileLink}
              aria-current={link.current ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
          {playbook && (
            <>
              <span className={mobileStyles.overlayDivider} aria-hidden="true" />
              <a
                href={playbook.href}
                className={mobileStyles.mobileLink}
                aria-current={playbook.current ? "page" : undefined}
              >
                {playbook.label}
              </a>
            </>
          )}
          {contributorsHref && (
            <>
              <span className={mobileStyles.overlayDivider} aria-hidden="true" />
              <div className={mobileStyles.mobileActions}>
                <ContributorsNavButton
                  href={contributorsHref}
                  current={contributorsCurrent}
                  total={contributorsTotal}
                />
                <LanguageSelect />
                <Button
                  as="a"
                  href={CONTRIBUTING_URL}
                  variant="primary"
                  size="medium"
                >
                  Contribute
                </Button>
              </div>
            </>
          )}
        </nav>
      </details>
    </>
  );
}
